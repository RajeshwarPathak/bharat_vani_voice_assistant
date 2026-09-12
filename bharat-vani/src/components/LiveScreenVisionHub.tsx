import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Monitor,
  Camera,
  Search,
  FileText,
  HelpCircle,
  Play,
  Square,
  Volume2,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Crop,
  Layers,
  RefreshCw,
  Maximize2,
  AlertCircle,
  Sliders,
  Send,
  Loader2,
  Keyboard,
  Info,
} from "lucide-react";
import {
  VisionSource,
  VisionMode,
  VisionAnalysisResult,
  CropArea,
  UserProfile,
  LanguageMode,
} from "../types";
import { sfx, speakText } from "../utils/audioSynthesizer";

interface LiveScreenVisionHubProps {
  activeProfile: UserProfile;
  languageMode: LanguageMode;
  onSendToChat?: (text: string, spokenText: string) => void;
}

export function LiveScreenVisionHub({
  activeProfile,
  languageMode,
  onSendToChat,
}: LiveScreenVisionHubProps) {
  const [source, setSource] = useState<VisionSource>("screen");
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [streamError, setStreamError] = useState<string | null>(null);

  // Video and Canvas Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Frozen / Captured Frame for Selection
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState<boolean>(false);
  const [cropArea, setCropArea] = useState<CropArea | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  // Analysis State
  const [mode, setMode] = useState<VisionMode>("search");
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [currentResult, setCurrentResult] = useState<VisionAnalysisResult | null>(null);
  const [history, setHistory] = useState<VisionAnalysisResult[]>([]);
  const [copied, setCopied] = useState<boolean>(false);

  // Resolution and FPS Stats
  const [streamStats, setStreamStats] = useState<{ width: number; height: number; fps: number }>({
    width: 1920,
    height: 1080,
    fps: 30,
  });

  // Stop active stream cleanly
  const stopStream = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  }, []);

  // Start Screen or Camera Stream
  const startStream = useCallback(
    async (selectedSource: VisionSource) => {
      stopStream();
      setStreamError(null);

      try {
        let stream: MediaStream;
        if (selectedSource === "screen") {
          if (!navigator.mediaDevices?.getDisplayMedia) {
            throw new Error("Screen capture is not supported in this browser environment.");
          }
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              cursor: "always",
              displaySurface: "monitor",
            } as any,
            audio: false,
          });
        } else {
          if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error("Camera access is not supported in this browser environment.");
          }
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: "user",
            },
            audio: false,
          });
        }

        mediaStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }

        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          const settings = videoTrack.getSettings();
          setStreamStats({
            width: settings.width || 1280,
            height: settings.height || 720,
            fps: Math.round(settings.frameRate || 30),
          });

          videoTrack.onended = () => {
            stopStream();
          };
        }

        setIsStreaming(true);
        sfx.playChirp();
      } catch (err: any) {
        console.warn("Stream start error:", err);
        setStreamError(
          err.name === "NotAllowedError"
            ? `Permission denied. Please allow ${selectedSource === "screen" ? "screen sharing" : "camera access"} when prompted.`
            : err.message || `Failed to access ${selectedSource}.`
        );
        setIsStreaming(false);
      }
    },
    [stopStream]
  );

  // Switch Source handler
  const handleSwitchSource = (newSource: VisionSource) => {
    setSource(newSource);
    setCropArea(null);
    if (isStreaming) {
      startStream(newSource);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  // Capture current video frame into a base64 snapshot
  const captureCurrentFrame = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      // Fallback: Generate simulated desktop / camera test frame if stream is unstarted
      const canvas = document.createElement("canvas");
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, 1280, 720);
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(40, 40, 1200, 640);
        ctx.fillStyle = "#f59e0b";
        ctx.font = "bold 28px sans-serif";
        ctx.fillText("Bharat Vani Windows Live Screen Simulator", 70, 100);
        ctx.fillStyle = "#94a3b8";
        ctx.font = "18px monospace";
        ctx.fillText("Active Window: VS Code - /workspace/src/App.tsx", 70, 150);
        ctx.fillText("Error: TS2339: Property 'user' does not exist on type 'UserProfile'", 70, 190);
        ctx.fillText("Status: Waiting for visual search query...", 70, 230);
        return canvas.toDataURL("image/png");
      }
      return null;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  }, []);

  // Enter Selection Mode (Freezes current live frame)
  const handleEnterSelectionMode = useCallback(() => {
    const frame = captureCurrentFrame();
    if (frame) {
      setCapturedImage(frame);
      setIsSelecting(true);
      setCropArea(null);
      sfx.playTap();
    }
  }, [captureCurrentFrame]);

  // Global Keyboard Shortcut: Alt + S or Ctrl + Shift + S triggers Select & Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.altKey && e.key.toLowerCase() === "s") ||
        (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "s")
      ) {
        e.preventDefault();
        handleEnterSelectionMode();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleEnterSelectionMode]);

  // Crop image to selected rectangle
  const getCroppedImageData = useCallback((): string | null => {
    const baseImg = capturedImage || captureCurrentFrame();
    if (!baseImg) return null;
    if (!cropArea) return baseImg;

    return new Promise<string | null>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const cropW = Math.max(20, cropArea.width);
        const cropH = Math.max(20, cropArea.height);
        canvas.width = cropW;
        canvas.height = cropH;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(baseImg);
          return;
        }

        ctx.drawImage(
          img,
          cropArea.x,
          cropArea.y,
          cropW,
          cropH,
          0,
          0,
          cropW,
          cropH
        );
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => resolve(baseImg);
      img.src = baseImg;
    }) as any;
  }, [capturedImage, captureCurrentFrame, cropArea]);

  // Handle Visual Search Execution
  const handleExecuteVisionAnalysis = async (
    targetMode: VisionMode = mode,
    promptOverride?: string
  ) => {
    setIsAnalyzing(true);
    sfx.playChirp();

    try {
      let finalImage = capturedImage;
      if (!finalImage) {
        finalImage = captureCurrentFrame();
      }

      // If cropped region exists, slice it
      if (cropArea && finalImage) {
        const cropped = await new Promise<string>((resolve) => {
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
              resolve(finalImage!);
            }
          };
          img.onerror = () => resolve(finalImage!);
          img.src = finalImage;
        });
        finalImage = cropped;
      }

      if (!finalImage) {
        throw new Error("Could not capture image frame from video stream.");
      }

      const promptToSend = promptOverride || customPrompt;

      const res = await fetch("/api/vision/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: finalImage,
          prompt: promptToSend,
          mode: targetMode,
          source,
          languagePreference: languageMode,
          cropArea: cropArea || undefined,
          userName: activeProfile.name,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      const result: VisionAnalysisResult = {
        id: `vis-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
        source,
        mode: targetMode,
        imageUrl: finalImage,
        cropArea: cropArea || undefined,
        displayText: data.displayText || "Analysis complete.",
        spokenResponse: data.spokenResponse || "Visual analysis complete.",
        groundingSources: data.groundingSources || [],
        prompt: promptToSend,
        engine: data.engine || "gemini-3.8-flash",
      };

      setCurrentResult(result);
      setHistory((prev) => [result, ...prev.slice(0, 7)]);
      sfx.playActionChime();

      // Automatically speak summary if enabled
      speakText(result.spokenResponse, {
        pitch: activeProfile.speechPitch || 1.0,
        rate: activeProfile.speechRate || 1.0,
        language: languageMode,
      });

      // Optionally sync to main chat log
      if (onSendToChat) {
        onSendToChat(
          `🔍 **Visual Inspection (${source.toUpperCase()})**: ${result.displayText}`,
          result.spokenResponse
        );
      }
    } catch (err: any) {
      console.error("Vision search failed:", err);
      const fallbackResult: VisionAnalysisResult = {
        id: `vis-err-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
        source,
        mode: targetMode,
        imageUrl: capturedImage || "",
        displayText: `⚠️ **Visual Analysis Notice**:\nCould not contact Gemini Vision API (${err.message}). Bharat Vani requires an active internet connection to perform real-time Google Search grounding and OCR on your live screen.`,
        spokenResponse: "Visual analysis request requires an active internet connection.",
        groundingSources: [],
        engine: "vision-inspector",
      };
      setCurrentResult(fallbackResult);
    } finally {
      setIsAnalyzing(false);
      setIsSelecting(false);
    }
  };

  // Mouse selection on Canvas for dragging crop box
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isSelecting) return;
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

  // Copy result text to clipboard
  const handleCopyText = () => {
    if (!currentResult) return;
    navigator.clipboard.writeText(currentResult.displayText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="live-screen-vision-hub" className="flex flex-col gap-6 w-full animate-in fade-in duration-300">
      {/* Top Banner: Status & Shortcut Instructions */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
            {source === "screen" ? <Monitor className="w-6 h-6" /> : <Camera className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide">
                Live {source === "screen" ? "Screen Vision" : "Camera Vision"} & Search
              </h2>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Gemini 3.8 Flash
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live screen/camera feed, interactive region crop, and real-time visual search with Google Grounding.
            </p>
          </div>
        </div>

        {/* Global Shortcut Badge */}
        <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-700/80 px-3.5 py-2 rounded-xl text-xs">
          <Keyboard className="w-4 h-4 text-amber-400" />
          <span className="text-slate-300 font-medium">Quick Crop Shortcut:</span>
          <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-600 text-amber-300 font-mono text-[11px] font-bold shadow-xs">
            Alt
          </kbd>
          <span className="text-slate-500">+</span>
          <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-600 text-amber-300 font-mono text-[11px] font-bold shadow-xs">
            S
          </kbd>
        </div>
      </div>

      {/* Main Grid: Stream Stage (Left 7 cols) & Vision Inspector / Results (Right 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Live Video Canvas Stage */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Controls Bar: Source Selector & Stream Toggle */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
            {/* Source Switcher Buttons */}
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                id="source-screen-btn"
                onClick={() => handleSwitchSource("screen")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                  source === "screen"
                    ? "bg-amber-500 text-slate-950 font-bold shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Live Screen</span>
              </button>
              <button
                id="source-camera-btn"
                onClick={() => handleSwitchSource("camera")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                  source === "camera"
                    ? "bg-amber-500 text-slate-950 font-bold shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Live Camera</span>
              </button>
            </div>

            {/* Stream Action Buttons */}
            <div className="flex items-center gap-2">
              {!isStreaming ? (
                <button
                  id="start-stream-btn"
                  onClick={() => startStream(source)}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md transition-colors cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start {source === "screen" ? "Screen Sharing" : "Camera"}</span>
                </button>
              ) : (
                <button
                  id="stop-stream-btn"
                  onClick={stopStream}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop Feed</span>
                </button>
              )}

              {/* Enter Crop / Selection Button */}
              <button
                id="enter-select-search-btn"
                onClick={handleEnterSelectionMode}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs shadow-md shadow-amber-500/10 transition-all cursor-pointer"
                title="Freeze frame and drag a box to search"
              >
                <Crop className="w-3.5 h-3.5" />
                <span>Select & Search</span>
              </button>
            </div>
          </div>

          {/* Stream Error Alert if permission denied */}
          {streamError && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 flex items-start gap-2.5 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold">Access Alert: </span>
                <span>{streamError}</span>
              </div>
            </div>
          )}

          {/* Video / Crop Stage Container */}
          <div
            id="vision-canvas-stage"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className={`relative w-full aspect-video bg-slate-950 rounded-2xl border-2 overflow-hidden flex items-center justify-center select-none shadow-2xl transition-all ${
              isSelecting
                ? "border-amber-500 cursor-crosshair ring-2 ring-amber-500/20"
                : "border-slate-800"
            }`}
          >
            {/* Actual HTML Video Element for Live Stream */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-contain ${
                isSelecting && capturedImage ? "hidden" : "block"
              }`}
            />

            {/* Frozen Frame Displayed when in Selection Mode */}
            {isSelecting && capturedImage && (
              <img
                src={capturedImage}
                alt="Captured visual frame"
                className="w-full h-full object-contain pointer-events-none"
              />
            )}

            {/* Inactive Stream Placeholder */}
            {!isStreaming && !isSelecting && (
              <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                  {source === "screen" ? (
                    <Monitor className="w-8 h-8 opacity-60" />
                  ) : (
                    <Camera className="w-8 h-8 opacity-60" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-300">
                    {source === "screen" ? "Live Screen Inactive" : "Camera Feed Inactive"}
                  </p>
                  <p className="text-xs text-slate-500 max-w-sm mt-1">
                    Click "Start {source === "screen" ? "Screen Sharing" : "Camera"}" to view your live desktop or camera, or press{" "}
                    <kbd className="px-1 py-0.5 bg-slate-800 text-amber-400 font-mono rounded">Alt+S</kbd> to inspect right now.
                  </p>
                </div>
                <button
                  onClick={() => startStream(source)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-amber-500/50 text-slate-200 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                >
                  Connect {source === "screen" ? "Display Stream" : "Webcam"}
                </button>
              </div>
            )}

            {/* Interactive Crop Boundary Box */}
            {isSelecting && cropArea && cropArea.width > 5 && cropArea.height > 5 && (
              <div
                style={{
                  left: `${cropArea.x}px`,
                  top: `${cropArea.y}px`,
                  width: `${cropArea.width}px`,
                  height: `${cropArea.height}px`,
                }}
                className="absolute border-2 border-amber-400 bg-amber-500/20 backdrop-brightness-110 pointer-events-none shadow-lg z-20"
              >
                {/* Crosshair Dimension Tag */}
                <div className="absolute -top-6 left-0 bg-amber-500 text-slate-950 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                  {Math.round(cropArea.width)} x {Math.round(cropArea.height)} px
                </div>
                {/* Corner Handles */}
                <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-amber-500 rounded-full"></div>
                <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-amber-500 rounded-full"></div>
                <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-amber-500 rounded-full"></div>
                <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-amber-500 rounded-full"></div>
              </div>
            )}

            {/* Selection Mode Instructions Overlay Header */}
            {isSelecting && (
              <div className="absolute top-3 inset-x-3 bg-slate-900/90 backdrop-blur-md border border-amber-500/40 rounded-xl p-2.5 flex items-center justify-between text-xs z-30 shadow-lg">
                <div className="flex items-center gap-2 text-amber-300 font-medium">
                  <Crop className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Click & Drag to highlight any region to search or extract text</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setCropArea(null);
                      setIsSelecting(false);
                    }}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleExecuteVisionAnalysis("search")}
                    disabled={isAnalyzing}
                    className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 shadow-sm"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Search Region</span>
                  </button>
                </div>
              </div>
            )}

            {/* Stream Quality Badges */}
            {isStreaming && !isSelecting && (
              <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-sm border border-slate-700/60 rounded-lg px-2.5 py-1 text-[11px] font-mono text-slate-300 flex items-center gap-2.5">
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  LIVE
                </span>
                <span className="text-slate-500">|</span>
                <span>{streamStats.width}x{streamStats.height}</span>
                <span className="text-slate-500">|</span>
                <span>{streamStats.fps} FPS</span>
              </div>
            )}
          </div>

          {/* Quick Action Pills on Selected Region */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Vision Actions:</span>
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <button
                id="quick-search-btn"
                onClick={() => handleExecuteVisionAnalysis("search")}
                disabled={isAnalyzing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-semibold transition-all cursor-pointer"
              >
                <Search className="w-3.5 h-3.5 text-sky-400" />
                <span>Google Visual Search</span>
              </button>

              <button
                id="quick-ocr-btn"
                onClick={() => handleExecuteVisionAnalysis("ocr")}
                disabled={isAnalyzing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-all cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                <span>Extract Text & Code (OCR)</span>
              </button>

              <button
                id="quick-explain-btn"
                onClick={() => handleExecuteVisionAnalysis("explain")}
                disabled={isAnalyzing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-all cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>Explain & Solve</span>
              </button>
            </div>
          </div>

          {/* Custom Question Bar */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-1.5">
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isAnalyzing) {
                  handleExecuteVisionAnalysis("custom");
                }
              }}
              placeholder="Ask anything about what's on screen/camera... (e.g. 'What error is this?', 'Find where to buy this')"
              className="flex-1 bg-transparent px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden"
            />
            <button
              onClick={() => handleExecuteVisionAnalysis("custom")}
              disabled={isAnalyzing}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
            >
              {isAnalyzing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>Ask Vani</span>
            </button>
          </div>
        </div>

        {/* Right Column: Visual Search Results & Grounding Citations */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col min-h-[460px]">
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400">
                  <Search className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Visual Intelligence Results</h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {currentResult ? `${currentResult.mode.toUpperCase()} Mode` : "Awaiting scan"}
                  </span>
                </div>
              </div>

              {currentResult && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleCopyText}
                    className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
                    title="Copy analysis text"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() =>
                      speakText(currentResult.spokenResponse, {
                        pitch: activeProfile.speechPitch || 1.0,
                        rate: activeProfile.speechRate || 1.0,
                        language: languageMode,
                      })
                    }
                    className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
                    title="Speak answer out loud"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Results Content Body */}
            <div className="flex-1 py-4 overflow-y-auto max-h-[420px] text-xs leading-relaxed space-y-3">
              {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <div className="w-12 h-12 rounded-full border-3 border-amber-500/20 border-t-amber-500 animate-spin flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-200 text-sm">
                      Analyzing {source === "screen" ? "Screen Selection" : "Camera Frame"}...
                    </p>
                    <p className="text-slate-400 text-xs mt-1">
                      Querying Gemini 3.8 Flash Vision with Google Search grounding
                    </p>
                  </div>
                </div>
              ) : currentResult ? (
                <div className="space-y-3.5">
                  {/* Cropped thumbnail preview */}
                  {currentResult.imageUrl && (
                    <div className="p-1.5 rounded-xl bg-slate-950 border border-slate-800 inline-block">
                      <img
                        src={currentResult.imageUrl}
                        alt="Crop target"
                        className="max-h-24 rounded-lg object-contain"
                      />
                    </div>
                  )}

                  {/* Formatted Markdown Analysis Text */}
                  <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 text-slate-200 font-sans whitespace-pre-wrap selection:bg-amber-500/30">
                    {currentResult.displayText}
                  </div>

                  {/* Google Search Grounding Sources / Links */}
                  {currentResult.groundingSources && currentResult.groundingSources.length > 0 && (
                    <div className="pt-2 border-t border-slate-800">
                      <span className="text-[11px] font-bold text-sky-400 flex items-center gap-1 uppercase tracking-wider mb-2">
                        <ExternalLink className="w-3 h-3" />
                        <span>Google Search Grounding Citations:</span>
                      </span>
                      <div className="flex flex-col gap-1.5">
                        {currentResult.groundingSources.map((source, idx) => (
                          <a
                            key={idx}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-2 rounded-lg bg-slate-850 hover:bg-slate-800 border border-slate-700/60 hover:border-sky-500/40 text-sky-300 transition-colors group"
                          >
                            <span className="truncate max-w-[280px] font-medium">
                              {source.title}
                            </span>
                            <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100 shrink-0" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500 gap-2">
                  <Crop className="w-10 h-10 opacity-30 text-amber-400" />
                  <p className="font-medium text-slate-400">No screen inspection active</p>
                  <p className="text-[11px] max-w-xs">
                    Press <kbd className="px-1 py-0.5 bg-slate-800 rounded font-mono text-amber-400">Alt+S</kbd> or click "Select & Search" on the live feed to analyze anything visible.
                  </p>
                </div>
              )}
            </div>

            {/* Footer with Timestamp & Engine */}
            {currentResult && (
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>{currentResult.timestamp}</span>
                <span className="text-amber-400">{currentResult.engine}</span>
              </div>
            )}
          </div>

          {/* Recent Visual Scans Gallery */}
          {history.length > 1 && (
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3">
              <span className="text-xs font-semibold text-slate-400 block mb-2 font-mono uppercase tracking-wider">
                Recent Scans:
              </span>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {history.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setCurrentResult(item)}
                    className={`shrink-0 w-16 h-12 rounded-lg border overflow-hidden transition-all ${
                      currentResult?.id === item.id
                        ? "border-amber-500 ring-1 ring-amber-500/40"
                        : "border-slate-700 hover:border-slate-500"
                    }`}
                  >
                    <img
                      src={item.imageUrl}
                      alt="History scan"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
