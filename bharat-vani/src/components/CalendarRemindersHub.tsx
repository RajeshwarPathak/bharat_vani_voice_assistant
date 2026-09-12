import React, { useState } from "react";
import { CalendarEvent, ReminderItem } from "../types";
import {
  Calendar,
  Clock,
  Bell,
  CheckCircle2,
  Circle,
  Plus,
  Download,
  ExternalLink,
  CalendarPlus,
  Trash2,
  AlertCircle,
  ChevronRight,
  Sparkles,
  Volume2,
} from "lucide-react";
import {
  downloadIcsFile,
  getGoogleCalendarUrl,
} from "../utils/calendarExporter";
import { getTodayDateStr, getTomorrowDateStr } from "../data/defaultCalendar";

interface CalendarRemindersHubProps {
  events: CalendarEvent[];
  reminders: ReminderItem[];
  onAddEvent: (event: CalendarEvent) => void;
  onDeleteEvent: (id: string) => void;
  onAddReminder: (reminder: ReminderItem) => void;
  onToggleReminder: (id: string) => void;
  onDeleteReminder: (id: string) => void;
  onSpeakOutReminder: (reminder: ReminderItem) => void;
  languageMode: "en-IN" | "hi-IN" | "mix";
}

export const CalendarRemindersHub: React.FC<CalendarRemindersHubProps> = ({
  events,
  reminders,
  onAddEvent,
  onDeleteEvent,
  onAddReminder,
  onToggleReminder,
  onDeleteReminder,
  onSpeakOutReminder,
  languageMode,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"schedule" | "reminders">("schedule");
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showAddReminderModal, setShowAddReminderModal] = useState(false);

  // New Event State
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState(getTodayDateStr());
  const [newTime, setNewTime] = useState("14:00");
  const [newDuration, setNewDuration] = useState(30);
  const [newCategory, setNewCategory] = useState<CalendarEvent["category"]>("work");
  const [newNotes, setNewNotes] = useState("");

  // New Reminder State
  const [newRemText, setNewRemText] = useState("");
  const [newRemDate, setNewRemDate] = useState(getTodayDateStr());
  const [newRemTime, setNewRemTime] = useState("16:00");
  const [newRemPriority, setNewRemPriority] = useState<ReminderItem["priority"]>("medium");

  const todayStr = getTodayDateStr();
  const todayEvents = events.filter((e) => e.date === todayStr);
  const upcomingEvents = events.filter((e) => e.date !== todayStr);

  const pendingReminders = reminders.filter((r) => r.status === "pending");
  const completedReminders = reminders.filter((r) => r.status === "completed");

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newEvt: CalendarEvent = {
      id: `evt-${Date.now()}`,
      title: newTitle.trim(),
      date: newDate,
      time: newTime,
      durationMinutes: newDuration,
      category: newCategory,
      notes: newNotes.trim() || undefined,
    };

    onAddEvent(newEvt);
    setNewTitle("");
    setNewNotes("");
    setShowAddEventModal(false);
  };

  const handleCreateReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRemText.trim()) return;

    const newRem: ReminderItem = {
      id: `rem-${Date.now()}`,
      text: newRemText.trim(),
      date: newRemDate,
      time: newRemTime,
      status: "pending",
      priority: newRemPriority,
    };

    onAddReminder(newRem);
    setNewRemText("");
    setShowAddReminderModal(false);
  };

  const handleLaunchWindowsClock = () => {
    window.location.href = "ms-clock:";
  };

  return (
    <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800/90 p-5 space-y-6 shadow-2xl">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <Calendar className="w-5 h-5 text-sky-400" />
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-100 font-mono">
              Windows Calendar & Voice Reminders
            </h2>
            <p className="text-xs text-slate-400 font-sans">
              Schedule meetings, set voice alarms in Hindi & English, and export to Windows Calendar (.ICS).
            </p>
          </div>
        </div>

        {/* Windows Calendar Integration Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => downloadIcsFile(events)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-mono font-semibold transition-colors cursor-pointer"
            title="Download .ICS file to open in Windows Calendar or Outlook"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>Export to Windows Calendar (.ICS)</span>
          </button>

          <button
            onClick={handleLaunchWindowsClock}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-mono font-semibold transition-colors cursor-pointer"
            title="Open Windows Alarms & Clock (ms-clock:)"
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Windows Clock</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Sub-Tab Navigation & Add Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveSubTab("schedule")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === "schedule"
                ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Calendar Schedule ({events.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab("reminders")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === "reminders"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Voice Reminders ({pendingReminders.length} Active)</span>
          </button>
        </div>

        {activeSubTab === "schedule" ? (
          <button
            onClick={() => setShowAddEventModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Event</span>
          </button>
        ) : (
          <button
            onClick={() => setShowAddReminderModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Set Reminder</span>
          </button>
        )}
      </div>

      {/* View 1: Calendar Schedule */}
      {activeSubTab === "schedule" && (
        <div className="space-y-4">
          {/* Today's Agenda */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-slate-300 uppercase flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Today's Agenda ({todayEvents.length} Events)</span>
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                {new Date().toLocaleDateString("en-IN", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>

            {todayEvents.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-950/40 border border-dashed border-slate-800 text-center text-xs text-slate-400 font-mono">
                No events scheduled for today. Say <strong className="text-amber-300">"Hey Vani, schedule team meeting at 3 PM"</strong> to add one!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {todayEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/90 hover:border-sky-500/40 space-y-2 transition-all group"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-100 group-hover:text-sky-300 transition-colors">
                          {evt.title}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 mt-1">
                          <span className="text-sky-400 font-semibold">{evt.time}</span>
                          <span>•</span>
                          <span>{evt.durationMinutes} mins</span>
                          <span>•</span>
                          <span className="capitalize text-slate-500">{evt.category}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <a
                          href={getGoogleCalendarUrl(evt)}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 rounded text-slate-500 hover:text-sky-400"
                          title="Add to Google Calendar"
                        >
                          <CalendarPlus className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => onDeleteEvent(evt.id)}
                          className="p-1 rounded text-slate-500 hover:text-red-400"
                          title="Delete Event"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {evt.notes && (
                      <p className="text-[11px] text-slate-400 bg-slate-950/50 p-2 rounded-lg border border-slate-800/50">
                        {evt.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Events */}
          {upcomingEvents.length > 0 && (
            <div className="pt-3 border-t border-slate-800">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase mb-2 block">
                Upcoming Days ({upcomingEvents.length} Events)
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {upcomingEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-xs font-semibold text-slate-200">
                        {evt.title}
                      </h4>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                        <span className="text-amber-400">{evt.date}</span> at {evt.time} ({evt.durationMinutes}m)
                      </div>
                    </div>

                    <button
                      onClick={() => onDeleteEvent(evt.id)}
                      className="p-1 text-slate-500 hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* View 2: Voice Reminders */}
      {activeSubTab === "reminders" && (
        <div className="space-y-4">
          {/* Active Pending Reminders */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 animate-bounce" />
                <span>Active Voice Reminders ({pendingReminders.length})</span>
              </span>
            </div>

            {pendingReminders.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-950/40 border border-dashed border-slate-800 text-center text-xs text-slate-400 font-mono">
                No active reminders. Speak: <strong className="text-amber-300">"Mujhe 5 baje Rahul ko call karne ki yaad dilana"</strong>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingReminders.map((rem) => (
                  <div
                    key={rem.id}
                    className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/90 hover:border-amber-500/40 flex items-center justify-between gap-3 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => onToggleReminder(rem.id)}
                        className="text-slate-500 hover:text-emerald-400 transition-colors cursor-pointer"
                        title="Mark as Completed"
                      >
                        <Circle className="w-4 h-4" />
                      </button>

                      <div>
                        <div className="text-xs font-medium text-slate-100">
                          {rem.text}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 mt-0.5">
                          <span className="text-amber-400 font-semibold">{rem.time}</span>
                          <span>•</span>
                          <span>{rem.date}</span>
                          <span>•</span>
                          <span
                            className={`uppercase text-[9px] px-1.5 py-0.2 rounded font-mono ${
                              rem.priority === "high"
                                ? "bg-red-950 text-red-300 border border-red-800"
                                : rem.priority === "medium"
                                ? "bg-amber-950 text-amber-300 border border-amber-800"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {rem.priority} priority
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onSpeakOutReminder(rem)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300"
                        title="Vani Speak Reminder Out Loud"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteReminder(rem.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Completed Reminders */}
          {completedReminders.length > 0 && (
            <div className="pt-3 border-t border-slate-800">
              <span className="text-xs font-mono font-bold text-slate-500 uppercase mb-2 block">
                Completed Reminders ({completedReminders.length})
              </span>
              <div className="space-y-1.5">
                {completedReminders.map((rem) => (
                  <div
                    key={rem.id}
                    className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/60 flex items-center justify-between text-xs text-slate-500"
                  >
                    <div className="flex items-center gap-2 line-through">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{rem.text}</span>
                    </div>
                    <button
                      onClick={() => onDeleteReminder(rem.id)}
                      className="text-slate-600 hover:text-red-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Event Modal */}
      {showAddEventModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateEvent}
            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-mono text-sm font-bold text-slate-100 flex items-center gap-2">
                <CalendarPlus className="w-4 h-4 text-sky-400" />
                <span>Schedule New Event</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddEventModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">
                Event Title
              </label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Sync with Team / Dentist"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  Time
                </label>
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  Duration (mins)
                </label>
                <input
                  type="number"
                  min="5"
                  step="5"
                  value={newDuration}
                  onChange={(e) => setNewDuration(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none"
                >
                  <option value="work">Work</option>
                  <option value="meeting">Meeting</option>
                  <option value="personal">Personal</option>
                  <option value="health">Health</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">
                Notes (Optional)
              </label>
              <textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Details or agenda..."
                rows={2}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none"
              ></textarea>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddEventModal(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs"
              >
                Save Event
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Reminder Modal */}
      {showAddReminderModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateReminder}
            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-mono text-sm font-bold text-slate-100 flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-400" />
                <span>Set Voice Reminder</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddReminderModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">
                Reminder Text
              </label>
              <input
                type="text"
                required
                value={newRemText}
                onChange={(e) => setNewRemText(e.target.value)}
                placeholder="e.g. Call Rahul on WhatsApp / Take medicine"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={newRemDate}
                  onChange={(e) => setNewRemDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  Time
                </label>
                <input
                  type="time"
                  value={newRemTime}
                  onChange={(e) => setNewRemTime(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">
                Priority
              </label>
              <select
                value={newRemPriority}
                onChange={(e) => setNewRemPriority(e.target.value as any)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High (Urgent Alarm)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddReminderModal(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
              >
                Set Reminder
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
