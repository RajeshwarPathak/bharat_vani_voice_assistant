import { CalendarEvent } from "../types";

/**
 * Generate standard iCalendar (.ics) string for Windows Calendar / Outlook
 */
export function generateIcsContent(events: CalendarEvent[]): string {
  let ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Bharat Vani//Voice Assistant for Windows//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  events.forEach((evt) => {
    // Format date time: YYYYMMDDTHHmmSS
    const cleanDate = evt.date.replace(/-/g, "");
    const cleanTime = (evt.time || "10:00").replace(/:/g, "") + "00";
    const startStr = `${cleanDate}T${cleanTime}`;

    // Calculate end time
    const [h, m] = (evt.time || "10:00").split(":").map(Number);
    const endMinutesTotal = h * 60 + m + (evt.durationMinutes || 30);
    const endH = Math.floor(endMinutesTotal / 60) % 24;
    const endM = endMinutesTotal % 60;
    const endTimeStr = `${String(endH).padStart(2, "0")}${String(endM).padStart(2, "0")}00`;
    const endStr = `${cleanDate}T${endTimeStr}`;

    ics.push(
      "BEGIN:VEVENT",
      `UID:${evt.id}@bharatvani.windows`,
      `DTSTAMP:${cleanDate}T000000Z`,
      `DTSTART:${startStr}`,
      `DTEND:${endStr}`,
      `SUMMARY:${evt.title}`,
      `DESCRIPTION:${evt.notes || "Created via Bharat Vani Voice Assistant"}`,
      `LOCATION:${evt.location || "Windows Workstation"}`,
      "STATUS:CONFIRMED",
      "END:VEVENT"
    );
  });

  ics.push("END:VCALENDAR");
  return ics.join("\r\n");
}

/**
 * Download .ICS file directly to user's browser
 */
export function downloadIcsFile(events: CalendarEvent[], filename = "BharatVani_Schedule.ics") {
  const content = generateIcsContent(events);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generate Google Calendar Web URL for an event
 */
export function getGoogleCalendarUrl(evt: CalendarEvent): string {
  const cleanDate = evt.date.replace(/-/g, "");
  const cleanTime = (evt.time || "10:00").replace(/:/g, "") + "00";
  const startStr = `${cleanDate}T${cleanTime}Z`;

  const [h, m] = (evt.time || "10:00").split(":").map(Number);
  const endMinutesTotal = h * 60 + m + (evt.durationMinutes || 30);
  const endH = Math.floor(endMinutesTotal / 60) % 24;
  const endM = endMinutesTotal % 60;
  const endStr = `${cleanDate}T${String(endH).padStart(2, "0")}${String(endM).padStart(2, "0")}00Z`;

  const title = encodeURIComponent(evt.title);
  const details = encodeURIComponent(evt.notes || "Added by Bharat Vani AI Voice Assistant");
  const loc = encodeURIComponent(evt.location || "Windows PC");

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&details=${details}&location=${loc}`;
}
