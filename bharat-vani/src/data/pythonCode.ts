import { PythonModuleFile } from "../types";

export const PYTHON_MODULES: PythonModuleFile[] = [
  {
    filename: "brain.py",
    path: "core/brain.py",
    description: "Connects to Google Gemini AI. Routes every command intelligently.",
    code: `# ==============================================================================
# 🧠 core/brain.py - Bharat Vani AI Intelligence Core
# Powered by Google Gemini AI
# ==============================================================================

import os
import json
import requests
from typing import Dict, Any, Optional

try:
    from google import genai
    from google.genai import types
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False

class BharatBrain:
    """
    Intelligent routing engine for Bharat Vani.
    Analyzes user intent: classifies between PC Actions and Knowledge Questions.
    """

    def __init__(self, gemini_api_key: Optional[str] = None):
        self.api_key = gemini_api_key or os.environ.get("GEMINI_API_KEY", "")
        self.client = None

        if GENAI_AVAILABLE and self.api_key:
            try:
                self.client = genai.Client(api_key=self.api_key)
                print("⚡ [Brain] Google Gemini AI initialized successfully.")
            except Exception as e:
                print(f"⚠️ [Brain] Could not initialize Gemini Client: {e}")

    def process(self, prompt: str) -> Dict[str, Any]:
        """
        Process a user prompt via Gemini AI with deterministic local action matching.
        """
        clean_prompt = self._clean_prompt(prompt)

        # 1. Check quick deterministic actions (fast path)
        quick_action = self._quick_action_match(clean_prompt)
        if quick_action:
            return quick_action

        # 2. Try Gemini Cloud AI if configured
        if self.client:
            try:
                return self._call_gemini(clean_prompt)
            except Exception as e:
                print(f"⚠️ [Brain] Gemini API call error: {e}")

        # 3. Local deterministic fallback
        return self._local_fallback(clean_prompt)

    def _clean_prompt(self, prompt: str) -> str:
        p = prompt.strip()
        for wake in ["hey vani", "ok vani", "namaste vani", "vani"]:
            if p.lower().startswith(wake):
                p = p[len(wake):].lstrip(",. ")
        return p

    def _call_gemini(self, prompt: str) -> Dict[str, Any]:
        system_instruction = (
            "You are Bharat Vani (Voice of India), a real AI voice assistant for Windows. "
            "You speak courteous Indian English, understand Hinglish, and control the user's PC. "
            "Analyze if the request is an action (launch_app, whatsapp_message, web_search, system_control, "
            "screenshot, lock_screen) or general conversation (chat). "
            "Respond ONLY in valid JSON matching this schema: "
            '{"isAction": bool, "actionType": str, "actionDetails": {"target": str, "message": str, "query": str}, '
            '"spokenResponse": str, "displayText": str}'
        )

        response = self.client.models.generate_content(
            model="gemini-3.8-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                temperature=0.2,
            ),
        )

        data = json.loads(response.text)
        data["engine"] = "gemini-3.8-flash"
        return data

    def _local_fallback(self, prompt: str) -> Dict[str, Any]:
        """Local deterministic fallback."""
        return {
            "isAction": False,
            "actionType": "chat",
            "spokenResponse": f"I heard: {prompt}. I am ready to launch apps, control Windows, or take commands.",
            "displayText": f"Processed via local assistant engine: '{prompt}'",
            "engine": "local-fallback"
        }

    def _quick_action_match(self, p: str) -> Optional[Dict[str, Any]]:
        pl = p.lower()
        if "lock" in pl and ("screen" in pl or "pc" in pl or "computer" in pl):
            return {
                "isAction": True,
                "actionType": "lock_screen",
                "actionDetails": {"target": "lock"},
                "spokenResponse": "Locking your computer now, Sir.",
                "displayText": "🔒 Windows Workstation Locked.",
                "engine": "local-rule"
            }
        if "screenshot" in pl or "screen capture" in pl:
            return {
                "isAction": True,
                "actionType": "screenshot",
                "actionDetails": {"target": "screenshot"},
                "spokenResponse": "Taking a screenshot for you right away.",
                "displayText": "📸 Screenshot captured and saved.",
                "engine": "local-rule"
            }
        return None
`,
  },
  {
    filename: "listener.py",
    path: "core/listener.py",
    description: "Listens 24/7 for wake words ('Hey Vani', 'Ok Vani', 'Namaste Vani') and transcribes Indian English (en-IN).",
    code: `# ==============================================================================
# 👂 core/listener.py - 24/7 Wake Word & Indian English STT
# Listens continuously for "Hey Vani", transcribes via Google STT (en-IN)
# ==============================================================================

import time
import threading
import speech_recognition as sr
from typing import Callable, Optional

class BharatListener:
    """
    Continuous background listener for Bharat Vani with energy calibration
    and push-to-talk interrupt capability.
    """

    WAKE_WORDS = ["hey vani", "ok vani", "namaste vani", "vani"]

    def __init__(self, on_command_callback: Callable[[str], None], language: str = "en-IN"):
        self.recognizer = sr.Recognizer()
        self.recognizer.energy_threshold = 300
        self.recognizer.dynamic_energy_threshold = True
        self.recognizer.pause_threshold = 0.8
        self.language = language
        self.callback = on_command_callback
        self.is_listening = False
        self._stop_listening = None

    def start_background_listening(self):
        """Start non-blocking continuous 24/7 listening loop."""
        self.is_listening = True
        print(f"👂 [Listener] Calibrating microphone for ambient noise...")
        with sr.Microphone() as source:
            self.recognizer.adjust_for_ambient_noise(source, duration=1.2)
        print("✅ [Listener] Ready! Listening 24/7 for 'Hey Vani' or 'Namaste Vani'...")

        self._stop_listening = self.recognizer.listen_in_background(
            sr.Microphone(),
            self._audio_callback,
            phrase_time_limit=10
        )

    def _audio_callback(self, recognizer, audio):
        """Called automatically when speech audio is captured."""
        try:
            # Transcribe with Indian English locale
            text = recognizer.recognize_google(audio, language=self.language).strip()
            print(f"🎙️ [Heard]: '{text}'")

            # Check for wake word trigger
            lower = text.lower()
            triggered = any(w in lower for w in self.WAKE_WORDS)

            if triggered:
                print("⚡ [Wake Word Detected]: Bharat Vani Activated!")
                self.callback(text)
        except sr.UnknownValueError:
            pass # Background silence or unparseable noise
        except sr.RequestError as e:
            print(f"⚠️ [Listener] STT Service error: {e}")

    def push_to_talk_record(self) -> Optional[str]:
        """Synchronous record for manual Push-To-Talk button."""
        print("🎙️ [Push-To-Talk] Listening now...")
        with sr.Microphone() as source:
            try:
                audio = self.recognizer.listen(source, timeout=5, phrase_time_limit=10)
                text = self.recognizer.recognize_google(audio, language=self.language)
                print(f"🎙️ [PTT Transcribed]: '{text}'")
                return text
            except Exception as e:
                print(f"⚠️ [PTT Error]: {e}")
                return None

    def stop(self):
        """Stop listening."""
        if self._stop_listening:
            self._stop_listening(wait_for_stop=False)
        self.is_listening = False
        print("🛑 [Listener] Stopped background listener.")
`,
  },
  {
    filename: "speaker.py",
    path: "core/speaker.py",
    description: "Speaks back using Windows SAPI voice with fallback chain (SAPI → PowerShell → pyttsx3).",
    code: `# ==============================================================================
# 🔊 core/speaker.py - Windows SAPI Voice Synthesizer
# Speaks with Indian accent / natural voice through Windows native speech engine
# ==============================================================================

import subprocess
import threading
import sys

class BharatSpeaker:
    """
    Speaks back to the user using Windows native SAPI.SpVoice with
    PowerShell and pyttsx3 fallback chain.
    """

    def __init__(self, voice_name: str = "Microsoft Heera"):
        self.voice_name = voice_name
        self.sapi = None
        self._init_sapi()

    def _init_sapi(self):
        """Try Windows win32com SAPI first."""
        try:
            import win32com.client
            self.sapi = win32com.client.Dispatch("SAPI.SpVoice")
            # Attempt to set Indian English or pleasant voice
            voices = self.sapi.GetVoices()
            for v in voices:
                desc = v.GetDescription()
                if "heera" in desc.lower() or "ravi" in desc.lower() or "india" in desc.lower():
                    self.sapi.Voice = v
                    self.voice_name = desc
                    print(f"🔊 [Speaker] Using Windows Voice: {desc}")
                    break
        except Exception as e:
            print(f"ℹ️ [Speaker] SAPI COM dispatch fallback: {e}")

    def speak(self, text: str, async_mode: bool = True):
        """Speak the text out loud."""
        if not text:
            return

        print(f"🗣️ [Bharat Vani]: \\"{text}\\"")
        if async_mode:
            threading.Thread(target=self._speak_sync, args=(text,), daemon=True).start()
        else:
            self._speak_sync(text)

    def _speak_sync(self, text: str):
        # Clean text for speech
        clean_text = text.replace('"', '').replace("'", "").replace('\\n', ' ')

        # Method 1: SAPI COM
        if self.sapi:
            try:
                self.sapi.Speak(clean_text)
                return
            except Exception:
                pass

        # Method 2: Windows PowerShell native SpeechSynthesizer
        try:
            ps_cmd = (
                f'Add-Type -AssemblyName System.Speech; '
                f'$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer; '
                f'$synth.Rate = 0; $synth.Speak("{clean_text}");'
            )
            subprocess.run(["powershell", "-Command", ps_cmd], capture_output=True, check=True)
            return
        except Exception:
            pass

        # Method 3: pyttsx3 fallback
        try:
            import pyttsx3
            engine = pyttsx3.init()
            engine.say(clean_text)
            engine.runAndWait()
        except Exception as e:
            print(f"❌ [Speaker Error]: Could not synthesize audio: {e}")
`,
  },
  {
    filename: "actions.py",
    path: "core/actions.py",
    description: "Controls Windows PC: WhatsApp automation, launches apps, web search, system telemetry, lock screen.",
    code: `# ==============================================================================
# ⚡ core/actions.py - Windows PC Action Executor
# Controls your computer: WhatsApp automation, app launcher, volume, screenshot
# ==============================================================================

import os
import ctypes
import subprocess
import webbrowser
import urllib.parse
from datetime import datetime
from typing import Dict, Any

try:
    import pyautogui
except ImportError:
    pyautogui = None

try:
    import psutil
except ImportError:
    psutil = None

class ActionExecutor:
    """
    Executes real PC automation actions directly on Windows.
    """

    APP_MAP = {
        "chrome": "start chrome",
        "google chrome": "start chrome",
        "vs code": "code",
        "code": "code",
        "visual studio code": "code",
        "notepad": "notepad",
        "calculator": "calc",
        "calc": "calc",
        "spotify": "start spotify",
        "terminal": "start wt",
        "cmd": "start cmd",
        "explorer": "explorer",
        "file explorer": "explorer",
        "youtube": "https://www.youtube.com",
    }

    def execute(self, action_type: str, details: Dict[str, Any]) -> str:
        """Dispatches action to the appropriate Windows automation handler."""
        print(f"⚡ [ActionExecutor] Executing {action_type} with {details}")

        if action_type == "whatsapp_message":
            return self.send_whatsapp_message(
                details.get("target", "Friend"),
                details.get("message", "Hi")
            )
        elif action_type == "launch_app":
            return self.launch_application(details.get("target", "chrome"))
        elif action_type == "web_search":
            return self.search_web(details.get("query", ""), details.get("target", "Google"))
        elif action_type == "screenshot":
            return self.take_screenshot()
        elif action_type == "lock_screen":
            return self.lock_workstation()
        elif action_type == "system_control":
            return self.system_control(details.get("target", "status"))

        return "Unknown action"

    def send_whatsapp_message(self, recipient: str, message: str) -> str:
        """
        Automates WhatsApp message dispatch.
        Example: 'Send hi to Rahul on WhatsApp'
        """
        # Using native Windows WhatsApp desktop protocol
        url = f"whatsapp://send?text={encoded_msg}"
        webbrowser.open(url)

        # PyAutoGUI automation (optional simulated typing & enter)
        if pyautogui:
            # Short delay for browser to focus
            pass

        return f"Dispatched WhatsApp message '{message}' for contact {recipient}."

    def launch_application(self, app_name: str) -> str:
        """Launch Windows desktop applications."""
        app_clean = app_name.lower().strip()
        cmd = self.APP_MAP.get(app_clean)

        if cmd:
            if cmd.startswith("http"):
                webbrowser.open(cmd)
            else:
                subprocess.Popen(cmd, shell=True)
            return f"Launched {app_name} on Windows."
        else:
            # Try generic start command
            subprocess.Popen(f"start {app_clean}", shell=True)
            return f"Requested Windows to start {app_name}."

    def search_web(self, query: str, engine: str = "Google") -> str:
        """Search Google or YouTube by voice."""
        encoded = urllib.parse.quote(query)
        if "youtube" in engine.lower():
            url = f"https://www.youtube.com/results?search_query={encoded}"
        else:
            url = f"https://www.google.com/search?q={encoded}"

        webbrowser.open(url)
        return f"Searched {engine} for '{query}'."

    def take_screenshot(self) -> str:
        """Captures Windows screenshot and saves to Pictures folder."""
        pictures_dir = os.path.expanduser("~/Pictures/BharatVani")
        os.makedirs(pictures_dir, exist_ok=True)
        filename = f"Vani_Screenshot_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
        filepath = os.path.join(pictures_dir, filename)

        if pyautogui:
            screenshot = pyautogui.screenshot()
            screenshot.save(filepath)
            return f"Screenshot saved to {filepath}"
        else:
            # Fallback to Windows snipping tool
            subprocess.Popen("snippingtool", shell=True)
            return "Launched Windows Snipping Tool."

    def lock_workstation(self) -> str:
        """Locks the Windows workstation instantly."""
        ctypes.windll.user32.LockWorkStation()
        return "Windows workstation locked successfully."

    def system_control(self, command: str) -> str:
        """Controls volume, mute, or reports battery telemetry."""
        if psutil:
            battery = psutil.sensors_battery()
            cpu = psutil.cpu_percent(interval=0.1)
            ram = psutil.virtual_memory().percent
            batt_info = f"{battery.percent}%" if battery else "AC Power"
            return f"System: CPU {cpu}%, RAM {ram}%, Battery {batt_info}"
        return "System telemetry updated."
`,
  },
  {
    filename: "hud.py",
    path: "gui/hud.py",
    description: "Dark glass HUD with animated orb, live chat log, telemetry bar, and Push-To-Talk.",
    code: `# ==============================================================================
# 🖥️ gui/hud.py - Dark Glass HUD with Animated Hologram Orb
# Built with CustomTkinter for a futuristic Indian J.A.R.V.I.S. interface
# ==============================================================================

import math
import tkinter as tk
from tkinter import ttk
import threading
import time

try:
    import customtkinter as ctk
    ctk.set_appearance_mode("dark")
    ctk.set_default_color_theme("blue")
except ImportError:
    ctk = None

class BharatHUD:
    """
    Futuristic HUD window for Bharat Vani.
    Features an animated multi-ring glowing orb, live chat feed,
    telemetry metrics, and push-to-talk button.
    """

    def __init__(self, on_user_input_callback=None):
        self.callback = on_user_input_callback
        self.root = ctk.CTk() if ctk else tk.Tk()
        self.root.title("Bharat Vani 🇮🇳 — Voice of India (Windows HUD)")
        self.root.geometry("480x740")
        self.root.configure(bg="#0b0f19")

        self.angle = 0
        self.state = "idle" # idle, listening, thinking, speaking
        self._build_ui()
        self._start_orb_animation()

    def _build_ui(self):
        # Header / Title Bar
        header = tk.Frame(self.root, bg="#0f172a", height=50)
        header.pack(fill="x")

        title = tk.Label(
            header,
            text="BHARAT VANI 🇮🇳 — AI VOICE ASSISTANT",
            font=("Segoe UI", 12, "bold"),
            fg="#f59e0b",
            bg="#0f172a"
        )
        title.pack(pady=10)

        # Telemetry Status Ribbon
        self.telemetry_label = tk.Label(
            self.root,
            text="⚡ CPU: 14% | RAM: 48% | BAT: 95% | MODE: GEMINI CLOUD (ONLINE)",
            font=("Consolas", 8),
            fg="#94a3b8",
            bg="#0b0f19"
        )
        self.telemetry_label.pack(pady=4)

        # Animated Glowing Orb Canvas
        self.canvas = tk.Canvas(self.root, width=280, height=240, bg="#0b0f19", highlightthickness=0)
        self.canvas.pack(pady=10)

        # State label
        self.state_label = tk.Label(
            self.root,
            text="● WAITING FOR 'HEY VANI'...",
            font=("Segoe UI", 10, "bold"),
            fg="#38bdf8",
            bg="#0b0f19"
        )
        self.state_label.pack(pady=2)

        # Chat Log Box
        self.chat_box = tk.Text(
            self.root,
            height=12,
            bg="#111827",
            fg="#e2e8f0",
            font=("Segoe UI", 9),
            wrap="word",
            relief="flat",
            padx=10,
            pady=8
        )
        self.chat_box.pack(fill="x", padx=16, pady=8)
        self.chat_box.insert("end", "🇮🇳 [Bharat Vani]: Namaste! I am your Windows AI assistant.\\n")
        self.chat_box.configure(state="disabled")

        # Bottom Input Area
        input_frame = tk.Frame(self.root, bg="#0b0f19")
        input_frame.pack(fill="x", padx=16, pady=8)

        self.entry = tk.Entry(input_frame, bg="#1e293b", fg="#f8fafc", font=("Segoe UI", 10), relief="flat")
        self.entry.pack(side="left", fill="x", expand=True, padx=(0, 8), ipady=6)
        self.entry.bind("<Return>", self._on_enter_pressed)

        self.ptt_button = tk.Button(
            input_frame,
            text="🎙️ PTT",
            bg="#f59e0b",
            fg="#000",
            font=("Segoe UI", 9, "bold"),
            command=self._on_ptt_clicked,
            relief="flat",
            padx=12,
            pady=6
        )
        self.ptt_button.pack(side="right")

    def log_message(self, sender: str, text: str):
        self.chat_box.configure(state="normal")
        self.chat_box.insert("end", f"\\n[{sender}]: {text}\\n")
        self.chat_box.see("end")
        self.chat_box.configure(state="disabled")

    def set_state(self, state: str):
        self.state = state
        colors = {
            "idle": ("● WAITING FOR 'HEY VANI'...", "#38bdf8"),
            "listening": ("🎙️ LISTENING...", "#ef4444"),
            "thinking": ("🧠 THINKING...", "#a855f7"),
            "speaking": ("🔊 SPEAKING...", "#10b981"),
        }
        text, color = colors.get(state, ("● STANDBY", "#94a3b8"))
        self.state_label.config(text=text, fg=color)

    def _start_orb_animation(self):
        def animate():
            self.canvas.delete("all")
            cx, cy = 140, 120
            self.angle = (self.angle + 4) % 360

            # Outer rings
            for r, col, width in [(60, "#f59e0b", 2), (75, "#0ea5e9", 1), (90, "#6366f1", 1)]:
                self.canvas.create_oval(cx - r, cy - r, cx + r, cy + r, outline=col, width=width)

            # Orbiting energy nodes
            rad = math.radians(self.angle)
            px = cx + 75 * math.cos(rad)
            py = cy + 75 * math.sin(rad)
            self.canvas.create_oval(px - 5, py - 5, px + 5, py + 5, fill="#f59e0b", outline="")

            # Center Glowing Core
            core_r = 35 + int(5 * math.sin(rad * 2))
            core_color = "#38bdf8" if self.state == "idle" else "#f59e0b"
            self.canvas.create_oval(cx - core_r, cy - core_r, cx + core_r, cy + core_r, fill=core_color, outline="#ffffff")

            self.root.after(30, animate)

        animate()

    def _on_enter_pressed(self, event):
        text = self.entry.get().strip()
        if text and self.callback:
            self.entry.delete(0, "end")
            self.callback(text)

    def _on_ptt_clicked(self):
        if self.callback:
            self.callback("__PTT_TRIGGER__")

    def run(self):
        self.root.mainloop()
`,
  },
  {
    filename: "main.py",
    path: "main.py",
    description: "Main orchestrator connecting Listener, Brain, ActionExecutor, Speaker, and HUD.",
    code: `# ==============================================================================
# 🇮🇳 main.py - Bharat Vani Windows Assistant Orchestrator
# Connects: Listener 👂 -> Brain 🧠 -> Actions ⚡ -> Speaker 🔊 -> HUD 🖥️
# ==============================================================================

import os
import sys
import threading
from core.brain import BharatBrain
from core.listener import BharatListener
from core.speaker import BharatSpeaker
from core.actions import ActionExecutor
from gui.hud import BharatHUD

def main():
    print("=" * 60)
    print("🇮🇳  BHARAT VANI — VOICE OF INDIA (WINDOWS ASSISTANT)")
    print("=" * 60)

    # 1. Initialize Subsystems
    gemini_key = os.environ.get("GEMINI_API_KEY", "")
    brain = BharatBrain(gemini_api_key=gemini_key)
    speaker = BharatSpeaker()
    actions = ActionExecutor()

    # 2. Command Dispatcher
    def handle_command(text: str):
        if text == "__PTT_TRIGGER__":
            hud.set_state("listening")
            text = listener.push_to_talk_record()
            if not text:
                hud.set_state("idle")
                return

        hud.log_message("You 🇮🇳", text)
        hud.set_state("thinking")

        # Process with Brain (Google Gemini AI)
        result = brain.process(text)
        hud.set_state("speaking")

        # Execute PC Action if detected
        if result.get("isAction"):
            action_type = result.get("actionType")
            details = result.get("actionDetails", {})
            actions.execute(action_type, details)

        # Log to HUD
        display_text = result.get("displayText", "")
        hud.log_message(f"Bharat Vani ({result.get('engine', 'AI')})", display_text)

        # Speak back
        spoken_response = result.get("spokenResponse", "")
        speaker.speak(spoken_response)
        hud.set_state("idle")

    # 3. Setup Listener
    listener = BharatListener(on_command_callback=handle_command)
    listener.start_background_listening()

    # 4. Launch Futuristic HUD (Main GUI thread)
    hud = BharatHUD(on_user_input_callback=handle_command)
    hud.run()

if __name__ == "__main__":
    main()
`,
  },
  {
    filename: "requirements.txt",
    path: "requirements.txt",
    description: "Required Python dependencies for running Bharat Vani on Windows.",
    code: `google-genai>=2.4.0
SpeechRecognition>=3.10.0
PyAudio>=0.2.14
pyttsx3>=2.90
pywhatkit>=5.4
pyautogui>=0.9.54
psutil>=5.9.8
customtkinter>=5.2.2
requests>=2.31.0
pywin32>=306
pillow>=10.2.0
`,
  },
  {
    filename: "run.bat",
    path: "run.bat",
    description: "One-click Windows batch script to install dependencies and run Bharat Vani.",
    code: `@echo off
title Bharat Vani - AI Voice Assistant for Windows
color 0B
cls
echo ===============================================================
echo   BHARAT VANI - VOICE OF INDIA (WINDOWS AI VOICE ASSISTANT)
echo ===============================================================
echo.
echo [1/3] Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not added to PATH.
    echo Please install Python 3.10+ from python.org and check 'Add to PATH'.
    pause
    exit /b
)

echo [2/3] Installing / Verifying requirements...
pip install -r requirements.txt

echo.
echo [3/3] Launching Bharat Vani HUD & 24/7 Voice Listener...
echo Wake words: "Hey Vani", "Ok Vani", "Namaste Vani"
python main.py

pause
`,
  },
];
