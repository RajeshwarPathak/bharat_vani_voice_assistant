import React, { useState } from "react";
import {
  MessageCircle,
  AppWindow,
  Search,
  Camera,
  Lock,
  Volume2,
  VolumeX,
  Volume1,
  ExternalLink,
  Play,
  Terminal,
  Calculator,
  Code,
  Globe,
  Music,
  Folder,
  CheckCircle2,
  Crop,
  Monitor,
  Command as CommandIcon,
  Grid,
  Hash,
  Keyboard,
  Power,
  Moon,
  RotateCcw,
  Sparkles,
} from "lucide-react";

interface ActionsHubProps {
  onTriggerAction: (actionType: string, details: any, spokenText: string) => void;
  onLockScreen: () => void;
  onTakeScreenshot: () => void;
  onOpenSelectSearch?: () => void;
  onOpenVisionHub?: () => void;
  onOpenCommands?: () => void;
  onToggleOverlay?: (mode: "numbers" | "grid") => void;
}

export const ActionsHub: React.FC<ActionsHubProps> = ({
  onTriggerAction,
  onLockScreen,
  onTakeScreenshot,
  onOpenSelectSearch,
  onOpenVisionHub,
  onOpenCommands,
  onToggleOverlay,
}) => {
  const [recipient, setRecipient] = useState("");
  const [waMessage, setWaMessage] = useState("Namaste from Bharat Vani!");
  const [searchQuery, setSearchQuery] = useState("latest ISRO space missions");

  const apps = [
    { name: "Google Chrome", icon: Globe, target: "Google Chrome" },
    { name: "VS Code", icon: Code, target: "Visual Studio Code" },
    { name: "Calculator", icon: Calculator, target: "Calculator" },
    { name: "Spotify", icon: Music, target: "Spotify" },
    { name: "Terminal", icon: Terminal, target: "Command Prompt" },
    { name: "File Explorer", icon: Folder, target: "File Explorer" },
  ];

  const handleLaunchApp = (app: (typeof apps)[0]) => {
    // Launch native Windows desktop application via backend
    fetch("/api/system/launch-app", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target: app.target || app.name }),
    }).catch((err) => console.error("Launch app error:", err));

    onTriggerAction(
      "launch_app",
      { target: app.name, command: `start ${app.target || app.name}` },
      `Launching ${app.name} on Windows for you now.`
    );
  };

  const handleSendWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient.trim()) return;

    // Launch WhatsApp Native Desktop protocol or Web fallback
    fetch("/api/system/launch-app", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target: "whatsapp",
        message: waMessage,
        recipient,
      }),
    }).catch(() => {
      const encoded = encodeURIComponent(waMessage);
      window.location.href = `whatsapp://send?text=${encoded}`;
    });

    onTriggerAction(
      "whatsapp_message",
      {
        target: recipient,
        message: waMessage,
        command: `start whatsapp://send?text=${encodeURIComponent(waMessage)}`,
      },
      `Opening WhatsApp to send "${waMessage}" to ${recipient} right away.`
    );
  };

  const handleWebSearch = (engine: "Google" | "YouTube") => {
    if (!searchQuery.trim()) return;
    const encoded = encodeURIComponent(searchQuery);
    const url =
      engine === "YouTube"
        ? `https://www.youtube.com/results?search_query=${encoded}`
        : `https://www.google.com/search?q=${encoded}`;

    fetch("/api/system/launch-app", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target: engine === "YouTube" ? "youtube" : "chrome",
        url,
        query: searchQuery,
      }),
    }).catch(() => {
      window.open(url, "_blank");
    });

    onTriggerAction(
      "web_search",
      { query: searchQuery, target: engine },
      `Searching ${engine} for "${searchQuery}".`
    );
  };

  const handleWindowsAction = (subAction: string, payload: any = {}, spokenText = "") => {
    fetch("/api/system/windows-action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subAction, ...payload }),
    }).catch((err) => console.error("Windows action error:", err));

    onTriggerAction("windows_action", { subAction, ...payload }, spokenText);
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800/80 p-4 space-y-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <AppWindow className="w-4 h-4 text-sky-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
            Windows PC Automation Hub
          </h3>
        </div>
        <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          ActionExecutor Online
        </span>
      </div>

      {/* 1. Quick App Launcher */}
      <div>
        <div className="text-[11px] font-mono text-slate-400 mb-2 flex items-center justify-between">
          <span>APP LAUNCHER (WINDOWS)</span>
          <span className="text-slate-500 text-[10px]">6 Configured</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {apps.map((app) => {
            const Icon = app.icon;
            return (
              <button
                key={app.name}
                onClick={() => handleLaunchApp(app)}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-amber-500/40 text-slate-300 hover:text-white transition-all group cursor-pointer"
              >
                <Icon className="w-5 h-5 text-amber-400/80 group-hover:text-amber-300 mb-1 transition-transform group-hover:scale-110" />
                <span className="text-[11px] font-medium truncate max-w-full">
                  {app.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. WhatsApp Automation Module */}
      <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20">
        <div className="flex items-center gap-2 mb-2 text-emerald-400 font-mono text-xs font-bold">
          <MessageCircle className="w-4 h-4" />
          <span>WHATSAPP AUTOMATION</span>
        </div>
        <form onSubmit={handleSendWhatsApp} className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Contact Name (e.g. Rahul, Friend)"
              className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            <input
              type="text"
              value={waMessage}
              onChange={(e) => setWaMessage(e.target.value)}
              placeholder="Message to send..."
              className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors cursor-pointer"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Automate WhatsApp to "{recipient}"</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </form>
      </div>

      {/* Windows Voice Access (Vani) System Actions */}
      <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-emerald-500/30 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold">
            <CommandIcon className="w-4 h-4 text-emerald-400" />
            <span>WINDOWS VOICE ACCESS (VANI)</span>
          </div>
          {onOpenCommands && (
            <button
              onClick={onOpenCommands}
              className="text-[11px] font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer underline"
            >
              <span>"What can I say" Guide</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {onToggleOverlay && (
            <button
              onClick={() => onToggleOverlay("numbers")}
              className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-emerald-500/30 hover:border-emerald-500/60 text-emerald-300 text-xs font-medium transition-all cursor-pointer"
            >
              <Hash className="w-3.5 h-3.5 text-emerald-400" />
              <span>Show Numbers</span>
            </button>
          )}
          {onToggleOverlay && (
            <button
              onClick={() => onToggleOverlay("grid")}
              className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-emerald-500/30 hover:border-emerald-500/60 text-emerald-300 text-xs font-medium transition-all cursor-pointer"
            >
              <Grid className="w-3.5 h-3.5 text-emerald-400" />
              <span>Mouse Grid (3x3)</span>
            </button>
          )}
          <button
            onClick={() => handleWindowsAction("go_to_desktop", {}, "Showing desktop")}
            className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white text-xs font-medium transition-all cursor-pointer"
          >
            <AppWindow className="w-3.5 h-3.5 text-sky-400" />
            <span>Go to Desktop</span>
          </button>
          <button
            onClick={() => handleWindowsAction("task_switcher", {}, "Task Switcher")}
            className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white text-xs font-medium transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Alt+Tab Apps</span>
          </button>
          <button
            onClick={() => handleWindowsAction("snap_left", {}, "Snapped left")}
            className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white text-xs font-medium transition-all cursor-pointer"
          >
            <span>◀ Tile Left</span>
          </button>
          <button
            onClick={() => handleWindowsAction("snap_right", {}, "Snapped right")}
            className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white text-xs font-medium transition-all cursor-pointer"
          >
            <span>Tile Right ▶</span>
          </button>
          <button
            onClick={() => handleWindowsAction("touch_keyboard", {}, "Touch keyboard")}
            className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white text-xs font-medium transition-all cursor-pointer"
          >
            <Keyboard className="w-3.5 h-3.5 text-purple-400" />
            <span>Touch Keyboard</span>
          </button>
          <button
            onClick={() => handleWindowsAction("sleep_pc", {}, "Putting PC to sleep")}
            className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-amber-500/50 text-amber-300 text-xs font-medium transition-all cursor-pointer"
          >
            <Moon className="w-3.5 h-3.5 text-amber-400" />
            <span>Sleep PC</span>
          </button>
        </div>
      </div>

      {/* 3. System Controls & Utilities */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
        {/* Select & Search Screen (Alt+S) */}
        {onOpenSelectSearch && (
          <button
            onClick={onOpenSelectSearch}
            className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 text-xs font-semibold transition-all cursor-pointer"
            title="Press Alt+S anywhere to crop and search"
          >
            <Crop className="w-4 h-4 text-amber-400" />
            <span>Select & Search (Alt+S)</span>
          </button>
        )}

        {/* Live Vision & Camera Hub */}
        {onOpenVisionHub && (
          <button
            onClick={onOpenVisionHub}
            className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-300 text-xs font-semibold transition-all cursor-pointer"
          >
            <Monitor className="w-4 h-4 text-emerald-400" />
            <span>Live Screen & Camera</span>
          </button>
        )}

        {/* Screenshot Button */}
        <button
          onClick={onTakeScreenshot}
          className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-sky-500/40 text-slate-200 text-xs font-semibold transition-all cursor-pointer"
        >
          <Camera className="w-4 h-4 text-sky-400" />
          <span>Take Screenshot</span>
        </button>

        {/* Lock Screen Button */}
        <button
          onClick={onLockScreen}
          className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-red-500/40 text-slate-200 text-xs font-semibold transition-all cursor-pointer"
        >
          <Lock className="w-4 h-4 text-red-400" />
          <span>Lock (Win+L)</span>
        </button>
      </div>

      {/* 4. Web Search Bar */}
      <div className="flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Voice search query..."
          className="flex-1 bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
        />
        <button
          onClick={() => handleWebSearch("Google")}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 font-semibold text-xs flex items-center gap-1 cursor-pointer"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Google</span>
        </button>
        <button
          onClick={() => handleWebSearch("YouTube")}
          className="px-3 py-1.5 rounded-lg bg-red-950/80 hover:bg-red-900 border border-red-800/60 text-red-200 font-semibold text-xs flex items-center gap-1 cursor-pointer"
        >
          <Search className="w-3.5 h-3.5" />
          <span>YouTube</span>
        </button>
      </div>
    </div>
  );
};
