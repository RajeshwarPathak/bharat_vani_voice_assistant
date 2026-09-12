import React, { useEffect, useRef } from "react";
import { AssistantState } from "../types";
import { Mic, Radio, Sparkles, Volume2, Cpu, CheckCircle } from "lucide-react";

interface HologramOrbProps {
  state: AssistantState;
  onClick: () => void;
  audioLevel?: number;
  lastWakeWord?: string;
}

export const HologramOrb: React.FC<HologramOrbProps> = ({
  state,
  onClick,
  audioLevel = 0.3,
  lastWakeWord = "Hey Vani",
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let angle = 0;
    let pulsePhase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      angle += state === "thinking" ? 0.08 : state === "listening" ? 0.05 : 0.02;
      pulsePhase += 0.04;

      // Color scheme according to state
      let primaryColor = "rgba(245, 158, 11, "; // Amber (India saffron accent)
      let secondaryColor = "rgba(14, 165, 233, "; // Cyan (Tech glow)
      let coreGlow = "rgba(245, 158, 11, 0.4)";

      if (state === "listening") {
        primaryColor = "rgba(239, 68, 68, "; // Red / Amber intense
        secondaryColor = "rgba(249, 115, 22, ";
        coreGlow = "rgba(239, 68, 68, 0.5)";
      } else if (state === "thinking") {
        primaryColor = "rgba(168, 85, 247, "; // Purple/Violet
        secondaryColor = "rgba(56, 189, 248, ";
        coreGlow = "rgba(168, 85, 247, 0.5)";
      } else if (state === "speaking") {
        primaryColor = "rgba(16, 185, 129, "; // Emerald / Teal
        secondaryColor = "rgba(245, 158, 11, ";
        coreGlow = "rgba(16, 185, 129, 0.4)";
      } else if (state === "action_executing") {
        primaryColor = "rgba(59, 130, 246, "; // Blue electric
        secondaryColor = "rgba(245, 158, 11, ";
        coreGlow = "rgba(59, 130, 246, 0.6)";
      }

      // 1. Ambient Background Glow
      const bgGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 130);
      bgGrad.addColorStop(0, coreGlow);
      bgGrad.addColorStop(1, "rgba(11, 15, 25, 0)");
      ctx.fillStyle = bgGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 130, 0, Math.PI * 2);
      ctx.fill();

      // 2. Multi-Ring Concentric Gyroscope Rings
      const rings = [
        { r: 48, speed: 1.0, color: primaryColor, dashes: [12, 6], width: 2 },
        { r: 70, speed: -0.7, color: secondaryColor, dashes: [8, 14], width: 1.5 },
        { r: 92, speed: 0.5, color: primaryColor, dashes: [24, 8, 4, 8], width: 1 },
        { r: 110, speed: -0.3, color: "rgba(148, 163, 184, ", dashes: [2, 10], width: 1 },
      ];

      rings.forEach((ring, idx) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle * ring.speed + (idx * Math.PI) / 4);

        ctx.strokeStyle = ring.color + "0.65)";
        ctx.lineWidth = ring.width;
        ctx.setLineDash(ring.dashes);

        // Add elliptical tilt for 3D holographic sphere illusion
        ctx.beginPath();
        const tiltX = 1;
        const tiltY = idx % 2 === 0 ? 0.75 : 0.85;
        ctx.ellipse(0, 0, ring.r * tiltX, ring.r * tiltY, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
      });

      // 3. Orbiting Quantum Nodes
      const nodeCount = state === "thinking" ? 8 : 4;
      for (let i = 0; i < nodeCount; i++) {
        const nodeAngle = angle * (i % 2 === 0 ? 1.4 : -1.1) + (i * (Math.PI * 2)) / nodeCount;
        const orbitR = 85 + Math.sin(pulsePhase + i) * 6;
        const nx = cx + Math.cos(nodeAngle) * orbitR;
        const ny = cy + Math.sin(nodeAngle) * (orbitR * 0.8);

        ctx.beginPath();
        ctx.arc(nx, ny, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = i % 2 === 0 ? primaryColor + "0.9)" : secondaryColor + "0.9)";
        ctx.shadowColor = i % 2 === 0 ? "#f59e0b" : "#38bdf8";
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // 4. Central Reactor Core with Audio Reactive Pulse
      const baseCoreRadius = 32;
      const audioPulse = state === "listening" || state === "speaking" ? Math.sin(pulsePhase * 4) * 8 * audioLevel : Math.sin(pulsePhase * 2) * 3;
      const currentRadius = Math.max(20, baseCoreRadius + audioPulse);

      const coreGrad = ctx.createRadialGradient(cx - 6, cy - 6, 2, cx, cy, currentRadius);
      coreGrad.addColorStop(0, "#ffffff");
      coreGrad.addColorStop(0.35, primaryColor + "0.95)");
      coreGrad.addColorStop(0.8, secondaryColor + "0.85)");
      coreGrad.addColorStop(1, primaryColor + "0.2)");

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, currentRadius, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.shadowColor = primaryColor + "0.8)";
      ctx.shadowBlur = 24;
      ctx.fill();
      ctx.restore();

      // 5. Digital Soundwave frequency ripple (during speaking or listening)
      if (state === "speaking" || state === "listening") {
        const waves = 16;
        ctx.strokeStyle = primaryColor + "0.8)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < waves; i++) {
          const theta = (i / waves) * Math.PI * 2;
          const amp = Math.sin(theta * 5 + pulsePhase * 6) * 10 * audioLevel;
          const wr = currentRadius + 14 + amp;
          const wx = cx + Math.cos(theta) * wr;
          const wy = cy + Math.sin(theta) * wr;
          if (i === 0) ctx.moveTo(wx, wy);
          else ctx.lineTo(wx, wy);
        }
        ctx.closePath();
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [state, audioLevel]);

  return (
    <div className="relative flex flex-col items-center justify-center select-none">
      {/* Clickable Hologram Canvas */}
      <div
        onClick={onClick}
        className="relative group cursor-pointer p-2 rounded-full transition-transform duration-300 hover:scale-[1.03] active:scale-[0.98]"
        title="Click to Push-to-Talk or toggle Voice"
      >
        <canvas
          ref={canvasRef}
          width={280}
          height={260}
          className="relative z-10 drop-shadow-[0_0_25px_rgba(245,158,11,0.25)]"
        />

        {/* Center overlay badge on hover */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full border border-amber-500/30 text-amber-300 text-xs font-mono flex items-center gap-1.5 shadow-lg">
            <Mic className="w-3.5 h-3.5" />
            <span>Push-To-Talk</span>
          </div>
        </div>
      </div>

      {/* State Status Banner */}
      <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/60 backdrop-blur-md shadow-inner">
        {state === "idle" && (
          <>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
            <span className="text-xs font-medium text-slate-300 tracking-wide font-mono">
              STANDBY ● LISTENING FOR <span className="text-amber-400 font-bold">"{lastWakeWord.toUpperCase()}"</span>
            </span>
          </>
        )}

        {state === "listening" && (
          <>
            <Radio className="w-4 h-4 text-red-400 animate-pulse" />
            <span className="text-xs font-semibold text-red-300 tracking-wide font-mono animate-pulse">
              LISTENING TO INDIAN ENGLISH (en-IN)...
            </span>
          </>
        )}

        {state === "thinking" && (
          <>
            <Sparkles className="w-4 h-4 text-purple-400 animate-spin" />
            <span className="text-xs font-semibold text-purple-300 tracking-wide font-mono">
              BHARAT BRAIN ROUTING COMMAND...
            </span>
          </>
        )}

        {state === "speaking" && (
          <>
            <Volume2 className="w-4 h-4 text-emerald-400 animate-bounce" />
            <span className="text-xs font-semibold text-emerald-300 tracking-wide font-mono">
              BHARAT VANI SPEAKING (WINDOWS SAPI)...
            </span>
          </>
        )}

        {state === "action_executing" && (
          <>
            <Cpu className="w-4 h-4 text-blue-400 animate-pulse" />
            <span className="text-xs font-semibold text-blue-300 tracking-wide font-mono">
              EXECUTING WINDOWS PC AUTOMATION...
            </span>
          </>
        )}
      </div>
    </div>
  );
};
