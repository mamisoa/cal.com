/**
 * EmailReminderService - AGPL-3.0 Licensed
 *
 * Service for scheduling and sending email reminders.
 */

import dayjs from "@calcom/dayjs";
import { tasker } from "@calcom/features/tasker";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import { WorkflowMethods, WorkflowTriggerEvents } from "@calcom/prisma/enums";
import { getTemplateForTrigger, replaceTemplateVariables } from "../templates/emailTemplates";
import type { ExtendedCalendarEvent, ScheduleResult, Workflow, WorkflowStep } from "../types";
import { isEmailAction } from "../types";

const log = logger.getSubLogger({ prefix: ["EmailReminderService"] });

/**
 * Service for handling email workflow reminders
 */
export class EmailReminderService {
  /**
   * Schedule an email reminder for a workflow step
   */
  static async scheduleReminder(
    workflow: Workflow,
    step: WorkflowStep,
    calendarEvent: ExtendedCalendarEvent,
    options?: {
      emailAttendeeSendToOverride?: string;
      seatReferenceUid?: string;
    }
  ): Promise<ScheduleResult> {
    try {
      if (!isEmailAction(step.action)) {
        return { success: false, error: "Not an email action" };
      }

      // Determine recipient
      const to = EmailReminderService.getRecipient(step, calendarEvent, options?.emailAttendeeSendToOverride);
      if (!to) {
        log.warn("No recipient for email reminder", { workflowId: workflow.id, stepId: step.id });
        return { success: false, error: "No recipient" };
      }

      // Get subject and body (use custom or default template)
      const locale = calendarEvent.attendees[0]?.language?.locale || "en";
      const subject = step.emailSubject
        ? replaceTemplateVariables(step.emailSubject, calendarEvent, { locale })
        : replaceTemplateVariables(
            getTemplateForTrigger(workflow.trigger, "subject", locale),
            calendarEvent,
            { locale }
          );

      const body = step.reminderBody
        ? replaceTemplateVariables(step.reminderBody, calendarEvent, { locale })
        : replaceTemplateVariables(getTemplateForTrigger(workflow.trigger, "body", locale), calendarEvent, {
            locale,
          });

      // Calculate scheduled date
      const scheduledDate = EmailReminderService.calculateScheduledDate(workflow, calendarEvent);

      if (!scheduledDate) {
        log.warn("Could not calculate scheduled date", {
          workflowId: workflow.id,
          trigger: workflow.trigger,
        });
        return { success: false, error: "Could not calculate scheduled date" };
      }

      // For immediate triggers, send now
      if (EmailReminderService.isImmediateTrigger(workflow.trigger)) {
        return EmailReminderService.sendEmailNow({
          to,
          subject,
          body,
          calendarEvent,
          step,
          workflow,
        });
      }

      // For timed triggers (BEFORE_EVENT, AFTER_EVENT), schedule the reminder
      const workflowReminder = await prisma.workflowReminder.create({
        data: {
          bookingUid: calendarEvent.uid || "",
          workflowStepId: step.id,
          method: WorkflowMethods.EMAIL,
          scheduledDate,
          scheduled: true,
          seatReferenceId: options?.seatReferenceUid,
        },
      });

      // Schedule the task
      await tasker.create(
        "sendWorkflowEmails",
        {
          bookingUid: calendarEvent.uid || "",
          workflowReminderId: workflowReminder.id,
        },
        {
          scheduledAt: scheduledDate,
          referenceUid: workflowReminder.uuid || undefined,
        }
      );

      log.info("Email reminder scheduled", {
        workflowId: workflow.id,
        stepId: step.id,
        to,
        scheduledDate,
        reminderId: workflowReminder.id,
      });

      return { success: true, reminderId: workflowReminder.id };
    } catch (error) {
      log.error("Failed to schedule email reminder", {
        error,
        workflowId: workflow.id,
        stepId: step.id,
      });
      return { success: false, error: String(error) };
    }
  }

  /**
   * Send an email immediately (for immediate triggers)
   */
  private static async sendEmailNow(params: {
    to: string;
    subject: string;
    body: string;
    calendarEvent: ExtendedCalendarEvent;
    step: WorkflowStep;
    workflow: Workflow;
  }): Promise<ScheduleResult> {
    const { to, subject, body, calendarEvent, step, workflow } = params;

    try {
      // Create a reminder record for tracking
      const workflowReminder = await prisma.workflowReminder.create({
        data: {
          bookingUid: calendarEvent.uid,
          workflowStepId: step.id,
          method: WorkflowMethods.EMAIL,
          scheduledDate: new Date(),
          scheduled: true,
        },
      });

      // Use tasker to send immediately
      await tasker.create(
        "sendWorkflowEmails",
        {
          bookingUid: calendarEvent.uid || "",
          workflowReminderId: workflowReminder.id,
        },
        {
          scheduledAt: new Date(),
          referenceUid: workflowReminder.uuid || undefined,
        }
      );

      log.info("Immediate email scheduled", {
        workflowId: workflow.id,
        stepId: step.id,
        to,
      });

      return { success: true, reminderId: workflowReminder.id };
    } catch (error) {
      log.error("Failed to send immediate email", { error });
      return { success: false, error: String(error) };
    }
  }

  /**
   * Determine the recipient email address
   */
  private static getRecipient(
    step: WorkflowStep,
    calendarEvent: ExtendedCalendarEvent,
    emailAttendeeSendToOverride?: string
  ): string | null {
    switch (step.action) {
      case "EMAIL_HOST":
        return calendarEvent.organizer?.email || null;

      case "EMAIL_ATTENDEE":
        if (emailAttendeeSendToOverride) {
          return emailAttendeeSendToOverride;
        }
        return calendarEvent.attendees[0]?.email || null;

      case "EMAIL_ADDRESS":
        return step.sendTo || null;

      default:
        return null;
    }
  }

  /**
   * Calculate when the reminder should be sent
   */
  private static calculateScheduledDate(
    workflow: Workflow,
    calendarEvent: ExtendedCalendarEvent
  ): Date | null {
    const { trigger, time, timeUnit } = workflow;

    // Immediate triggers
    if (EmailReminderService.isImmediateTrigger(trigger)) {
      return new Date();
    }

    // Timed triggers
    if (trigger === WorkflowTriggerEvents.BEFORE_EVENT) {
      if (!time || !timeUnit) return null;
      const startTime = dayjs(calendarEvent.startTime);
      return startTime.subtract(time, timeUnit.toLowerCase() as dayjs.ManipulateType).toDate();
    }

    if (trigger === WorkflowTriggerEvents.AFTER_EVENT) {
      if (!time || !timeUnit) return null;
      const endTime = dayjs(calendarEvent.endTime);
      return endTime.add(time, timeUnit.toLowerCase() as dayjs.ManipulateType).toDate();
    }

    return null;
  }

  /**
   * Check if a trigger should send immediately
   */
  private static isImmediateTrigger(trigger: WorkflowTriggerEvents): boolean {
    const immediateTriggers: WorkflowTriggerEvents[] = [
      WorkflowTriggerEvents.NEW_EVENT,
      WorkflowTriggerEvents.RESCHEDULE_EVENT,
      WorkflowTriggerEvents.EVENT_CANCELLED,
    ];
    return immediateTriggers.includes(trigger);
  }

  /**
   * Cancel scheduled reminders for a booking
   */
  static async cancelRemindersForBooking(bookingUid: string): Promise<void> {
    try {
      const reminders = await prisma.workflowReminder.findMany({
        where: {
          bookingUid,
          method: WorkflowMethods.EMAIL,
          cancelled: false,
          scheduled: true,
        },
      });

      for (const reminder of reminders) {
        // Cancel the scheduled task
        if (reminder.uuid) {
          await tasker.cancel(reminder.uuid);
        }

        // Mark as cancelled
        await prisma.workflowReminder.update({
          where: { id: reminder.id },
          data: { cancelled: true },
        });
      }

      log.info("Cancelled email reminders for booking", {
        bookingUid,
        count: reminders.length,
      });
    } catch (error) {
      log.error("Failed to cancel email reminders", { error, bookingUid });
    }
  }
}
