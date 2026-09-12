import { UserProfile } from "../types";

export const DEFAULT_PROFILES: UserProfile[] = [
  {
    id: "profile-user",
    name: "User",
    avatarColor: "from-amber-500 to-orange-600",
    preferredLanguage: "mix", // Hinglish
    wakeWord: "Hey Vani",
    speechRate: 1.02,
    speechPitch: 1.05,
    defaultBrainMode: "gemini",
    greeting: "Namaste! Ready for your voice commands.",
    city: "Location not set",
    customCommands: [
      {
        id: "cmd-chai-break",
        phrase: "Chai break",
        actionType: "web_search",
        actionDetails: {
          target: "YouTube",
          query: "Indian Lo-Fi Chill Hop beats for relaxation",
        },
        spokenResponse: "Chai time! Playing soothing Indian Lo-Fi tunes for you.",
      },
      {
        id: "cmd-work-start",
        phrase: "Kaam shuru",
        actionType: "launch_app",
        actionDetails: {
          target: "Google Chrome",
        },
        spokenResponse: "Shubh shuruaat! Launching your workspace apps now.",
      },
      {
        id: "cmd-quick-lock",
        phrase: "Lock kar do",
        actionType: "lock_screen",
        actionDetails: {
          target: "Windows Lock",
        },
        spokenResponse: "Locking your Windows PC screen right away.",
      },
    ],
  },
  {
    id: "profile-work",
    name: "Work & Productivity",
    avatarColor: "from-blue-600 to-indigo-700",
    preferredLanguage: "en-IN",
    wakeWord: "Ok Vani",
    speechRate: 1.05,
    speechPitch: 1.0,
    defaultBrainMode: "gemini",
    greeting: "Good day! Windows productivity workstation ready.",
    city: "Location not set",
    customCommands: [
      {
        id: "cmd-daily-standup",
        phrase: "Daily standup",
        actionType: "check_schedule",
        actionDetails: {},
        spokenResponse: "Checking today's scheduled meetings and calendar events for you.",
      },
      {
        id: "cmd-terminal-code",
        phrase: "Code mode",
        actionType: "launch_app",
        actionDetails: {
          target: "Visual Studio Code",
        },
        spokenResponse: "Launching Visual Studio Code for development.",
      },
    ],
  },
  {
    id: "profile-hindi-family",
    name: "पारिवारिक (Hindi Home)",
    avatarColor: "from-emerald-600 to-teal-700",
    preferredLanguage: "hi-IN",
    wakeWord: "नमस्ते वानी",
    speechRate: 0.98,
    speechPitch: 1.05,
    defaultBrainMode: "gemini",
    greeting: "नमस्ते! भारत वानी आपकी सेवा में हाज़िर है।",
    city: "Location not set",
    customCommands: [
      {
        id: "cmd-morning-bhajan",
        phrase: "भजन चलाओ",
        actionType: "web_search",
        actionDetails: {
          target: "YouTube",
          query: "सुबह के मधुर भजन और शांति संगीत",
        },
        spokenResponse: "आपके लिए यूट्यूब पर मधुर प्रातःकालीन भजन शुरू कर रही हूँ।",
      },
      {
        id: "cmd-hindi-screenshot",
        phrase: "फोटो खींचो",
        actionType: "screenshot",
        actionDetails: {
          target: "Screen",
        },
        spokenResponse: "स्क्रीन की फोटो खींच ली गई है।",
      },
    ],
  },
];
