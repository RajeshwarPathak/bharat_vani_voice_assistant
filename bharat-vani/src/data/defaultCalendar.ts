import { CalendarEvent, ReminderItem } from "../types";

export function getTodayDateStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getTomorrowDateStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const INITIAL_CALENDAR_EVENTS: CalendarEvent[] = [
  {
    id: "evt-1",
    title: "Bharat Vani Architecture Review 🇮🇳",
    date: getTodayDateStr(),
    time: "11:00",
    durationMinutes: 45,
    category: "work",
    location: "Google Meet / Windows Terminal",
    notes: "Reviewing Google Gemini API streaming and integration.",
  },
  {
    id: "evt-2",
    title: "Chai & Sync with Team",
    date: getTodayDateStr(),
    time: "16:30",
    durationMinutes: 30,
    category: "personal",
    location: "Cafeteria / Discord",
    notes: "Discussing voice recognition accuracy in noisy Indian environments.",
  },
  {
    id: "evt-3",
    title: "Windows Automation Testing",
    date: getTomorrowDateStr(),
    time: "14:00",
    durationMinutes: 60,
    category: "meeting",
    location: "Local PC Workstation",
    notes: "Testing ActionExecutor pywhatkit and SAPI speech synthesis.",
  },
];

export const INITIAL_REMINDERS: ReminderItem[] = [
  {
    id: "rem-1",
    text: "Review WhatsApp automation messages",
    date: getTodayDateStr(),
    time: "12:00",
    status: "pending",
    priority: "high",
  },
  {
    id: "rem-2",
    text: "Drink water and stretch (desk posture break)",
    date: getTodayDateStr(),
    time: "15:00",
    status: "pending",
    priority: "medium",
  },
  {
    id: "rem-3",
    text: "Backup Bharat Vani code from e:\\New folder\\",
    date: getTomorrowDateStr(),
    time: "18:00",
    status: "pending",
    priority: "low",
  },
];
