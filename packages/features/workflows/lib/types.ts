/**
 * Workflow Types - AGPL-3.0 Licensed
 *
 * Type definitions for the workflow automation system.
 */

import type { TimeFormat } from "@calcom/lib/timeFormat";
import type { Prisma } from "@calcom/prisma/client";
import type {
  TimeUnit,
  WorkflowActions,
  WorkflowTemplates,
  WorkflowTriggerEvents,
} from "@calcom/prisma/enums";
import type { CalEventResponses, RecurringEvent } from "@calcom/types/Calendar";

/**
 * Supported workflow trigger events for this AGPL implementation
 */
export const SUPPORTED_TRIGGERS: WorkflowTriggerEvents[] = [
  "BEFORE_EVENT",
  "AFTER_EVENT",
  "NEW_EVENT",
  "RESCHEDULE_EVENT",
  "EVENT_CANCELLED",
] as const;

/**
 * Supported workflow actions for this AGPL implementation
 */
export const SUPPORTED_ACTIONS: WorkflowActions[] = [
  "EMAIL_HOST",
  "EMAIL_ATTENDEE",
  "EMAIL_ADDRESS",
  "SMS_ATTENDEE",
  "SMS_NUMBER",
] as const;

/**
 * Check if a trigger is supported by this implementation
 */
export function isSupportedTrigger(trigger: WorkflowTriggerEvents): boolean {
  return SUPPORTED_TRIGGERS.includes(trigger as (typeof SUPPORTED_TRIGGERS)[number]);
}

/**
 * Check if an action is supported by this implementation
 */
export function isSupportedAction(action: WorkflowActions): boolean {
  return SUPPORTED_ACTIONS.includes(action as (typeof SUPPORTED_ACTIONS)[number]);
}

/**
 * Check if an action is an email action
 */
export function isEmailAction(action: WorkflowActions): boolean {
  return action === "EMAIL_HOST" || action === "EMAIL_ATTENDEE" || action === "EMAIL_ADDRESS";
}

/**
 * Check if an action is an SMS action
 */
export function isSmsAction(action: WorkflowActions): boolean {
  return action === "SMS_ATTENDEE" || action === "SMS_NUMBER";
}

/**
 * Check if an action targets the attendee
 */
export function isAttendeeAction(action: WorkflowActions): boolean {
  return action === "EMAIL_ATTENDEE" || action === "SMS_ATTENDEE";
}

/**
 * Workflow step definition
 * Compatible with EE WorkflowStep type
 */
export type WorkflowStep = {
  action: WorkflowActions;
  sendTo: string | null;
  template: WorkflowTemplates;
  reminderBody: string | null;
  emailSubject: string | null;
  id: number;
  sender: string | null;
  includeCalendarEvent: boolean;
  numberVerificationPending: boolean;
  numberRequired: boolean | null;
  verifiedAt?: Date | null;
};

/**
 * Workflow definition
 */
export interface Workflow {
  id: number;
  name: string;
  trigger: WorkflowTriggerEvents;
  time: number | null;
  timeUnit: TimeUnit | null;
  userId: number | null;
  teamId: number | null;
  steps: WorkflowStep[];
}

/**
 * Attendee information for booking context
 */
export interface AttendeeInfo {
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phoneNumber?: string | null;
  timeZone: string;
  language: { locale: string };
}

/**
 * Organizer information for booking context
 */
export interface OrganizerInfo {
  name: string;
  email: string;
  timeZone: string;
  timeFormat?: TimeFormat;
  username?: string;
  language: { locale: string };
}

/**
 * Event type information for booking context
 */
export interface EventTypeInfo {
  slug: string;
  recurringEvent?: RecurringEvent | null;
  customReplyToEmail?: string | null;
}

/**
 * Booking information for workflow context
 */
export interface BookingInfo {
  uid?: string | null;
  bookerUrl: string;
  attendees: AttendeeInfo[];
  organizer: OrganizerInfo;
  eventType?: EventTypeInfo;
  startTime: string;
  endTime: string;
  title: string;
  location?: string | null;
  additionalNotes?: string | null;
  responses?: CalEventResponses | null;
  metadata?: Prisma.JsonValue;
  cancellationReason?: string | null;
  rescheduleReason?: string | null;
  hideOrganizerEmail?: boolean;
  videoCallData?: {
    url?: string;
  };
}

/**
 * Extended calendar event for workflow processing
 */
export interface ExtendedCalendarEvent {
  uid?: string | null;
  title: string;
  startTime: string;
  endTime: string;
  organizer: OrganizerInfo;
  attendees: AttendeeInfo[];
  location?: string | null;
  additionalNotes?: string | null;
  responses?: CalEventResponses | null;
  metadata?: { videoCallUrl: string | undefined };
  eventType: {
    slug: string;
    schedulingType?: string | null;
    hosts?: { user: { email: string; destinationCalendar?: { primaryEmail: string | null } | null } }[];
  };
  rescheduleReason?: string | null;
  cancellationReason?: string | null;
  bookerUrl: string;
}

/**
 * Arguments for scheduling workflow reminders
 */
export interface ScheduleWorkflowRemindersArgs {
  workflows: Workflow[];
  calendarEvent: ExtendedCalendarEvent;
  smsReminderNumber: string | null;
  emailAttendeeSendToOverride?: string;
  hideBranding?: boolean;
  seatReferenceUid?: string;
  isDryRun?: boolean;
}

/**
 * Email reminder data
 */
export interface EmailReminderData {
  workflowStepId: number;
  triggerEvent: WorkflowTriggerEvents;
  to: string;
  subject: string;
  body: string;
  replyTo?: string;
  scheduledDate: Date;
  includeCalendarEvent: boolean;
  calendarEvent: ExtendedCalendarEvent;
}

/**
 * SMS reminder data
 */
export interface SmsReminderData {
  workflowStepId: number;
  triggerEvent: WorkflowTriggerEvents;
  to: string;
  message: string;
  scheduledDate: Date;
  sender?: string;
}

/**
 * Result of scheduling a workflow reminder
 */
export interface ScheduleResult {
  success: boolean;
  reminderId?: number;
  error?: string;
}
