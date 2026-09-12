import React, { useState } from "react";
import { PYTHON_MODULES } from "../data/pythonCode";
import { PythonModuleFile } from "../types";
import {
  Folder,
  FileCode,
  Download,
  Copy,
  Check,
  Terminal,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Layers,
  FileText,
} from "lucide-react";
import JSZip from "jszip";

export const PythonProjectExplorer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<PythonModuleFile>(PYTHON_MODULES[0]);
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(selectedFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();

      // Add project README
      const readmeContent = `# 🇮🇳 Bharat Vani (Voice of India) — Windows AI Voice Assistant
Directly controls your Windows PC, speaks Indian English, and is powered by Google Gemini AI!

## 📁 Installation & Run (on Windows)
Target location: your chosen installation folder

1. Extract all files into your chosen folder.
2. Make sure Python 3.10+ is installed on your Windows PC.
3. Double-click \`run.bat\` OR run in Terminal:
   \`\`\`bash
   pip install -r requirements.txt
   python main.py
   \`\`\`
4. Speak:
   - "Hey Vani, open Chrome"
   - "Hey Vani, send a message on WhatsApp"
   - "Namaste Vani, take a screenshot"
   - "Lock my PC"
`;
      zip.file("README.md", readmeContent);

      // Add all core modules
      PYTHON_MODULES.forEach((mod) => {
        zip.file(mod.path, mod.code);
      });

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Bharat_Vani_Windows_Assistant.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Failed to generate zip:", e);
      alert("Error generating zip download.");
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800/90 overflow-hidden shadow-2xl flex flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 gap-2">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-amber-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
            Windows Source Code Explorer (chosen installation folder)
          </h2>
          <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700 font-mono">
            600+ Lines Python
          </span>
        </div>

        {/* Download Full Zip Button */}
        <button
          onClick={handleDownloadZip}
          disabled={isZipping}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs transition-all shadow-md shadow-amber-500/10 cursor-pointer"
          title="Download the entire ready-to-run Windows package"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{isZipping ? "Packaging ZIP..." : "Download Windows Project (.ZIP)"}</span>
        </button>
      </div>

      {/* Main Grid: Sidebar File Tree & Code Viewer */}
      <div className="grid grid-cols-1 md:grid-cols-12 min-h-[420px]">
        {/* Left: File Tree */}
        <div className="md:col-span-4 bg-slate-950/60 border-r border-slate-800 p-3 space-y-1.5">
          <div className="text-[10px] font-mono uppercase text-slate-500 px-2 py-1 flex items-center gap-1">
            <Folder className="w-3 h-3 text-amber-400" />
            <span>Project Directory</span>
          </div>

          <div className="space-y-1">
            {PYTHON_MODULES.map((file) => {
              const isSelected = selectedFile.path === file.path;
              return (
                <button
                  key={file.path}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-mono flex items-center justify-between transition-all cursor-pointer ${
                    isSelected
                      ? "bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileCode
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isSelected ? "text-amber-400" : "text-slate-500"
                      }`}
                    />
                    <span className="truncate">{file.path}</span>
                  </div>
                  {isSelected && <ChevronRight className="w-3 h-3 text-amber-400 shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Quick Windows Run Instructions */}
          <div className="mt-4 p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-slate-400 space-y-1 font-mono">
            <div className="text-amber-400 font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>How To Run on Windows</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-normal">
              1. Download ZIP and extract it to your chosen folder.
            </p>
            <p className="text-[10px] text-slate-400 leading-normal">
              2. Double click <code className="text-amber-300">run.bat</code>
            </p>
            <p className="text-[10px] text-slate-400 leading-normal">
              3. Speak <strong className="text-slate-200">"Hey Vani"</strong> 🇮🇳
            </p>
          </div>
        </div>

        {/* Right: Code Viewer */}
        <div className="md:col-span-8 flex flex-col bg-slate-950/90">
          {/* File Tab Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-slate-900/70 border-b border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-mono text-slate-200 font-bold">{selectedFile.path}</span>
              <span className="text-[11px] text-slate-500 hidden sm:inline">
                — {selectedFile.description}
              </span>
            </div>

            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1 text-[11px] font-mono text-slate-300 hover:text-white px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>

          {/* Code Pre Block */}
          <div className="flex-1 p-4 overflow-auto max-h-[440px] font-mono text-xs text-slate-300 scrollbar-thin scrollbar-thumb-slate-800">
            <pre className="leading-relaxed whitespace-pre font-mono">
              <code>{selectedFile.code}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
