/**
 * Bharat Vani - TypeScript Definitions
 */

export type LanguageMode = "en-IN" | "hi-IN" | "mix";

export type AssistantState =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "action_executing";

export type BrainMode = "gemini";

export type ActionType =
  | "launch_app"
  | "whatsapp_message"
  | "web_search"
  | "system_control"
  | "screenshot"
  | "lock_screen"
  | "add_calendar_event"
  | "check_schedule"
  | "set_reminder"
  | "check_reminders"
  | "switch_profile"
  | "custom_command"
  | "chat";

export interface ActionDetails {
  target?: string;
  message?: string;
  query?: string;
  command?: string;
  eventTitle?: string;
  eventDate?: string;
  eventTime?: string;
  reminderText?: string;
  reminderTime?: string;
  profileName?: string;
}

export interface CustomCommand {
  id: string;
  phrase: string; // e.g. "Chai break", "Kaam shuru"
  actionType: ActionType;
  actionDetails: ActionDetails;
  spokenResponse: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm (24h)
  durationMinutes: number;
  category: "work" | "personal" | "meeting" | "health" | "other";
  location?: string;
  notes?: string;
}

export interface ReminderItem {
  id: string;
  text: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm (24h)
  status: "pending" | "completed" | "snoozed";
  priority: "low" | "medium" | "high";
  spokenTriggered?: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  avatarColor: string;
  preferredLanguage: LanguageMode;
  wakeWord: string;
  speechRate: number;
  speechPitch: number;
  defaultBrainMode: BrainMode;
  greeting: string;
  city: string;
  customCommands: CustomCommand[];
}

export interface AssistantResponse {
  isAction: boolean;
  actionType: ActionType;
  actionDetails?: ActionDetails;
  spokenResponse: string;
  displayText: string;
  engine: string;
  note?: string;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "vani";
  text: string;
  timestamp: string;
  isAction?: boolean;
  actionType?: ActionType;
  actionDetails?: ActionDetails;
  spokenResponse?: string;
  engine?: string;
  status?: "pending" | "executed" | "failed";
}

export interface TelemetryData {
  cpu: number;
  ram: number;
  battery: number;
  isCharging: boolean;
  os: string;
  pcName: string;
  latency: number;
  volume: number;
  isMuted: boolean;
}

export interface PythonModuleFile {
  filename: string;
  path: string;
  description: string;
  code: string;
}

export type VisionSource = "screen" | "camera";
export type VisionMode = "search" | "ocr" | "explain" | "custom";

export interface GroundingSource {
  title: string;
  url: string;
  type?: string;
}

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AutoStartConfig {
  enabled: boolean;
  startMinimizedToIcon: boolean;
  playGreetingOnBoot: boolean;
  launchPath?: string;
  installMethod: "startup_folder" | "registry" | "task_scheduler";
}

export interface VisionAnalysisResult {
  id: string;
  timestamp: string;
  source: VisionSource;
  mode: VisionMode;
  imageUrl: string;
  cropArea?: CropArea;
  displayText: string;
  spokenResponse: string;
  groundingSources: GroundingSource[];
  prompt?: string;
  engine: string;
}
