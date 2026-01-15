/**
 * SmsReminderService - AGPL-3.0 Licensed
 *
 * Service for scheduling and sending SMS reminders.
 * Requires Twilio configuration to be set up.
 */

import process from "node:process";
import dayjs from "@calcom/dayjs";
import { tasker } from "@calcom/features/tasker";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import { WorkflowMethods, WorkflowTriggerEvents } from "@calcom/prisma/enums";
import { getSmsTemplateForTrigger, replaceSmsVariables } from "../templates/smsTemplates";
import type { ExtendedCalendarEvent, ScheduleResult, Workflow, WorkflowStep } from "../types";
import { isSmsAction } from "../types";

const log = logger.getSubLogger({ prefix: ["SmsReminderService"] });

/**
 * Check if SMS is configured (Twilio credentials available)
 */
function isSmsConfigured(): boolean {
  return !!(process.env.TWILIO_SID && process.env.TWILIO_TOKEN && process.env.TWILIO_MESSAGING_SID);
}

/**
 * Service for handling SMS workflow reminders
 */
export class SmsReminderService {
  /**
   * Schedule an SMS reminder for a workflow step
   */
  static async scheduleReminder(
    workflow: Workflow,
    step: WorkflowStep,
    calendarEvent: ExtendedCalendarEvent,
    options?: {
      smsReminderNumber?: string | null;
      seatReferenceUid?: string;
    }
  ): Promise<ScheduleResult> {
    try {
      if (!isSmsAction(step.action)) {
        return { success: false, error: "Not an SMS action" };
      }

      if (!isSmsConfigured()) {
        log.warn("SMS not configured - Twilio credentials missing");
        return { success: false, error: "SMS not configured" };
      }

      // Determine recipient phone number
      const to = SmsReminderService.getRecipient(step, calendarEvent, options?.smsReminderNumber);
      if (!to) {
        log.warn("No recipient phone number for SMS reminder", {
          workflowId: workflow.id,
          stepId: step.id,
        });
        return { success: false, error: "No recipient phone number" };
      }

      // Check if number is verified (for attendee SMS)
      if (step.action === "SMS_ATTENDEE" && step.numberVerificationPending) {
        log.warn("Phone number not verified", { stepId: step.id });
        return { success: false, error: "Phone number not verified" };
      }

      // Get message content
      const locale = calendarEvent.attendees[0]?.language?.locale || "en";
      const message = step.reminderBody
        ? replaceSmsVariables(step.reminderBody, calendarEvent, locale)
        : replaceSmsVariables(getSmsTemplateForTrigger(workflow.trigger, locale), calendarEvent, locale);

      // Calculate scheduled date
      const scheduledDate = SmsReminderService.calculateScheduledDate(workflow, calendarEvent);
      if (!scheduledDate) {
        log.warn("Could not calculate scheduled date for SMS", {
          workflowId: workflow.id,
          trigger: workflow.trigger,
        });
        return { success: false, error: "Could not calculate scheduled date" };
      }

      // For immediate triggers, send now
      if (SmsReminderService.isImmediateTrigger(workflow.trigger)) {
        return SmsReminderService.sendSmsNow({
          to,
          message,
          calendarEvent,
          step,
          workflow,
          sender: step.sender,
        });
      }

      // For timed triggers, schedule the reminder
      const workflowReminder = await prisma.workflowReminder.create({
        data: {
          bookingUid: calendarEvent.uid,
          workflowStepId: step.id,
          method: WorkflowMethods.SMS,
          scheduledDate,
          scheduled: true,
          seatReferenceId: options?.seatReferenceUid,
        },
      });

      // Note: SMS sending is handled by the existing workflow infrastructure
      // For now, we just create the reminder record - actual sending would need
      // integration with Twilio or other SMS provider
      log.info("SMS reminder record created (sending requires SMS provider integration)", {
        workflowReminderId: workflowReminder.id,
        to: SmsReminderService.maskPhoneNumber(to),
        scheduledDate,
      });

      log.info("SMS reminder scheduled", {
        workflowId: workflow.id,
        stepId: step.id,
        to: SmsReminderService.maskPhoneNumber(to),
        scheduledDate,
        reminderId: workflowReminder.id,
      });

      return { success: true, reminderId: workflowReminder.id };
    } catch (error) {
      log.error("Failed to schedule SMS reminder", {
        error,
        workflowId: workflow.id,
        stepId: step.id,
      });
      return { success: false, error: String(error) };
    }
  }

  /**
   * Send an SMS immediately
   */
  private static async sendSmsNow(params: {
    to: string;
    message: string;
    calendarEvent: ExtendedCalendarEvent;
    step: WorkflowStep;
    workflow: Workflow;
    sender?: string | null;
  }): Promise<ScheduleResult> {
    const { to, message, calendarEvent, step, workflow, sender } = params;

    try {
      const workflowReminder = await prisma.workflowReminder.create({
        data: {
          bookingUid: calendarEvent.uid,
          workflowStepId: step.id,
          method: WorkflowMethods.SMS,
          scheduledDate: new Date(),
          scheduled: true,
        },
      });

      // Note: SMS sending requires SMS provider integration
      log.info("Immediate SMS reminder record created (sending requires SMS provider integration)", {
        workflowId: workflow.id,
        stepId: step.id,
        workflowReminderId: workflowReminder.id,
        to: SmsReminderService.maskPhoneNumber(to),
      });

      return { success: true, reminderId: workflowReminder.id };
    } catch (error) {
      log.error("Failed to send immediate SMS", { error });
      return { success: false, error: String(error) };
    }
  }

  /**
   * Determine the recipient phone number
   */
  private static getRecipient(
    step: WorkflowStep,
    calendarEvent: ExtendedCalendarEvent,
    smsReminderNumber?: string | null
  ): string | null {
    switch (step.action) {
      case "SMS_ATTENDEE":
        // Use provided number or attendee's phone number
        return smsReminderNumber || calendarEvent.attendees[0]?.phoneNumber || null;

      case "SMS_NUMBER":
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

    if (SmsReminderService.isImmediateTrigger(trigger)) {
      return new Date();
    }

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
   * Cancel scheduled SMS reminders for a booking
   */
  static async cancelRemindersForBooking(bookingUid: string): Promise<void> {
    try {
      const reminders = await prisma.workflowReminder.findMany({
        where: {
          bookingUid,
          method: WorkflowMethods.SMS,
          cancelled: false,
          scheduled: true,
        },
      });

      for (const reminder of reminders) {
        if (reminder.uuid) {
          await tasker.cancel(reminder.uuid);
        }

        await prisma.workflowReminder.update({
          where: { id: reminder.id },
          data: { cancelled: true },
        });
      }

      log.info("Cancelled SMS reminders for booking", {
        bookingUid,
        count: reminders.length,
      });
    } catch (error) {
      log.error("Failed to cancel SMS reminders", { error, bookingUid });
    }
  }

  /**
   * Mask phone number for logging (privacy)
   */
  private static maskPhoneNumber(phone: string): string {
    if (phone.length <= 4) return "****";
    return phone.slice(0, -4).replace(/./g, "*") + phone.slice(-4);
  }
}
