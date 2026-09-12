// Bharat Vani Popup HUD

const API_BASE = "http://localhost:3000";
const popStatus = document.getElementById("popStatus");
const popMic = document.getElementById("popMic");
const popVoiceHint = document.getElementById("popVoiceHint");
const popOpenSidePanel = document.getElementById("popOpenSidePanel");
const popOpenDesktop = document.getElementById("popOpenDesktop");
const popResponseBox = document.getElementById("popResponseBox");
const popResponseText = document.getElementById("popResponseText");

let isRecording = false;
let recognition = null;

async function checkStatus() {
  try {
    const res = await fetch(`${API_BASE}/api/system/status`);
    if (res.ok) {
      popStatus.textContent = "🟢 Online";
      popStatus.style.color = "#10b981";
      return;
    }
  } catch (e) {}
  popStatus.textContent = "🔴 Server Offline";
  popStatus.style.color = "#f43f5e";
}

function setupMic() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    popVoiceHint.textContent = "Mic not supported";
    popMic.style.opacity = "0.5";
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "en-IN";
  recognition.interimResults = false;

  recognition.onresult = async (event) => {
    const transcript = event.results[0][0].transcript.trim();
    popVoiceHint.textContent = `Heard: "${transcript}"`;
    stopMic();
    await sendPrompt(transcript);
  };

  recognition.onerror = () => {
    popVoiceHint.textContent = "Tap mic to retry";
    stopMic();
  };

  recognition.onend = () => {
    stopMic();
  };
}

function startMic() {
  if (!recognition) setupMic();
  if (!recognition) return;
  try {
    recognition.start();
    isRecording = true;
    popMic.classList.add("recording");
    popVoiceHint.textContent = "Listening...";
  } catch (e) {}
}

function stopMic() {
  isRecording = false;
  popMic.classList.remove("recording");
  try {
    recognition?.stop();
  } catch (e) {}
}

async function sendPrompt(text) {
  popResponseBox.style.display = "block";
  popResponseText.textContent = "Thinking...";

  try {
    const res = await fetch(`${API_BASE}/api/assistant/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: text,
        languagePreference: "mix",
        brainMode: "gemini",
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const answer = data.spokenResponse || data.displayText || "Done!";
      popResponseText.textContent = answer;

      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const ut = new SpeechSynthesisUtterance(answer.slice(0, 200));
        window.speechSynthesis.speak(ut);
      }
    } else {
      popResponseText.textContent = "Assistant returned an error.";
    }
  } catch (err) {
    popResponseText.textContent = "Please start desktop app (http://localhost:3000).";
  }
}

popMic.addEventListener("click", () => {
  if (isRecording) {
    stopMic();
  } else {
    startMic();
  }
});

popOpenSidePanel.addEventListener("click", async () => {
  if (chrome?.sidePanel?.open) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await chrome.sidePanel.open({ tabId: tab.id });
      window.close();
      return;
    }
  }
  // Fallback
  chrome.tabs.create({ url: `${API_BASE}` });
  window.close();
});

popOpenDesktop.addEventListener("click", () => {
  chrome.tabs.create({ url: API_BASE });
  window.close();
});

document.addEventListener("DOMContentLoaded", () => {
  checkStatus();
  setupMic();
});
