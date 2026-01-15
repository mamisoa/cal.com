/**
 * Workflow Constants - AGPL-3.0 Licensed
 */

import { TimeUnit, WorkflowActions, WorkflowTriggerEvents } from "@calcom/prisma/enums";

type TimeOption = { value: number; label: string };
type TimeUnitOption = { value: TimeUnit; label: string };
type TriggerOption = { value: WorkflowTriggerEvents; label: string };
type ActionOption = { value: WorkflowActions; label: string };

/**
 * Time options for workflow scheduling
 */
export const TIME_OPTIONS: TimeOption[] = [
  { value: 5, label: "5" },
  { value: 10, label: "10" },
  { value: 15, label: "15" },
  { value: 30, label: "30" },
  { value: 60, label: "60" },
];

/**
 * Time unit options
 */
export const TIME_UNIT_OPTIONS: TimeUnitOption[] = [
  { value: TimeUnit.MINUTE, label: "minutes" },
  { value: TimeUnit.HOUR, label: "hours" },
  { value: TimeUnit.DAY, label: "days" },
];

/**
 * Trigger event options for workflow configuration
 */
export const TRIGGER_OPTIONS: TriggerOption[] = [
  { value: WorkflowTriggerEvents.BEFORE_EVENT, label: "before_event" },
  { value: WorkflowTriggerEvents.AFTER_EVENT, label: "after_event" },
  { value: WorkflowTriggerEvents.NEW_EVENT, label: "new_event" },
  { value: WorkflowTriggerEvents.RESCHEDULE_EVENT, label: "reschedule_event" },
  { value: WorkflowTriggerEvents.EVENT_CANCELLED, label: "event_cancelled" },
];

/**
 * Action options for workflow steps (AGPL supported only)
 */
export const ACTION_OPTIONS: ActionOption[] = [
  { value: WorkflowActions.EMAIL_HOST, label: "email_host" },
  { value: WorkflowActions.EMAIL_ATTENDEE, label: "email_attendee" },
  { value: WorkflowActions.EMAIL_ADDRESS, label: "email_address" },
  { value: WorkflowActions.SMS_ATTENDEE, label: "sms_attendee" },
  { value: WorkflowActions.SMS_NUMBER, label: "sms_number" },
];

/**
 * Default workflow reminder time (in hours)
 */
export const DEFAULT_REMINDER_TIME: number = 24;

/**
 * Default time unit
 */
export const DEFAULT_TIME_UNIT: TimeUnit = TimeUnit.HOUR;

/**
 * Sender ID support varies by country
 * This is a simplified list - full implementation would need more countries
 */
export const SENDER_ID_SUPPORTED_COUNTRIES: string[] = ["US", "CA", "GB", "AU", "DE", "FR", "IT", "ES", "NL", "BE"];

/**
 * Workflow templates available
 */
export { WorkflowTemplates } from "@calcom/prisma/enums";

/**
 * Re-export trigger and action enums for convenience
 */
export { WorkflowTriggerEvents, WorkflowActions, TimeUnit };
