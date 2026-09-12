import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  Search,
  Crop,
  FileText,
  HelpCircle,
  Upload,
  Camera,
  Monitor,
  Copy,
  Check,
  Volume2,
  ExternalLink,
  Sparkles,
  Loader2,
  Keyboard,
} from "lucide-react";
import {
  VisionMode,
  VisionAnalysisResult,
  CropArea,
  UserProfile,
  LanguageMode,
} from "../types";
import { sfx, speakText } from "../utils/audioSynthesizer";

interface ScreenSelectSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProfile: UserProfile;
  languageMode: LanguageMode;
  onSendToChat?: (text: string, spokenText: string) => void;
}

export function ScreenSelectSearchModal({
  isOpen,
  onClose,
  activeProfile,
  languageMode,
  onSendToChat,
}: ScreenSelectSearchModalProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [cropArea, setCropArea] = useState<CropArea | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  const [mode, setMode] = useState<VisionMode>("search");
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [result, setResult] = useState<VisionAnalysisResult | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Default snapshot generation if no screenshot exists yet
  const generateQuickScreenSnapshot = useCallback(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      // Create a stylish realistic Windows 11 desktop mockup
      const grad = ctx.createLinearGradient(0, 0, 1280, 720);
      grad.addColorStop(0, "#0b132b");
      grad.addColorStop(1, "#1c2541");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1280, 720);

      // Taskbar
      ctx.fillStyle = "#090d16";
      ctx.fillRect(0, 672, 1280, 48);

      // Windows logo
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(620, 682, 12, 12);
      ctx.fillRect(636, 682, 12, 12);
      ctx.fillRect(620, 698, 12, 12);
      ctx.fillRect(636, 698, 12, 12);

      // Active App Window: VS Code / Web Browser
      ctx.fillStyle = "#1e293b";
      ctx.roundRect(80, 60, 1120, 560, [12]);
      ctx.fill();

      // Window Header
      ctx.fillStyle = "#0f172a";
      ctx.roundRect(80, 60, 1120, 42, [12, 12, 0, 0]);
      ctx.fill();

      // Window controls
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(110, 81, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f59e0b";
      ctx.beginPath();
      ctx.arc(130, 81, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#10b981";
      ctx.beginPath();
      ctx.arc(150, 81, 6, 0, Math.PI * 2);
      ctx.fill();

      // Title
      ctx.fillStyle = "#cbd5e1";
      ctx.font = "bold 15px sans-serif";
      ctx.fillText("Windows Terminal / VS Code - Bharat Vani Active Session", 180, 86);

      // Code text
      ctx.fillStyle = "#f8fafc";
      ctx.font = "16px monospace";
      ctx.fillText("// Bharat Vani AI Screen Vision & Search Assistant", 110, 150);
      ctx.fillStyle = "#38bdf8";
      ctx.fillText("const assistant = new BharatVani({ voice: 'en-IN', os: 'Windows 11' });", 110, 185);
      ctx.fillStyle = "#f59e0b";
      ctx.fillText("await assistant.listenAndSearch(); // Press Alt+S to highlight this block", 110, 220);
      ctx.fillStyle = "#a855f7";
      ctx.fillText("// Try highlighting any code line, error message, or diagram!", 110, 255);

      // Sample error block
      ctx.fillStyle = "#451a1a";
      ctx.roundRect(110, 300, 1060, 100, [8]);
      ctx.fill();
      ctx.fillStyle = "#f87171";
      ctx.font = "15px monospace";
      ctx.fillText("Error: ETIMEDOUT connect 127.0.0.1:5432 - Database connection failed", 130, 335);
      ctx.fillStyle = "#fca5a5";
      ctx.font = "13px monospace";
      ctx.fillText("Tip: Highlight this error box with your mouse to ask Gemini 3.8 Flash for an instant fix.", 130, 370);

      setImageSrc(canvas.toDataURL("image/png"));
    }
  }, []);

  // Initialize or capture on open
  useEffect(() => {
    if (isOpen && !imageSrc) {
      generateQuickScreenSnapshot();
    }
  }, [isOpen, imageSrc, generateQuickScreenSnapshot]);

  // Handle Clipboard Paste (Ctrl+V screenshot)
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              if (event.target?.result) {
                setImageSrc(event.target.result as string);
                setCropArea(null);
                setResult(null);
                sfx.playChirp();
              }
            };
            reader.readAsDataURL(file);
          }
          break;
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [isOpen]);

  if (!isOpen) return null;

  // File upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImageSrc(event.target.result as string);
          setCropArea(null);
          setResult(null);
          sfx.playChirp();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Live Screen Capture Trigger
  const handleCaptureLiveScreen = async () => {
    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        throw new Error("Screen sharing not supported");
      }
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      const video = document.createElement("video");
      video.srcObject = stream;
      await video.play();

      setTimeout(() => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 1920;
        canvas.height = video.videoHeight || 1080;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          setImageSrc(canvas.toDataURL("image/png"));
          setCropArea(null);
          setResult(null);
          sfx.playActionChime();
        }
        stream.getTracks().forEach((track) => track.stop());
      }, 300);
    } catch (err) {
      console.warn("Screen grab declined or unavailable:", err);
    }
  };

  // Live Camera Snapshot Trigger
  const handleCaptureCamera = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera not supported");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });

      const video = document.createElement("video");
      video.srcObject = stream;
      await video.play();

      setTimeout(() => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          setImageSrc(canvas.toDataURL("image/png"));
          setCropArea(null);
          setResult(null);
          sfx.playActionChime();
        }
        stream.getTracks().forEach((track) => track.stop());
      }, 300);
    } catch (err) {
      console.warn("Camera grab declined or unavailable:", err);
    }
  };

  // Canvas selection drag
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setIsDragging(true);
    setDragStart({ x, y });
    setCropArea({ x, y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStart) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const currentX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const currentY = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

    const x = Math.min(dragStart.x, currentX);
    const y = Math.min(dragStart.y, currentY);
    const width = Math.abs(currentX - dragStart.x);
    const height = Math.abs(currentY - dragStart.y);

    setCropArea({ x, y, width, height });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  // Execute Analysis
  const handleAnalyze = async (targetMode: VisionMode = mode, promptOverride?: string) => {
    if (!imageSrc) return;
    setIsAnalyzing(true);
    sfx.playTap();

    try {
      let finalImage = imageSrc;

      // Crop if box selected
      if (cropArea && cropArea.width > 10 && cropArea.height > 10) {
        finalImage = await new Promise<string>((resolve) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = cropArea.width;
            canvas.height = cropArea.height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(
                img,
                cropArea.x,
                cropArea.y,
                cropArea.width,
                cropArea.height,
                0,
                0,
                cropArea.width,
                cropArea.height
              );
              resolve(canvas.toDataURL("image/png"));
            } else {
              resolve(imageSrc);
            }
          };
          img.onerror = () => resolve(imageSrc);
          img.src = imageSrc;
        });
      }

      const queryToSend = promptOverride || customPrompt;

      const res = await fetch("/api/vision/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: finalImage,
          prompt: queryToSend,
          mode: targetMode,
          source: "screen",
          languagePreference: languageMode,
          cropArea: cropArea || undefined,
          userName: activeProfile.name,
        }),
      });

      const data = await res.json();
      const newResult: VisionAnalysisResult = {
        id: `vis-modal-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
        source: "screen",
        mode: targetMode,
        imageUrl: finalImage,
        cropArea: cropArea || undefined,
        displayText: data.displayText || "Analysis complete.",
        spokenResponse: data.spokenResponse || "Visual analysis complete.",
        groundingSources: data.groundingSources || [],
        prompt: queryToSend,
        engine: data.engine || "gemini-3.8-flash",
      };

      setResult(newResult);
      sfx.playActionChime();

      speakText(newResult.spokenResponse, {
        pitch: activeProfile.speechPitch || 1.0,
        rate: activeProfile.speechRate || 1.0,
        language: languageMode,
      });

      if (onSendToChat) {
        onSendToChat(
          `🔍 **Screen Select & Search**: ${newResult.displayText}`,
          newResult.spokenResponse
        );
      }
    } catch (err: any) {
      console.error("Modal analysis error:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div
      id="screen-select-search-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Crop className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide">
                  Screen Select & Search
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Keyboard className="w-3 h-3" />
                  Alt + S
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Drag a box to select any code, text, error, or image on your screen to search with Google Grounding.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCaptureLiveScreen}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
              title="Grab active live screen frame"
            >
              <Monitor className="w-3.5 h-3.5 text-sky-400" />
              <span>Capture Screen</span>
            </button>
            <button
              onClick={handleCaptureCamera}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
              title="Grab camera snapshot"
            >
              <Camera className="w-3.5 h-3.5 text-emerald-400" />
              <span>Camera</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span>Upload</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Crop Canvas on Left / Results on Right */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Crop Canvas View (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            <div
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className="relative w-full aspect-video bg-slate-950 rounded-2xl border-2 border-slate-800 hover:border-slate-700 overflow-hidden flex items-center justify-center cursor-crosshair select-none shadow-xl"
            >
              {imageSrc ? (
                <img
                  src={imageSrc}
                  alt="Target viewport"
                  className="w-full h-full object-contain pointer-events-none"
                />
              ) : (
                <div className="text-center p-6 text-slate-500">
                  <p className="text-xs">Generating desktop viewport...</p>
                </div>
              )}

              {/* Crop Boundary Box */}
              {cropArea && cropArea.width > 5 && cropArea.height > 5 && (
                <div
                  style={{
                    left: `${cropArea.x}px`,
                    top: `${cropArea.y}px`,
                    width: `${cropArea.width}px`,
                    height: `${cropArea.height}px`,
                  }}
                  className="absolute border-2 border-amber-400 bg-amber-500/20 backdrop-brightness-110 pointer-events-none shadow-md z-20"
                >
                  <div className="absolute -top-5 left-0 bg-amber-500 text-slate-950 font-mono text-[9px] font-bold px-1 rounded">
                    {Math.round(cropArea.width)} x {Math.round(cropArea.height)}
                  </div>
                </div>
              )}

              {/* Guide Overlay */}
              <div className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-xs border border-slate-700/60 rounded-md px-2 py-0.5 text-[10px] text-slate-300 font-mono">
                {cropArea ? "Selection active" : "Click & drag anywhere to select"} • Paste (Ctrl+V) supported
              </div>
            </div>

            {/* Quick Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/60 border border-slate-800 p-2.5 rounded-xl">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleAnalyze("search")}
                  disabled={isAnalyzing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-xs font-bold transition-all cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5 text-sky-400" />
                  <span>Google Search</span>
                </button>
                <button
                  onClick={() => handleAnalyze("ocr")}
                  disabled={isAnalyzing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition-all cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Extract Text (OCR)</span>
                </button>
                <button
                  onClick={() => handleAnalyze("explain")}
                  disabled={isAnalyzing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Explain & Fix</span>
                </button>
              </div>

              {cropArea && (
                <button
                  onClick={() => setCropArea(null)}
                  className="text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800"
                >
                  Clear Selection
                </button>
              )}
            </div>
          </div>

          {/* Results Panel (5 cols) */}
          <div className="lg:col-span-5 flex flex-col bg-slate-950/80 border border-slate-800 rounded-2xl p-4 min-h-[380px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Gemini 3.8 Flash Vision Grounding</span>
              </span>

              {result && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(result.displayText);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="p-1 text-slate-400 hover:text-amber-400 rounded"
                    title="Copy text"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() =>
                      speakText(result.spokenResponse, {
                        pitch: activeProfile.speechPitch || 1.0,
                        rate: activeProfile.speechRate || 1.0,
                        language: languageMode,
                      })
                    }
                    className="p-1 text-slate-400 hover:text-amber-400 rounded"
                    title="Speak response"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 py-3 overflow-y-auto max-h-[320px] text-xs leading-relaxed">
              {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                  <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                  <p className="font-semibold text-slate-300">Searching & Analyzing Selection...</p>
                  <p className="text-[11px] text-slate-500">Grounded with live Google Search</p>
                </div>
              ) : result ? (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 whitespace-pre-wrap font-sans">
                    {result.displayText}
                  </div>

                  {result.groundingSources && result.groundingSources.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-800">
                      <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block">
                        Web Sources:
                      </span>
                      {result.groundingSources.map((s, idx) => (
                        <a
                          key={idx}
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-sky-500/40 text-sky-300 text-[11px] transition-colors"
                        >
                          <span className="truncate max-w-[220px]">{s.title}</span>
                          <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500 gap-2">
                  <Crop className="w-8 h-8 opacity-40 text-amber-400" />
                  <p className="font-medium text-slate-400 text-xs">Ready for Selection</p>
                  <p className="text-[11px] max-w-xs">
                    Highlight a region on the viewport and click "Google Search", "Extract Text", or "Explain & Fix".
                  </p>
                </div>
              )}
            </div>

            {/* Custom Question input */}
            <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
              <input
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isAnalyzing) {
                    handleAnalyze("custom");
                  }
                }}
                placeholder="Ask custom question about this area..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden"
              />
              <button
                onClick={() => handleAnalyze("custom")}
                disabled={isAnalyzing}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50"
              >
                Search
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
