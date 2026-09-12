import React, { useState, useEffect } from "react";
import { User, Check, X, Sparkles } from "lucide-react";

interface CustomUserNameModalProps {
  isOpen: boolean;
  currentName: string;
  onClose: () => void;
  onSaveName: (name: string, avatarColor?: string) => void;
}

const AVATAR_COLORS = [
  { label: "Amber Sun", gradient: "from-amber-500 to-orange-600" },
  { label: "Deep Cobalt", gradient: "from-blue-600 to-indigo-700" },
  { label: "Forest Emerald", gradient: "from-emerald-600 to-teal-700" },
  { label: "Royal Amethyst", gradient: "from-purple-600 to-indigo-600" },
  { label: "Crimson Rose", gradient: "from-rose-500 to-pink-600" },
];

export const CustomUserNameModal: React.FC<CustomUserNameModalProps> = ({
  isOpen,
  currentName,
  onClose,
  onSaveName,
}) => {
  const [name, setName] = useState(currentName === "User" ? "" : currentName);
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0].gradient);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setName(currentName === "User" ? "" : currentName);
      setError("");
    }
  }, [isOpen, currentName]);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please enter a valid name");
      return;
    }
    if (trimmed.length > 40) {
      setError("Name must be under 40 characters");
      return;
    }
    onSaveName(trimmed, selectedColor);
    onClose();
  };

  return (
    <div
      id="custom-name-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="custom-name-modal-content"
        className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle decorative glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400" />

        {/* Close button */}
        <button
          id="custom-name-modal-close"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
          title="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
              <span>Enter Custom User Name</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              Bharat Vani will personalize spoken greetings, voice feedback, and PC commands using your custom name.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="custom-name-input"
              className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider font-mono"
            >
              Your Name / Preferred Title
            </label>
            <div className="relative">
              <input
                id="custom-name-input"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError("");
                }}
                autoFocus
                placeholder="e.g. Rahul, Priya, Alex, Dr. Sharma..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all font-sans"
              />
              {name && (
                <button
                  type="button"
                  onClick={() => setName("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {error && <p className="text-xs text-rose-400 mt-1.5 font-medium">{error}</p>}
          </div>

          {/* Color theme selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider font-mono">
              Badge Color Accent
            </label>
            <div className="flex items-center gap-2">
              {AVATAR_COLORS.map((c) => {
                const isSelected = selectedColor === c.gradient;
                return (
                  <button
                    key={c.label}
                    type="button"
                    onClick={() => setSelectedColor(c.gradient)}
                    className={`w-7 h-7 rounded-full bg-gradient-to-br ${c.gradient} flex items-center justify-center transition-transform cursor-pointer ${
                      isSelected ? "ring-2 ring-white scale-110 shadow-md" : "opacity-70 hover:opacity-100"
                    }`}
                    title={c.label}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-xs space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">
              Live Spoken Greeting Preview
            </span>
            <p className="text-slate-300 font-medium italic">
              "Namaste {name.trim() || "there"}! Bharat Vani is ready for your voice commands."
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              id="custom-name-cancel-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="custom-name-save-btn"
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Save Custom Name</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
