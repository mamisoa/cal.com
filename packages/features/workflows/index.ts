/**
 * @calcom/features-workflows
 *
 * AGPL-3.0 Licensed workflow automation for Cal.com bookings.
 * This module provides email and SMS reminder workflows for booking events.
 *
 * Supported Triggers:
 * - BEFORE_EVENT: Send reminder before booking
 * - AFTER_EVENT: Send follow-up after booking
 * - NEW_EVENT: Notify on new booking
 * - RESCHEDULE_EVENT: Notify on reschedule
 * - EVENT_CANCELLED: Notify on cancellation
 *
 * Supported Actions:
 * - EMAIL_HOST: Email to organizer
 * - EMAIL_ATTENDEE: Email to attendee
 * - EMAIL_ADDRESS: Email to custom address
 * - SMS_ATTENDEE: SMS to attendee
 * - SMS_NUMBER: SMS to custom number
 */

export {
  isAttendeeAction,
  isCalAIAction,
  isEmailAction,
  isFormTrigger,
  isSMSAction,
  isSMSOrWhatsappAction,
  isTextReminderAction,
  isWhatsappAction,
} from "./lib/actionHelperFunctions";
export {
  allowDisablingAttendeeConfirmationEmails,
  allowDisablingHostConfirmationEmails,
} from "./lib/allowDisablingStandardEmails";
// Constants
export * from "./lib/constants";
// Helpers
export { getAllWorkflowsFromEventType } from "./lib/getAllWorkflowsFromEventType";
export { isAuthorized } from "./lib/isAuthorized";
export { EmailReminderService } from "./lib/reminders/EmailReminderService";
// Reminders
export {
  cancelWorkflowReminders,
  ReminderScheduler,
  scheduleWorkflowReminders,
} from "./lib/reminders/ReminderScheduler";
export { SmsReminderService } from "./lib/reminders/SmsReminderService";
export { scheduleMandatoryReminder } from "./lib/reminders/scheduleMandatoryReminder";
// Services
export { WorkflowService } from "./lib/service/WorkflowService";
// Templates
export * from "./lib/templates/emailTemplates";
export * from "./lib/templates/smsTemplates";
// Types
export * from "./lib/types";
// Repositories
export { WorkflowRepository } from "./repositories/WorkflowRepository";
