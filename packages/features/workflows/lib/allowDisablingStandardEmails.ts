/**
 * Allow Disabling Standard Emails - AGPL-3.0 Licensed
 *
 * Helpers to determine if standard confirmation emails can be disabled
 * based on workflow configuration.
 */

import { WorkflowActions, WorkflowTriggerEvents } from "@calcom/prisma/enums";

type WorkflowWithStepsAndTrigger = {
  trigger: WorkflowTriggerEvents;
  steps: {
    action: WorkflowActions;
  }[];
};

/**
 * Check if host confirmation emails can be disabled
 * (because there's a NEW_EVENT workflow that emails the host)
 */
export function allowDisablingHostConfirmationEmails(workflows: WorkflowWithStepsAndTrigger[]): boolean {
  return !!workflows.find(
    (workflow) =>
      workflow.trigger === WorkflowTriggerEvents.NEW_EVENT &&
      !!workflow.steps.find((step) => step.action === WorkflowActions.EMAIL_HOST)
  );
}

/**
 * Check if attendee confirmation emails can be disabled
 * (because there's a NEW_EVENT workflow that emails/sms the attendee)
 */
export function allowDisablingAttendeeConfirmationEmails(workflows: WorkflowWithStepsAndTrigger[]): boolean {
  return !!workflows.find(
    (workflow) =>
      workflow.trigger === WorkflowTriggerEvents.NEW_EVENT &&
      !!workflow.steps.find(
        (step) =>
          step.action === WorkflowActions.EMAIL_ATTENDEE || step.action === WorkflowActions.SMS_ATTENDEE
      )
  );
}
