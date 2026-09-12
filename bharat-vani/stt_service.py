import sys
import os
import time
import json
import io
import threading
import subprocess
from http.server import HTTPServer, BaseHTTPRequestHandler
import speech_recognition as sr

# Initialize Speech Recognizer with sensitive thresholds
recognizer = sr.Recognizer()
recognizer.energy_threshold = 200
recognizer.dynamic_energy_threshold = True
recognizer.dynamic_energy_adjustment_damping = 0.15
recognizer.dynamic_energy_ratio = 1.3
recognizer.pause_threshold = 0.6

# Background wake-word listener state & locks
stop_bg_listener = None
is_bg_active = False
latest_wake_event = {"detected": False, "phrase": "", "timestamp": 0}
wake_lock = threading.Lock()
mic_busy_lock = threading.Lock()

def recognize_windows_speech(wav_bytes):
    """Fallback: Native Windows Speech Recognition (System.Speech.Recognition)"""
    temp_path = os.path.join(os.environ.get("TEMP", "."), f"sapi_{int(time.time()*1000)}.wav")
    try:
        with open(temp_path, "wb") as f:
            f.write(wav_bytes)
        ps_cmd = f"""
        Add-Type -AssemblyName System.Speech
        $sre = New-Object System.Speech.Recognition.SpeechRecognitionEngine
        $sre.SetInputToWaveFile('{temp_path}')
        $sre.LoadGrammar((New-Object System.Speech.Recognition.DictationGrammar))
        $res = $sre.Recognize((New-Object System.TimeSpan(0,0,5)))
        if ($res) {{ $res.Text }} else {{ '' }}
        """
        out = subprocess.check_output(["powershell", "-NoProfile", "-Command", ps_cmd], text=True, timeout=8)
        return out.strip()
    except Exception as e:
        print(f"⚠️ [Windows Speech] Recognition error: {e}", flush=True)
        return ""
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass

def transcribe_audio_multi_engine(audio, wav_bytes=None, lang="en-IN"):
    """Transcribes audio using Free Speech Model first, with Windows Speech Recognition fallback"""
    text = ""
    # 1. Free Google Speech Recognition (no API key needed, handles Hinglish & Indian English)
    try:
        text = recognizer.recognize_google(audio, language=lang)
        if text:
            return {"text": text, "engine": "Free Speech Model (en-IN)"}
    except sr.UnknownValueError:
        # Try Hindi if en-IN had no match
        try:
            text = recognizer.recognize_google(audio, language="hi-IN")
            if text:
                return {"text": text, "engine": "Free Speech Model (hi-IN)"}
        except Exception:
            pass
    except Exception as e:
        print(f"⚠️ [Free STT] Google endpoint note: {e}", flush=True)

    # 2. Offline Fallback: Windows Native Speech Recognition
    if wav_bytes:
        try:
            win_text = recognize_windows_speech(wav_bytes)
            if win_text:
                return {"text": win_text, "engine": "Windows Native Speech (SAPI)"}
        except Exception:
            pass

    return {"text": text, "engine": "Free Speech Model"}

def wake_word_callback(rec, audio):
    global latest_wake_event
    phrase = ""
    try:
        phrase = rec.recognize_google(audio, language="en-IN").lower()
    except sr.UnknownValueError:
        try:
            phrase = rec.recognize_google(audio, language="hi-IN").lower()
        except Exception:
            return
    except Exception:
        return

    if not phrase:
        return

    wake_words = [
        "hey vani", "ok vani", "namaste vani", "suno vani", "vani", 
        "वानी", "हे वानी", "नमस्ते वानी", "hey bani", "ok bani", "bani",
        "hey vaani", "vaani", "wani", "hey wani", "hai vani"
    ]
    for w in wake_words:
        if w in phrase:
            print(f"🔔 [Free STT] Wake word detected on mic: '{phrase}' (trigger: '{w}')", flush=True)
            with wake_lock:
                latest_wake_event = {
                    "detected": True,
                    "phrase": phrase,
                    "timestamp": time.time()
                }
            break

def start_background_wake_listening():
    global stop_bg_listener, is_bg_active
    with wake_lock:
        if stop_bg_listener is not None:
            return True
        try:
            mic = sr.Microphone()
            with mic as source:
                recognizer.adjust_for_ambient_noise(source, duration=0.3)
                if recognizer.energy_threshold > 260:
                    recognizer.energy_threshold = 240
                elif recognizer.energy_threshold < 100:
                    recognizer.energy_threshold = 150
            stop_bg_listener = recognizer.listen_in_background(mic, wake_word_callback, phrase_time_limit=4)
            is_bg_active = True
            print(f"🎙️ [Free STT] 24/7 Background Wake-Word Listener started on Windows hardware mic! (threshold: {recognizer.energy_threshold})", flush=True)
            return True
        except Exception as e:
            print(f"⚠️ [Free STT] Could not start background listener: {e}", flush=True)
            return False

def stop_background_wake_listening():
    global stop_bg_listener, is_bg_active
    with wake_lock:
        if stop_bg_listener:
            try:
                stop_bg_listener(wait_for_stop=False)
            except Exception:
                pass
            stop_bg_listener = None
            is_bg_active = False
            print("🛑 [Free STT] Background Wake-Word Listener stopped.", flush=True)

class SpeechHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        global latest_wake_event

        if self.path == "/status":
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "online",
                "engine": "Free SpeechRecognition + Windows Native SAPI",
                "bgListenerActive": is_bg_active,
                "hasWindowsSpeech": True,
                "languages": ["en-IN", "hi-IN", "en-US"]
            }).encode('utf-8'))

        elif self.path == "/wakeword/start":
            success = start_background_wake_listening()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"success": success}).encode('utf-8'))

        elif self.path == "/wakeword/stop":
            stop_background_wake_listening()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True}).encode('utf-8'))

        elif self.path == "/wakeword/poll":
            with wake_lock:
                now = time.time()
                is_fresh = latest_wake_event["detected"] and (now - latest_wake_event["timestamp"] < 4)
                event_data = dict(latest_wake_event)
                event_data["isFresh"] = is_fresh
                if is_fresh:
                    latest_wake_event["detected"] = False

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(event_data).encode('utf-8'))

        elif self.path.startswith("/listen"):
            # Direct recording from hardware microphone
            was_bg = is_bg_active
            if was_bg:
                stop_background_wake_listening()

            result = {"success": False, "text": "", "engine": "Free Speech"}
            try:
                with mic_busy_lock:
                    with sr.Microphone() as source:
                        recognizer.adjust_for_ambient_noise(source, duration=0.25)
                        if recognizer.energy_threshold > 260:
                            recognizer.energy_threshold = 240
                        elif recognizer.energy_threshold < 100:
                            recognizer.energy_threshold = 150
                        audio = recognizer.listen(source, timeout=6, phrase_time_limit=10)
                
                # Get raw wav bytes for fallback
                wav_bytes = audio.get_wav_data()
                res = transcribe_audio_multi_engine(audio, wav_bytes)
                result = {
                    "success": True,
                    "text": res.get("text", ""),
                    "engine": res.get("engine", "Free Speech"),
                    "heard": bool(res.get("text"))
                }
            except Exception as e:
                result = {"success": False, "error": str(e), "text": ""}
            finally:
                if was_bg:
                    start_background_wake_listening()

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path == "/transcribe":
            content_length = int(self.headers.get('Content-Length', 0))
            audio_data = self.rfile.read(content_length)

            result = {"success": False, "text": "", "engine": "Free Speech"}
            try:
                audio_file = io.BytesIO(audio_data)
                with sr.AudioFile(audio_file) as source:
                    audio = recognizer.record(source)
                
                res = transcribe_audio_multi_engine(audio, audio_data)
                result = {
                    "success": True,
                    "text": res.get("text", ""),
                    "engine": res.get("engine", "Free Speech"),
                    "heard": bool(res.get("text"))
                }
            except Exception as e:
                print(f"⚠️ [Transcribe Error]: {e}", flush=True)
                # Try raw Windows SAPI directly
                try:
                    win_text = recognize_windows_speech(audio_data)
                    if win_text:
                        result = {"success": True, "text": win_text, "engine": "Windows Native Speech", "heard": True}
                    else:
                        result = {"success": False, "error": str(e), "text": ""}
                except Exception as win_err:
                    result = {"success": False, "error": f"{e}; Win: {win_err}", "text": ""}

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        pass

def run(port=3001):
    server = HTTPServer(('127.0.0.1', port), SpeechHandler)
    print(f"🎙️ [Free Speech Engine] Python SpeechRecognition + Windows SAPI Service running on http://127.0.0.1:{port}", flush=True)
    server.serve_forever()

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 3001
    run(port)
