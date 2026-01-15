/**
 * Action Helper Functions - AGPL-3.0 Licensed
 *
 * Helper functions for workflow action type checking.
 */

import { WorkflowActions, WorkflowTriggerEvents } from "@calcom/prisma/enums";

/**
 * Check if an action is an email action
 */
export function isEmailAction(action: WorkflowActions): boolean {
  return (
    action === WorkflowActions.EMAIL_HOST ||
    action === WorkflowActions.EMAIL_ATTENDEE ||
    action === WorkflowActions.EMAIL_ADDRESS
  );
}

/**
 * Check if an action is an SMS action
 */
export function isSMSAction(action: WorkflowActions): boolean {
  return action === WorkflowActions.SMS_ATTENDEE || action === WorkflowActions.SMS_NUMBER;
}

/**
 * Check if an action is a WhatsApp action
 * Note: WhatsApp is not supported in AGPL version
 */
export function isWhatsappAction(action: WorkflowActions): boolean {
  return action === WorkflowActions.WHATSAPP_ATTENDEE || action === WorkflowActions.WHATSAPP_NUMBER;
}

/**
 * Check if an action is SMS or WhatsApp
 */
export function isSMSOrWhatsappAction(action: WorkflowActions): boolean {
  return isSMSAction(action) || isWhatsappAction(action);
}

/**
 * Check if an action targets an attendee
 */
export function isAttendeeAction(action: WorkflowActions): boolean {
  return (
    action === WorkflowActions.EMAIL_ATTENDEE ||
    action === WorkflowActions.SMS_ATTENDEE ||
    action === WorkflowActions.WHATSAPP_ATTENDEE
  );
}

/**
 * Check if an action is a Cal AI phone call action
 * Note: Cal AI is not supported in AGPL version
 */
export function isCalAIAction(action: WorkflowActions): boolean {
  return action === WorkflowActions.CAL_AI_PHONE_CALL;
}

/**
 * Check if a trigger is a form trigger
 * Note: Form triggers are not fully supported in AGPL version
 */
export function isFormTrigger(trigger: WorkflowTriggerEvents): boolean {
  return (
    trigger === WorkflowTriggerEvents.FORM_SUBMITTED ||
    trigger === WorkflowTriggerEvents.FORM_SUBMITTED_NO_EVENT
  );
}

/**
 * Check if a trigger is a text reminder action (SMS or WhatsApp)
 */
export function isTextReminderAction(action: WorkflowActions): boolean {
  return isSMSOrWhatsappAction(action);
}
