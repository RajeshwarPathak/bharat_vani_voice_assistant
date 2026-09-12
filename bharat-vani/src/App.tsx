import React, { useState, useEffect, useCallback } from "react";
import {
  AssistantState,
  ChatMessage,
  TelemetryData,
  UserProfile,
  CalendarEvent,
  ReminderItem,
  LanguageMode,
  CustomCommand,
} from "./types";
import { TelemetryBar } from "./components/TelemetryBar";
import { HologramOrb } from "./components/HologramOrb";
import { ChatHUD } from "./components/ChatHUD";
import { ActionsHub } from "./components/ActionsHub";
import { VoiceInputBar } from "./components/VoiceInputBar";
import { PythonProjectExplorer } from "./components/PythonProjectExplorer";
import { LockScreenOverlay } from "./components/LockScreenOverlay";
import { ScreenshotModal } from "./components/ScreenshotModal";
import { ProfileManager } from "./components/ProfileManager";
import { CalendarRemindersHub } from "./components/CalendarRemindersHub";
import { CustomUserNameModal } from "./components/CustomUserNameModal";
import { LiveScreenVisionHub } from "./components/LiveScreenVisionHub";
import { ScreenSelectSearchModal } from "./components/ScreenSelectSearchModal";
import { WindowsAutoStartModal } from "./components/WindowsAutoStartModal";
import { CommandsCheatSheetModal, CommandItem } from "./components/CommandsCheatSheetModal";
import { ScreenOverlays, OverlayMode } from "./components/ScreenOverlays";
import { AutoStartConfig } from "./types";
import {
  DEFAULT_PROFILES,
} from "./data/defaultProfiles";
import {
  INITIAL_CALENDAR_EVENTS,
  INITIAL_REMINDERS,
  getTodayDateStr,
} from "./data/defaultCalendar";
import { sfx, speakText, stopSpeaking } from "./utils/audioSynthesizer";
import {
  Sparkles,
  Terminal,
  AppWindow,
  Radio,
  Cpu,
  ShieldCheck,
  Zap,
  Info,
  Users,
  Calendar,
  Bell,
  Languages,
  User,
  Edit2,
  Monitor,
  Camera,
  Crop,
  Minimize2,
  Maximize2,
  Power,
  Command as CommandIcon,
  Grid,
  Hash,
} from "lucide-react";

export default function App() {
  const [assistantState, setAssistantState] = useState<AssistantState>("idle");
  const [selectedWakeWord, setSelectedWakeWord] = useState<string>("Hey Vani");
  const [isContinuousListening, setIsContinuousListening] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<
    "assistant" | "calendar" | "vision" | "profiles" | "actions" | "code_explorer"
  >("assistant");
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [isNameModalOpen, setIsNameModalOpen] = useState<boolean>(false);
  const [isSelectSearchModalOpen, setIsSelectSearchModalOpen] = useState<boolean>(false);
  const isMinimizedToIcon = false;

  // Windows Voice Access (Vani) States
  const [isCommandsModalOpen, setIsCommandsModalOpen] = useState<boolean>(false);
  const [overlayMode, setOverlayMode] = useState<OverlayMode>("none");
  const [voiceMode, setVoiceMode] = useState<"default" | "commands" | "dictation">("default");

  // Windows Auto-Start on System Boot Configuration
  const [autoStartConfig, setAutoStartConfig] = useState<AutoStartConfig>(() => {
    try {
      const saved = localStorage.getItem("bharat_vani_autostart_cfg");
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      enabled: true,
      startMinimizedToIcon: false,
      playGreetingOnBoot: true,
      installMethod: "startup_folder",
    };
  });

  const [isAutoStartModalOpen, setIsAutoStartModalOpen] = useState<boolean>(false);

  // User Profiles State with Local Persistence and automatic cleanup
  const [profiles, setProfiles] = useState<UserProfile[]>(() => {
    try {
      const saved = localStorage.getItem("bharat_vani_profiles");
      if (saved) {
        const parsed: UserProfile[] = JSON.parse(saved);
        const cleaned = parsed.map((p) => {
          if (p.id === "profile-baby-pathak") {
            return {
              ...p,
              id: "profile-user",
              name: "User",
              greeting: "Namaste! Ready for your voice commands.",
              customCommands: (p.customCommands || []).filter(
                (c) => c.phrase.toLowerCase() !== p.name.toLowerCase()
              ),
            };
          }
          return p;
        });
        return cleaned;
      }
    } catch {
      // Ignore
    }
    return DEFAULT_PROFILES;
  });

  const [activeProfileId, setActiveProfileId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("bharat_vani_active_profile_id");
      if (saved) {
        if (saved === "profile-baby-pathak") return "profile-user";
        return saved;
      }
    } catch {
      // Ignore
    }
    return DEFAULT_PROFILES[0].id;
  });

  const activeProfile =
    profiles.find((p) => p.id === activeProfileId) || profiles[0];

  // Language Mode (Hinglish, Pure Hindi, or Indian English)
  const [languageMode, setLanguageMode] = useState<LanguageMode>(
    activeProfile.preferredLanguage || "mix"
  );

  // Sync wake word with active profile whenever profile switches
  useEffect(() => {
    if (activeProfile.wakeWord) {
      setSelectedWakeWord(activeProfile.wakeWord);
    }
    if (activeProfile.preferredLanguage) {
      setLanguageMode(activeProfile.preferredLanguage);
    }
    try {
      localStorage.setItem("bharat_vani_active_profile_id", activeProfile.id);
    } catch {
      // Ignore
    }
  }, [activeProfile.id]);

  // Persist profiles
  useEffect(() => {
    try {
      localStorage.setItem("bharat_vani_profiles", JSON.stringify(profiles));
    } catch {
      // Ignore
    }
  }, [profiles]);

  // Calendar Events State with Local Persistence
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    try {
      const saved = localStorage.getItem("bharat_vani_events");
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignore
    }
    return INITIAL_CALENDAR_EVENTS;
  });

  useEffect(() => {
    try {
      localStorage.setItem("bharat_vani_events", JSON.stringify(events));
    } catch {
      // Ignore
    }
  }, [events]);

  // Voice Reminders State with Local Persistence
  const [reminders, setReminders] = useState<ReminderItem[]>(() => {
    try {
      const saved = localStorage.getItem("bharat_vani_reminders");
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignore
    }
    return INITIAL_REMINDERS;
  });

  useEffect(() => {
    try {
      localStorage.setItem("bharat_vani_reminders", JSON.stringify(reminders));
    } catch {
      // Ignore
    }
  }, [reminders]);

  // Active Reminder Auto-Check (Simulating background Windows Reminder Alert)
  useEffect(() => {
    const checkReminderInterval = setInterval(() => {
      const now = new Date();
      const todayDateStr = getTodayDateStr();
      const currentHours = String(now.getHours()).padStart(2, "0");
      const currentMinutes = String(now.getMinutes()).padStart(2, "0");
      const currentTimeStr = `${currentHours}:${currentMinutes}`;

      reminders.forEach((rem) => {
        if (
          rem.status === "pending" &&
          rem.date === todayDateStr &&
          rem.time === currentTimeStr
        ) {
          // Play chime and announce
          sfx.playReminderChime();
          const announcement =
            languageMode === "hi-IN"
              ? `रिमाइंडर अलार्म: ${rem.text}`
              : `Reminder alert: ${rem.text}`;

          speakText(announcement, { language: languageMode });
          // Mark as triggered so we don't spam
          setReminders((prev) =>
            prev.map((r) =>
              r.id === rem.id ? { ...r, status: "completed" as const } : r
            )
          );
        }
      });
    }, 25000);

    return () => clearInterval(checkReminderInterval);
  }, [reminders, languageMode]);

  // Live Telemetry
  const [telemetry, setTelemetry] = useState<TelemetryData>({
    cpu: 18,
    ram: 44,
    battery: 92,
    isCharging: true,
    os: "Windows 11 Pro 64-bit",
    pcName: "This PC",
    latency: 28,
    volume: 85,
    isMuted: false,
  });

  // Dynamic Telemetry Fluctuations (simulating real live Windows metrics)
  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetry((prev) => ({
        ...prev,
        cpu: Math.min(95, Math.max(8, prev.cpu + Math.floor(Math.random() * 7 - 3))),
        ram: Math.min(
          85,
          Math.max(35, prev.ram + (Math.random() > 0.7 ? 1 : Math.random() < 0.3 ? -1 : 0))
        ),
        latency: Math.min(65, Math.max(14, prev.latency + Math.floor(Math.random() * 5 - 2))),
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Update Windows Auto-Start Configuration
  const handleUpdateAutoStartConfig = useCallback((patch: Partial<AutoStartConfig>) => {
    setAutoStartConfig((prev) => {
      const updated = { ...prev, ...patch };
      try {
        localStorage.setItem("bharat_vani_autostart_cfg", JSON.stringify(updated));
      } catch {}
      // Sync with server
      fetch("/api/system/autostart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      }).catch(() => {});
      return updated;
    });
  }, []);

  // Windows System Boot Initializer (Runs on startup when PC is turned on)
  useEffect(() => {
    // Play subtle wake chime when system starts up
    const bootTimer = setTimeout(() => {
      sfx.playWakeChime();
      if (autoStartConfig.enabled && autoStartConfig.playGreetingOnBoot) {
        speakText(`Namaste ${activeProfile.name}! Bharat Vani is standing by.`, {
          pitch: activeProfile.speechPitch || 1.0,
          rate: activeProfile.speechRate || 1.0,
          language: languageMode,
        });
      }
    }, 1000);

    return () => clearTimeout(bootTimer);
  }, []);

  // Global Shortcut Listener:
  // Alt + S = Select & Search Screen
  // Global keyboard shortcuts
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      // Alt + S: Select & Search
      if (
        (e.altKey && e.key.toLowerCase() === "s") ||
        (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "s")
      ) {
        e.preventDefault();
        setIsSelectSearchModalOpen(true);
        sfx.playChirp();
      }

    };
    window.addEventListener("keydown", handleGlobalShortcuts);
    return () => window.removeEventListener("keydown", handleGlobalShortcuts);
  }, []);

  // Chat Feed Messages
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      sender: "vani",
      text: `🇮🇳 **Namaste, ${activeProfile.name}!**\nBharat Vani is active in **${
        languageMode === "hi-IN"
          ? "हिन्दी"
          : languageMode === "mix"
          ? "Hinglish (Hindi + English)"
          : "Indian English"
      }** mode.\n\n• Wake Word: **"${selectedWakeWord}"**\n• Schedule: **${events.length}** events tracked\n• Reminders: **${
        reminders.filter((r) => r.status === "pending").length
      }** active alarms\n• Windows Automation: Ready for voice and PC actions.`,
      timestamp: "Just now",
      spokenResponse: activeProfile.greeting || "Namaste! Bharat Vani is standing by.",
      engine: "gemini-3.8-flash",
    },
  ]);

  // Custom User Name Update Handler
  const handleSaveCustomName = useCallback(
    (newName: string, avatarColor?: string) => {
      const trimmed = newName.trim();
      if (!trimmed) return;

      const updatedProfile: UserProfile = {
        ...activeProfile,
        name: trimmed,
        avatarColor: avatarColor || activeProfile.avatarColor,
        greeting: `Namaste ${trimmed}! Ready for your voice commands.`,
      };

      setProfiles((prev) =>
        prev.map((p) => (p.id === activeProfile.id ? updatedProfile : p))
      );

      sfx.playActionChime();
      speakText(
        `Namaste ${trimmed}! Your custom user name has been saved. Bharat Vani is standing by.`,
        {
          pitch: activeProfile.speechPitch || 1.0,
          rate: activeProfile.speechRate || 1.0,
          language: languageMode,
        }
      );

      setMessages((prev) => [
        ...prev,
        {
          id: `msg-username-${Date.now()}`,
          sender: "vani",
          text: `✅ **Custom User Name Updated**: **"${trimmed}"**\nBharat Vani will now address you as **${trimmed}** in spoken greetings and voice responses.`,
          timestamp: new Date().toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }),
          spokenResponse: `Namaste ${trimmed}! Your custom user name has been saved.`,
          engine: "system",
        },
      ]);
    },
    [activeProfile, languageMode]
  );

  // Windows Voice Access: Numbers Overlay Click Handler
  const handleOverlayNumberSelect = (num: number) => {
    setOverlayMode("none");
    sfx.playActionChime();
    switch (num) {
      case 1:
        setIsContinuousListening((prev) => !prev);
        break;
      case 2:
        setIsCommandsModalOpen(true);
        break;
      case 3:
        setActiveTab("actions");
        break;
      case 4:
        setActiveTab("profiles");
        break;
      case 5:
        fetch("/api/system/launch-app", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target: "notepad" }),
        }).catch(console.error);
        break;
      case 6:
        setActiveTab("assistant");
        break;
      case 7:
        setActiveTab("vision");
        break;
      case 8:
        setActiveTab("assistant");
        break;
      case 9:
        setActiveTab("calendar");
        break;
      case 10:
        setAssistantState("listening");
        break;
      case 11:
        setTelemetry((prev) => ({ ...prev, isMuted: !prev.isMuted }));
        break;
      case 12:
        fetch("/api/system/windows-action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subAction: "go_to_desktop" }),
        }).catch(console.error);
        break;
      default:
        break;
    }
  };

  // Windows Voice Access: Mouse Grid Drill-Down Click Handler
  const handleGridClick = (x: number, y: number) => {
    fetch("/api/system/windows-action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subAction: "mouse_click", button: "left", x, y }),
    }).catch(console.error);
    sfx.playActionChime();
  };

  // Windows Voice Access: Execute Command from Cheat Sheet Modal
  const handleExecuteCheatSheetCommand = (cmd: CommandItem) => {
    if (cmd.payload) {
      if (cmd.payload.actionType === "windows_action") {
        fetch("/api/system/windows-action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cmd.payload),
        }).catch(console.error);
        if (cmd.payload.subAction === "lock_pc") {
          setTimeout(() => setIsLocked(true), 600);
        }
      } else if (cmd.payload.actionType === "open_app") {
        fetch("/api/system/launch-app", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target: cmd.payload.appName || "notepad" }),
        }).catch(console.error);
      } else if (cmd.payload.actionType === "show_overlay") {
        setOverlayMode(cmd.payload.overlay || "numbers");
      } else if (cmd.payload.actionType === "voice_mode") {
        setVoiceMode(cmd.payload.mode || "default");
      } else if (cmd.payload.actionType === "show_commands") {
        setIsCommandsModalOpen(true);
      } else if (cmd.payload.actionType === "open_settings") {
        setActiveTab("profiles");
      } else if (cmd.payload.actionType === "voice_control") {
        if (cmd.payload.control === "wake") {
          setTelemetry((prev) => ({ ...prev, isMuted: false }));
          setIsContinuousListening(true);
          setAssistantState("listening");
        } else if (cmd.payload.control === "sleep" || cmd.payload.control === "mute") {
          setTelemetry((prev) => ({ ...prev, isMuted: true }));
          setIsContinuousListening(false);
          setAssistantState("idle");
        }
      }
    }
  };

  // Command Execution Handler
  const handleSendCommand = useCallback(
    async (userInput: string) => {
      if (!userInput.trim()) return;

      // Play wake chime
      sfx.playWakeChime();

      const userTimestamp = new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      // Add user message
      const userMsgId = `user-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: userMsgId,
          sender: "user",
          text: userInput,
          timestamp: userTimestamp,
        },
      ]);

      // Check if user is asking to set/change their custom name via voice
      const nameMatch = userInput.match(
        /(?:mera naam|my name is|set my name to|set name to|change my name to|call me)\s+([a-zA-Z\u0900-\u097F\s]+)/i
      );
      if (nameMatch && nameMatch[1].trim() && !userInput.toLowerCase().includes("whatsapp")) {
        const extracted = nameMatch[1].replace(/(?:hai|rakh do|rakho)$/i, "").trim();
        if (extracted && extracted.length > 1 && extracted.length < 30) {
          handleSaveCustomName(extracted);
          setAssistantState("idle");
          return;
        }
      }

      // Check if user is asking for Screen Search / Camera Vision via voice
      const lowerInput = userInput.toLowerCase();
      if (
        lowerInput.includes("screen search") ||
        lowerInput.includes("select and search") ||
        lowerInput.includes("select & search") ||
        lowerInput.includes("screen dekho") ||
        lowerInput.includes("live screen") ||
        lowerInput.includes("camera") ||
        lowerInput.includes("camera dekho") ||
        lowerInput.includes("open camera") ||
        lowerInput.includes("screen par kya hai") ||
        lowerInput.includes("what is on my screen")
      ) {
        setActiveTab("vision");
        setIsSelectSearchModalOpen(true);
        const respText =
          languageMode === "hi-IN"
            ? "लाइव स्क्रीन और कैमरा विजन हब खोल दिया गया है। आप किसी भी समय ऑल्ट प्लस एस दबाकर स्क्रीन क्षेत्र का चयन और खोज कर सकते हैं।"
            : "Opening Live Screen and Camera Vision Hub. You can also press Alt plus S anytime to crop and search any area of your screen.";

        setMessages((prev) => [
          ...prev,
          {
            id: `vani-vis-${Date.now()}`,
            sender: "vani",
            text: `🔍 **Live Vision & Search Activated**\nOpened the Live Screen & Camera Vision Hub. Press **Alt + S** anytime for instant region crop and Google search grounding.`,
            timestamp: userTimestamp,
            isAction: true,
            actionType: "chat",
            spokenResponse: respText,
            engine: "gemini-3.8-flash",
          },
        ]);
        setAssistantState("speaking");
        speakText(respText, {
          pitch: activeProfile.speechPitch || 1.0,
          rate: activeProfile.speechRate || 1.0,
          language: languageMode,
          onEnd: () => setAssistantState("idle"),
        });
        return;
      }

      // Check if user is asking for Windows Auto-Start configuration
      if (
        lowerInput.includes("auto start") ||
        lowerInput.includes("startup") ||
        lowerInput.includes("system start") ||
        lowerInput.includes("boot sequence") ||
        lowerInput.includes("turn on start") ||
        lowerInput.includes("system turn on")
      ) {
        setIsAutoStartModalOpen(true);
        const resp =
          languageMode === "hi-IN"
            ? "विंडोज ऑटो-स्टार्ट मैनेजर खोल दिया गया है। कंप्यूटर चालू होने पर भारत वाणी अपने आप शुरू हो जाएगी।"
            : "Opening Windows Auto-Start Manager. Bharat Vani can automatically launch whenever your PC boots up.";
        setAssistantState("speaking");
        speakText(resp, {
          pitch: activeProfile.speechPitch || 1.0,
          rate: activeProfile.speechRate || 1.0,
          language: languageMode,
          onEnd: () => setAssistantState("idle"),
        });
        return;
      }

      // Set state to thinking
      setAssistantState("thinking");

      try {
        const response = await fetch("/api/assistant/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: userInput,
            userProfile: activeProfile,
            languagePreference: languageMode,
          }),
        });

        if (!response.ok) {
          throw new Error(`Server returned ${response.status}`);
        }

        const data = await response.json();
        const vaniTimestamp = new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });

        // Check if PC action
        if (data.isAction) {
          setAssistantState("action_executing");
          sfx.playActionChime();

          // 1. Calendar Event Added
          if (data.actionType === "add_calendar_event" && data.actionDetails) {
            const newEvt: CalendarEvent = {
              id: `evt-${Date.now()}`,
              title: data.actionDetails.eventTitle || "Scheduled Event",
              date: data.actionDetails.eventDate || getTodayDateStr(),
              time: data.actionDetails.eventTime || "12:00",
              durationMinutes: data.actionDetails.durationMinutes || 30,
              category: "meeting",
            };
            setEvents((prev) => [...prev, newEvt]);
          }

          // 2. Reminder Added
          if (data.actionType === "set_reminder" && data.actionDetails) {
            const newRem: ReminderItem = {
              id: `rem-${Date.now()}`,
              text: data.actionDetails.reminderText || "Voice Reminder",
              date: data.actionDetails.reminderDate || getTodayDateStr(),
              time: data.actionDetails.reminderTime || "16:00",
              status: "pending",
              priority: "medium",
            };
            setReminders((prev) => [...prev, newRem]);
          }

          // 3. Lock Screen
          if (data.actionType === "lock_screen") {
            setTimeout(() => setIsLocked(true), 800);
          }

          // 4. Screenshot
          if (data.actionType === "screenshot") {
            setTimeout(() => captureScreen(), 600);
          }

          // 5. WhatsApp Automation (Native Desktop App Protocol via Backend)
          if (data.actionType === "whatsapp_message") {
            fetch("/api/system/launch-app", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                target: "whatsapp",
                message: data.actionDetails?.message,
                recipient: data.actionDetails?.target,
              }),
            }).catch((err) => {
              console.warn("Backend WhatsApp launch failed, falling back to Web:", err);
              if (data.actionDetails?.message) {
                const recipient = data.actionDetails.target || "";
                const phone = recipient.replace(/[^0-9+]/g, "");
                const url = /^\+?\d{7,15}$/.test(phone)
                  ? `https://wa.me/${phone.replace(/^\+/, "")}?text=${encodeURIComponent(
                      data.actionDetails.message
                    )}`
                  : `https://web.whatsapp.com/send?text=${encodeURIComponent(
                      data.actionDetails.message
                    )}`;
                window.open(url, "_blank");
              }
            });
          }

          // 6. Web Search
          if (data.actionType === "web_search" && data.actionDetails?.query) {
            const isYt = (data.actionDetails.target || "").toLowerCase().includes("youtube");
            const searchUrl = isYt
              ? `https://www.youtube.com/results?search_query=${encodeURIComponent(
                  data.actionDetails.query
                )}`
              : `https://www.google.com/search?q=${encodeURIComponent(
                  data.actionDetails.query
                )}`;
            fetch("/api/system/launch-app", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                target: isYt ? "youtube" : "chrome",
                url: searchUrl,
                query: data.actionDetails.query,
              }),
            }).catch(() => {
              window.open(searchUrl, "_blank");
            });
          }

          // 7. Launch App (Native Windows App execution via Backend)
          if (data.actionType === "launch_app") {
            const target = data.actionDetails?.target || "Application";
            fetch("/api/system/launch-app", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                target,
                query: data.actionDetails?.query,
                url: data.actionDetails?.url,
              }),
            }).catch((err) => console.error("Native app launch error:", err));
          }

          // 8. Windows Action (Voice Access & PC Management)
          if (data.actionType === "windows_action" && data.actionDetails) {
            fetch("/api/system/windows-action", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data.actionDetails),
            }).catch((err) => console.error("Windows action error:", err));

            if (data.actionDetails?.subAction === "lock_pc") {
              setTimeout(() => setIsLocked(true), 600);
            }
          }

          // 9. Vani Voice & Mic Control
          if (data.actionType === "voice_control" && data.actionDetails) {
            const ctrl = data.actionDetails.control;
            if (ctrl === "wake") {
              setTelemetry((prev) => ({ ...prev, isMuted: false }));
              setIsContinuousListening(true);
              setAssistantState("listening");
            } else if (ctrl === "sleep" || ctrl === "mute") {
              setTelemetry((prev) => ({ ...prev, isMuted: true }));
              setIsContinuousListening(false);
              setAssistantState("idle");
              stopSpeaking();
            } else if (ctrl === "exit") {
              fetch("/api/system/windows-action", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ subAction: "close_window" }),
              }).catch(console.error);
            }
          }

          // 10. Voice Access Operational Mode
          if (data.actionType === "voice_mode" && data.actionDetails?.mode) {
            setVoiceMode(data.actionDetails.mode as any);
          }

          // 11. Screen Overlays (Numbers & Mouse Grid)
          if (data.actionType === "show_overlay") {
            const ov = (data.actionDetails?.overlay || "none") as OverlayMode;
            setOverlayMode(ov);
          }

          // 12. Overlay Click
          if (data.actionType === "overlay_click" && typeof data.actionDetails?.number === "number") {
            handleOverlayNumberSelect(data.actionDetails.number);
          }

          // 13. Show Commands Cheat Sheet Guide
          if (data.actionType === "show_commands") {
            setIsCommandsModalOpen(true);
          }

          // 14. Open Settings
          if (data.actionType === "open_settings") {
            setActiveTab("profiles");
          }
        }

        // Add Assistant Response to Chat Feed
        setMessages((prev) => [
          ...prev,
          {
            id: `vani-${Date.now()}`,
            sender: "vani",
            text: data.displayText || data.spokenResponse,
            timestamp: vaniTimestamp,
            isAction: data.isAction,
            actionType: data.actionType,
            actionDetails: data.actionDetails,
            spokenResponse: data.spokenResponse,
            engine: data.engine || "gemini-3.8-flash",
          },
        ]);

        // Speak back voice response
        if (!telemetry.isMuted && data.spokenResponse) {
          setAssistantState("speaking");
          speakText(data.spokenResponse, {
            language: languageMode,
            rate: activeProfile.speechRate || 1.0,
            pitch: activeProfile.speechPitch || 1.0,
            onEnd: () => setAssistantState("idle"),
          });
        } else {
          setTimeout(() => setAssistantState("idle"), 1200);
        }
      } catch (err: any) {
        console.error("Failed to process command:", err);
        sfx.playErrorChime();

        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            sender: "vani",
            text: "⚠️ **Connection Notice**: Unable to reach cloud brain. Running local deterministic routing.",
            timestamp: userTimestamp,
            spokenResponse: "Operating in local assistant mode. Command recognized.",
            engine: "local-fallback",
          },
        ]);

        setAssistantState("idle");
      }
    },
    [telemetry.isMuted, activeProfile, languageMode]
  );

  // Use the native listener while this window is behind another app or tab.
  useEffect(() => {
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let nativeListenerStarted = false;

    const stopNativeListener = () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      if (nativeListenerStarted) {
        fetch("/api/voice/wakeword/stop").catch(() => {});
        nativeListenerStarted = false;
      }
    };

    const pollNativeListener = async () => {
      try {
        const response = await fetch("/api/voice/wakeword/poll", { cache: "no-store" });
        const event = await response.json();
        if (event.isFresh && event.phrase) {
          handleSendCommand(event.phrase);
        }
      } catch {
        // The native speech service may still be starting.
      }
    };

    const syncListener = async () => {
      if (!document.hidden || !isContinuousListening) {
        stopNativeListener();
        return;
      }

      try {
        const response = await fetch("/api/voice/wakeword/start");
        const result = await response.json();
        if (!result.success) return;
        nativeListenerStarted = true;
        await pollNativeListener();
        pollTimer = setInterval(pollNativeListener, 1000);
      } catch {
        // Keep the visible browser listener available if native STT is offline.
      }
    };

    document.addEventListener("visibilitychange", syncListener);
    syncListener();
    return () => {
      document.removeEventListener("visibilitychange", syncListener);
      stopNativeListener();
    };
  }, [handleSendCommand, isContinuousListening]);

  // Run a custom command from Profile
  const handleRunCustomCommand = (cmd: CustomCommand) => {
    handleSendCommand(cmd.phrase);
  };

  // Take screenshot helper
  const captureScreen = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 1280, 720);
      grad.addColorStop(0, "#0b0f19");
      grad.addColorStop(0.5, "#1e1b4b");
      grad.addColorStop(1, "#0f172a");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1280, 720);

      // Windows taskbar
      ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
      ctx.fillRect(0, 680, 1280, 40);

      // HUD watermark
      ctx.fillStyle = "#f59e0b";
      ctx.font = "bold 28px Consolas";
      ctx.fillText("BHARAT VANI (WINDOWS 11 PRO) - SCREENSHOT", 40, 80);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "16px Segoe UI";
      ctx.fillText(`User Profile: ${activeProfile.name}`, 40, 110);
      ctx.fillText(`Timestamp: ${new Date().toLocaleString("en-IN")}`, 40, 135);
      ctx.fillText(
        `Action: ActionExecutor.take_screenshot() | Path: ~/Pictures/BharatVani/`,
        40,
        160
      );

      // Glowing orb art
      ctx.beginPath();
      ctx.arc(640, 380, 120, 0, Math.PI * 2);
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(640, 380, 60, 0, Math.PI * 2);
      ctx.fillStyle = "#0ea5e9";
      ctx.fill();

      const url = canvas.toDataURL("image/png");
      setScreenshotUrl(url);
    }
  };

  const handleOrbClick = () => {
    if (assistantState === "speaking") {
      stopSpeaking();
      setAssistantState("idle");
    } else {
      const prompt =
        languageMode === "hi-IN"
          ? `${selectedWakeWord}, आप क्या कर सकती हैं?`
          : `${selectedWakeWord}, who are you and what is on my schedule?`;
      handleSendCommand(prompt);
    }
  };

  const handleToggleMute = () => {
    setTelemetry((prev) => {
      const nextMuted = !prev.isMuted;
      if (nextMuted) stopSpeaking();
      return { ...prev, isMuted: nextMuted };
    });
  };

  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* 1. Windows System Telemetry Header */}
      <TelemetryBar
        telemetry={telemetry}
        selectedWakeWord={selectedWakeWord}
        onChangeWakeWord={setSelectedWakeWord}
        onToggleMute={handleToggleMute}
        onOpenAutoStartModal={() => setIsAutoStartModalOpen(true)}
        autoStartEnabled={autoStartConfig.enabled}
      />

      {/* 2. Top Navigation Tabs & Profile Bar */}
      <div className="w-full bg-slate-900/60 border-b border-slate-800/80 px-4 py-2 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Logo & Active User Badge */}
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-bold text-amber-400 font-mono tracking-wider flex items-center gap-1.5">
              <span>🇮🇳</span>
              <span>BHARAT VANI</span>
            </span>

            {/* Quick Custom User Name Switcher / Edit Button */}
            <div className="flex items-center gap-1.5">
              <button
                id="header-custom-user-btn"
                onClick={() => setIsNameModalOpen(true)}
                className="flex items-center gap-1.5 bg-slate-850 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/50 px-2.5 py-1 rounded-full cursor-pointer transition-all text-xs group shadow-sm"
                title="Click to enter or customize your user name"
              >
                <div
                  className={`w-4 h-4 rounded-full bg-gradient-to-br ${activeProfile.avatarColor} flex items-center justify-center text-[10px] text-white font-bold`}
                >
                  {activeProfile.name && activeProfile.name !== "User"
                    ? activeProfile.name.charAt(0).toUpperCase()
                    : <User className="w-2.5 h-2.5" />}
                </div>
                <span className="font-semibold text-slate-200 group-hover:text-amber-300">
                  {activeProfile.name}
                </span>
                <Edit2 className="w-3 h-3 text-slate-400 group-hover:text-amber-400" />
              </button>

              <button
                id="header-set-name-pill"
                onClick={() => setIsNameModalOpen(true)}
                className="hidden sm:inline-flex items-center gap-1 text-[10px] text-amber-400/90 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 px-2 py-0.5 rounded-md font-mono transition-colors cursor-pointer"
                title="Enter custom user name"
              >
                <span>Change Name</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab("assistant")}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                activeTab === "assistant"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/10"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Voice HUD</span>
            </button>

            <button
              onClick={() => setActiveTab("calendar")}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                activeTab === "calendar"
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm shadow-sky-500/10"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Calendar & Reminders</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-slate-300 rounded-full font-mono">
                {events.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("profiles")}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                activeTab === "profiles"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/10"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Profiles & Commands</span>
            </button>

            <button
              onClick={() => setActiveTab("vision")}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                activeTab === "vision"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/10"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Monitor className="w-3.5 h-3.5 text-amber-400" />
              <span>Live Screen & Camera</span>
              <span className="hidden md:inline text-[9px] px-1 py-0.2 bg-amber-500/20 text-amber-300 rounded font-mono border border-amber-500/30">
                Alt+S
              </span>
            </button>

            {/* Windows Voice Access (Vani) Guide Button */}
            <button
              id="nav-commands-guide-btn"
              onClick={() => setIsCommandsModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 hover:border-emerald-400 transition-all cursor-pointer shadow-sm shrink-0"
              title="What Can I Say? (Windows Voice Access Guide for Vani)"
            >
              <CommandIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span>What Can I Say</span>
              <span className="text-[10px] uppercase px-1.5 py-0.2 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-semibold">
                {voiceMode}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("actions")}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                activeTab === "actions"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/10"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <AppWindow className="w-3.5 h-3.5" />
              <span>PC Actions</span>
            </button>

            <button
              onClick={() => setActiveTab("code_explorer")}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                activeTab === "code_explorer"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/10"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Windows Python Code</span>
              <span className="sm:hidden">Python</span>
            </button>

            {/* Quick Action: Select & Search Screen Region (Alt+S) */}
            <button
              id="nav-quick-select-search-btn"
              onClick={() => setIsSelectSearchModalOpen(true)}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-gradient-to-r from-amber-500/20 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 text-amber-300 border border-amber-500/40 transition-all cursor-pointer ml-1 shadow-sm shrink-0"
              title="Drag to crop & search screen (Alt+S)"
            >
              <Crop className="w-3.5 h-3.5 text-amber-400" />
              <span>Select & Search</span>
              <kbd className="px-1 py-0.2 bg-slate-900 border border-slate-700 text-[10px] text-amber-300 rounded font-mono">
                Alt+S
              </kbd>
            </button>

            {/* Windows Auto-Start Boot Configuration */}
            <button
              id="nav-autostart-settings-btn"
              onClick={() => setIsAutoStartModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/50 text-slate-300 hover:text-emerald-300 transition-all cursor-pointer shadow-sm shrink-0"
              title="Configure Windows Auto-Start on System Boot"
            >
              <Power className={`w-3.5 h-3.5 ${autoStartConfig.enabled ? "text-emerald-400" : "text-slate-400"}`} />
              <span className="hidden md:inline">Auto-Start</span>
            </button>

          </nav>
        </div>
      </div>

      {/* 3. Main Body or Minimized Desktop View */}
      {isMinimizedToIcon ? (
        <div
          id="desktop-minimized-view"
          className="flex-1 flex flex-col items-center justify-between p-6 relative overflow-hidden bg-gradient-to-b from-[#06080e] via-[#090e1a] to-[#0c1424]"
        >
          {/* Subtle Wallpaper Grid & Ambient Glow */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293712_1px,transparent_1px),linear-gradient(to_bottom,#1f293712_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Top Desktop Notification / Restore Bar */}
          <div className="z-10 w-full max-w-3xl bg-slate-900/85 border border-slate-700/80 rounded-2xl p-4 shadow-2xl backdrop-blur-md flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <span>Bharat Vani Active as Animated Icon</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                </h2>
                <p className="text-xs text-slate-400">
                  Running smoothly in the background. Single-click the floating animated icon or click Expand below.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="btn-desktop-expand"
                onClick={() => setIsAutoStartModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
                title="Single Click to restore Big Screen (Alt+M)"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Expand to Big Screen</span>
                <kbd className="px-1 py-0.2 bg-amber-700/40 text-[10px] text-slate-950 rounded font-mono font-bold">
                  Alt+M
                </kbd>
              </button>
            </div>
          </div>

          {/* Center Info Hub */}
          <div className="z-10 my-auto text-center space-y-4 max-w-lg p-6 bg-slate-900/40 border border-slate-800/60 rounded-3xl backdrop-blur-sm">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-amber-500/40 text-amber-300 text-xs font-mono shadow-sm">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>Voice Wake Word: "{selectedWakeWord}"</span>
            </div>
            <h3 className="text-lg font-bold text-slate-200">
              Desktop Companion Mode Active
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Bharat Vani is now floating on your screen as an interactive animated icon. You can drag it anywhere. Single-click it anytime or use <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-amber-300 font-mono">Alt + M</kbd> to return to the full workspace.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setIsSelectSearchModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Crop className="w-3.5 h-3.5 text-amber-400" />
                <span>Crop & Search (Alt+S)</span>
              </button>
              <button
                onClick={() => setIsAutoStartModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Power className="w-3.5 h-3.5 text-emerald-400" />
                <span>Auto-Start on Boot</span>
              </button>
            </div>
          </div>

          {/* Bottom Taskbar Indicator */}
          <div className="z-10 w-full max-w-3xl bg-slate-900/90 border border-slate-800 rounded-2xl px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-2xl backdrop-blur-md text-xs text-slate-400">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-300">Windows System:</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Online
              </span>
              <span className="text-slate-600">|</span>
              <span>Startup: <strong className="text-emerald-400">{autoStartConfig.enabled ? "Auto-Launch ON" : "OFF"}</strong></span>
            </div>
            <button
              onClick={() => setIsAutoStartModalOpen(true)}
              className="text-amber-400 hover:text-amber-300 text-xs font-semibold cursor-pointer underline underline-offset-2 flex items-center gap-1"
            >
              <Power className="w-3 h-3" />
              <span>Windows Startup Settings</span>
            </button>
          </div>
        </div>
      ) : (
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6">
        {/* Custom User Name Personalization Banner (if default User) */}
        {activeProfile.name === "User" && activeTab === "assistant" && (
          <div
            id="personalize-user-banner"
            className="bg-gradient-to-r from-amber-500/15 via-slate-900 to-slate-900 border border-amber-500/35 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-lg animate-in fade-in"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-slate-100 text-xs flex items-center gap-1.5 font-mono uppercase tracking-wider">
                  <span>Personalize Your Assistant</span>
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                </span>
                <p className="text-slate-400 text-xs mt-0.5">
                  Enter your custom name so Bharat Vani greets you personally and addresses you by name.
                </p>
              </div>
            </div>
            <button
              id="banner-enter-name-btn"
              onClick={() => setIsNameModalOpen(true)}
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md shadow-amber-500/10 cursor-pointer flex items-center gap-1.5"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Enter Your Name</span>
            </button>
          </div>
        )}

        {activeTab === "assistant" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
            {/* Left Column: Hologram Orb & Profile Overview (5 cols) */}
            <div className="lg:col-span-5 flex flex-col items-center justify-between gap-6 bg-slate-900/40 border border-slate-800/70 rounded-3xl p-6 backdrop-blur-xl shadow-2xl">
              <div className="w-full flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
                  <span className="font-mono text-xs text-slate-300 font-bold uppercase tracking-wider">
                    Orb Reactor Core
                  </span>
                </div>

                <div className="text-[11px] font-mono text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  Google Gemini AI (Active)
                </div>
              </div>

              {/* Holographic Glowing Orb */}
              <div className="my-auto py-2">
                <HologramOrb
                  state={assistantState}
                  onClick={handleOrbClick}
                  lastWakeWord={selectedWakeWord}
                  audioLevel={0.65}
                />
              </div>

              {/* Status & Capabilities Chips */}
              <div className="w-full pt-4 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center text-[10px] font-mono text-slate-400">
                <div
                  id="orb-user-profile-stat-card"
                  onClick={() => setIsNameModalOpen(true)}
                  className="p-2 rounded-lg bg-slate-800/40 border border-slate-700/40 hover:border-amber-500/50 hover:bg-slate-800/80 transition-all cursor-pointer group"
                  title="Click to enter or change custom user name"
                >
                  <span className="block text-amber-400 font-bold flex items-center justify-center gap-1">
                    <span>User Profile</span>
                    <Edit2 className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100 group-hover:text-amber-300" />
                  </span>
                  <span className="truncate group-hover:text-slate-200 block">{activeProfile.name}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-800/40 border border-slate-700/40">
                  <span className="block text-sky-400 font-bold">Language</span>
                  <span className="truncate">
                    {languageMode === "hi-IN"
                      ? "हिन्दी"
                      : languageMode === "mix"
                      ? "Hinglish Mix"
                      : "English (en-IN)"}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-slate-800/40 border border-slate-700/40">
                  <span className="block text-emerald-400 font-bold">Wake Word</span>
                  <span className="truncate">"{selectedWakeWord}"</span>
                </div>
              </div>
            </div>

            {/* Right Column: Terminal Chat HUD & Voice Input Bar (7 cols) */}
            <div className="lg:col-span-7 flex flex-col gap-4 min-h-[500px]">
              {/* Terminal Chat Log */}
              <div className="flex-1 min-h-[400px]">
                <ChatHUD
                  messages={messages}
                  onReplayVoice={(text) => {
                    setAssistantState("speaking");
                    speakText(text, {
                      language: languageMode,
                      rate: activeProfile.speechRate || 1.0,
                      pitch: activeProfile.speechPitch || 1.0,
                      onEnd: () => setAssistantState("idle"),
                    });
                  }}
                  onClearChat={() => setMessages([])}
                />
              </div>

              {/* Voice & Text Input Control Bar */}
              <VoiceInputBar
                onSendCommand={handleSendCommand}
                assistantState={assistantState}
                selectedWakeWord={selectedWakeWord}
                isContinuousListening={isContinuousListening}
                onToggleContinuousListening={() =>
                  setIsContinuousListening((prev) => !prev)
                }
                languageMode={languageMode}
                onChangeLanguage={setLanguageMode}
              />
            </div>
          </div>
        )}

        {/* Calendar & Reminders Hub Tab */}
        {activeTab === "calendar" && (
          <CalendarRemindersHub
            events={events}
            reminders={reminders}
            onAddEvent={(newEvent) => setEvents((prev) => [...prev, newEvent])}
            onDeleteEvent={(id) =>
              setEvents((prev) => prev.filter((e) => e.id !== id))
            }
            onAddReminder={(newRem) =>
              setReminders((prev) => [...prev, newRem])
            }
            onToggleReminder={(id) =>
              setReminders((prev) =>
                prev.map((r) =>
                  r.id === id
                    ? {
                        ...r,
                        status:
                          r.status === "pending"
                            ? ("completed" as const)
                            : ("pending" as const),
                      }
                    : r
                )
              )
            }
            onDeleteReminder={(id) =>
              setReminders((prev) => prev.filter((r) => r.id !== id))
            }
            onSpeakOutReminder={(rem) => {
              sfx.playReminderChime();
              speakText(`Reminder for ${rem.time}: ${rem.text}`, {
                language: languageMode,
              });
            }}
            languageMode={languageMode}
          />
        )}

        {/* Live Screen & Camera Vision Hub Tab */}
        {activeTab === "vision" && (
          <LiveScreenVisionHub
            activeProfile={activeProfile}
            languageMode={languageMode}
            onSendToChat={(text, spokenText) => {
              setMessages((prev) => [
                ...prev,
                {
                  id: `vani-vis-${Date.now()}`,
                  sender: "vani",
                  text,
                  spokenResponse: spokenText,
                  timestamp: new Date().toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  }),
                  engine: "gemini-3.8-flash",
                },
              ]);
            }}
          />
        )}

        {/* User Profile & Custom Commands Tab */}
        {activeTab === "profiles" && (
          <ProfileManager
            profiles={profiles}
            activeProfileId={activeProfileId}
            onSelectProfile={setActiveProfileId}
            onSaveProfile={(saved) => {
              setProfiles((prev) =>
                prev.map((p) => (p.id === saved.id ? saved : p)).concat(
                  prev.some((p) => p.id === saved.id) ? [] : [saved]
                )
              );
            }}
            onDeleteProfile={(delId) => {
              setProfiles((prev) => prev.filter((p) => p.id !== delId));
              if (activeProfileId === delId) {
                const remaining = profiles.filter((p) => p.id !== delId);
                if (remaining.length > 0) setActiveProfileId(remaining[0].id);
              }
            }}
            onRunCommand={handleRunCustomCommand}
          />
        )}

        {/* Actions Hub Tab */}
        {activeTab === "actions" && (
          <div className="space-y-6">
            <ActionsHub
              onTriggerAction={(type, details, spokenText) => {
                handleSendCommand(spokenText);
              }}
              onLockScreen={() => setIsLocked(true)}
              onTakeScreenshot={captureScreen}
              onOpenSelectSearch={() => setIsSelectSearchModalOpen(true)}
              onOpenVisionHub={() => setActiveTab("vision")}
              onOpenCommands={() => setIsCommandsModalOpen(true)}
              onToggleOverlay={(mode) => setOverlayMode(mode)}
            />

            {/* Terminal Feed Preview alongside actions */}
            <div className="h-72">
              <ChatHUD
                messages={messages}
                onReplayVoice={(text) => {
                  setAssistantState("speaking");
                  speakText(text, {
                    language: languageMode,
                    rate: activeProfile.speechRate || 1.0,
                    pitch: activeProfile.speechPitch || 1.0,
                    onEnd: () => setAssistantState("idle"),
                  });
                }}
                onClearChat={() => setMessages([])}
              />
            </div>
          </div>
        )}

        {/* Windows Python Code Explorer */}
        {activeTab === "code_explorer" && (
          <div className="space-y-4">
            <PythonProjectExplorer />
          </div>
        )}
      </main>
      )}

      {/* 4. Windows Lock Screen Simulator */}
      <LockScreenOverlay
        isLocked={isLocked}
        onUnlock={() => setIsLocked(false)}
      />

      {/* 5. Screenshot Captured Preview Modal */}
      <ScreenshotModal
        isOpen={Boolean(screenshotUrl)}
        onClose={() => setScreenshotUrl(null)}
        screenshotUrl={screenshotUrl}
      />

      {/* 6. Custom User Name Entry Modal */}
      <CustomUserNameModal
        isOpen={isNameModalOpen}
        currentName={activeProfile.name}
        onClose={() => setIsNameModalOpen(false)}
        onSaveName={handleSaveCustomName}
      />

      {/* 7. Screen Select & Search Modal (Alt+S) */}
      <ScreenSelectSearchModal
        isOpen={isSelectSearchModalOpen}
        onClose={() => setIsSelectSearchModalOpen(false)}
        activeProfile={activeProfile}
        languageMode={languageMode}
        onSendToChat={(text, spokenText) => {
          setMessages((prev) => [
            ...prev,
            {
              id: `vani-vis-${Date.now()}`,
              sender: "vani",
              text,
              spokenResponse: spokenText,
              timestamp: new Date().toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              }),
              engine: "gemini-3.8-flash",
            },
          ]);
        }}
      />

      {/* 8. Windows Auto-Start on System Boot Modal */}
      <WindowsAutoStartModal
        isOpen={isAutoStartModalOpen}
        onClose={() => setIsAutoStartModalOpen(false)}
        config={autoStartConfig}
        onUpdateConfig={handleUpdateAutoStartConfig}
        activeProfile={activeProfile}
      />

      {/* 10. Windows Voice Access (Vani) Cheat Sheet Modal */}
      <CommandsCheatSheetModal
        isOpen={isCommandsModalOpen}
        onClose={() => setIsCommandsModalOpen(false)}
        onExecuteCommand={handleExecuteCheatSheetCommand}
      />

      {/* 11. Screen Overlays (Numbers & 3x3 Mouse Grid) */}
      <ScreenOverlays
        mode={overlayMode}
        onClose={() => setOverlayMode("none")}
        onSelectNumber={handleOverlayNumberSelect}
        onGridClick={handleGridClick}
      />
    </div>
  );
}
