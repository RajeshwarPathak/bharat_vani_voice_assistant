import React, { useState, useEffect, useRef } from "react";
import { AssistantState, UserProfile } from "../types";
import {
  Mic,
  MicOff,
  Maximize2,
  Crop,
  Power,
  Volume2,
  Sparkles,
  Move,
  CheckCircle2,
  X,
} from "lucide-react";
import { sfx } from "../utils/audioSynthesizer";

interface FloatingAnimatedIconProps {
  assistantState: AssistantState;
  activeProfile: UserProfile;
  onExpandToBigScreen: () => void;
  onToggleMic: () => void;
  isListening: boolean;
  onOpenSelectSearch: () => void;
  onOpenAutoStartModal: () => void;
  autoStartEnabled: boolean;
}

export const FloatingAnimatedIcon: React.FC<FloatingAnimatedIconProps> = ({
  assistantState,
  activeProfile,
  onExpandToBigScreen,
  onToggleMic,
  isListening,
  onOpenSelectSearch,
  onOpenAutoStartModal,
  autoStartEnabled,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem("bharat_vani_icon_pos");
      if (saved) return JSON.parse(saved);
    } catch {}
    // Default to bottom right
    return {
      x: typeof window !== "undefined" ? window.innerWidth - 110 : 200,
      y: typeof window !== "undefined" ? window.innerHeight - 110 : 400,
    };
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0,
  });

  // Clamp position to window bounds on resize
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => ({
        x: Math.max(16, Math.min(window.innerWidth - 96, prev.x)),
        y: Math.max(16, Math.min(window.innerHeight - 96, prev.y)),
      }));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Dragging logic
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag if not clicking buttons
    if ((e.target as HTMLElement).closest("button")) return;
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: position.x,
      startY: position.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;

      const newX = Math.max(16, Math.min(window.innerWidth - 96, dragStartRef.current.startX + dx));
      const newY = Math.max(16, Math.min(window.innerHeight - 96, dragStartRef.current.startY + dy));

      const newPos = { x: newX, y: newY };
      setPosition(newPos);
      try {
        localStorage.setItem("bharat_vani_icon_pos", JSON.stringify(newPos));
      } catch {}
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  // Canvas animation for the floating animated holographic icon
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let angle = 0;
    let pulse = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      angle += assistantState === "thinking" ? 0.09 : assistantState === "listening" ? 0.06 : 0.025;
      pulse += 0.05;

      // Colors based on state
      let primary = "rgba(245, 158, 11, "; // Amber
      let secondary = "rgba(14, 165, 233, "; // Cyan
      let glowColor = "rgba(245, 158, 11, 0.4)";

      if (assistantState === "listening") {
        primary = "rgba(239, 68, 68, "; // Red
        secondary = "rgba(249, 115, 22, ";
        glowColor = "rgba(239, 68, 68, 0.55)";
      } else if (assistantState === "thinking") {
        primary = "rgba(168, 85, 247, "; // Purple
        secondary = "rgba(56, 189, 248, ";
        glowColor = "rgba(168, 85, 247, 0.55)";
      } else if (assistantState === "speaking") {
        primary = "rgba(16, 185, 129, "; // Emerald
        secondary = "rgba(245, 158, 11, ";
        glowColor = "rgba(16, 185, 129, 0.5)";
      } else if (assistantState === "action_executing") {
        primary = "rgba(59, 130, 246, "; // Blue
        secondary = "rgba(245, 158, 11, ";
        glowColor = "rgba(59, 130, 246, 0.6)";
      }

      // Outer radial glow
      const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, 38);
      grad.addColorStop(0, glowColor);
      grad.addColorStop(1, "rgba(11, 15, 25, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, 38, 0, Math.PI * 2);
      ctx.fill();

      // Outer revolving segmented ring
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.strokeStyle = primary + "0.8)";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.ellipse(0, 0, 28, 24, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Middle counter-rotating ring
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-angle * 1.3);
      ctx.strokeStyle = secondary + "0.85)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.ellipse(0, 0, 22, 26, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Orbiting quantum dots
      const dots = assistantState === "thinking" ? 6 : 3;
      for (let i = 0; i < dots; i++) {
        const dotAngle = angle * 1.6 + (i * Math.PI * 2) / dots;
        const dx = Math.cos(dotAngle) * 30;
        const dy = Math.sin(dotAngle) * 25;
        ctx.fillStyle = i % 2 === 0 ? primary + "1)" : secondary + "1)";
        ctx.beginPath();
        ctx.arc(cx + dx, cy + dy, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Glowing central pulsating core
      const coreR = 11 + Math.sin(pulse) * 2;
      const coreGrad = ctx.createRadialGradient(cx, cy, 1, cx, cy, coreR);
      coreGrad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
      coreGrad.addColorStop(0.5, primary + "0.9)");
      coreGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fill();

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [assistantState]);

  return (
    <div
      id="floating-animated-icon-container"
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
      }}
      className="fixed top-0 left-0 z-50 select-none cursor-pointer transition-transform duration-75 ease-out"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={handleMouseDown}
    >
      {/* Quick Action Floating Flyout Bar on Hover */}
      <div
        className={`absolute bottom-full right-0 mb-2 flex items-center gap-1.5 p-1.5 bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-xl transition-all duration-200 ${
          isHovered
            ? "opacity-100 scale-100 pointer-events-auto translate-y-0"
            : "opacity-0 scale-95 pointer-events-none translate-y-1"
        }`}
      >
        {/* Expand to Big Screen Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            sfx.playActionChime();
            onExpandToBigScreen();
          }}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
          title="Single click: Expand back to Big Screen"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>Expand Screen</span>
        </button>

        {/* Quick Mic Toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleMic();
          }}
          className={`p-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
            isListening
              ? "bg-red-500/20 border-red-500/50 text-red-300 animate-pulse"
              : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200"
          }`}
          title={isListening ? "Mute Microphone" : "Activate Microphone"}
        >
          {isListening ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
        </button>

        {/* Quick Select & Search (Alt+S) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenSelectSearch();
          }}
          className="p-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 transition-all cursor-pointer"
          title="Select & Search Screen (Alt+S)"
        >
          <Crop className="w-3.5 h-3.5" />
        </button>

        {/* Auto-Start Status Badge / Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenAutoStartModal();
          }}
          className={`p-1.5 rounded-xl border text-xs transition-all cursor-pointer ${
            autoStartEnabled
              ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
              : "bg-slate-800 border-slate-700 text-slate-400"
          }`}
          title="Windows Auto-Start Settings"
        >
          <Power className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* The Animated Floating Icon / Orb */}
      <div
        onClick={() => {
          if (!isDragging) {
            sfx.playActionChime();
            onExpandToBigScreen();
          }
        }}
        className="relative group w-20 h-20 flex items-center justify-center rounded-3xl bg-slate-900/90 border-2 border-amber-500/50 hover:border-amber-400 shadow-2xl hover:shadow-amber-500/30 backdrop-blur-md transition-all duration-200 active:scale-95"
        title="Single-click to open Big Screen Bharat Vani"
      >
        {/* Background Canvas Hologram Rings */}
        <canvas
          ref={canvasRef}
          width={80}
          height={80}
          className="absolute inset-0 pointer-events-none rounded-3xl"
        />

        {/* Center Mic / Assistant Emblem */}
        <div className="relative z-10 flex flex-col items-center justify-center pointer-events-none">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all ${
              assistantState === "listening"
                ? "bg-red-500 text-white animate-pulse"
                : assistantState === "thinking"
                ? "bg-purple-600 text-white"
                : assistantState === "speaking"
                ? "bg-emerald-500 text-white"
                : "bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950"
            }`}
          >
            {assistantState === "listening" ? (
              <Mic className="w-4 h-4" />
            ) : assistantState === "speaking" ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
          </div>
        </div>

        {/* Drag Handle Indicator in top-left */}
        <div
          className="absolute top-1 left-1.5 opacity-40 group-hover:opacity-100 text-slate-400 transition-opacity"
          title="Drag to reposition icon"
        >
          <Move className="w-2.5 h-2.5" />
        </div>

        {/* State Ping Indicator Dot */}
        <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              assistantState === "listening"
                ? "bg-red-400"
                : assistantState === "speaking"
                ? "bg-emerald-400"
                : "bg-amber-400"
            }`}
          ></span>
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              assistantState === "listening"
                ? "bg-red-500"
                : assistantState === "speaking"
                ? "bg-emerald-500"
                : "bg-amber-500"
            }`}
          ></span>
        </span>

        {/* Bottom State Pill */}
        <div className="absolute -bottom-2 bg-slate-950/90 border border-slate-700/80 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-tight text-amber-300 shadow-md whitespace-nowrap">
          {assistantState === "listening"
            ? "Listening..."
            : assistantState === "thinking"
            ? "Thinking..."
            : assistantState === "speaking"
            ? "Speaking..."
            : activeProfile.name || "Vani"}
        </div>
      </div>
    </div>
  );
};
