/** Follow-up reminder only — a trial booking is a request, not a confirmed appointment. */
export function bookingFollowUpReminder(id: string, now = Date.now()) {
  const timestamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const followUp = now + 24 * 60 * 60_000;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FitZone Pro//Booking Follow-up//EN",
    "BEGIN:VEVENT",
    `UID:${id}@fitzone.pro`,
    `DTSTAMP:${timestamp(now)}`,
    `DTSTART:${timestamp(followUp)}`,
    `DTEND:${timestamp(followUp + 15 * 60_000)}`,
    "SUMMARY:FitZone Pro - Follow up on booking request",
    `DESCRIPTION:Booking ${id}. Contact the gym to confirm a session time. No appointment has been scheduled yet.`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
