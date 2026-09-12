import React, { useState, useMemo } from "react";
import {
  X,
  Search,
  Mic,
  Volume2,
  AppWindow,
  MousePointer,
  Grid,
  Edit3,
  Type,
  Power,
  Play,
  Copy,
  Check,
  Sparkles,
  Command as CommandIcon,
  Keyboard
} from "lucide-react";

export interface CommandItem {
  id: string;
  action: string;
  command: string;
  aliases?: string[];
  category: string;
  description: string;
  payload?: {
    actionType: string;
    [key: string]: any;
  };
}

export const ALL_VANI_COMMANDS: CommandItem[] = [
  // 1. VANI VOICE & MIC CONTROL
  {
    id: "wake_up",
    category: "Vani Voice & Mic",
    action: "Listen / Wake up Vani",
    command: "Vani wake up",
    aliases: ["Unmute", "Start listening"],
    description: "Wakes up Vani so it starts listening to your voice commands.",
    payload: { actionType: "voice_control", control: "wake" },
  },
  {
    id: "sleep",
    category: "Vani Voice & Mic",
    action: "Put Vani to sleep",
    command: "Vani sleep",
    aliases: ["Mute", "Stop listening"],
    description: "Pauses voice recognition until you say 'Vani wake up' or 'Unmute'.",
    payload: { actionType: "voice_control", control: "sleep" },
  },
  {
    id: "mic_off",
    category: "Vani Voice & Mic",
    action: "Turn off microphone",
    command: "Turn off microphone",
    aliases: ["Mute microphone", "Disable mic"],
    description: "Turns off the active microphone audio input completely.",
    payload: { actionType: "voice_control", control: "mute" },
  },
  {
    id: "close_vani",
    category: "Vani Voice & Mic",
    action: "Close / Exit Vani",
    command: "Close vani",
    aliases: ["Turn off vani", "Stop vani", "Exit vani", "Quit vani"],
    description: "Exits or minimizes the Vani voice assistant application.",
    payload: { actionType: "voice_control", control: "exit" },
  },
  {
    id: "what_can_i_say",
    category: "Vani Voice & Mic",
    action: "Show all commands",
    command: "What can I say",
    aliases: ["Show all commands", "Show command list", "Show commands"],
    description: "Opens this interactive Voice Access Cheat Sheet dialog.",
    payload: { actionType: "show_commands" },
  },
  {
    id: "open_settings",
    category: "Vani Voice & Mic",
    action: "Open Vani settings",
    command: "Open vani settings",
    aliases: ["Vani settings", "Assistant settings"],
    description: "Opens the settings and configuration panel.",
    payload: { actionType: "open_settings" },
  },
  {
    id: "open_help",
    category: "Vani Voice & Mic",
    action: "Open Vani help & guide",
    command: "Open vani guide",
    aliases: ["Open vani help", "Vani guide", "Help menu"],
    description: "Opens the tutorial and guidance for Windows Voice Access.",
    payload: { actionType: "show_commands" },
  },
  {
    id: "mode_commands",
    category: "Vani Voice & Mic",
    action: "Commands only mode",
    command: "Commands mode",
    aliases: ["Switch to command mode"],
    description: "Recognizes strictly system and navigation commands without typing dictation.",
    payload: { actionType: "voice_mode", mode: "commands" },
  },
  {
    id: "mode_dictation",
    category: "Vani Voice & Mic",
    action: "Dictation only mode",
    command: "Dictation mode",
    aliases: ["Switch to dictation mode"],
    description: "Focuses on transcribing words directly into text fields without firing shortcuts.",
    payload: { actionType: "voice_mode", mode: "dictation" },
  },
  {
    id: "mode_default",
    category: "Vani Voice & Mic",
    action: "Default mode",
    command: "Default mode",
    aliases: ["Switch to default mode"],
    description: "Standard balanced mode recognizing both commands and intelligent dictation.",
    payload: { actionType: "voice_mode", mode: "default" },
  },

  // 2. APPS & WINDOW MANAGEMENT
  {
    id: "open_app",
    category: "Apps & Windows",
    action: "Open a new app",
    command: "Open <app name>",
    aliases: ["Start <app name>", "Launch Chrome", "Open Notepad", "Open WhatsApp", "Open Python"],
    description: "Launches any installed Windows software, app, or browser.",
    payload: { actionType: "open_app", appName: "notepad" },
  },
  {
    id: "switch_app",
    category: "Apps & Windows",
    action: "Switch to open app",
    command: "Switch to <app name>",
    aliases: ["Bring up <app name>", "Switch to Chrome", "Switch to VS Code"],
    description: "Brings the target application window to the foreground.",
    payload: { actionType: "windows_action", subAction: "switch_app", target: "chrome" },
  },
  {
    id: "close_window",
    category: "Apps & Windows",
    action: "Close active window",
    command: "Close window",
    aliases: ["Close that", "Close this", "Exit app", "Close <app name>"],
    description: "Closes the current foreground window or specified program (Alt+F4).",
    payload: { actionType: "windows_action", subAction: "close_window" },
  },
  {
    id: "minimize_window",
    category: "Apps & Windows",
    action: "Minimize window",
    command: "Minimize window",
    aliases: ["Minimize that", "Minimize <app name>"],
    description: "Minimizes the current active window to the taskbar.",
    payload: { actionType: "windows_action", subAction: "minimize_window" },
  },
  {
    id: "maximize_window",
    category: "Apps & Windows",
    action: "Maximize window",
    command: "Maximize window",
    aliases: ["Maximize that", "Full screen window"],
    description: "Expands the active window to occupy the entire screen.",
    payload: { actionType: "windows_action", subAction: "maximize_window" },
  },
  {
    id: "restore_window",
    category: "Apps & Windows",
    action: "Restore window",
    command: "Restore window",
    aliases: ["Restore that", "Unmaximize window"],
    description: "Restores the active window back to its previous non-maximized size.",
    payload: { actionType: "windows_action", subAction: "restore_window" },
  },
  {
    id: "go_to_desktop",
    category: "Apps & Windows",
    action: "Go to desktop",
    command: "Go to desktop",
    aliases: ["Minimize all windows", "Show desktop"],
    description: "Minimizes all windows instantly to show your desktop (Win+D).",
    payload: { actionType: "windows_action", subAction: "go_to_desktop" },
  },
  {
    id: "task_switcher",
    category: "Apps & Windows",
    action: "Show task switcher",
    command: "Show task switcher",
    aliases: ["Switch app", "Alt Tab", "Show open apps"],
    description: "Opens the Windows task switcher view (Alt+Tab).",
    payload: { actionType: "windows_action", subAction: "task_switcher" },
  },
  {
    id: "snap_left",
    category: "Apps & Windows",
    action: "Snap window left",
    command: "Snap window to the left",
    aliases: ["Snap left", "Tile left"],
    description: "Tiles the current active window to the left half of the display.",
    payload: { actionType: "windows_action", subAction: "snap_left" },
  },
  {
    id: "snap_right",
    category: "Apps & Windows",
    action: "Snap window right",
    command: "Snap window to the right",
    aliases: ["Snap right", "Tile right"],
    description: "Tiles the current active window to the right half of the display.",
    payload: { actionType: "windows_action", subAction: "snap_right" },
  },
  {
    id: "search_windows",
    category: "Apps & Windows",
    action: "Search Windows / Start",
    command: "Search <entity>",
    aliases: ["Search Windows for <query>", "Find <file>"],
    description: "Opens Windows Search and enters your query.",
    payload: { actionType: "windows_action", subAction: "search_windows", query: "Settings" },
  },

  // 3. MOUSE & KEYBOARD
  {
    id: "click",
    category: "Mouse & Keyboard",
    action: "Left Click",
    command: "Click",
    aliases: ["Left click", "Click here"],
    description: "Sends a primary mouse click at current cursor position.",
    payload: { actionType: "windows_action", subAction: "mouse_click", button: "left" },
  },
  {
    id: "right_click",
    category: "Mouse & Keyboard",
    action: "Right Click",
    command: "Right click",
    aliases: ["Context click"],
    description: "Opens the context menu at the mouse cursor position.",
    payload: { actionType: "windows_action", subAction: "mouse_click", button: "right" },
  },
  {
    id: "double_click",
    category: "Mouse & Keyboard",
    action: "Double Click",
    command: "Double click",
    aliases: ["Open item"],
    description: "Executes a fast double left-click.",
    payload: { actionType: "windows_action", subAction: "mouse_click", button: "double" },
  },
  {
    id: "scroll_down",
    category: "Mouse & Keyboard",
    action: "Scroll Down",
    command: "Scroll down",
    aliases: ["Page down", "Scroll down 5 times"],
    description: "Scrolls the active window content downward.",
    payload: { actionType: "windows_action", subAction: "mouse_scroll", direction: "down" },
  },
  {
    id: "scroll_up",
    category: "Mouse & Keyboard",
    action: "Scroll Up",
    command: "Scroll up",
    aliases: ["Page up", "Scroll up 5 times"],
    description: "Scrolls the active window content upward.",
    payload: { actionType: "windows_action", subAction: "mouse_scroll", direction: "up" },
  },
  {
    id: "press_enter",
    category: "Mouse & Keyboard",
    action: "Press Enter",
    command: "Press Enter",
    aliases: ["Enter", "Submit"],
    description: "Simulates pressing the Enter / Return key.",
    payload: { actionType: "windows_action", subAction: "key_press", key: "Enter" },
  },
  {
    id: "press_tab",
    category: "Mouse & Keyboard",
    action: "Press Tab",
    command: "Press Tab",
    aliases: ["Tab key", "Next field"],
    description: "Moves focus to the next interactive field (Tab).",
    payload: { actionType: "windows_action", subAction: "key_press", key: "Tab" },
  },
  {
    id: "press_escape",
    category: "Mouse & Keyboard",
    action: "Press Escape / Dismiss",
    command: "Dismiss",
    aliases: ["Press Escape", "Escape", "Cancel"],
    description: "Closes the current popup, dropdown or dialog.",
    payload: { actionType: "windows_action", subAction: "key_press", key: "Escape" },
  },
  {
    id: "select_all",
    category: "Mouse & Keyboard",
    action: "Select All",
    command: "Select all",
    aliases: ["Ctrl A"],
    description: "Selects all text or items in the focused context.",
    payload: { actionType: "windows_action", subAction: "key_combo", keys: "^a" },
  },
  {
    id: "copy_that",
    category: "Mouse & Keyboard",
    action: "Copy That",
    command: "Copy that",
    aliases: ["Copy", "Ctrl C"],
    description: "Copies the selected text or items to the Windows clipboard.",
    payload: { actionType: "windows_action", subAction: "key_combo", keys: "^c" },
  },
  {
    id: "paste_that",
    category: "Mouse & Keyboard",
    action: "Paste That",
    command: "Paste that",
    aliases: ["Paste", "Ctrl V"],
    description: "Pastes contents from clipboard into current cursor focus.",
    payload: { actionType: "windows_action", subAction: "key_combo", keys: "^v" },
  },
  {
    id: "undo_that",
    category: "Mouse & Keyboard",
    action: "Undo That",
    command: "Undo that",
    aliases: ["Undo", "Ctrl Z"],
    description: "Reverses the previous typing or editing action.",
    payload: { actionType: "windows_action", subAction: "key_combo", keys: "^z" },
  },
  {
    id: "redo_that",
    category: "Mouse & Keyboard",
    action: "Redo That",
    command: "Redo that",
    aliases: ["Redo", "Ctrl Y"],
    description: "Reapplies the last undone action.",
    payload: { actionType: "windows_action", subAction: "key_combo", keys: "^y" },
  },
  {
    id: "touch_keyboard",
    category: "Mouse & Keyboard",
    action: "Touch / On-Screen Keyboard",
    command: "Show touch keyboard",
    aliases: ["Open on-screen keyboard", "Virtual keyboard"],
    description: "Opens the native Windows touch or on-screen keyboard (OSK).",
    payload: { actionType: "windows_action", subAction: "touch_keyboard" },
  },

  // 4. SCREEN OVERLAYS (NUMBERS & GRID)
  {
    id: "show_numbers",
    category: "Screen Overlays",
    action: "Show Numbers Overlay",
    command: "Show numbers",
    aliases: ["Show labels", "Number elements"],
    description: "Displays numbered badges over interactive buttons and controls on screen.",
    payload: { actionType: "show_overlay", overlay: "numbers" },
  },
  {
    id: "hide_numbers",
    category: "Screen Overlays",
    action: "Hide Numbers Overlay",
    command: "Hide numbers",
    aliases: ["Clear numbers", "Dismiss numbers"],
    description: "Hides all numbered element tags.",
    payload: { actionType: "show_overlay", overlay: "none" },
  },
  {
    id: "click_number",
    category: "Screen Overlays",
    action: "Click Number Badge",
    command: "Click <number>",
    aliases: ["<number>", "Choose <number>"],
    description: "Clicks the target element corresponding to the numbered tag.",
    payload: { actionType: "overlay_click", number: 1 },
  },
  {
    id: "show_grid",
    category: "Screen Overlays",
    action: "Show Mouse Grid",
    command: "Show grid",
    aliases: ["Mouse grid", "Coordinate grid"],
    description: "Displays a 3x3 numbered grid covering the entire display for precise mouse targeting.",
    payload: { actionType: "show_overlay", overlay: "grid" },
  },
  {
    id: "hide_grid",
    category: "Screen Overlays",
    action: "Hide Mouse Grid",
    command: "Hide grid",
    aliases: ["Close grid", "Cancel grid"],
    description: "Dismisses the mouse coordinate grid overlay.",
    payload: { actionType: "show_overlay", overlay: "none" },
  },
  {
    id: "grid_drill",
    category: "Screen Overlays",
    action: "Grid Drill-Down",
    command: "<1-9>",
    aliases: ["Mouse grid <1-9>", "Zoom <1-9>"],
    description: "Subdivides the selected quadrant into another 3x3 grid for pixel-perfect targeting.",
    payload: { actionType: "grid_select", cell: 5 },
  },

  // 5. DICTATION & EDITING
  {
    id: "dictate_text",
    category: "Dictation & Editing",
    action: "Type Text Directly",
    command: "Type <text>",
    aliases: ["Enter <text>", "Write <text>"],
    description: "Types words directly into the currently focused text field.",
    payload: { actionType: "dictate_text", text: "Hello World" },
  },
  {
    id: "delete_that",
    category: "Dictation & Editing",
    action: "Delete Last Spoken Text",
    command: "Delete that",
    aliases: ["Backspace that", "Clear that"],
    description: "Deletes the last spoken utterance or selected text.",
    payload: { actionType: "windows_action", subAction: "key_press", key: "Backspace" },
  },
  {
    id: "backspace_times",
    category: "Dictation & Editing",
    action: "Backspace N Times",
    command: "Backspace 5 times",
    aliases: ["Delete 3 characters", "Press backspace <count> times"],
    description: "Removes multiple characters in rapid succession.",
    payload: { actionType: "windows_action", subAction: "key_repeat", key: "Backspace", count: 5 },
  },
  {
    id: "clear_selection",
    category: "Dictation & Editing",
    action: "Clear Selection",
    command: "Clear selection",
    aliases: ["Unselect", "Deselect"],
    description: "Deselects the currently highlighted text.",
    payload: { actionType: "windows_action", subAction: "key_press", key: "Right" },
  },

  // 6. FORMATTING & PUNCTUATION
  {
    id: "format_bold",
    category: "Formatting & Punctuation",
    action: "Make Bold",
    command: "Bold that",
    aliases: ["Make bold", "Ctrl B"],
    description: "Applies bold formatting to selected text (Ctrl+B).",
    payload: { actionType: "windows_action", subAction: "key_combo", keys: "^b" },
  },
  {
    id: "format_italic",
    category: "Formatting & Punctuation",
    action: "Make Italic",
    command: "Italicize that",
    aliases: ["Make italic", "Ctrl I"],
    description: "Applies italic formatting to selected text (Ctrl+I).",
    payload: { actionType: "windows_action", subAction: "key_combo", keys: "^i" },
  },
  {
    id: "format_underline",
    category: "Formatting & Punctuation",
    action: "Make Underline",
    command: "Underline that",
    aliases: ["Make underline", "Ctrl U"],
    description: "Underlines selected text (Ctrl+U).",
    payload: { actionType: "windows_action", subAction: "key_combo", keys: "^u" },
  },
  {
    id: "format_uppercase",
    category: "Formatting & Punctuation",
    action: "Uppercase Text",
    command: "Make that uppercase",
    aliases: ["All caps that", "Capitalize all"],
    description: "Converts selected text or words to uppercase.",
    payload: { actionType: "format_text", style: "uppercase" },
  },
  {
    id: "format_lowercase",
    category: "Formatting & Punctuation",
    action: "Lowercase Text",
    command: "Make that lowercase",
    aliases: ["Lower that", "Small letters"],
    description: "Converts selected text to lowercase.",
    payload: { actionType: "format_text", style: "lowercase" },
  },
  {
    id: "new_line",
    category: "Formatting & Punctuation",
    action: "New Line / Paragraph",
    command: "New line",
    aliases: ["New paragraph", "Press Enter"],
    description: "Inserts a line break into the current document or chat.",
    payload: { actionType: "windows_action", subAction: "key_press", key: "Enter" },
  },
  {
    id: "punctuation_symbols",
    category: "Formatting & Punctuation",
    action: "Spoken Punctuation",
    command: "Comma, Period, Question mark, Colon, At sign",
    aliases: ["Exclamation mark", "Dollar sign", "Hash", "Percent"],
    description: "Speak symbols naturally: 'Period' (.), 'Comma' (,), 'Question mark' (?).",
    payload: { actionType: "dictate_text", text: "." },
  },

  // 7. POWER & SYSTEM CONTROL
  {
    id: "lock_screen",
    category: "PC Power & System",
    action: "Lock Workstation",
    command: "Lock screen",
    aliases: ["Lock PC", "Lock computer", "Win L"],
    description: "Instantly locks your Windows desktop session securely.",
    payload: { actionType: "windows_action", subAction: "lock_pc" },
  },
  {
    id: "sleep_pc",
    category: "PC Power & System",
    action: "Sleep PC",
    command: "Sleep PC",
    aliases: ["Put computer to sleep", "Suspend PC"],
    description: "Puts the Windows computer into low-power sleep state.",
    payload: { actionType: "windows_action", subAction: "sleep_pc" },
  },
  {
    id: "restart_pc",
    category: "PC Power & System",
    action: "Restart PC",
    command: "Restart PC",
    aliases: ["Reboot computer", "Restart Windows"],
    description: "Restarts the PC safely with a cancellation grace period.",
    payload: { actionType: "windows_action", subAction: "restart_pc" },
  },
  {
    id: "shutdown_pc",
    category: "PC Power & System",
    action: "Shutdown PC",
    command: "Shutdown PC",
    aliases: ["Turn off computer", "Power down PC"],
    description: "Safely powers down your Windows computer with a cancellation timer.",
    payload: { actionType: "windows_action", subAction: "shutdown_pc" },
  },
];

interface CommandsCheatSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExecuteCommand?: (item: CommandItem) => void;
}

export const CommandsCheatSheetModal: React.FC<CommandsCheatSheetModalProps> = ({
  isOpen,
  onClose,
  onExecuteCommand,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [executingId, setExecutingId] = useState<string | null>(null);

  const categories = useMemo(() => {
    const set = new Set(ALL_VANI_COMMANDS.map((c) => c.category));
    return ["All", ...Array.from(set)];
  }, []);

  const filteredCommands = useMemo(() => {
    return ALL_VANI_COMMANDS.filter((cmd) => {
      const matchesCategory =
        selectedCategory === "All" || cmd.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        cmd.action.toLowerCase().includes(query) ||
        cmd.command.toLowerCase().includes(query) ||
        cmd.description.toLowerCase().includes(query) ||
        (cmd.aliases && cmd.aliases.some((a) => a.toLowerCase().includes(query)))
      );
    });
  }, [searchQuery, selectedCategory]);

  const handleCopy = (cmd: CommandItem) => {
    navigator.clipboard.writeText(cmd.command);
    setCopiedId(cmd.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleExecute = async (cmd: CommandItem) => {
    setExecutingId(cmd.id);
    try {
      if (onExecuteCommand) {
        onExecuteCommand(cmd);
      }
    } finally {
      setTimeout(() => setExecutingId(null), 800);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-5xl h-[88vh] bg-zinc-950 border border-emerald-500/30 rounded-2xl shadow-2xl overflow-hidden text-zinc-100 font-sans">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <CommandIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  Bharat Vani — Windows Voice Access Guide
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-500/30">
                  Vani Edition
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Say any command starting with or mentioning <span className="text-emerald-300 font-semibold">"Vani"</span> to control your PC, apps, keyboard, mouse & windows.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Close Guide (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="px-6 py-3 border-b border-zinc-800 bg-zinc-900/30 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search Voice Access commands (e.g. 'wake up', 'grid', 'snap', 'close window')..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-zinc-900/90 border border-zinc-700/70 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-full no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? "bg-emerald-500 text-zinc-950 font-semibold shadow-lg shadow-emerald-500/20"
                    : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-800"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Commands List Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {filteredCommands.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center text-zinc-400">
              <CommandIcon className="w-12 h-12 text-zinc-600 mb-3" />
              <p className="text-base font-semibold text-zinc-300">No commands match "{searchQuery}"</p>
              <p className="text-xs text-zinc-500 mt-1">
                Try searching for "numbers", "window", "click", or "sleep".
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("All");
                }}
                className="mt-4 px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-emerald-400 rounded-lg"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredCommands.map((cmd) => (
                <div
                  key={cmd.id}
                  className="group relative flex flex-col justify-between p-4 rounded-xl bg-zinc-900/60 hover:bg-zinc-900/95 border border-zinc-800 hover:border-emerald-500/40 transition-all shadow-sm hover:shadow-md"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-400/90 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {cmd.category}
                      </span>
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleCopy(cmd)}
                          title="Copy command"
                          className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                        >
                          {copiedId === cmd.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleExecute(cmd)}
                          title="Test / Run this command"
                          className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-300 text-[11px] font-medium border border-emerald-500/30 transition-all"
                        >
                          <Play className="w-3 h-3 fill-emerald-400 text-emerald-400" />
                          {executingId === cmd.id ? "Running..." : "Test Run"}
                        </button>
                      </div>
                    </div>

                    <h3 className="text-sm font-semibold text-zinc-100">{cmd.action}</h3>

                    {/* Primary Voice Utterance */}
                    <div className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-zinc-950/80 border border-zinc-800/80">
                      <Mic className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-xs font-mono font-medium text-emerald-300 select-all">
                        "{cmd.command}"
                      </span>
                    </div>

                    {/* Aliases */}
                    {cmd.aliases && cmd.aliases.length > 0 && (
                      <div className="mt-2 flex flex-wrap items-center gap-1 text-[11px] text-zinc-400">
                        <span className="text-zinc-500 font-medium">Or say:</span>
                        {cmd.aliases.map((alias, i) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.5 rounded bg-zinc-800/60 text-zinc-300 font-mono text-[10px]"
                          >
                            "{alias}"
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                      {cmd.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>
              Say <strong className="text-emerald-300">"What can I say"</strong> or{" "}
              <strong className="text-emerald-300">"Show commands"</strong> anytime to re-open this guide.
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};

