// Bharat Vani Extension — Side Panel Logic

const API_BASE = "http://localhost:3000";
let conversationHistory = [];
let isListening = false;
let recognition = null;
let includePageContext = true;

// DOM Elements
const statusText = document.getElementById("statusText");
const chatViewport = document.getElementById("chatViewport");
const chatInput = document.getElementById("chatInput");
const btnSend = document.getElementById("btnSend");
const btnMic = document.getElementById("btnMic");
const visualizerContainer = document.getElementById("visualizerContainer");
const visualizerText = document.getElementById("visualizerText");
const languageSelect = document.getElementById("languageSelect");
const continuousListeningCheck = document.getElementById("continuousListeningCheck");
const btnOpenFull = document.getElementById("btnOpenFull");
const btnClearChat = document.getElementById("btnClearChat");
const contextPageTitle = document.getElementById("contextPageTitle");
const btnToggleContext = document.getElementById("btnToggleContext");

// Quick ribbon buttons
const btnSummarizePage = document.getElementById("btnSummarizePage");
const btnExplainPage = document.getElementById("btnExplainPage");
const btnTranslateHinglish = document.getElementById("btnTranslateHinglish");
const btnSystemStatus = document.getElementById("btnSystemStatus");

// Check Server Connection
async function checkBackendStatus() {
  try {
    const res = await fetch(`${API_BASE}/api/system/status`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      statusText.textContent = `🟢 Online (${data.pcName || "Ready"})`;
      statusText.style.color = "#10b981";
      return true;
    }
  } catch (err) {
    // Server is not running
  }
  statusText.textContent = "🔴 Server Offline (Run Desktop App)";
  statusText.style.color = "#f43f5e";
  return false;
}

// Update Active Tab Banner
async function updateCurrentTabInfo() {
  try {
    if (!chrome?.tabs) return;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.title) {
      contextPageTitle.textContent = tab.title.slice(0, 35) + (tab.title.length > 35 ? "..." : "");
    }
  } catch (e) {
    contextPageTitle.textContent = "Current Tab Attached";
  }
}

// Extract current active page text
function getActivePageData() {
  return new Promise((resolve) => {
    if (!chrome?.runtime?.sendMessage) {
      return resolve(null);
    }
    chrome.runtime.sendMessage({ type: "EXTRACT_PAGE_TEXT" }, (response) => {
      if (response && response.data) {
        resolve(response.data);
      } else {
        resolve(null);
      }
    });
  });
}

// Setup Speech Recognition
function setupSpeech() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn("Web Speech Recognition not supported in this environment");
    btnMic.style.opacity = "0.5";
    btnMic.title = "Microphone not supported";
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = languageSelect.value === "hi-IN" ? "hi-IN" : "en-IN";

  recognition.onresult = (event) => {
    const lastIndex = event.results.length - 1;
    const transcript = event.results[lastIndex][0].transcript.trim();
    console.log("🎙️ [Heard]:", transcript);

    const lower = transcript.toLowerCase();
    const wakeWords = ["hey vani", "ok vani", "namaste vani", "suno vani", "vani", "वानी"];
    const hasWakeWord = wakeWords.some((w) => lower.includes(w));

    if (isListening || (continuousListeningCheck.checked && hasWakeWord)) {
      chatInput.value = transcript;
      handleSendMessage(transcript);
      if (!continuousListeningCheck.checked) {
        stopListening();
      }
    }
  };

  recognition.onerror = (event) => {
    console.warn("Speech error:", event.error);
    if (!continuousListeningCheck.checked) {
      stopListening();
    }
  };

  recognition.onend = () => {
    if (continuousListeningCheck.checked) {
      try {
        recognition.start();
      } catch (e) {}
    } else {
      stopListening();
    }
  };
}

function startListening() {
  if (!recognition) setupSpeech();
  if (!recognition) return;

  try {
    recognition.lang = languageSelect.value === "hi-IN" ? "hi-IN" : "en-IN";
    recognition.start();
    isListening = true;
    btnMic.classList.add("recording");
    visualizerContainer.classList.add("active");
    visualizerText.textContent = "Listening to your voice...";
  } catch (e) {
    console.warn("Recognition already active", e);
  }
}

function stopListening() {
  isListening = false;
  btnMic.classList.remove("recording");
  visualizerContainer.classList.remove("active");
  try {
    recognition?.stop();
  } catch (e) {}
}

// Speak aloud using SpeechSynthesis
function speakAssistantResponse(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();

  // Strip markdown symbols for speech
  const cleanSpeech = text
    .replace(/[*_#`~\[\]\(\)]/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .slice(0, 400);

  const utterance = new SpeechSynthesisUtterance(cleanSpeech);
  utterance.rate = 1.05;
  utterance.pitch = 1.0;

  // Try to find Indian English or Hindi voice
  const voices = window.speechSynthesis.getVoices();
  const indianVoice = voices.find(
    (v) => v.lang.includes("en-IN") || v.lang.includes("hi-IN") || v.name.toLowerCase().includes("india")
  );
  if (indianVoice) utterance.voice = indianVoice;

  window.speechSynthesis.speak(utterance);
}

// Append Message to Chat Viewport
function appendMessage(role, text) {
  const msgEl = document.createElement("div");
  msgEl.className = `message ${role}`;

  const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (role === "assistant") {
    // Formatted content
    const formatted = formatMarkdown(text);
    msgEl.innerHTML = `
      <div class="msg-avatar">
        <img src="icons/icon32.png" alt="Vani">
      </div>
      <div class="msg-bubble">
        <div class="msg-sender">Bharat Vani AI</div>
        <div class="msg-content">${formatted}</div>
        <div class="msg-time">${timeStr}</div>
      </div>
    `;
  } else {
    msgEl.innerHTML = `
      <div class="msg-bubble">
        <div class="msg-sender">You</div>
        <div class="msg-content">${escapeHTML(text)}</div>
        <div class="msg-time">${timeStr}</div>
      </div>
    `;
  }

  chatViewport.appendChild(msgEl);
  chatViewport.scrollTop = chatViewport.scrollHeight;
}

// Lightweight Markdown Formatter
function formatMarkdown(text) {
  let esc = escapeHTML(text);
  // Bold
  esc = esc.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  // Bullet lists
  esc = esc.replace(/^[\*\-]\s+(.*)$/gm, "<li>$1</li>");
  esc = esc.replace(/(<li>.*<\/li>)/s, "<ul style='margin-left:16px;margin-top:4px;'>$1</ul>");
  // Line breaks
  esc = esc.replace(/\n/g, "<br>");
  return esc;
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

// Send Message to Server
async function handleSendMessage(customPrompt = null) {
  const prompt = (customPrompt || chatInput.value).trim();
  if (!prompt) return;

  appendMessage("user", prompt);
  chatInput.value = "";

  // Visualizer feedback
  visualizerContainer.classList.add("active");
  visualizerText.textContent = "Bharat Vani is thinking...";

  let promptWithContext = prompt;

  // Append page context if enabled and prompt seems to relate to page
  if (includePageContext) {
    const pageData = await getActivePageData();
    if (pageData && pageData.title) {
      promptWithContext = `[Webpage Context - Title: "${pageData.title}", URL: "${pageData.url}"]\nContent excerpt: "${pageData.body.slice(0, 1500)}"\n\nUser Question: ${prompt}`;
    }
  }

  try {
    const res = await fetch(`${API_BASE}/api/assistant/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: promptWithContext,
        languagePreference: languageSelect.value,
        conversationHistory: conversationHistory.slice(-8),
        brainMode: "gemini",
      }),
    });

    visualizerContainer.classList.remove("active");

    if (res.ok) {
      const data = await res.json();
      const answer = data.spokenResponse || data.displayText || "Request processed.";
      appendMessage("assistant", answer);
      speakAssistantResponse(answer);

      // Save to conversation history
      conversationHistory.push({ role: "user", text: prompt });
      conversationHistory.push({ role: "assistant", text: answer });
    } else {
      const errData = await res.json().catch(() => ({}));
      appendMessage("assistant", `⚠️ **Error**: ${errData.error || "Unable to reach Gemini assistant."}`);
    }
  } catch (err) {
    visualizerContainer.classList.remove("active");
    appendMessage(
      "assistant",
      `⚠️ **Cannot connect to Bharat Vani local backend**.\n\nPlease launch the desktop app via **"Launch Bharat Vani (Desktop App).bat"** so the local server is running on http://localhost:3000.`
    );
  }
}

// Event Listeners
btnSend.addEventListener("click", () => handleSendMessage());

chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSendMessage();
  }
});

btnMic.addEventListener("click", () => {
  if (isListening) {
    stopListening();
  } else {
    startListening();
  }
});

continuousListeningCheck.addEventListener("change", () => {
  if (continuousListeningCheck.checked) {
    startListening();
  } else {
    stopListening();
  }
});

btnToggleContext.addEventListener("click", () => {
  includePageContext = !includePageContext;
  btnToggleContext.textContent = includePageContext ? "Active" : "Off";
  btnToggleContext.style.background = includePageContext ? "rgba(6, 182, 212, 0.12)" : "rgba(255, 255, 255, 0.05)";
  btnToggleContext.style.color = includePageContext ? "var(--cyan)" : "var(--text-muted)";
});

btnClearChat.addEventListener("click", () => {
  chatViewport.innerHTML = "";
  conversationHistory = [];
  appendMessage("assistant", "Namaste! Conversation cleared. How may I assist you now?");
});

btnOpenFull.addEventListener("click", () => {
  if (chrome?.tabs?.create) {
    chrome.tabs.create({ url: API_BASE });
  } else {
    window.open(API_BASE, "_blank");
  }
});

// Quick Action Ribbon Handlers
btnSummarizePage.addEventListener("click", async () => {
  const pageData = await getActivePageData();
  const title = pageData?.title ? `"${pageData.title}"` : "this webpage";
  handleSendMessage(`Summarize the main content, key takeaways, and conclusion of ${title} in concise bullet points.`);
});

btnExplainPage.addEventListener("click", async () => {
  handleSendMessage("Explain the core concepts and important points of this current webpage simply.");
});

btnTranslateHinglish.addEventListener("click", () => {
  languageSelect.value = "hi-IN";
  handleSendMessage("Please explain the main idea of this page in Hindi / Hinglish.");
});

btnSystemStatus.addEventListener("click", () => {
  handleSendMessage("Check my system status, available tools, and voice assistant mode.");
});

// Check for pending queries from Context Menu clicks
async function checkPendingQueries() {
  if (!chrome?.storage?.local) return;
  const data = await chrome.storage.local.get(["pendingQuery", "triggerPageAnalysis", "timestamp"]);
  if (data.pendingQuery && Date.now() - (data.timestamp || 0) < 60000) {
    await chrome.storage.local.remove(["pendingQuery", "triggerPageAnalysis", "timestamp"]);
    handleSendMessage(data.pendingQuery);
  }
}

// Initialization
document.addEventListener("DOMContentLoaded", () => {
  setupSpeech();
  checkBackendStatus();
  updateCurrentTabInfo();
  checkPendingQueries();
  setInterval(checkBackendStatus, 10000);
});
