import React, { useState } from "react";
import { AutoStartConfig, UserProfile } from "../types";
import {
  Power,
  CheckCircle2,
  Download,
  Copy,
  Check,
  Terminal,
  Laptop,
  Sparkles,
  Info,
  X,
  Play,
  RotateCcw,
  Sliders,
} from "lucide-react";
import { sfx, speakText } from "../utils/audioSynthesizer";

interface WindowsAutoStartModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AutoStartConfig;
  onUpdateConfig: (newConfig: Partial<AutoStartConfig>) => void;
  activeProfile: UserProfile;
}

export const WindowsAutoStartModal: React.FC<WindowsAutoStartModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  activeProfile,
}) => {
  const [copiedScript, setCopiedScript] = useState(false);
  const [isSimulatingBoot, setIsSimulatingBoot] = useState(false);

  if (!isOpen) return null;

  const powershellCommand = `$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut("$env:APPDATA\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\BharatVani.lnk"); $Shortcut.TargetPath = "msedge.exe"; $Shortcut.Arguments = "--app=${window.location.origin}"; $Shortcut.Save(); Write-Host "Bharat Vani added to Startup!"`;

  const handleCopyPowershell = () => {
    navigator.clipboard.writeText(powershellCommand);
    setCopiedScript(true);
    sfx.playActionChime();
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const handleDownloadBatch = () => {
    sfx.playActionChime();
    window.open("/api/system/autostart/script", "_blank");
  };

  const handleSimulateBoot = () => {
    setIsSimulatingBoot(true);
    sfx.playWakeChime();

    setTimeout(() => {
      sfx.playActionChime();
      if (config.playGreetingOnBoot) {
        speakText(
          `Windows system boot sequence complete. Namaste ${activeProfile.name}! Bharat Vani AI is online and standing by.`,
          {
            rate: activeProfile.speechRate || 1.0,
            pitch: activeProfile.speechPitch || 1.0,
            language: activeProfile.preferredLanguage || "en-IN",
          }
        );
      }
      setIsSimulatingBoot(false);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Power className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Windows Auto-Start on System Boot</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-medium border border-emerald-500/30">
                  {config.enabled ? "Active" : "Disabled"}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Always launch Bharat Vani automatically when your PC is turned on
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Main Switches Card */}
          <div className="bg-slate-850/80 border border-slate-800 rounded-2xl p-4 space-y-4">
            {/* 1. Toggle Always Start on System Boot */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-sky-400" />
                  <span>Start automatically when PC is turned on</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Registers Bharat Vani in Windows Startup so it wakes up as soon as your computer boots up.
                </p>
              </div>
              <button
                onClick={() => {
                  sfx.playTap();
                  onUpdateConfig({ enabled: !config.enabled });
                }}
                className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                  config.enabled ? "bg-emerald-500" : "bg-slate-700"
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    config.enabled ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div className="h-px bg-slate-800" />

            {/* 3. Toggle Voice Greeting on Startup */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Play className="w-4 h-4 text-emerald-400" />
                  <span>Play spoken voice greeting on boot</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Speaks personalized voice greetings ("Namaste {activeProfile.name}! Bharat Vani is standing by.") upon boot.
                </p>
              </div>
              <button
                onClick={() => {
                  sfx.playTap();
                  onUpdateConfig({ playGreetingOnBoot: !config.playGreetingOnBoot });
                }}
                className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                  config.playGreetingOnBoot ? "bg-emerald-500" : "bg-slate-700"
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    config.playGreetingOnBoot ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Quick Windows Install Options */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-amber-400" />
              <span>1-Click Windows Setup Tools</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option A: Download Auto-Start Batch file */}
              <div className="bg-slate-800/50 border border-slate-700/70 hover:border-amber-500/40 rounded-2xl p-3.5 flex flex-col justify-between gap-3 transition-colors">
                <div>
                  <div className="font-semibold text-xs text-slate-200 flex items-center gap-1.5">
                    <Download className="w-4 h-4 text-amber-400" />
                    <span>Download Windows Installer</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Downloads <code className="text-amber-300">BharatVani_AutoStart_Setup.bat</code>. Double-click once to register in Windows Startup!
                  </p>
                </div>
                <button
                  onClick={handleDownloadBatch}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .bat Installer</span>
                </button>
              </div>

              {/* Option B: Copy PowerShell 1-Liner */}
              <div className="bg-slate-800/50 border border-slate-700/70 hover:border-sky-500/40 rounded-2xl p-3.5 flex flex-col justify-between gap-3 transition-colors">
                <div>
                  <div className="font-semibold text-xs text-slate-200 flex items-center gap-1.5">
                    <Terminal className="w-4 h-4 text-sky-400" />
                    <span>PowerShell Quick Command</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Instantly creates a desktop app shortcut in your Windows <code className="text-sky-300">shell:startup</code> directory.
                  </p>
                </div>
                <button
                  onClick={handleCopyPowershell}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-sky-500/50 text-slate-200 text-xs font-semibold transition-all cursor-pointer"
                >
                  {copiedScript ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300">Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-sky-400" />
                      <span>Copy PowerShell Command</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Test / Simulate Boot Button */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-800/80 to-slate-900 border border-slate-700/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <RotateCcw className={`w-4 h-4 ${isSimulatingBoot ? "animate-spin text-amber-400" : ""}`} />
              </div>
              <div>
                <h5 className="text-xs font-semibold text-slate-200">
                  Preview System Boot Sequence
                </h5>
                <p className="text-[11px] text-slate-400">
                  Test the exact startup sound and spoken welcome message right now
                </p>
              </div>
            </div>
            <button
              onClick={handleSimulateBoot}
              disabled={isSimulatingBoot}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-semibold text-slate-200 cursor-pointer transition-all shrink-0"
            >
              {isSimulatingBoot ? "Booting..." : "Test Boot"}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-amber-400" />
            <span>Shortcut location: %APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
