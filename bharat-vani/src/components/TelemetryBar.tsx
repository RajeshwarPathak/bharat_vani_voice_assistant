import React, { useState, useEffect } from "react";
import { TelemetryData, BrainMode } from "../types";
import {
  Cpu,
  HardDrive,
  BatteryCharging,
  Battery,
  Wifi,
  Cloud,
  Server,
  Clock,
  Volume2,
  VolumeX,
  Laptop,
  Sparkles,
  Power,
} from "lucide-react";

interface TelemetryBarProps {
  telemetry: TelemetryData;
  brainMode?: BrainMode;
  onToggleBrainMode?: () => void;
  selectedWakeWord: string;
  onChangeWakeWord: (w: string) => void;
  onToggleMute: () => void;
  onOpenAutoStartModal?: () => void;
  autoStartEnabled?: boolean;
}

export const TelemetryBar: React.FC<TelemetryBarProps> = ({
  telemetry,
  selectedWakeWord,
  onChangeWakeWord,
  onToggleMute,
  onOpenAutoStartModal,
  autoStartEnabled = true,
}) => {
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Format in Indian Standard Time (IST)
      const options: Intl.DateTimeFormatOptions = {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      };
      setCurrentTime(now.toLocaleTimeString("en-IN", options) + " IST");
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="w-full bg-slate-900/90 border-b border-slate-800/80 backdrop-blur-md px-3 py-2 text-xs select-none">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: OS & PC Identity */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800/70 border border-slate-700/60 text-slate-300">
            <Laptop className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-semibold text-slate-200">Windows 11 Pro</span>
            <span className="text-slate-500">|</span>
            <span className="font-mono text-[11px] text-amber-400 font-bold">{telemetry.pcName}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1 text-slate-400 font-mono text-[11px]">
            <Clock className="w-3.5 h-3.5 text-amber-400/80" />
            <span>{currentTime || "02:15 PM IST"}</span>
          </div>
        </div>

        {/* Center: Live Telemetry Metrics */}
        <div className="flex items-center gap-3 font-mono text-[11px]">
          {/* CPU */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800/40 border border-slate-700/40 text-slate-300">
            <Cpu className="w-3.5 h-3.5 text-amber-400" />
            <span>CPU</span>
            <span className="font-bold text-amber-300">{telemetry.cpu}%</span>
          </div>

          {/* RAM */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800/40 border border-slate-700/40 text-slate-300">
            <HardDrive className="w-3.5 h-3.5 text-sky-400" />
            <span>RAM</span>
            <span className="font-bold text-sky-300">{telemetry.ram}%</span>
          </div>

          {/* Battery */}
          <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800/40 border border-slate-700/40 text-slate-300">
            {telemetry.isCharging ? (
              <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Battery className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>{telemetry.battery}%</span>
          </div>

          {/* Network Latency */}
          <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800/40 border border-slate-700/40 text-slate-300">
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-emerald-300 font-bold">{telemetry.latency}ms</span>
          </div>
        </div>

        {/* Right: Engine Switch & Controls */}
        <div className="flex items-center gap-2">
          {/* Wake Word Selector */}
          <div className="flex items-center gap-1 bg-slate-800/60 border border-slate-700/60 rounded px-2 py-0.5 text-slate-300">
            <span className="text-[10px] text-slate-400 uppercase font-mono">Wake:</span>
            <select
              value={selectedWakeWord}
              onChange={(e) => onChangeWakeWord(e.target.value)}
              className="bg-transparent text-amber-300 text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="Hey Vani" className="bg-slate-900 text-slate-100">
                Hey Vani
              </option>
              <option value="Ok Vani" className="bg-slate-900 text-slate-100">
                Ok Vani
              </option>
              <option value="Namaste Vani" className="bg-slate-900 text-slate-100">
                Namaste Vani 🇮🇳
              </option>
            </select>
          </div>

          {/* AI Intelligence Engine */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-semibold bg-gradient-to-r from-blue-900/60 to-purple-900/60 border-blue-500/50 text-sky-200 shadow-sm shadow-blue-500/10"
            title="AI Intelligence powered by Google Gemini AI"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Gemini AI</span>
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span>
          </div>

          {/* Mute / Audio Toggle */}
          <button
            onClick={onToggleMute}
            className={`p-1.5 rounded border transition-colors ${
              telemetry.isMuted
                ? "bg-red-950/80 border-red-800/60 text-red-300"
                : "bg-slate-800/60 border-slate-700/60 text-slate-300 hover:text-white"
            }`}
            title={telemetry.isMuted ? "Unmute Assistant Voice" : "Mute Assistant Voice"}
          >
            {telemetry.isMuted ? (
              <VolumeX className="w-3.5 h-3.5 text-red-400" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-slate-300" />
            )}
          </button>

          {/* Windows Auto-Start Status Button */}
          {onOpenAutoStartModal && (
            <button
              onClick={onOpenAutoStartModal}
              className={`hidden sm:flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-mono transition-all cursor-pointer ${
                autoStartEnabled
                  ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:border-emerald-400"
                  : "bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200"
              }`}
              title="Windows Auto-Start on System Boot: Click to configure"
            >
              <Power className={`w-3 h-3 ${autoStartEnabled ? "text-emerald-400" : "text-slate-400"}`} />
              <span>Auto-Start: {autoStartEnabled ? "ON" : "OFF"}</span>
            </button>
          )}

        </div>
      </div>
    </header>
  );
};
