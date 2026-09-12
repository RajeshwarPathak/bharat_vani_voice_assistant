import React, { useState, useEffect } from "react";
import { X, Undo2, MousePointer, Crosshair } from "lucide-react";

export type OverlayMode = "none" | "numbers" | "grid";

interface ScreenOverlaysProps {
  mode: OverlayMode;
  onClose: () => void;
  onSelectNumber?: (num: number) => void;
  onGridClick?: (x: number, y: number) => void;
}

export const ScreenOverlays: React.FC<ScreenOverlaysProps> = ({
  mode,
  onClose,
  onSelectNumber,
  onGridClick,
}) => {
  // Grid drill-down state: stack of bounding boxes relative to 0-1 normalized coordinates
  const [gridStack, setGridStack] = useState<Array<{ x0: number; y0: number; w: number; h: number }>>([
    { x0: 0, y0: 0, w: 1, h: 1 },
  ]);

  useEffect(() => {
    // Reset grid when opened or closed
    if (mode === "grid") {
      setGridStack([{ x0: 0, y0: 0, w: 1, h: 1 }]);
    }
  }, [mode]);

  if (mode === "none") return null;

  // Render Numbers Overlay
  if (mode === "numbers") {
    // Collect interactive elements or synthetic targets
    const sampleTargets = [
      { id: 1, label: "1", x: "12%", y: "4%", desc: "Voice Assistant Toggle" },
      { id: 2, label: "2", x: "24%", y: "4%", desc: "Cheat Sheet Guide" },
      { id: 3, label: "3", x: "78%", y: "4%", desc: "Action Hub" },
      { id: 4, label: "4", x: "92%", y: "4%", desc: "Settings Menu" },
      { id: 5, label: "5", x: "20%", y: "30%", desc: "Quick Apps Card" },
      { id: 6, label: "6", x: "50%", y: "30%", desc: "System Status" },
      { id: 7, label: "7", x: "80%", y: "30%", desc: "Vision & Screen" },
      { id: 8, label: "8", x: "35%", y: "60%", desc: "Chat / Assistant HUD" },
      { id: 9, label: "9", x: "65%", y: "60%", desc: "Reminders & Calendar" },
      { id: 10, label: "10", x: "50%", y: "92%", desc: "Voice Input Microphone" },
      { id: 11, label: "11", x: "10%", y: "92%", desc: "Mute Button" },
      { id: 12, label: "12", x: "90%", y: "92%", desc: "Desktop Minimize" },
    ];

    return (
      <div className="fixed inset-0 z-50 pointer-events-none animate-in fade-in duration-200">
        {/* Banner at top */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-3 px-4 py-2 bg-zinc-950/90 border border-emerald-500/50 rounded-full shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            NUMBERS OVERLAY ACTIVE
          </div>
          <span className="text-zinc-500 text-xs">|</span>
          <span className="text-xs text-zinc-300">
            Say <strong className="text-emerald-300">"Click &lt;number&gt;"</strong> or{" "}
            <strong className="text-emerald-300">"Hide numbers"</strong>
          </span>
          <button
            onClick={onClose}
            className="ml-2 p-1 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white"
            title="Hide numbers"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Number Badges across display */}
        {sampleTargets.map((item) => (
          <div
            key={item.id}
            style={{ left: item.x, top: item.y }}
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer group"
            onClick={() => {
              if (onSelectNumber) onSelectNumber(item.id);
            }}
          >
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500 text-zinc-950 font-black text-xs shadow-lg shadow-emerald-500/40 border-2 border-white ring-2 ring-emerald-500/50 transform group-hover:scale-125 transition-transform">
              {item.label}
            </div>
            <div className="hidden group-hover:block absolute left-1/2 -translate-x-1/2 top-8 px-2 py-1 bg-zinc-900 border border-zinc-700 text-[10px] text-white rounded shadow-md whitespace-nowrap z-10">
              {item.desc}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Render 3x3 Mouse Grid Overlay
  const currentBox = gridStack[gridStack.length - 1];

  const handleCellClick = (row: number, col: number) => {
    // row: 0, 1, 2; col: 0, 1, 2
    const cellW = currentBox.w / 3;
    const cellH = currentBox.h / 3;
    const cellX0 = currentBox.x0 + col * cellW;
    const cellY0 = currentBox.y0 + row * cellH;

    // If already zoomed in 3 levels, trigger click at center
    if (gridStack.length >= 3) {
      const centerX = (cellX0 + cellW / 2) * window.innerWidth;
      const centerY = (cellY0 + cellH / 2) * window.innerHeight;
      if (onGridClick) {
        onGridClick(Math.round(centerX), Math.round(centerY));
      }
      onClose();
    } else {
      // Zoom in deeper
      setGridStack((prev) => [...prev, { x0: cellX0, y0: cellY0, w: cellW, h: cellH }]);
    }
  };

  const handleUndo = () => {
    if (gridStack.length > 1) {
      setGridStack((prev) => prev.slice(0, -1));
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none select-none animate-in fade-in duration-150">
      {/* Top Controls Banner */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-3 px-5 py-2.5 bg-zinc-950/95 border border-emerald-500/60 rounded-full shadow-2xl backdrop-blur-lg">
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
          <Crosshair className="w-4 h-4 animate-spin text-emerald-400" />
          MOUSE GRID ACTIVE (Level {gridStack.length}/3)
        </div>
        <span className="text-zinc-500 text-xs">|</span>
        <span className="text-xs text-zinc-300">
          Say <strong className="text-emerald-300">"1"</strong> to{" "}
          <strong className="text-emerald-300">"9"</strong> to zoom •{" "}
          <strong className="text-emerald-300">"Undo"</strong> •{" "}
          <strong className="text-emerald-300">"Hide grid"</strong>
        </span>
        {gridStack.length > 1 && (
          <button
            onClick={handleUndo}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200"
            title="Zoom back out (Undo)"
          >
            <Undo2 className="w-3.5 h-3.5" /> Undo
          </button>
        )}
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white"
          title="Close grid"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Grid Canvas Box */}
      <div
        style={{
          left: `${currentBox.x0 * 100}%`,
          top: `${currentBox.y0 * 100}%`,
          width: `${currentBox.w * 100}%`,
          height: `${currentBox.h * 100}%`,
        }}
        className="absolute pointer-events-auto border-2 border-emerald-500/80 bg-emerald-950/10 backdrop-blur-[1px] transition-all duration-300"
      >
        {/* 3x3 Grid Cells */}
        <div className="grid grid-cols-3 grid-rows-3 w-full h-full">
          {[0, 1, 2].map((r) =>
            [0, 1, 2].map((c) => {
              const cellNumber = r * 3 + c + 1;
              return (
                <div
                  key={cellNumber}
                  onClick={() => handleCellClick(r, c)}
                  className="relative flex items-center justify-center border border-emerald-500/40 hover:bg-emerald-500/20 cursor-crosshair transition-colors group"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-950/80 border border-emerald-400 text-emerald-300 font-extrabold text-sm shadow-lg group-hover:scale-125 group-hover:bg-emerald-500 group-hover:text-zinc-950 transition-all">
                    {cellNumber}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

