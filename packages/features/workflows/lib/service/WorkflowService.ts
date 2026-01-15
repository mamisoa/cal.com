/**
 * WorkflowService - AGPL-3.0 Licensed
 *
 * Main service for workflow automation.
 * Provides integration points for the booking system.
 */

import logger from "@calcom/lib/logger";
import { WorkflowTriggerEvents } from "@calcom/prisma/enums";

import { WorkflowRepository } from "../../repositories/WorkflowRepository";
import {
  scheduleWorkflowReminders,
  cancelWorkflowReminders,
} from "../reminders/ReminderScheduler";
import type {
  ExtendedCalendarEvent,
  ScheduleWorkflowRemindersArgs,
  Workflow,
} from "../types";
import { isSupportedTrigger, SUPPORTED_TRIGGERS } from "../types";

const log = logger.getSubLogger({ prefix: ["WorkflowService"] });

/**
 * Arguments for scheduling workflows on a new booking
 */
export interface ScheduleNewBookingArgs {
  calendarEvent: ExtendedCalendarEvent;
  eventTypeId?: number;
  userId?: number | null;
  teamId?: number | null;
  smsReminderNumber: string | null;
  isConfirmedByDefault: boolean;
  isRescheduleEvent: boolean;
  isNormalBookingOrFirstRecurringSlot: boolean;
  hideBranding?: boolean;
  seatReferenceUid?: string;
  // Allow passing workflows directly (from the original EE interface)
  workflows?: Workflow[];
  // Optional fields from EE interface for compatibility
  creditCheckFn?: unknown;
  isDryRun?: boolean;
}

/**
 * Arguments for scheduling workflows by trigger
 */
export interface ScheduleByTriggerArgs {
  calendarEvent: ExtendedCalendarEvent;
  eventTypeId?: number;
  userId?: number | null;
  teamId?: number | null;
  triggers: WorkflowTriggerEvents[];
  smsReminderNumber: string | null;
  hideBranding?: boolean;
  seatReferenceUid?: string;
  // Allow passing workflows directly (from the original EE interface)
  workflows?: Workflow[];
  // Optional fields from EE interface for compatibility
  creditCheckFn?: unknown;
  isDryRun?: boolean;
}

/**
 * WorkflowService - Main service for workflow operations
 */
export class WorkflowService {
  /**
   * Triggers that happen before or after an event (timed reminders)
   */
  private static readonly _beforeAfterEventTriggers: WorkflowTriggerEvents[] = [
    WorkflowTriggerEvents.AFTER_EVENT,
    WorkflowTriggerEvents.BEFORE_EVENT,
  ];

  /**
   * Get all workflows that should run for an event type
   */
  static async getAllWorkflowsFromEventType(params: {
    eventTypeId: number;
    userId: number | null;
    teamId: number | null;
  }): Promise<Workflow[]> {
    const { eventTypeId, userId, teamId } = params;

    try {
      const workflows = await WorkflowRepository.findAllWorkflowsForEventType({
        eventTypeId,
        userId,
        teamId,
      });

      // Filter to only supported triggers
      return workflows.filter((workflow) => isSupportedTrigger(workflow.trigger));
    } catch (error) {
      log.error("Failed to get workflows for event type", {
        error,
        eventTypeId,
        userId,
        teamId,
      });
      return [];
    }
  }

  /**
   * Schedule workflows for a new booking
   * This is the main entry point called from handleConfirmation and RegularBookingService
   */
  static async scheduleWorkflowsForNewBooking({
    calendarEvent,
    eventTypeId,
    userId,
    teamId,
    smsReminderNumber,
    isConfirmedByDefault,
    isRescheduleEvent,
    isNormalBookingOrFirstRecurringSlot,
    hideBranding,
    seatReferenceUid,
    workflows,
  }: ScheduleNewBookingArgs): Promise<void> {
    // Use provided workflows or fetch from event type
    let allWorkflows: Workflow[];
    if (workflows && workflows.length > 0) {
      allWorkflows = workflows;
    } else if (eventTypeId) {
      allWorkflows = await this.getAllWorkflowsFromEventType({
        eventTypeId,
        userId: userId ?? null,
        teamId: teamId ?? null,
      });
    } else {
      allWorkflows = [];
    }

    if (allWorkflows.length === 0) {
      log.debug("No workflows to schedule", { eventTypeId });
      return;
    }

    // Determine which workflows to trigger based on booking state
    const workflowsToTrigger: Workflow[] = [];

    if (isRescheduleEvent) {
      // For reschedules, trigger RESCHEDULE_EVENT and before/after reminders
      workflowsToTrigger.push(
        ...allWorkflows.filter(
          (workflow) =>
            workflow.trigger === WorkflowTriggerEvents.RESCHEDULE_EVENT ||
            this._beforeAfterEventTriggers.includes(workflow.trigger)
        )
      );
    } else if (!isConfirmedByDefault) {
      // For unconfirmed bookings, only trigger BOOKING_REQUESTED (if supported)
      // Currently we don't support BOOKING_REQUESTED, so nothing triggers
      log.debug("Booking not confirmed - skipping workflow triggers");
    } else if (isConfirmedByDefault) {
      // For confirmed bookings
      workflowsToTrigger.push(
        ...allWorkflows.filter(
          (workflow) =>
            this._beforeAfterEventTriggers.includes(workflow.trigger) ||
            (isNormalBookingOrFirstRecurringSlot &&
              workflow.trigger === WorkflowTriggerEvents.NEW_EVENT)
        )
      );
    }

    if (workflowsToTrigger.length === 0) {
      log.debug("No matching workflows for this booking state", {
        isRescheduleEvent,
        isConfirmedByDefault,
      });
      return;
    }

    // Schedule the reminders
    await scheduleWorkflowReminders({
      workflows: workflowsToTrigger,
      calendarEvent,
      smsReminderNumber,
      hideBranding,
      seatReferenceUid,
    });

    log.info("Scheduled workflows for new booking", {
      bookingUid: calendarEvent.uid,
      workflowCount: workflowsToTrigger.length,
    });
  }

  /**
   * Schedule workflows filtered by specific trigger events
   * Useful for triggering on specific events like cancellation
   */
  static async scheduleWorkflowsFilteredByTriggerEvent({
    calendarEvent,
    eventTypeId,
    userId,
    teamId,
    triggers,
    smsReminderNumber,
    hideBranding,
    seatReferenceUid,
    workflows,
  }: ScheduleByTriggerArgs): Promise<void> {
    // Use provided workflows or fetch from event type
    let allWorkflows: Workflow[];
    if (workflows && workflows.length > 0) {
      allWorkflows = workflows;
    } else if (eventTypeId) {
      allWorkflows = await this.getAllWorkflowsFromEventType({
        eventTypeId,
        userId: userId ?? null,
        teamId: teamId ?? null,
      });
    } else {
      allWorkflows = [];
    }

    if (allWorkflows.length === 0) {
      log.debug("No workflows found", { eventTypeId });
      return;
    }

    // Filter to only the specified triggers
    const matchingWorkflows = allWorkflows.filter((workflow) =>
      triggers.includes(workflow.trigger)
    );

    if (matchingWorkflows.length === 0) {
      log.debug("No workflows matching triggers", { triggers });
      return;
    }

    await scheduleWorkflowReminders({
      workflows: matchingWorkflows,
      calendarEvent,
      smsReminderNumber,
      hideBranding,
      seatReferenceUid,
    });

    log.info("Scheduled workflows by trigger", {
      bookingUid: calendarEvent.uid,
      triggers,
      workflowCount: matchingWorkflows.length,
    });
  }

  /**
   * Cancel all workflow reminders for a booking (e.g., when booking is cancelled)
   */
  static async cancelWorkflowsForBooking(bookingUid: string): Promise<void> {
    await cancelWorkflowReminders(bookingUid);
    log.info("Cancelled workflows for booking", { bookingUid });
  }

  /**
   * Handle booking cancellation
   * Cancels existing reminders and triggers cancellation workflows
   */
  static async handleBookingCancellation({
    calendarEvent,
    eventTypeId,
    userId,
    teamId,
    smsReminderNumber,
  }: {
    calendarEvent: ExtendedCalendarEvent;
    eventTypeId: number;
    userId: number | null;
    teamId: number | null;
    smsReminderNumber: string | null;
  }): Promise<void> {
    // Cancel existing reminders
    if (calendarEvent.uid) {
      await this.cancelWorkflowsForBooking(calendarEvent.uid);
    }

    // Trigger cancellation workflows
    await this.scheduleWorkflowsFilteredByTriggerEvent({
      calendarEvent,
      eventTypeId,
      userId,
      teamId,
      triggers: [WorkflowTriggerEvents.EVENT_CANCELLED],
      smsReminderNumber,
    });
  }

  /**
   * Handle booking reschedule
   * Cancels old reminders and schedules new ones
   */
  static async handleBookingReschedule({
    calendarEvent,
    eventTypeId,
    userId,
    teamId,
    smsReminderNumber,
    previousBookingUid,
  }: {
    calendarEvent: ExtendedCalendarEvent;
    eventTypeId: number;
    userId: number | null;
    teamId: number | null;
    smsReminderNumber: string | null;
    previousBookingUid?: string;
  }): Promise<void> {
    // Cancel reminders from previous booking
    if (previousBookingUid) {
      await this.cancelWorkflowsForBooking(previousBookingUid);
    }

    // Schedule workflows for the rescheduled booking
    await this.scheduleWorkflowsForNewBooking({
      calendarEvent,
      eventTypeId,
      userId,
      teamId,
      smsReminderNumber,
      isConfirmedByDefault: true,
      isRescheduleEvent: true,
      isNormalBookingOrFirstRecurringSlot: true,
    });
  }

  /**
   * Get supported triggers for UI display
   */
  static getSupportedTriggers(): WorkflowTriggerEvents[] {
    return [...SUPPORTED_TRIGGERS] as WorkflowTriggerEvents[];
  }

  /**
   * Delete workflow reminders when a team is removed.
   * This cleans up any scheduled reminders that were associated with the team's workflows.
   */
  static async deleteWorkflowRemindersOfRemovedTeam(teamId: number): Promise<void> {
    try {
      // Find all workflows belonging to this team
      const teamWorkflows = await WorkflowRepository.findByTeamId(teamId);

      if (teamWorkflows.length === 0) {
        log.debug("No workflows found for team", { teamId });
        return;
      }

      // Get all workflow step IDs for this team's workflows
      const workflowStepIds = teamWorkflows.flatMap((workflow) =>
        workflow.steps.map((step) => step.id)
      );

      if (workflowStepIds.length === 0) {
        log.debug("No workflow steps found for team", { teamId });
        return;
      }

      // Find and delete all reminders for these workflow steps
      const { prisma } = await import("@calcom/prisma");
      const remindersToDelete = await prisma.workflowReminder.findMany({
        where: {
          workflowStepId: {
            in: workflowStepIds,
          },
        },
        select: {
          id: true,
          referenceId: true,
          method: true,
        },
      });

      if (remindersToDelete.length > 0) {
        await WorkflowRepository.deleteAllWorkflowReminders(remindersToDelete);
        log.info("Deleted workflow reminders for removed team", {
          teamId,
          reminderCount: remindersToDelete.length,
        });
      }
    } catch (error) {
      log.error("Failed to delete workflow reminders for team", { error, teamId });
      throw error;
    }
  }
}
