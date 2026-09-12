import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Send, Radio, Sparkles, Volume2, Languages, AlertCircle, CheckCircle2 } from "lucide-react";
import { AssistantState, LanguageMode } from "../types";
import { sfx } from "../utils/audioSynthesizer";

const isElectron =
  typeof navigator !== "undefined" &&
  (navigator.userAgent.toLowerCase().includes(" electron/") ||
    Boolean((window as any).process?.versions?.electron));

interface VoiceInputBarProps {
  onSendCommand: (text: string) => void;
  assistantState: AssistantState;
  selectedWakeWord: string;
  isContinuousListening: boolean;
  onToggleContinuousListening: () => void;
  languageMode: LanguageMode;
  onChangeLanguage: (lang: LanguageMode) => void;
}

export const VoiceInputBar: React.FC<VoiceInputBarProps> = ({
  onSendCommand,
  assistantState,
  selectedWakeWord,
  isContinuousListening,
  onToggleContinuousListening,
  languageMode,
  onChangeLanguage,
}) => {
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [speechSupported, setSpeechSupported] = useState(true);
  const [micPermission, setMicPermission] = useState<"prompt" | "granted" | "denied">("prompt");
  const [audioLevel, setAudioLevel] = useState(0); // 0 to 100 for VU meter
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [wakeWordHeardToast, setWakeWordHeardToast] = useState<string | null>(null);

  // Use refs to avoid stale closures in recognition event handlers
  const recognitionRef = useRef<any>(null);
  const isRecognitionRunningRef = useRef(false);
  const isRecordingRef = useRef(false);
  const isContinuousRef = useRef(isContinuousListening);
  const languageModeRef = useRef(languageMode);
  const wakeWordRef = useRef(selectedWakeWord);
  const currentTranscriptRef = useRef("");
  const restartTimeoutRef = useRef<any>(null);
  const wakeWordSilenceTimerRef = useRef<any>(null);
  const listenAbortControllerRef = useRef<AbortController | null>(null);

  // Audio Context & Analyser for live volume meter
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Sync refs with props
  useEffect(() => {
    isContinuousRef.current = isContinuousListening;
  }, [isContinuousListening]);

  useEffect(() => {
    languageModeRef.current = languageMode;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.lang = languageMode === "hi-IN" ? "hi-IN" : "en-IN";
      } catch {}
    }
  }, [languageMode]);

  useEffect(() => {
    wakeWordRef.current = selectedWakeWord;
  }, [selectedWakeWord]);

  // Multilingual quick prompt chips
  const quickPrompts = [
    `Convert into animated icon`,
    `Select and search screen`,
    `Kal 3 baje team sync add karo`,
    `Mujhe 5 baje chai ki yaad dilana`,
    `What's on my schedule today?`,
    `Chrome kholo`,
    `Take a screenshot`,
    `Lock my PC screen`,
  ];

  // Check initial permission status if available
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: "microphone" as any })
        .then((permissionStatus) => {
          if (permissionStatus.state === "granted") {
            setMicPermission("granted");
            startVolumeMeter();
          } else if (permissionStatus.state === "denied") {
            setMicPermission("denied");
          }
          permissionStatus.onchange = () => {
            if (permissionStatus.state === "granted") {
              setMicPermission("granted");
              startVolumeMeter();
            } else if (permissionStatus.state === "denied") {
              setMicPermission("denied");
            }
          };
        })
        .catch(() => {});
    }
  }, []);

  // Safe acquisition of persistent microphone stream
  const getMicStream = async (): Promise<MediaStream | null> => {
    if (micStreamRef.current && micStreamRef.current.active) {
      return micStreamRef.current;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      micStreamRef.current = stream;
      setMicPermission("granted");
      setSpeechError(null);
      return stream;
    } catch (err: any) {
      console.warn("[Mic Meter] Permission error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setMicPermission("denied");
        setSpeechError("Microphone permission was denied. Please allow microphone access in your browser or Windows privacy settings.");
      }
      return null;
    }
  };

  // Live microphone audio energy analyzer (VU Meter)
  const startVolumeMeter = async (): Promise<boolean> => {
    const stream = await getMicStream();
    if (!stream) return false;

    try {
      if (!audioContextRef.current || audioContextRef.current.state === "closed") {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioCtx();
      }
      if (audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume().catch(() => {});
      }

      if (!analyserRef.current && audioContextRef.current) {
        const analyser = audioContextRef.current.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.4;
        analyserRef.current = analyser;

        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyser);
      }

      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

      if (analyserRef.current) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        const checkVolume = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          const normalized = Math.min(100, Math.round((avg / 128) * 100));
          setAudioLevel(normalized);
          animFrameRef.current = requestAnimationFrame(checkVolume);
        };
        checkVolume();
      }
      return true;
    } catch (err) {
      console.warn("[Mic Meter] Analyzer setup error:", err);
      return true;
    }
  };

  const stopVolumeMeter = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setAudioLevel(0);
  };

  // In-browser MediaRecorder for 100% reliable audio transcription fallback
  const startMediaRecorder = (stream: MediaStream) => {
    try {
      if (typeof MediaRecorder === "undefined") return;
      audioChunksRef.current = [];
      const mimeTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
      const supported = mimeTypes.find((t) => MediaRecorder.isTypeSupported(t));
      const recorder = new MediaRecorder(stream, supported ? { mimeType: supported } : undefined);
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      recorder.start(250);
      mediaRecorderRef.current = recorder;
    } catch (e) {
      console.warn("MediaRecorder start error:", e);
    }
  };

  const stopMediaRecorderAndTranscribe = async (): Promise<string> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        resolve("");
        return;
      }

      recorder.onstop = async () => {
        try {
          const mimeType = recorder.mimeType || "audio/webm";
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          audioChunksRef.current = [];
          if (audioBlob.size < 1200) {
            resolve("");
            return;
          }

          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64Data = (reader.result as string) || "";
            // 1. Try Gemini transcription
            try {
              const res = await fetch("/api/gemini/transcribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ audioBase64: base64Data, mimeType }),
              });
              const data = await res.json();
              if (data && data.transcription && data.transcription.trim()) {
                console.log("🎙️ [Gemini Audio Transcribed]:", data.transcription);
                resolve(data.transcription.trim());
                return;
              }
            } catch (err) {
              console.warn("Gemini audio transcription fallback error:", err);
            }

            // 2. Try Python Speech Engine transcribe fallback
            try {
              const rawBase64 = base64Data.includes(",") ? base64Data.split(",")[1] : base64Data;
              const res2 = await fetch("/api/voice/transcribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ audioBase64: rawBase64 }),
              });
              const data2 = await res2.json();
              if (data2 && data2.text && data2.text.trim()) {
                console.log("🎙️ [Python STT Transcribe Fallback]:", data2.text);
                resolve(data2.text.trim());
                return;
              }
            } catch {}

            resolve("");
          };
          reader.readAsDataURL(audioBlob);
        } catch {
          resolve("");
        }
      };

      try {
        recorder.stop();
      } catch {
        resolve("");
      }
    });
  };

  // Explicit User Action to Request Microphone Access
  const handleRequestMicAccess = async () => {
    const granted = await startVolumeMeter();
    if (granted) {
      setMicPermission("granted");
      setSpeechError(null);
      sfx.playWakeChime();
      startRecognitionSafely();
    }
  };

  // Safe Recognition Starter
  const startRecognitionSafely = () => {
    if (!recognitionRef.current || isRecognitionRunningRef.current) return;
    try {
      recognitionRef.current.start();
    } catch (e: any) {
      // Ignore if already running
    }
  };

  // Dedicated Free Python Speech Engine / Hardware Mic recorder (for Electron or native fallback)
  const recordViaFreeSpeechEngine = async () => {
    setInterimTranscript("🎙️ Listening via Speech Model... Speak now!");
    try {
      listenAbortControllerRef.current = new AbortController();
      const res = await fetch("/api/voice/listen", {
        signal: listenAbortControllerRef.current.signal,
      });
      const data = await res.json();
      if (data && data.text && data.text.trim()) {
        console.log(`🎙️ [${data.engine || "Free Speech"} Heard]:`, data.text);
        setInterimTranscript(data.text);
        const clean = data.text
          .replace(/^(hey vani|ok vani|namaste vani|suno vani|vani|vaani|wani|bani|नमस्ते वानी|वानी|हे वानी)[,\s]*/i, "")
          .trim();
        onSendCommand(clean || data.text.trim());
      } else if (data && !data.text && isRecordingRef.current) {
        setSpeechError("No speech detected. Please speak clearly into your microphone.");
        setTimeout(() => setSpeechError(null), 4000);
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setSpeechError("Speech engine connection error: " + err.message);
        setTimeout(() => setSpeechError(null), 4000);
      }
    } finally {
      setIsRecording(false);
      isRecordingRef.current = false;
      stopVolumeMeter();
      setInterimTranscript("");
      listenAbortControllerRef.current = null;
    }
  };

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setSpeechSupported(false);
      return;
    }

    // In Electron, Chromium Speech throws error -2 because Google Cloud API keys are absent.
    // Disabling SpeechRecognition in Electron stops the network pipe spam.
    if (isElectron) {
      setSpeechSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = languageMode === "hi-IN" ? "hi-IN" : "en-IN";

      recognition.onstart = () => {
        isRecognitionRunningRef.current = true;
      };

      recognition.onresult = (event: any) => {
        let interim = "";
        let final = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }

        const currentSpoken = (final || interim).trim();
        if (!currentSpoken) return;

        setInterimTranscript(currentSpoken);
        currentTranscriptRef.current = currentSpoken;

        const lower = currentSpoken.toLowerCase();
        const wakeWordLower = wakeWordRef.current.toLowerCase();

        // 1. Check if Wake Word was detected (Hey Vani, Ok Vani, Namaste Vani, Suno Vani, etc.)
        const isWakeWordMatch =
          lower.includes(wakeWordLower) ||
          lower.includes("hey vani") ||
          lower.includes("ok vani") ||
          lower.includes("namaste vani") ||
          lower.includes("suno vani") ||
          lower.includes("vani") ||
          lower.includes("vaani") ||
          lower.includes("wani") ||
          lower.includes("bani") ||
          lower.includes("नमस्ते वानी") ||
          lower.includes("वानी") ||
          lower.includes("हे वानी");

        if (isContinuousRef.current && isWakeWordMatch && !isRecordingRef.current) {
          console.log("🎙️ [Wake Word Triggered]:", currentSpoken);
          sfx.playWakeChime();
          setWakeWordHeardToast(`Namaste! "Hey Vani" detected. Listening...`);
          setTimeout(() => setWakeWordHeardToast(null), 3500);

          // Extract words after the wake word if the user spoke in one sentence
          const commandAfterWake = currentSpoken
            .replace(/^(hey vani|ok vani|namaste vani|suno vani|vani|vaani|wani|bani|नमस्ते वानी|वानी|हे वानी)[,\s]*/i, "")
            .trim();

          if (commandAfterWake.length > 2 && (final.trim() || event.results[event.results.length - 1]?.isFinal)) {
            // User said full command in one breath (e.g. "Hey Vani what time is it")
            onSendCommand(commandAfterWake);
            setInterimTranscript("");
            currentTranscriptRef.current = "";
          } else {
            // User just said "Hey Vani" -> Switch into active recording state to listen for their command!
            startRecording();
          }
          return;
        }

        // 2. If in Active Recording Mode (User clicked mic or wake word triggered)
        if (isRecordingRef.current) {
          if (final.trim()) {
            console.log("🎙️ [Final Command Sent]:", final.trim());
            const cleanFinal = final.trim().replace(/^(hey vani|ok vani|namaste vani|suno vani|vani|vaani|wani|bani|नमस्ते वानी|वानी|हे वानी)[,\s]*/i, "").trim();
            onSendCommand(cleanFinal || final.trim());
            stopRecording();
          } else {
            // Reset silence timer on interim speech
            if (wakeWordSilenceTimerRef.current) clearTimeout(wakeWordSilenceTimerRef.current);
            wakeWordSilenceTimerRef.current = setTimeout(() => {
              if (isRecordingRef.current && currentTranscriptRef.current.trim()) {
                console.log("🎙️ [Auto-send after silence]:", currentTranscriptRef.current.trim());
                const cleanAuto = currentTranscriptRef.current.trim().replace(/^(hey vani|ok vani|namaste vani|suno vani|vani|vaani|wani|bani|नमस्ते वानी|वानी|हे वानी)[,\s]*/i, "").trim();
                onSendCommand(cleanAuto || currentTranscriptRef.current.trim());
                stopRecording();
              }
            }, 1800);
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition event error:", event.error);
        if (event.error === "no-speech") {
          // Normal background silence in continuous mode; do not surface error
          return;
        }
        if (event.error === "network") {
          console.log("🌐 Chromium cloud speech network issue. MediaRecorder/Free STT will handle audio.");
          return;
        }
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setMicPermission("denied");
          setSpeechError("Microphone access is blocked. Click the Allow Mic Access button above or unmute your mic.");
          stopRecording();
        }
      };

      recognition.onend = () => {
        isRecognitionRunningRef.current = false;
        // Debounce auto-restart to maintain continuous listening without error
        if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = setTimeout(() => {
          if ((isContinuousRef.current || isRecordingRef.current) && !document.hidden) {
            try {
              if (!isRecognitionRunningRef.current) {
                recognition.start();
              }
            } catch (e) {
              // Engine may already be restarting
            }
          }
        }, 350);
      };

      recognitionRef.current = recognition;

      // If continuous listening is enabled and mic is granted, start engine
      if (isContinuousListening) {
        startRecognitionSafely();
      }
    } catch (e) {
      console.error("Failed to init SpeechRecognition:", e);
      setSpeechSupported(false);
    }

    return () => {
      stopVolumeMeter();
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
      if (wakeWordSilenceTimerRef.current) clearTimeout(wakeWordSilenceTimerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
        micStreamRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, [isContinuousListening, selectedWakeWord, languageMode]);

  // Background polling for Free Python Hardware Wake Word (Works in Electron & all environments!)
  useEffect(() => {
    if (!isContinuousListening) {
      fetch("/api/voice/wakeword/stop").catch(() => {});
      return;
    }

    // Start background wake-word listener on Windows mic hardware
    fetch("/api/voice/wakeword/start").catch(() => {});

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/voice/wakeword/poll");
        const data = await res.json();
        if (data && data.isFresh && data.detected && !isRecordingRef.current) {
          console.log("🔔 [Free Wake Word Heard on Hardware Mic]:", data.phrase);
          sfx.playWakeChime();
          setWakeWordHeardToast(`Namaste! "Hey Vani" detected via Free Speech Model. Listening...`);
          setTimeout(() => setWakeWordHeardToast(null), 3500);
          // Automatically trigger recording to capture command!
          startRecording();
        }
      } catch {}
    }, 800);

    return () => {
      clearInterval(interval);
    };
  }, [isContinuousListening, selectedWakeWord]);

  // Start Recording
  const startRecording = async () => {
    setSpeechError(null);
    setInterimTranscript("");
    currentTranscriptRef.current = "";
    setIsRecording(true);
    isRecordingRef.current = true;

    sfx.playWakeChime();

    // Ensure mic stream & start VU meter + start MediaRecorder audio capture
    const stream = await getMicStream();
    if (stream) {
      startVolumeMeter();
      startMediaRecorder(stream);
    }

    // In Electron (where Web Speech API is absent): Use Free Python Speech Engine
    if (isElectron || !recognitionRef.current) {
      recordViaFreeSpeechEngine();
      return;
    }

    // If Web Speech API is available:
    if (recognitionRef.current) {
      try {
        recognitionRef.current.lang = languageModeRef.current === "hi-IN" ? "hi-IN" : "en-IN";
        if (!isRecognitionRunningRef.current) {
          recognitionRef.current.start();
        }
      } catch (err: any) {
        console.warn("Recognition start check:", err?.message);
      }
    }
  };

  // Stop Recording and send current spoken text
  const stopRecording = async () => {
    if (listenAbortControllerRef.current) {
      listenAbortControllerRef.current.abort();
      listenAbortControllerRef.current = null;
    }
    setIsRecording(false);
    isRecordingRef.current = false;
    stopVolumeMeter();
    if (wakeWordSilenceTimerRef.current) clearTimeout(wakeWordSilenceTimerRef.current);

    // 1. Check if browser Web Speech API already provided a transcript
    const browserTranscript = currentTranscriptRef.current.trim();
    if (browserTranscript) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try {
          mediaRecorderRef.current.stop();
        } catch {}
      }
      audioChunksRef.current = [];
      const clean = browserTranscript
        .replace(/^(hey vani|ok vani|namaste vani|suno vani|vani|vaani|wani|bani|नमस्ते वानी|वानी|हे वानी)[,\s]*/i, "")
        .trim();
      onSendCommand(clean || browserTranscript);
      setInterimTranscript("");
      currentTranscriptRef.current = "";
      return;
    }

    // 2. MediaRecorder fallback: If Web Speech produced no text, use recorded audio
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      setInterimTranscript("🎙️ Processing voice command...");
      const aiTranscript = await stopMediaRecorderAndTranscribe();
      if (aiTranscript) {
        const clean = aiTranscript
          .replace(/^(hey vani|ok vani|namaste vani|suno vani|vani|vaani|wani|bani|नमस्ते वानी|वानी|हे वानी)[,\s]*/i, "")
          .trim();
        onSendCommand(clean || aiTranscript);
        setInterimTranscript("");
        return;
      }
    }

    // 3. Clear interim transcript quietly if nothing was spoken
    setInterimTranscript("");
  };

  // Toggle Recording on single click
  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !interimTranscript.trim()) return;
    const textToSend = inputText.trim() || interimTranscript.trim();
    onSendCommand(textToSend);
    setInputText("");
    setInterimTranscript("");
    currentTranscriptRef.current = "";
    if (isRecording) stopRecording();
  };

  const handleChipClick = (prompt: string) => {
    onSendCommand(prompt);
  };

  const getPlaceholderText = () => {
    if (isRecording) {
      return interimTranscript
        ? `🎙️ Hearing: "${interimTranscript}"...`
        : `🎙️ Listening... Speak now (Tap mic or Enter when done)`;
    }
    switch (languageMode) {
      case "hi-IN":
        return `बोलें "${selectedWakeWord}..." या लिखें (उदा. "कल 3 बजे मीटिंग जोड़ो")...`;
      case "mix":
        return `Speak "${selectedWakeWord}..." (Hinglish/English e.g. "Kal 3 baje sync add karo")...`;
      case "en-IN":
        return `Speak "${selectedWakeWord}..." (e.g. "Add dentist tomorrow at 4 PM")...`;
    }
  };

  return (
    <div className="w-full space-y-2.5">

      {/* Wake Word Toast Notification */}
      {wakeWordHeardToast && (
        <div className="flex items-center gap-2 p-2 px-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs animate-bounce font-medium shadow-lg">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{wakeWordHeardToast}</span>
        </div>
      )}

      {/* Permission Grant Banner if mic is not granted */}
      {micPermission !== "granted" && (
        <div className="flex items-center justify-between p-2.5 px-3 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-200 text-xs">
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-indigo-400 animate-pulse" />
            <span>
              {micPermission === "denied"
                ? "Microphone access is blocked in browser settings."
                : "Microphone permission required for voice & 'Hey Vani' wake-word."}
            </span>
          </div>
          <button
            type="button"
            onClick={handleRequestMicAccess}
            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] cursor-pointer transition-all shadow"
          >
            Allow Mic Access
          </button>
        </div>
      )}

      {/* Speech Error Banner if any */}
      {speechError && (
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{speechError}</span>
          </div>
          <button
            type="button"
            onClick={() => setSpeechError(null)}
            className="text-slate-400 hover:text-slate-200 px-2 py-0.5 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Quick Prompt Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px] font-medium text-slate-400">
        <span className="shrink-0 text-slate-500 font-mono text-[10px] uppercase">
          Try saying:
        </span>
        {quickPrompts.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => handleChipClick(p)}
            className="shrink-0 px-2.5 py-1 rounded-full bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-amber-500/40 text-slate-300 hover:text-amber-300 transition-all font-mono cursor-pointer"
          >
            "{p}"
          </button>
        ))}
      </div>

      {/* Main Input Control Bar */}
      <form
        onSubmit={handleFormSubmit}
        className={`relative flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900/90 border backdrop-blur-xl shadow-2xl transition-all ${
          isRecording
            ? "border-red-500 shadow-red-500/20 ring-1 ring-red-500/50"
            : "border-slate-700/80 focus-within:border-amber-500/60"
        }`}
      >
        {/* Continuous Wake Word Listener Button */}
        <button
          type="button"
          onClick={() => {
            if (micPermission !== "granted") {
              handleRequestMicAccess();
            }
            onToggleContinuousListening();
          }}
          className={`px-3 py-2 rounded-xl text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            isContinuousListening
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/10"
              : "bg-slate-800/60 text-slate-400 border border-slate-700/60 hover:text-slate-200"
          }`}
          title={
            isContinuousListening
              ? "Wake Word Active: Always listening for 'Hey Vani'"
              : "Click to enable hands-free 'Hey Vani' Wake Word"
          }
        >
          <Radio
            className={`w-3.5 h-3.5 ${
              isContinuousListening ? "text-amber-400 animate-pulse" : "text-slate-400"
            }`}
          />
          <span className="hidden sm:inline">Wake Word</span>
          <span
            className={`w-2 h-2 rounded-full ${
              isContinuousListening ? "bg-amber-400 animate-ping" : "bg-slate-600"
            }`}
          ></span>
        </button>

        {/* Language Switcher Dropdown */}
        <div className="flex items-center bg-slate-800/80 rounded-xl px-2 py-1.5 border border-slate-700/60 gap-1.5">
          <Languages className="w-3.5 h-3.5 text-amber-400" />
          <select
            value={languageMode}
            onChange={(e) => onChangeLanguage(e.target.value as LanguageMode)}
            className="bg-transparent text-[11px] font-mono text-slate-200 focus:outline-none cursor-pointer"
            title="Switch spoken language"
          >
            <option value="mix" className="bg-slate-900 text-slate-100">
              Mix (Hinglish)
            </option>
            <option value="hi-IN" className="bg-slate-900 text-slate-100">
              हिन्दी (hi-IN)
            </option>
            <option value="en-IN" className="bg-slate-900 text-slate-100">
              English (en-IN)
            </option>
          </select>
        </div>

        {/* Live Audio Volume Visualizer */}
        {audioLevel > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 bg-slate-800/60 rounded-lg border border-slate-700/40" title={`Mic volume: ${audioLevel}%`}>
            <span
              className="w-1 bg-emerald-400 rounded-full transition-all duration-75"
              style={{ height: `${Math.max(4, (audioLevel / 100) * 18)}px` }}
            ></span>
            <span
              className="w-1 bg-amber-400 rounded-full transition-all duration-75"
              style={{ height: `${Math.max(6, (audioLevel / 100) * 22)}px` }}
            ></span>
            <span
              className="w-1 bg-red-400 rounded-full transition-all duration-75"
              style={{ height: `${Math.max(4, (audioLevel / 100) * 16)}px` }}
            ></span>
          </div>
        )}

        {/* Text Input & Live Speech Preview */}
        <input
          type="text"
          value={isRecording && interimTranscript ? interimTranscript : inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={getPlaceholderText()}
          className={`flex-1 bg-transparent px-2 py-2 text-sm focus:outline-none ${
            isRecording
              ? "text-amber-300 font-medium placeholder-amber-400/70 italic"
              : "text-slate-100 placeholder-slate-500"
          }`}
        />

        {/* Click-to-Talk Mic Button */}
        <button
          type="button"
          onClick={toggleRecording}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${
            isRecording
              ? "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/40 animate-pulse scale-105"
              : "bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono shadow-md shadow-amber-500/20"
          }`}
          title={isRecording ? "Listening... Click to send command" : "Click to Speak"}
        >
          {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          <span className="hidden md:inline">
            {isRecording ? "Listening... (Tap to Send)" : "Click to Speak"}
          </span>
        </button>

        {/* Send Button */}
        <button
          type="submit"
          disabled={!inputText.trim() && !interimTranscript.trim()}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 transition-colors cursor-pointer"
          title="Send command"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
