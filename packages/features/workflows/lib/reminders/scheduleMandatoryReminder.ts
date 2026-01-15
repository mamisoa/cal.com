/**
 * Schedule Mandatory Reminder - AGPL-3.0 Licensed
 *
 * Schedules mandatory email reminders for Gmail attendees
 * to help ensure deliverability.
 */

import dayjs from "@calcom/dayjs";
import { tasker } from "@calcom/features/tasker";
import { withReporting } from "@calcom/lib/sentryWrapper";
import type { TraceContext } from "@calcom/lib/tracing";
import { distributedTracing } from "@calcom/lib/tracing/factory";
import { prisma } from "@calcom/prisma";
import { TimeUnit, WorkflowActions, WorkflowMethods, WorkflowTriggerEvents } from "@calcom/prisma/enums";
import {
  getDefaultReminderBody,
  getDefaultReminderSubject,
  replaceTemplateVariables,
} from "../templates/emailTemplates";
import type { ExtendedCalendarEvent, Workflow } from "../types";

/**
 * Schedule mandatory reminder for Gmail attendees
 * This helps ensure booking confirmations aren't missed
 */
async function _scheduleMandatoryReminder({
  evt,
  workflows,
  requiresConfirmation,
  hideBranding,
  seatReferenceUid,
  isPlatformNoEmail = false,
  isDryRun = false,
  traceContext,
}: {
  evt: ExtendedCalendarEvent;
  workflows: Workflow[];
  requiresConfirmation: boolean;
  hideBranding: boolean;
  seatReferenceUid: string | undefined;
  isPlatformNoEmail?: boolean;
  isDryRun?: boolean;
  traceContext: TraceContext;
}): Promise<void> {
  const spanContext = distributedTracing.createSpan(traceContext, "schedule_mandatory_reminder", {
    eventTitle: evt.title,
    attendeeCount: evt.attendees.length,
    requiresConfirmation,
    hideBranding,
    seatReferenceUid,
    isPlatformNoEmail,
  });

  const tracingLogger = distributedTracing.getTracingLogger(spanContext);

  if (isDryRun) return;
  if (isPlatformNoEmail) return;

  try {
    // Check if there's already a workflow that sends reminders to attendees
    const hasExistingWorkflow = workflows.some((workflow) => {
      return (
        workflow.trigger === WorkflowTriggerEvents.BEFORE_EVENT &&
        ((workflow.time !== null && workflow.time <= 12 && workflow.timeUnit === TimeUnit.HOUR) ||
          (workflow.time !== null && workflow.time <= 720 && workflow.timeUnit === TimeUnit.MINUTE)) &&
        workflow.steps.some((step) => step?.action === WorkflowActions.EMAIL_ATTENDEE)
      );
    });

    // Only schedule mandatory reminder if:
    // 1. No existing workflow covers this
    // 2. There are Gmail attendees
    // 3. Booking doesn't require confirmation
    if (
      !hasExistingWorkflow &&
      evt.attendees.some((attendee) => attendee.email.includes("@gmail.com")) &&
      !requiresConfirmation
    ) {
      try {
        const gmailAttendees = evt.attendees.filter((attendee) => attendee.email.includes("@gmail.com"));

        const locale = gmailAttendees[0]?.language?.locale || "en";
        const scheduledDate = dayjs(evt.startTime).subtract(1, "hour").toDate();

        // Create reminder for each Gmail attendee
        for (const _attendee of gmailAttendees) {
          const _subject = replaceTemplateVariables(getDefaultReminderSubject(locale), evt, { locale });
          const _body = replaceTemplateVariables(getDefaultReminderBody(locale), evt, { locale });

          // Create reminder record
          const reminder = await prisma.workflowReminder.create({
            data: {
              bookingUid: evt.uid,
              method: WorkflowMethods.EMAIL,
              scheduledDate,
              scheduled: true,
              seatReferenceId: seatReferenceUid,
            },
          });

          // Schedule the email
          await tasker.create(
            "sendWorkflowEmails",
            {
              bookingUid: evt.uid || "",
              workflowReminderId: reminder.id,
            },
            {
              scheduledAt: scheduledDate,
              referenceUid: reminder.uuid || undefined,
            }
          );
        }
      } catch (error) {
        tracingLogger.error("Error scheduling mandatory reminders", JSON.stringify({ error }));
      }
    }
  } catch (error) {
    tracingLogger.error("Error in scheduleMandatoryReminder", JSON.stringify({ error }));
  }
}

export const scheduleMandatoryReminder = withReporting(
  _scheduleMandatoryReminder,
  "scheduleMandatoryReminder"
);
