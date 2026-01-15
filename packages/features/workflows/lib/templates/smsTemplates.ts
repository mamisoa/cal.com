/**
 * SMS Templates - AGPL-3.0 Licensed
 *
 * SMS templates for workflow reminders.
 */

import type { ExtendedCalendarEvent } from "../types";

/**
 * Variable placeholders that can be used in SMS templates
 */
export const SMS_VARIABLES = {
  ATTENDEE_NAME: "{ATTENDEE_NAME}",
  ORGANIZER_NAME: "{ORGANIZER_NAME}",
  EVENT_TITLE: "{EVENT_TITLE}",
  EVENT_DATE: "{EVENT_DATE}",
  EVENT_TIME: "{EVENT_TIME}",
  LOCATION: "{LOCATION}",
} as const;

/**
 * Default SMS reminder message
 */
export function getDefaultSmsReminder(locale: string = "en"): string {
  const messages: Record<string, string> = {
    en: "Reminder: {EVENT_TITLE} on {EVENT_DATE} at {EVENT_TIME}. Location: {LOCATION}",
    fr: "Rappel: {EVENT_TITLE} le {EVENT_DATE} à {EVENT_TIME}. Lieu: {LOCATION}",
    es: "Recordatorio: {EVENT_TITLE} el {EVENT_DATE} a las {EVENT_TIME}. Ubicación: {LOCATION}",
  };
  return messages[locale] || messages.en;
}

/**
 * New booking SMS message
 */
export function getNewBookingSms(locale: string = "en"): string {
  const messages: Record<string, string> = {
    en: "New booking: {EVENT_TITLE} with {ATTENDEE_NAME} on {EVENT_DATE} at {EVENT_TIME}",
    fr: "Nouvelle réservation: {EVENT_TITLE} avec {ATTENDEE_NAME} le {EVENT_DATE} à {EVENT_TIME}",
  };
  return messages[locale] || messages.en;
}

/**
 * Cancellation SMS message
 */
export function getCancellationSms(locale: string = "en"): string {
  const messages: Record<string, string> = {
    en: "Cancelled: {EVENT_TITLE} on {EVENT_DATE} has been cancelled.",
    fr: "Annulé: {EVENT_TITLE} le {EVENT_DATE} a été annulé.",
  };
  return messages[locale] || messages.en;
}

/**
 * Reschedule SMS message
 */
export function getRescheduleSms(locale: string = "en"): string {
  const messages: Record<string, string> = {
    en: "Rescheduled: {EVENT_TITLE} is now on {EVENT_DATE} at {EVENT_TIME}",
    fr: "Reporté: {EVENT_TITLE} est maintenant le {EVENT_DATE} à {EVENT_TIME}",
  };
  return messages[locale] || messages.en;
}

/**
 * Replace variables in an SMS template string
 */
export function replaceSmsVariables(
  template: string,
  calendarEvent: ExtendedCalendarEvent,
  locale?: string
): string {
  const attendee = calendarEvent.attendees[0];
  const startDate = new Date(calendarEvent.startTime);
  const effectiveLocale = locale || attendee?.language?.locale || "en";

  const dateFormatter = new Intl.DateTimeFormat(effectiveLocale, {
    month: "short",
    day: "numeric",
  });

  const timeFormatter = new Intl.DateTimeFormat(effectiveLocale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const replacements: Record<string, string> = {
    "{ATTENDEE_NAME}": attendee?.name || "Guest",
    "{ORGANIZER_NAME}": calendarEvent.organizer?.name || "Organizer",
    "{EVENT_TITLE}": calendarEvent.title || "Event",
    "{EVENT_DATE}": dateFormatter.format(startDate),
    "{EVENT_TIME}": timeFormatter.format(startDate),
    "{LOCATION}": calendarEvent.location || calendarEvent.metadata?.videoCallUrl || "TBD",
  };

  let result = template;
  for (const [variable, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(variable.replace(/[{}]/g, "\\$&"), "g"), value);
  }

  return result;
}

/**
 * Get SMS template based on trigger type
 */
export function getSmsTemplateForTrigger(trigger: string, locale: string = "en"): string {
  switch (trigger) {
    case "BEFORE_EVENT":
    case "AFTER_EVENT":
      return getDefaultSmsReminder(locale);
    case "NEW_EVENT":
      return getNewBookingSms(locale);
    case "EVENT_CANCELLED":
      return getCancellationSms(locale);
    case "RESCHEDULE_EVENT":
      return getRescheduleSms(locale);
    default:
      return getDefaultSmsReminder(locale);
  }
}
