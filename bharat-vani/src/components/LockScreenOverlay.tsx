import React, { useState, useEffect } from "react";
import { Lock, Unlock, Wifi, BatteryCharging, ArrowRight } from "lucide-react";

interface LockScreenOverlayProps {
  isLocked: boolean;
  onUnlock: () => void;
}

export const LockScreenOverlay: React.FC<LockScreenOverlayProps> = ({
  isLocked,
  onUnlock,
}) => {
  const [timeStr, setTimeStr] = useState("");
  const [dateStr, setDateStr] = useState("");

  useEffect(() => {
    if (!isLocked) return;

    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      );
      setDateStr(
        now.toLocaleDateString("en-IN", {
          timeZone: "Asia/Kolkata",
          weekday: "long",
          month: "long",
          day: "numeric",
        })
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [isLocked]);

  if (!isLocked) return null;

  return (
    <div
      onClick={onUnlock}
      className="fixed inset-0 z-50 bg-[#070a12]/95 backdrop-blur-2xl flex flex-col justify-between p-8 sm:p-12 text-white select-none cursor-pointer transition-opacity duration-300 animate-in fade-in"
    >
      {/* Top Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-400 font-mono text-xs">
          <Lock className="w-4 h-4 text-amber-400" />
          <span>BHARAT VANI WORKSTATION LOCKED</span>
        </div>
        <div className="flex items-center gap-3 text-slate-400">
          <Wifi className="w-4 h-4 text-emerald-400" />
          <BatteryCharging className="w-4 h-4 text-emerald-400" />
        </div>
      </div>

      {/* Center Digital Clock */}
      <div className="space-y-2">
        <h1 className="text-6xl sm:text-8xl font-bold tracking-tight font-mono text-slate-100">
          {timeStr || "02:15 PM"}
        </h1>
        <p className="text-xl sm:text-2xl text-amber-300 font-medium font-mono">
          {dateStr || "Friday, September 11"}
        </p>
      </div>

      {/* Bottom Unlock Prompt */}
      <div className="flex flex-col items-center sm:items-start space-y-3">
        <button
          onClick={onUnlock}
          className="flex items-center gap-3 px-6 py-3 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-all shadow-xl shadow-amber-500/20 cursor-pointer"
        >
          <Unlock className="w-4 h-4" />
          <span>Click Anywhere to Unlock Windows</span>
          <ArrowRight className="w-4 h-4" />
        </button>
        <p className="text-xs text-slate-400 font-mono">
          Bharat Vani voice assistant is actively running in the background.
        </p>
      </div>
    </div>
  );
};
