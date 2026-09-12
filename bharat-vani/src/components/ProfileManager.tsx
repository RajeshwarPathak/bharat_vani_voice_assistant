import React, { useState } from "react";
import {
  UserProfile,
  CustomCommand,
  LanguageMode,
  ActionType,
} from "../types";
import {
  User,
  Users,
  Plus,
  Edit2,
  Trash2,
  Check,
  Globe,
  Radio,
  Sliders,
  Sparkles,
  Command,
  Play,
  Volume2,
  Save,
  X,
  Languages,
} from "lucide-react";

interface ProfileManagerProps {
  profiles: UserProfile[];
  activeProfileId: string;
  onSelectProfile: (profileId: string) => void;
  onSaveProfile: (profile: UserProfile) => void;
  onDeleteProfile: (profileId: string) => void;
  onRunCommand: (command: CustomCommand) => void;
}

export const ProfileManager: React.FC<ProfileManagerProps> = ({
  profiles,
  activeProfileId,
  onSelectProfile,
  onSaveProfile,
  onDeleteProfile,
  onRunCommand,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null);

  // New custom command inline state
  const [newCmdPhrase, setNewCmdPhrase] = useState("");
  const [newCmdActionType, setNewCmdActionType] = useState<ActionType>("launch_app");
  const [newCmdTarget, setNewCmdTarget] = useState("Google Chrome");
  const [newCmdSpoken, setNewCmdSpoken] = useState("Executing custom command for you.");

  const activeProfile =
    profiles.find((p) => p.id === activeProfileId) || profiles[0];

  const [customNameInput, setCustomNameInput] = useState(
    activeProfile?.name === "User" ? "" : activeProfile?.name || ""
  );
  const [nameSavedAlert, setNameSavedAlert] = useState(false);

  React.useEffect(() => {
    if (activeProfile) {
      setCustomNameInput(activeProfile.name === "User" ? "" : activeProfile.name);
    }
  }, [activeProfile?.id, activeProfile?.name]);

  const handleUpdateCustomName = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customNameInput.trim();
    if (!trimmed) return;
    const updated: UserProfile = {
      ...activeProfile,
      name: trimmed,
      greeting: `Namaste ${trimmed}! Ready for your voice commands.`,
    };
    onSaveProfile(updated);
    setNameSavedAlert(true);
    setTimeout(() => setNameSavedAlert(false), 3000);
  };

  const handleStartEdit = (profile: UserProfile) => {
    setEditingProfile(JSON.parse(JSON.stringify(profile)));
    setIsEditing(true);
    setIsCreatingNew(false);
  };

  const handleStartCreate = () => {
    const newId = `profile-${Date.now()}`;
    const newProfile: UserProfile = {
      id: newId,
      name: "New User",
      avatarColor: "from-purple-600 to-indigo-600",
      preferredLanguage: "mix",
      wakeWord: "Hey Vani",
      speechRate: 1.0,
      speechPitch: 1.0,
      defaultBrainMode: "gemini",
      greeting: "Namaste! Welcome back.",
      city: "Location not set",
      customCommands: [
        {
          id: `cmd-${Date.now()}`,
          phrase: "Focus mode",
          actionType: "launch_app",
          actionDetails: { target: "VS Code" },
          spokenResponse: "Focus mode activated. Launching development environment.",
        },
      ],
    };
    setEditingProfile(newProfile);
    setIsEditing(true);
    setIsCreatingNew(true);
  };

  const handleSave = () => {
    if (!editingProfile) return;
    onSaveProfile(editingProfile);
    if (isCreatingNew) {
      onSelectProfile(editingProfile.id);
    }
    setIsEditing(false);
    setEditingProfile(null);
  };

  const handleAddCustomCommand = () => {
    if (!newCmdPhrase.trim() || !editingProfile) return;
    const newCmd: CustomCommand = {
      id: `cmd-${Date.now()}`,
      phrase: newCmdPhrase.trim(),
      actionType: newCmdActionType,
      actionDetails: { target: newCmdTarget },
      spokenResponse: newCmdSpoken.trim() || `Executing ${newCmdPhrase}.`,
    };

    setEditingProfile({
      ...editingProfile,
      customCommands: [...editingProfile.customCommands, newCmd],
    });

    setNewCmdPhrase("");
    setNewCmdSpoken("");
  };

  const handleDeleteCommand = (cmdId: string) => {
    if (!editingProfile) return;
    setEditingProfile({
      ...editingProfile,
      customCommands: editingProfile.customCommands.filter((c) => c.id !== cmdId),
    });
  };

  const getLanguageLabel = (lang: LanguageMode) => {
    switch (lang) {
      case "hi-IN":
        return "हिन्दी (Pure Hindi)";
      case "en-IN":
        return "English (Indian)";
      case "mix":
        return "Hinglish (Hindi + English)";
    }
  };

  return (
    <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800/90 p-5 space-y-6 shadow-2xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <Users className="w-5 h-5 text-amber-400" />
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-100 font-mono">
              User Profile Management & Personalization
            </h2>
            <p className="text-xs text-slate-400 font-sans">
              Switch users, configure Hindi/English preferences, customize wake words, and define custom voice triggers.
            </p>
          </div>
        </div>

        <button
          onClick={handleStartCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow-md shadow-amber-500/10 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Profile</span>
        </button>
      </div>

      {/* Quick Custom User Name Input Card */}
      <div
        id="quick-custom-username-section"
        className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 rounded-2xl border border-amber-500/30 p-4 shadow-lg relative overflow-hidden"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl bg-gradient-to-br ${activeProfile.avatarColor} flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0`}
            >
              {activeProfile.name && activeProfile.name !== "User"
                ? activeProfile.name.charAt(0).toUpperCase()
                : <User className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold">
                  Custom User Name
                </span>
                {nameSavedAlert && (
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 animate-in fade-in">
                    <Check className="w-3 h-3" /> Saved!
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Enter your custom name to personalize greetings and voice responses. Current:{" "}
                <strong className="text-slate-100 font-semibold">{activeProfile.name}</strong>
              </p>
            </div>
          </div>

          <form onSubmit={handleUpdateCustomName} className="flex items-center gap-2">
            <input
              type="text"
              id="profile-custom-name-field"
              value={customNameInput}
              onChange={(e) => setCustomNameInput(e.target.value)}
              placeholder="Enter your name (e.g. Rahul, Priya)..."
              className="bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500/40 w-full sm:w-60 font-sans"
            />
            <button
              type="submit"
              id="save-custom-name-btn"
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/10 shrink-0 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Name</span>
            </button>
          </form>
        </div>
      </div>

      {/* Profile Selector Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {profiles.map((p) => {
          const isActive = p.id === activeProfileId;
          return (
            <div
              key={p.id}
              onClick={() => onSelectProfile(p.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                isActive
                  ? "bg-slate-800/90 border-amber-500/60 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/30"
                  : "bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-850"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl bg-gradient-to-br ${p.avatarColor} flex items-center justify-center text-white font-bold text-sm shadow-md`}
                    >
                      {p.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                        <span>{p.name}</span>
                        {isActive && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-mono">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[150px]">
                        {p.city}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartEdit(p);
                    }}
                    className="p-1.5 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-white transition-colors"
                    title="Edit Profile"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1.5 text-[11px] font-mono text-slate-400">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Language:</span>
                    <span className="text-slate-300 font-sans text-xs">
                      {getLanguageLabel(p.preferredLanguage)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Wake Word:</span>
                    <span className="text-amber-300 font-mono">"{p.wakeWord}"</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Shortcuts:</span>
                    <span className="text-sky-300">
                      {p.customCommands.length} triggers
                    </span>
                  </div>
                </div>
              </div>

              {/* Greeting quote */}
              <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-400 italic">
                "{p.greeting}"
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Profile Custom Voice Commands Quick Bar */}
      <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Command className="w-4 h-4 text-sky-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
              Custom Voice Commands ({activeProfile.name})
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Click to test or speak directly
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
          {activeProfile.customCommands.map((cmd) => (
            <div
              key={cmd.id}
              className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/90 hover:border-sky-500/40 flex flex-col justify-between group transition-all"
            >
              <div className="space-y-1">
                <div className="text-xs font-bold text-amber-300 font-mono flex items-center gap-1">
                  <span>"{cmd.phrase}"</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  Action: <span className="text-slate-300">{cmd.actionType}</span>
                </div>
              </div>

              <button
                onClick={() => onRunCommand(cmd)}
                className="mt-2.5 flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg bg-slate-800 hover:bg-sky-600 hover:text-white text-slate-300 text-[11px] font-mono transition-colors cursor-pointer"
              >
                <Play className="w-3 h-3 text-sky-400 group-hover:text-white" />
                <span>Test Trigger</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Edit / Create Profile Modal */}
      {isEditing && editingProfile && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <h3 className="font-mono text-sm font-bold text-slate-100">
                  {isCreatingNew ? "Create New Profile" : `Edit Profile: ${editingProfile.name}`}
                </h3>
              </div>
              <button
                onClick={() => setIsEditing(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Basics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  User Name
                </label>
                <input
                  type="text"
                  value={editingProfile.name}
                  onChange={(e) =>
                    setEditingProfile({ ...editingProfile, name: e.target.value })
                  }
                  className="w-full bg-slate-850 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  City / Location
                </label>
                <input
                  type="text"
                  value={editingProfile.city}
                  onChange={(e) =>
                    setEditingProfile({ ...editingProfile, city: e.target.value })
                  }
                  className="w-full bg-slate-850 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Language Selection */}
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1 flex items-center gap-1">
                  <Languages className="w-3.5 h-3.5 text-amber-400" />
                  <span>Preferred Language</span>
                </label>
                <select
                  value={editingProfile.preferredLanguage}
                  onChange={(e) =>
                    setEditingProfile({
                      ...editingProfile,
                      preferredLanguage: e.target.value as LanguageMode,
                    })
                  }
                  className="w-full bg-slate-850 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="mix">Hinglish (Hindi + English)</option>
                  <option value="hi-IN">हिन्दी (Pure Hindi)</option>
                  <option value="en-IN">English (Indian en-IN)</option>
                </select>
              </div>

              {/* Wake Word */}
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  Wake Word
                </label>
                <input
                  type="text"
                  value={editingProfile.wakeWord}
                  onChange={(e) =>
                    setEditingProfile({ ...editingProfile, wakeWord: e.target.value })
                  }
                  placeholder="Hey Vani, Ok Vani, Namaste Vani"
                  className="w-full bg-slate-850 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>

            {/* Custom Greeting */}
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">
                Custom Spoken Greeting
              </label>
              <input
                type="text"
                value={editingProfile.greeting}
                onChange={(e) =>
                  setEditingProfile({ ...editingProfile, greeting: e.target.value })
                }
                className="w-full bg-slate-850 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Voice Pitch & Rate */}
            <div className="grid grid-cols-2 gap-4 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <div>
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
                  <span>Speech Rate</span>
                  <span className="text-amber-400">{editingProfile.speechRate}x</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.3"
                  step="0.05"
                  value={editingProfile.speechRate}
                  onChange={(e) =>
                    setEditingProfile({
                      ...editingProfile,
                      speechRate: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-amber-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
                  <span>Speech Pitch</span>
                  <span className="text-amber-400">{editingProfile.speechPitch}x</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.3"
                  step="0.05"
                  value={editingProfile.speechPitch}
                  onChange={(e) =>
                    setEditingProfile({
                      ...editingProfile,
                      speechPitch: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-amber-500"
                />
              </div>
            </div>

            {/* Manage Custom Commands Section */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-200 uppercase">
                  Custom Shortcut Commands ({editingProfile.customCommands.length})
                </span>
              </div>

              {/* List of commands */}
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {editingProfile.customCommands.map((cmd) => (
                  <div
                    key={cmd.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-800/70 border border-slate-700/60 text-xs"
                  >
                    <div>
                      <span className="font-bold text-amber-300 font-mono">
                        "{cmd.phrase}"
                      </span>{" "}
                      <span className="text-slate-400 font-mono text-[11px]">
                        → {cmd.actionType} ({cmd.actionDetails.target || cmd.actionDetails.query || "system"})
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteCommand(cmd.id)}
                      className="p-1 text-red-400 hover:text-red-300"
                      title="Delete command"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add New Command Form */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="text-[11px] font-mono text-sky-400 font-semibold">
                  Add New Custom Trigger:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={newCmdPhrase}
                    onChange={(e) => setNewCmdPhrase(e.target.value)}
                    placeholder="Trigger (e.g. Kaam shuru)"
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500"
                  />
                  <select
                    value={newCmdActionType}
                    onChange={(e) => setNewCmdActionType(e.target.value as ActionType)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
                  >
                    <option value="launch_app">Launch App</option>
                    <option value="web_search">Web / YouTube Search</option>
                    <option value="lock_screen">Lock PC</option>
                    <option value="screenshot">Screenshot</option>
                    <option value="check_schedule">Check Schedule</option>
                  </select>
                  <input
                    type="text"
                    value={newCmdTarget}
                    onChange={(e) => setNewCmdTarget(e.target.value)}
                    placeholder="Target (e.g. Chrome, VS Code)"
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500"
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCmdSpoken}
                    onChange={(e) => setNewCmdSpoken(e.target.value)}
                    placeholder="Spoken response (e.g. Starting your work session now!)"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomCommand}
                    disabled={!newCmdPhrase.trim()}
                    className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Add Trigger
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              {!isCreatingNew && profiles.length > 1 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Delete profile "${editingProfile.name}"?`)) {
                      onDeleteProfile(editingProfile.id);
                      setIsEditing(false);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-300 text-xs font-semibold cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Profile</span>
                </button>
              ) : (
                <div></div>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors shadow-md shadow-amber-500/10 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Profile</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
