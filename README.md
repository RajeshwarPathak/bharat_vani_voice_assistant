# Bharat Vani

> A Windows-first voice, vision, and productivity assistant with Hindi, Hinglish, and English support.

Bharat Vani combines a React interface, an Express automation bridge, Google Gemini, a native Python speech service, and an optional Chrome/Edge extension. It can answer questions, control Windows, inspect screen captures, manage reminders and calendar items, launch applications, and automate WhatsApp Desktop through keyboard navigation.

## Contents

- [What It Does](#what-it-does)
- [Requirements](#requirements)
- [Quick Start](#quick-start)
- [Gemini Configuration](#gemini-configuration)
- [Desktop App](#desktop-app)
- [Background Voice](#background-voice)
- [WhatsApp Automation](#whatsapp-automation)
- [Browser Extension](#browser-extension)
- [Development Commands](#development-commands)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)
- [Privacy and Security](#privacy-and-security)
- [Contributing](#contributing)

## What It Does

| Area | Capabilities |
| --- | --- |
| Conversation | Answers general questions through Gemini and speaks responses aloud |
| Languages | English, Hindi, and Hinglish modes with configurable wake words |
| Windows control | Launch apps, control windows, type text, manage volume, lock, sleep, restart, or shut down |
| Voice | Push-to-talk, wake-word listening, and native background listening while the app is behind another window |
| Vision | Screen capture, region selection, OCR-style inspection, and Google Search grounding |
| Productivity | Calendar events, reminders, profiles, voice modes, overlays, and command guide |
| Messaging | WhatsApp Desktop chat search and message entry for explicit WhatsApp commands |
| Browser | Chrome/Edge side panel, popup, selected-text actions, and page summaries |

## Requirements

- Windows 10 or Windows 11
- Node.js 20 or newer
- npm
- Python 3.10 or newer for native background speech
- A logged-in WhatsApp Desktop installation for WhatsApp UI automation
- A Gemini API key for cloud answers and vision features

Node and Python must be available in `PATH`. The application can still open without Gemini, but cloud answers and vision grounding will be unavailable.

## Quick Start

### 1. Get the project

Clone the repository or download it from GitHub, then open a terminal in the project folder.

```powershell
git clone <your-repository-url>
Set-Location .\bharat-vani
```

### 2. Install Node dependencies

```powershell
npm install
```

### 3. Configure environment variables

Copy `.env.example` to `.env` and add your own key:

```powershell
Copy-Item .env.example .env
```

Edit `.env`:

```dotenv
GEMINI_API_KEY=your_gemini_api_key
```

Never commit `.env`. It is ignored by Git.

### 4. Install Python speech dependencies

```powershell
python -m pip install --upgrade pip
python -m pip install SpeechRecognition PyAudio
```

If PyAudio does not install through pip on your machine, install a compatible Windows wheel or use the desktop app without native background listening.

### 5. Start Bharat Vani

The easiest option is:

```powershell
.\Launch Bharat Vani (Desktop App).bat
```

The launcher starts the backend, refreshes an older Bharat Vani server process, starts the native speech service, and opens the app window. You can also run:

```powershell
npm run app
```

## Gemini Configuration

Create a Gemini API key in Google AI Studio, then place it only in your local `.env` file:

```dotenv
GEMINI_API_KEY=your_gemini_api_key
```

The key is read by the local server and is never required by the browser extension directly. Do not paste the key into source code, screenshots, GitHub issues, or a public repository.

## Desktop App

### Create a desktop shortcut

Double-click:

```text
Create Desktop Shortcut.bat
```

The shortcut uses the folder where the project is installed, so it can be created on any Windows PC.

### Start automatically with Windows

Open **Auto-Start** inside the app and choose the startup option. The generated startup command uses `%APPDATA%` and the current app URL rather than a fixed user or drive path.

### Normal window mode

Bharat Vani runs as a regular standalone app window. It does not require a permanent browser tab and does not use the old animated floating-icon mode.

## Background Voice

When the Bharat Vani window is visible, the app uses the browser/Electron voice input path. When the window is hidden behind another tab or app, the native Python speech service can listen for the configured wake word and forward the recognized phrase to the assistant.

Example:

```text
Hey Vani, what time is it?
```

For background listening to work:

1. Start Bharat Vani with the launcher.
2. Allow microphone access.
3. Keep continuous listening enabled.
4. Say the selected wake word before the question.

## WhatsApp Automation

Use an explicit WhatsApp command:

```text
Hey Vani, send hello to Raj on WhatsApp
```

The Windows UI automation then attempts to:

1. Open and focus WhatsApp Desktop.
2. Close a leftover dialog if one is open.
3. Use `Ctrl+F` to search existing chats.
4. Enter the contact name and choose the first result.
5. Paste the message into the conversation.
6. Press `Enter` to send.

WhatsApp Desktop must be installed, logged in, and available in the foreground. Contact names can be ambiguous, so verify the selected conversation before using this with a real recipient. Phone numbers are more reliable when the WhatsApp account and country code are correct.

The automation uses Windows keyboard navigation, not blind screen coordinates. WhatsApp can change its shortcuts or interface, so this feature may need maintenance after a WhatsApp update.

## Browser Extension

The extension works in Chromium-based browsers and connects to the local server at `http://localhost:3000`.

1. Start Bharat Vani.
2. Open `chrome://extensions` in Chrome/Brave or `edge://extensions` in Edge.
3. Enable **Developer mode**.
4. Choose **Load unpacked**.
5. Select the `extension` folder inside this project.
6. Open the extension popup or side panel.

Available extension features include selected-text questions, page summaries, voice input, and a side panel. The local backend must be running for assistant requests to work.

## Development Commands

Run these commands from the `bharat-vani` folder:

| Command | Purpose |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Run the TypeScript server with `tsx` |
| `npm run app` | Start the Electron desktop app |
| `npm run build` | Build the Vite frontend and bundled server |
| `npm run start` | Run the production server from `dist` |
| `npm run lint` | Run the TypeScript check |
| `npm run preview` | Preview the Vite production frontend |
| `npm run dist` | Build a Windows installer with electron-builder |

Before packaging or publishing, run:

```powershell
npm run lint
npm run build
```

## Project Structure

```text
bharat-vani/
├── src/                         React application
│   ├── App.tsx                  Main state and command routing
│   ├── components/              UI hubs, modals, voice, vision, and controls
│   ├── data/                    Default profiles, calendar data, and sample modules
│   └── utils/                   Audio and calendar helpers
├── server.ts                    Express API, Gemini routing, and Windows bridge
├── stt_service.py               Native Python speech and wake-word service
├── electron.cjs                 Electron desktop shell and tray integration
├── extension/                   Chrome and Edge extension
├── .env.example                 Safe environment variable template
├── .gitignore                   Secret and generated-file exclusions
└── package.json                 Scripts and dependencies
```

## Troubleshooting

<details>
<summary>Port 3000 is already in use</summary>

The launcher restarts an existing Bharat Vani `dist/server.cjs` process. If another application owns port 3000, close that application or change the app port consistently in the server, Electron shell, launcher, and extension configuration.
</details>

<details>
<summary>The app opens but Gemini does not answer</summary>

Check that `.env` exists in the `bharat-vani` folder and contains a valid `GEMINI_API_KEY`. Then restart the app. Network access is required for Gemini requests.
</details>

<details>
<summary>Background voice does not work</summary>

Confirm Python, `SpeechRecognition`, and `PyAudio` are installed. Check microphone permissions in Windows. Start the app with the launcher and keep continuous listening enabled.
</details>

<details>
<summary>WhatsApp opens the wrong dialog</summary>

Close any existing forwarding or new-message dialog in WhatsApp, restart Bharat Vani so the latest bundle is loaded, and use an explicit command containing `on WhatsApp`. The automation searches existing chats with `Ctrl+F`; it does not use the Forward dialog.
</details>

<details>
<summary>GitHub shows `.env`, `dist`, or `node_modules`</summary>

These files are intentionally ignored. Refresh GitHub Desktop and ensure you are publishing the repository root, not a nested duplicate folder.
</details>

## Privacy and Security

- Keep `.env` local and private.
- Use `.env.example` for public configuration documentation.
- Do not commit API keys, access tokens, contact lists, screenshots, or personal machine paths.
- The server uses local addresses for communication between the UI and local services.
- WhatsApp UI automation interacts with the currently logged-in desktop account. Review recipients before enabling hands-free sending.

## Contributing

1. Create a branch for your change.
2. Keep personal data and secrets out of source files.
3. Run `npm run lint` and `npm run build`.
4. Describe behavior changes and platform assumptions in the pull request.

## License

Add the project license before distributing the repository publicly.
