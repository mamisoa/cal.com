/**
 * ReminderScheduler - AGPL-3.0 Licensed
 *
 * Main orchestrator for scheduling workflow reminders.
 * Dispatches to EmailReminderService and SmsReminderService based on action type.
 */

import logger from "@calcom/lib/logger";

import type {
  ExtendedCalendarEvent,
  ScheduleResult,
  ScheduleWorkflowRemindersArgs,
  Workflow,
  WorkflowStep,
} from "../types";
import { isEmailAction, isSmsAction, isSupportedAction } from "../types";
import { EmailReminderService } from "./EmailReminderService";
import { SmsReminderService } from "./SmsReminderService";

const log = logger.getSubLogger({ prefix: ["ReminderScheduler"] });

/**
 * Result of scheduling all workflow reminders
 */
export interface ScheduleAllResult {
  scheduled: number;
  failed: number;
  skipped: number;
  results: Array<{
    workflowId: number;
    stepId: number;
    result: ScheduleResult;
  }>;
}

/**
 * ReminderScheduler - Orchestrates workflow reminder scheduling
 */
export class ReminderScheduler {
  /**
   * Schedule all reminders for a set of workflows
   */
  static async scheduleAll(args: ScheduleWorkflowRemindersArgs): Promise<ScheduleAllResult> {
    const {
      workflows,
      calendarEvent,
      smsReminderNumber,
      emailAttendeeSendToOverride,
      seatReferenceUid,
      isDryRun = false,
    } = args;

    const result: ScheduleAllResult = {
      scheduled: 0,
      failed: 0,
      skipped: 0,
      results: [],
    };

    if (isDryRun) {
      log.info("Dry run mode - not scheduling any reminders");
      return result;
    }

    for (const workflow of workflows) {
      for (const step of workflow.steps) {
        const stepResult = await ReminderScheduler.scheduleStep(workflow, step, calendarEvent, {
          smsReminderNumber,
          emailAttendeeSendToOverride,
          seatReferenceUid,
        });

        result.results.push({
          workflowId: workflow.id,
          stepId: step.id,
          result: stepResult,
        });

        if (stepResult.success) {
          result.scheduled++;
        } else if (stepResult.error === "unsupported" || stepResult.error === "skipped") {
          result.skipped++;
        } else {
          result.failed++;
        }
      }
    }

    log.info("Workflow reminders scheduling complete", {
      scheduled: result.scheduled,
      failed: result.failed,
      skipped: result.skipped,
      workflowCount: workflows.length,
    });

    return result;
  }

  /**
   * Schedule a single workflow step
   */
  private static async scheduleStep(
    workflow: Workflow,
    step: WorkflowStep,
    calendarEvent: ExtendedCalendarEvent,
    options: {
      smsReminderNumber?: string | null;
      emailAttendeeSendToOverride?: string;
      seatReferenceUid?: string;
    }
  ): Promise<ScheduleResult> {
    // Check if action is supported
    if (!isSupportedAction(step.action)) {
      log.debug("Skipping unsupported action", {
        workflowId: workflow.id,
        stepId: step.id,
        action: step.action,
      });
      return { success: false, error: "unsupported" };
    }

    // Route to appropriate service
    if (isEmailAction(step.action)) {
      return EmailReminderService.scheduleReminder(workflow, step, calendarEvent, {
        emailAttendeeSendToOverride: options.emailAttendeeSendToOverride,
        seatReferenceUid: options.seatReferenceUid,
      });
    }

    if (isSmsAction(step.action)) {
      return SmsReminderService.scheduleReminder(workflow, step, calendarEvent, {
        smsReminderNumber: options.smsReminderNumber,
        seatReferenceUid: options.seatReferenceUid,
      });
    }

    // Unknown action type
    log.warn("Unknown action type", {
      workflowId: workflow.id,
      stepId: step.id,
      action: step.action,
    });
    return { success: false, error: "unknown action" };
  }

  /**
   * Cancel all reminders for a booking
   */
  static async cancelAllForBooking(bookingUid: string): Promise<void> {
    await Promise.all([
      EmailReminderService.cancelRemindersForBooking(bookingUid),
      SmsReminderService.cancelRemindersForBooking(bookingUid),
    ]);

    log.info("Cancelled all reminders for booking", { bookingUid });
  }
}

/**
 * Convenience function to schedule workflow reminders
 * This is the main entry point for the booking system
 */
export async function scheduleWorkflowReminders(
  args: ScheduleWorkflowRemindersArgs
): Promise<ScheduleAllResult> {
  return ReminderScheduler.scheduleAll(args);
}

/**
 * Convenience function to cancel all reminders for a booking
 */
export async function cancelWorkflowReminders(bookingUid: string): Promise<void> {
  return ReminderScheduler.cancelAllForBooking(bookingUid);
}
