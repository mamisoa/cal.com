/**
 * Email Templates - AGPL-3.0 Licensed
 *
 * Email templates for workflow reminders.
 */

import type { ExtendedCalendarEvent } from "../types";

/**
 * Variable placeholders that can be used in templates
 */
export const EMAIL_VARIABLES = {
  ATTENDEE_NAME: "{ATTENDEE_NAME}",
  ORGANIZER_NAME: "{ORGANIZER_NAME}",
  EVENT_TITLE: "{EVENT_TITLE}",
  EVENT_DATE: "{EVENT_DATE}",
  EVENT_TIME: "{EVENT_TIME}",
  EVENT_END_TIME: "{EVENT_END_TIME}",
  EVENT_TIMEZONE: "{EVENT_TIMEZONE}",
  LOCATION: "{LOCATION}",
  ADDITIONAL_NOTES: "{ADDITIONAL_NOTES}",
  MEETING_URL: "{MEETING_URL}",
  CANCEL_URL: "{CANCEL_URL}",
  RESCHEDULE_URL: "{RESCHEDULE_URL}",
} as const;

/**
 * Default email subject for reminders
 */
export function getDefaultReminderSubject(locale: string = "en"): string {
  const subjects: Record<string, string> = {
    en: "Reminder: {EVENT_TITLE} on {EVENT_DATE}",
    fr: "Rappel: {EVENT_TITLE} le {EVENT_DATE}",
    es: "Recordatorio: {EVENT_TITLE} el {EVENT_DATE}",
    de: "Erinnerung: {EVENT_TITLE} am {EVENT_DATE}",
  };
  return subjects[locale] || subjects.en;
}

/**
 * Default email body for reminders
 */
export function getDefaultReminderBody(locale: string = "en"): string {
  const bodies: Record<string, string> = {
    en: `Hi {ATTENDEE_NAME},

This is a reminder for your upcoming event:

**{EVENT_TITLE}**
Date: {EVENT_DATE}
Time: {EVENT_TIME} - {EVENT_END_TIME} ({EVENT_TIMEZONE})
Location: {LOCATION}

{ADDITIONAL_NOTES}

Need to make changes?
- Reschedule: {RESCHEDULE_URL}
- Cancel: {CANCEL_URL}

Looking forward to seeing you!

Best regards,
{ORGANIZER_NAME}`,
    fr: `Bonjour {ATTENDEE_NAME},

Ceci est un rappel pour votre prochain événement:

**{EVENT_TITLE}**
Date: {EVENT_DATE}
Heure: {EVENT_TIME} - {EVENT_END_TIME} ({EVENT_TIMEZONE})
Lieu: {LOCATION}

{ADDITIONAL_NOTES}

Besoin de modifier?
- Reporter: {RESCHEDULE_URL}
- Annuler: {CANCEL_URL}

Au plaisir de vous voir!

Cordialement,
{ORGANIZER_NAME}`,
  };
  return bodies[locale] || bodies.en;
}

/**
 * Default new booking email subject
 */
export function getNewBookingSubject(locale: string = "en"): string {
  const subjects: Record<string, string> = {
    en: "New booking: {EVENT_TITLE}",
    fr: "Nouvelle réservation: {EVENT_TITLE}",
  };
  return subjects[locale] || subjects.en;
}

/**
 * Default new booking email body for host
 */
export function getNewBookingHostBody(locale: string = "en"): string {
  const bodies: Record<string, string> = {
    en: `You have a new booking!

**{EVENT_TITLE}**
With: {ATTENDEE_NAME}
Date: {EVENT_DATE}
Time: {EVENT_TIME} - {EVENT_END_TIME} ({EVENT_TIMEZONE})
Location: {LOCATION}

{ADDITIONAL_NOTES}`,
  };
  return bodies[locale] || bodies.en;
}

/**
 * Default cancellation email subject
 */
export function getCancellationSubject(locale: string = "en"): string {
  const subjects: Record<string, string> = {
    en: "Event Cancelled: {EVENT_TITLE}",
    fr: "Événement annulé: {EVENT_TITLE}",
  };
  return subjects[locale] || subjects.en;
}

/**
 * Default cancellation email body
 */
export function getCancellationBody(locale: string = "en"): string {
  const bodies: Record<string, string> = {
    en: `Hi {ATTENDEE_NAME},

Your event has been cancelled:

**{EVENT_TITLE}**
Original Date: {EVENT_DATE}
Original Time: {EVENT_TIME} ({EVENT_TIMEZONE})

If you'd like to reschedule, please book a new time.

Best regards,
{ORGANIZER_NAME}`,
  };
  return bodies[locale] || bodies.en;
}

/**
 * Default reschedule email subject
 */
export function getRescheduleSubject(locale: string = "en"): string {
  const subjects: Record<string, string> = {
    en: "Event Rescheduled: {EVENT_TITLE}",
    fr: "Événement reporté: {EVENT_TITLE}",
  };
  return subjects[locale] || subjects.en;
}

/**
 * Default reschedule email body
 */
export function getRescheduleBody(locale: string = "en"): string {
  const bodies: Record<string, string> = {
    en: `Hi {ATTENDEE_NAME},

Your event has been rescheduled:

**{EVENT_TITLE}**
New Date: {EVENT_DATE}
New Time: {EVENT_TIME} - {EVENT_END_TIME} ({EVENT_TIMEZONE})
Location: {LOCATION}

Need to make changes?
- Reschedule: {RESCHEDULE_URL}
- Cancel: {CANCEL_URL}

Best regards,
{ORGANIZER_NAME}`,
  };
  return bodies[locale] || bodies.en;
}

/**
 * Replace variables in a template string
 */
export function replaceTemplateVariables(
  template: string,
  calendarEvent: ExtendedCalendarEvent,
  options?: {
    bookerUrl?: string;
    locale?: string;
  }
): string {
  const attendee = calendarEvent.attendees[0];
  const startDate = new Date(calendarEvent.startTime);
  const endDate = new Date(calendarEvent.endTime);
  const locale = options?.locale || attendee?.language?.locale || "en";
  const bookerUrl = options?.bookerUrl || calendarEvent.bookerUrl;

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const timeFormatter = new Intl.DateTimeFormat(locale, {
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
    "{EVENT_END_TIME}": timeFormatter.format(endDate),
    "{EVENT_TIMEZONE}": attendee?.timeZone || calendarEvent.organizer?.timeZone || "UTC",
    "{LOCATION}": calendarEvent.location || calendarEvent.metadata?.videoCallUrl || "TBD",
    "{ADDITIONAL_NOTES}": calendarEvent.additionalNotes || "",
    "{MEETING_URL}": calendarEvent.metadata?.videoCallUrl || "",
    "{CANCEL_URL}": calendarEvent.uid ? `${bookerUrl}/booking/${calendarEvent.uid}?cancel=true` : "",
    "{RESCHEDULE_URL}": calendarEvent.uid ? `${bookerUrl}/reschedule/${calendarEvent.uid}` : "",
  };

  let result = template;
  for (const [variable, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(variable.replace(/[{}]/g, "\\$&"), "g"), value);
  }

  return result;
}

/**
 * Get template based on trigger type
 */
export function getTemplateForTrigger(
  trigger: string,
  type: "subject" | "body",
  locale: string = "en"
): string {
  switch (trigger) {
    case "BEFORE_EVENT":
    case "AFTER_EVENT":
      return type === "subject" ? getDefaultReminderSubject(locale) : getDefaultReminderBody(locale);
    case "NEW_EVENT":
      return type === "subject" ? getNewBookingSubject(locale) : getNewBookingHostBody(locale);
    case "EVENT_CANCELLED":
      return type === "subject" ? getCancellationSubject(locale) : getCancellationBody(locale);
    case "RESCHEDULE_EVENT":
      return type === "subject" ? getRescheduleSubject(locale) : getRescheduleBody(locale);
    default:
      return type === "subject" ? getDefaultReminderSubject(locale) : getDefaultReminderBody(locale);
  }
}

/**
 * Generate email reminder template for workflow creation
 * Used when creating a new workflow to provide default email content
 */
export function emailReminderTemplate(params: {
  isEditingMode: boolean;
  locale: string;
  t: (key: string) => string;
  action?: string;
  timeFormat?: string;
  startTime?: string;
  endTime?: string;
  eventName?: string;
  timeZone?: string;
  location?: string;
  meetingUrl?: string;
  otherPerson?: string;
  name?: string;
  isBrandingDisabled?: boolean;
}): { emailSubject: string; emailBody: string } {
  const { isEditingMode, locale, t, action, timeFormat = "h:mma" } = params;

  const dateTimeFormat = `ddd, MMM D, YYYY ${timeFormat}`;

  let eventDate: string;
  let endTime: string;
  let eventName: string;
  let timeZone: string;
  let locationString: string;
  let otherPerson: string;
  let name: string;

  if (isEditingMode) {
    endTime = "{EVENT_END_TIME}";
    eventName = "{EVENT_NAME}";
    timeZone = "{TIMEZONE}";
    locationString = "{LOCATION} {MEETING_URL}";
    otherPerson = action === "EMAIL_ATTENDEE" ? "{ORGANIZER}" : "{ATTENDEE}";
    name = action === "EMAIL_ATTENDEE" ? "{ATTENDEE}" : "{ORGANIZER}";
    eventDate = `{EVENT_DATE_${dateTimeFormat}}`;
  } else {
    eventDate = params.startTime || "";
    endTime = params.endTime || "";
    eventName = params.eventName || "";
    timeZone = params.timeZone || "";
    locationString = `${params.location || ""} ${params.meetingUrl || ""}`.trim();
    otherPerson = params.otherPerson || "";
    name = params.name || "";
  }

  const emailSubject = `${t("reminder") || "Reminder"}: ${eventName} - ${eventDate}`;

  const emailBody = `<body>
${t("hi") || "Hi"}${name ? ` ${name}` : ""},<br><br>
${t("email_reminder_upcoming_event_notice") || "This is a reminder about your upcoming event."}<br><br>
<div><strong>${t("event_upper_case") || "EVENT"}: </strong></div>${eventName}<br><br>
<div><strong>${t("date_and_time") || "DATE & TIME"}: </strong></div>${eventDate} - ${endTime} (${timeZone})<br><br>
<div><strong>${t("attendees") || "ATTENDEES"}: </strong></div>${t("you_and_conjunction") || "You &"} ${otherPerson}<br><br>
<div><strong>${t("location") || "LOCATION"}: </strong></div>${locationString}<br><br>
</body>`;

  return { emailSubject, emailBody };
}

// Default export for compatibility
export default emailReminderTemplate;
