import { config } from "dotenv";
config(); // Load .env file — GEMINI_API_KEY will be available as process.env.GEMINI_API_KEY

import express from "express";
import path from "path";
import http from "http";
import fs from "fs";
import os from "os";
import { spawn } from "child_process";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";


const app = express();
const PORT = 3000;
const STT_SERVICE_URL = "http://127.0.0.1:3001";

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Initialize server-side Gemini client using the recommended SDK
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// System status endpoint
app.get("/api/system/status", (req, res) => {
  res.json({
    status: "online",
    os: `${process.platform} ${os.arch()} (${os.release()})`,
    pcName: os.hostname(),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    defaultWakeWord: "Hey Vani",
    supportedWakeWords: ["Hey Vani", "Ok Vani", "Namaste Vani"],
    voiceLocale: "en-IN",
    location: "Not configured",
  });
});

// Launch Standalone Native Windows App Window (Edge / Chrome App with full Speech Support)
app.post("/api/system/launch-native-app", (req, res) => {
  if (process.platform === "win32") {
    const edgePaths = [
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    ];
    const edgeExe = edgePaths.find((p) => fs.existsSync(p));

    const args = [
      "--app=http://localhost:3000",
      "--window-size=1360,900",
      "--app-id=BharatVaniAI",
      "--use-fake-ui-for-media-stream",
      "--autoplay-policy=no-user-gesture-required",
    ];

    try {
      if (edgeExe) {
        const child = spawn(edgeExe, args, { detached: true, stdio: "ignore" });
        child.on("error", (err) => console.error("Edge spawn error:", err));
        child.unref();
        return res.json({ success: true, app: "msedge" });
      } else {
        const child = spawn("cmd.exe", ["/c", "start", "msedge", ...args], {
          detached: true,
          stdio: "ignore",
        });
        child.on("error", (err) => console.error("Cmd spawn error:", err));
        child.unref();
        return res.json({ success: true, app: "msedge-cmd" });
      }
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }
  res.json({ success: false, message: "Not on Windows" });
});

// Helper: Find Google Chrome installation on Windows
function findChromeExecutable(): string | null {
  if (process.platform !== "win32") return null;
  const possiblePaths = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    path.join(process.env.LOCALAPPDATA || "", "Google", "Chrome", "Application", "chrome.exe"),
  ];
  return possiblePaths.find((p) => fs.existsSync(p)) || null;
}

function encodePowerShellCommand(command: string): string {
  return Buffer.from(command, "utf16le").toString("base64");
}

function quotePowerShellString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function automateWhatsAppMessage(recipient: string, message: string): void {
  const script = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class WindowFocus {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
}
"@
$recipient = ${quotePowerShellString(recipient)}
$message = ${quotePowerShellString(message)}
Start-Process "whatsapp:"
Start-Sleep -Seconds 3
$whatsapp = Get-Process -ErrorAction SilentlyContinue |
  Where-Object { $_.ProcessName -match "WhatsApp" -and $_.MainWindowTitle -match "WhatsApp" } |
  Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if (-not $whatsapp) { throw "WhatsApp Desktop window was not found" }
[WindowFocus]::SetForegroundWindow($whatsapp.MainWindowHandle) | Out-Null
Start-Sleep -Milliseconds 700
$shell = New-Object -ComObject WScript.Shell
$shell.AppActivate($whatsapp.Id) | Out-Null
Start-Sleep -Milliseconds 300
# Ctrl+F searches existing WhatsApp chats without opening the Forward / Send to dialog.
[System.Windows.Forms.SendKeys]::SendWait("^f")
Start-Sleep -Milliseconds 700
$shell = New-Object -ComObject WScript.Shell
$shell.AppActivate($whatsapp.Id) | Out-Null
Start-Sleep -Milliseconds 300
Set-Clipboard -Value $recipient
[System.Windows.Forms.SendKeys]::SendWait("^v")
Start-Sleep -Milliseconds 800
[System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
Start-Sleep -Milliseconds 1200
Set-Clipboard -Value $message
[System.Windows.Forms.SendKeys]::SendWait("^v")
Start-Sleep -Milliseconds 300
[System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
`;

  const encodedScript = encodePowerShellCommand(script);
  const child = spawn(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encodedScript],
    { detached: true, stdio: "ignore", windowsHide: true }
  );
  child.on("error", (err) => console.error("WhatsApp UI automation error:", err));
  child.unref();
}

// Native Windows App Launcher (executes desktop programs, not browser tabs)
function launchWindowsApplication(params: {
  target?: string;
  query?: string;
  url?: string;
  message?: string;
  recipient?: string;
}): { success: boolean; app: string; message?: string } {
  if (process.platform !== "win32") {
    return { success: false, app: params.target || "unknown", message: "Only Windows is supported" };
  }

  const rawTarget = (params.target || "").trim();
  const targetLower = rawTarget.toLowerCase();
  const chromeExe = findChromeExecutable();

  try {
    if (
      targetLower === "python" ||
      targetLower === "py" ||
      targetLower === "python3" ||
      targetLower.includes("python")
    ) {
      if (targetLower.includes("idle")) {
        const child = spawn("cmd.exe", ["/c", "start", "python", "-m", "idlelib"], {
          detached: true,
          stdio: "ignore",
        });
        child.unref();
        return { success: true, app: "Python IDLE" };
      }
      // Launch Python in an interactive Windows Command Prompt
      const child = spawn("cmd.exe", ["/c", "start", "Python 3", "cmd", "/k", "python"], {
        detached: true,
        stdio: "ignore",
      });
      child.unref();
      return { success: true, app: "Python" };
    }

    // 2. WhatsApp Desktop Native App & Message Protocol
    if (targetLower.includes("whatsapp")) {
      if (params.message) {
        const encoded = encodeURIComponent(params.message);
        // WhatsApp's desktop URI accepts a phone number, not a contact name.
        // Keep named contacts out of `phone=` so the app can open normally.
        const cleanRecipient = (params.recipient || "").replace(/[^0-9+]/g, "");
        const isPhoneNumber = /^\+?\d{7,15}$/.test(cleanRecipient);
        if (isPhoneNumber || params.recipient) {
          automateWhatsAppMessage(params.recipient || cleanRecipient, params.message);
          return { success: true, app: "WhatsApp Desktop (Automated Message)" };
        }

        const child = spawn("cmd.exe", ["/c", "start", `whatsapp://send?text=${encoded}`], {
          detached: true,
          stdio: "ignore",
        });
        child.unref();
        return { success: true, app: "WhatsApp Desktop (Message Ready)" };
      }

      // Launch native WhatsApp Desktop app directly
      const child = spawn("cmd.exe", ["/c", "start", "whatsapp:"], {
        detached: true,
        stdio: "ignore",
      });
      child.unref();
      return { success: true, app: "WhatsApp Desktop" };
    }

    // 3. Google Chrome (native browser executable)
    if (
      targetLower.includes("chrome") ||
      targetLower === "google chrome" ||
      targetLower === "browser"
    ) {
      const urlArg =
        params.url ||
        (params.query ? `https://www.google.com/search?q=${encodeURIComponent(params.query)}` : undefined);
      if (chromeExe) {
        const args = urlArg ? [urlArg] : [];
        const child = spawn(chromeExe, args, { detached: true, stdio: "ignore" });
        child.unref();
        return { success: true, app: "Google Chrome" };
      } else {
        const args = urlArg ? ["chrome", urlArg] : ["chrome"];
        const child = spawn("cmd.exe", ["/c", "start", ...args], {
          detached: true,
          stdio: "ignore",
        });
        child.unref();
        return { success: true, app: "Google Chrome" };
      }
    }

    // 4. Visual Studio Code
    if (
      targetLower.includes("vs code") ||
      targetLower.includes("vscode") ||
      targetLower === "code" ||
      targetLower.includes("visual studio code")
    ) {
      const child = spawn("cmd.exe", ["/c", "start", "code"], {
        detached: true,
        stdio: "ignore",
      });
      child.unref();
      return { success: true, app: "Visual Studio Code" };
    }

    // 5. Notepad
    if (targetLower.includes("notepad") || targetLower === "editor") {
      const child = spawn("cmd.exe", ["/c", "start", "notepad"], {
        detached: true,
        stdio: "ignore",
      });
      child.unref();
      return { success: true, app: "Notepad" };
    }

    // 6. Calculator
    if (targetLower.includes("calculator") || targetLower.includes("calc")) {
      const child = spawn("cmd.exe", ["/c", "start", "calc"], {
        detached: true,
        stdio: "ignore",
      });
      child.unref();
      return { success: true, app: "Calculator" };
    }

    // 7. Command Prompt / PowerShell / Terminal
    if (targetLower.includes("powershell")) {
      const child = spawn("cmd.exe", ["/c", "start", "powershell"], {
        detached: true,
        stdio: "ignore",
      });
      child.unref();
      return { success: true, app: "PowerShell" };
    }
    if (
      targetLower.includes("terminal") ||
      targetLower.includes("cmd") ||
      targetLower.includes("command prompt")
    ) {
      const child = spawn("cmd.exe", ["/c", "start", "cmd"], {
        detached: true,
        stdio: "ignore",
      });
      child.unref();
      return { success: true, app: "Command Prompt" };
    }

    // 8. File Explorer
    if (
      targetLower.includes("explorer") ||
      targetLower.includes("files") ||
      targetLower.includes("folder")
    ) {
      const child = spawn("cmd.exe", ["/c", "start", "explorer"], {
        detached: true,
        stdio: "ignore",
      });
      child.unref();
      return { success: true, app: "File Explorer" };
    }

    // 9. Spotify
    if (targetLower.includes("spotify") || targetLower.includes("gaana")) {
      const child = spawn("cmd.exe", ["/c", "start", "spotify:"], {
        detached: true,
        stdio: "ignore",
      });
      child.unref();
      return { success: true, app: "Spotify" };
    }

    // 10. Microsoft Edge
    if (
      targetLower.includes("edge") ||
      targetLower.includes("msedge") ||
      targetLower.includes("microsoft edge")
    ) {
      const urlArg =
        params.url ||
        (params.query ? `https://www.bing.com/search?q=${encodeURIComponent(params.query)}` : undefined);
      const args = urlArg ? ["msedge", urlArg] : ["msedge"];
      const child = spawn("cmd.exe", ["/c", "start", ...args], {
        detached: true,
        stdio: "ignore",
      });
      child.unref();
      return { success: true, app: "Microsoft Edge" };
    }

    // 11. YouTube
    if (targetLower.includes("youtube")) {
      const ytUrl = params.query
        ? `https://www.youtube.com/results?search_query=${encodeURIComponent(params.query)}`
        : "https://www.youtube.com";
      if (chromeExe) {
        const child = spawn(chromeExe, [ytUrl], { detached: true, stdio: "ignore" });
        child.unref();
      } else {
        const child = spawn("cmd.exe", ["/c", "start", ytUrl], {
          detached: true,
          stdio: "ignore",
        });
        child.unref();
      }
      return { success: true, app: "YouTube" };
    }

    // 12. Generic Application Launch via Windows shell `start`
    const sanitized = rawTarget.replace(/[&|;`$<>^"']/g, "").trim();
    if (sanitized) {
      const child = spawn("cmd.exe", ["/c", "start", "", sanitized], {
        detached: true,
        stdio: "ignore",
      });
      child.unref();
      return { success: true, app: sanitized };
    }

    return { success: false, app: rawTarget, message: "No application specified" };
  } catch (err: any) {
    console.error(`[App Launcher] Error launching ${rawTarget}:`, err);
    return { success: false, app: rawTarget, message: err.message };
  }
}

// Endpoint to launch native desktop apps on Windows
app.post("/api/system/launch-app", (req, res) => {
  const { target, query, url, message, recipient } = req.body;
  const result = launchWindowsApplication({ target, query, url, message, recipient });
  res.json(result);
});

// Windows Voice Access & System Actions Bridge
async function executeWindowsAction(params: {
  subAction?: string;
  action?: string;
  key?: string;
  keys?: string;
  count?: number;
  direction?: string;
  button?: string;
  text?: string;
  target?: string;
  query?: string;
  x?: number;
  y?: number;
}): Promise<{ success: boolean; message: string }> {
  if (process.platform !== "win32") {
    return { success: false, message: "Windows actions are only supported on Windows OS." };
  }

  const act = (params.subAction || params.action || "").toLowerCase().trim();
  try {
    switch (act) {
      case "go_to_desktop": {
        const ps = `(New-Object -ComObject Shell.Application).MinimizeAll()`;
        spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps], { detached: true, stdio: "ignore" }).unref();
        return { success: true, message: "Desktop displayed (Minimized all windows)." };
      }

      case "minimize_window": {
        const ps = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class WinUtil {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
}
"@
$hwnd = [WinUtil]::GetForegroundWindow()
if ($hwnd -ne [IntPtr]::Zero) { [WinUtil]::ShowWindowAsync($hwnd, 6) }
`;
        spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps], { detached: true, stdio: "ignore" }).unref();
        return { success: true, message: "Minimized active window." };
      }

      case "maximize_window": {
        const ps = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class WinUtil {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
}
"@
$hwnd = [WinUtil]::GetForegroundWindow()
if ($hwnd -ne [IntPtr]::Zero) { [WinUtil]::ShowWindowAsync($hwnd, 3) }
`;
        spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps], { detached: true, stdio: "ignore" }).unref();
        return { success: true, message: "Maximized active window." };
      }

      case "restore_window": {
        const ps = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class WinUtil {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
}
"@
$hwnd = [WinUtil]::GetForegroundWindow()
if ($hwnd -ne [IntPtr]::Zero) { [WinUtil]::ShowWindowAsync($hwnd, 9) }
`;
        spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps], { detached: true, stdio: "ignore" }).unref();
        return { success: true, message: "Restored active window." };
      }

      case "close_window": {
        const ps = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait("%{F4}")`;
        spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps], { detached: true, stdio: "ignore" }).unref();
        return { success: true, message: "Closed active window (Alt+F4)." };
      }

      case "task_switcher": {
        const ps = `$wsh = New-Object -ComObject WScript.Shell; $wsh.SendKeys('%{TAB}')`;
        spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps], { detached: true, stdio: "ignore" }).unref();
        return { success: true, message: "Activated Task Switcher (Alt+Tab)." };
      }

      case "snap_left":
      case "snap_right":
      case "snap_up":
      case "snap_down": {
        const keyMap: Record<string, number> = {
          snap_left: 0x25,
          snap_right: 0x27,
          snap_up: 0x26,
          snap_down: 0x28,
        };
        const vk = keyMap[act] || 0x25;
        const ps = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class WinSnap {
    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, int dwExtraInfo);
    public static void Snap(byte key) {
        keybd_event(0x5B, 0, 0, 0);
        keybd_event(key, 0, 0, 0);
        keybd_event(key, 0, 2, 0);
        keybd_event(0x5B, 0, 2, 0);
    }
}
"@
[WinSnap]::Snap(${vk})
`;
        spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps], { detached: true, stdio: "ignore" }).unref();
        return { success: true, message: `Window snapped (${act.replace("snap_", "")}).` };
      }

      case "search_windows": {
        const query = (params.query || "").replace(/"/g, '`"');
        const ps = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class WinSearch {
    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, int dwExtraInfo);
    public static void OpenSearch() {
        keybd_event(0x5B, 0, 0, 0);
        keybd_event(0x53, 0, 0, 0);
        keybd_event(0x53, 0, 2, 0);
        keybd_event(0x5B, 0, 2, 0);
    }
}
"@
[WinSearch]::OpenSearch()
${query ? `Start-Sleep -Milliseconds 350; Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait("${query}")` : ""}
`;
        spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps], { detached: true, stdio: "ignore" }).unref();
        return { success: true, message: `Opened Windows Search for "${params.query || ""}".` };
      }

      case "touch_keyboard": {
        spawn("cmd.exe", ["/c", "start", "osk.exe"], { detached: true, stdio: "ignore" }).unref();
        return { success: true, message: "Launched Windows Touch / On-Screen Keyboard." };
      }

      case "mouse_click": {
        const btn = (params.button || "left").toLowerCase();
        let psCode = "";
        if (btn === "right") {
          psCode = `[WinMouse]::mouse_event(8, 0, 0, 0, 0); [WinMouse]::mouse_event(16, 0, 0, 0, 0);`;
        } else if (btn === "double") {
          psCode = `[WinMouse]::mouse_event(2, 0, 0, 0, 0); [WinMouse]::mouse_event(4, 0, 0, 0, 0); Start-Sleep -Milliseconds 80; [WinMouse]::mouse_event(2, 0, 0, 0, 0); [WinMouse]::mouse_event(4, 0, 0, 0, 0);`;
        } else {
          psCode = `[WinMouse]::mouse_event(2, 0, 0, 0, 0); [WinMouse]::mouse_event(4, 0, 0, 0, 0);`;
        }
        const ps = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class WinMouse {
    [DllImport("user32.dll")]
    public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo);
}
"@
${psCode}
`;
        spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps], { detached: true, stdio: "ignore" }).unref();
        return { success: true, message: `Executed mouse ${btn} click.` };
      }

      case "mouse_scroll": {
        const dir = (params.direction || "down").toLowerCase();
        const delta = dir === "up" ? 240 : -240;
        const ps = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class WinMouse {
    [DllImport("user32.dll")]
    public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo);
}
"@
[WinMouse]::mouse_event(0x0800, 0, 0, ${delta}, 0);
`;
        spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps], { detached: true, stdio: "ignore" }).unref();
        return { success: true, message: `Scrolled mouse ${dir}.` };
      }

      case "key_press": {
        const k = (params.key || "Enter").toLowerCase();
        const map: Record<string, string> = {
          enter: "{ENTER}",
          return: "{ENTER}",
          tab: "{TAB}",
          escape: "{ESC}",
          dismiss: "{ESC}",
          esc: "{ESC}",
          backspace: "{BACKSPACE}",
          delete: "{DELETE}",
          space: " ",
          up: "{UP}",
          down: "{DOWN}",
          left: "{LEFT}",
          right: "{RIGHT}",
          home: "{HOME}",
          end: "{END}",
          pageup: "{PGUP}",
          pagedown: "{PGDN}",
        };
        const token = map[k] || `{${params.key}}`;
        const ps = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${token}')`;
        spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps], { detached: true, stdio: "ignore" }).unref();
        return { success: true, message: `Pressed key: ${params.key}` };
      }

      case "key_combo": {
        const keys = (params.keys || "^c").replace(/'/g, "''");
        const ps = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${keys}')`;
        spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps], { detached: true, stdio: "ignore" }).unref();
        return { success: true, message: `Sent key combination: ${params.keys}` };
      }

      case "key_repeat": {
        const k = (params.key || "Backspace").toLowerCase();
        const map: Record<string, string> = {
          backspace: "{BACKSPACE}",
          delete: "{DELETE}",
          tab: "{TAB}",
          up: "{UP}",
          down: "{DOWN}",
          left: "{LEFT}",
          right: "{RIGHT}",
        };
        const token = map[k] || "{BACKSPACE}";
        const count = Math.min(Math.max(Number(params.count) || 1, 1), 50);
        const ps = `Add-Type -AssemblyName System.Windows.Forms; for ($i=0; $i -lt ${count}; $i++) { [System.Windows.Forms.SendKeys]::SendWait('${token}') }`;
        spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps], { detached: true, stdio: "ignore" }).unref();
        return { success: true, message: `Repeated key ${params.key} ${count} times.` };
      }

      case "dictate_text": {
        const text = (params.text || "").replace(/'/g, "''");
        const ps = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Clipboard]::SetText('${text}'); [System.Windows.Forms.SendKeys]::SendWait('^v')`;
        spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps], { detached: true, stdio: "ignore" }).unref();
        return { success: true, message: `Typed: "${params.text}"` };
      }

      case "switch_app": {
        const target = (params.target || "").replace(/'/g, "''");
        const ps = `
$wsh = New-Object -ComObject WScript.Shell
$wsh.AppActivate('${target}')
`;
        spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps], { detached: true, stdio: "ignore" }).unref();
        return { success: true, message: `Switched to application: ${params.target}` };
      }

      case "lock_pc": {
        spawn("rundll32.exe", ["user32.dll,LockWorkStation"], { detached: true, stdio: "ignore" }).unref();
        return { success: true, message: "Windows Workstation session locked." };
      }

      case "sleep_pc": {
        spawn("rundll32.exe", ["powrprof.dll,SetSuspendState", "0,1,0"], { detached: true, stdio: "ignore" }).unref();
        return { success: true, message: "PC entered sleep mode." };
      }

      case "shutdown_pc": {
        spawn("shutdown.exe", ["/s", "/t", "15", "/c", "Bharat Vani: PC Shutting Down in 15 seconds."], {
          detached: true,
          stdio: "ignore",
        }).unref();
        return { success: true, message: "PC shutdown scheduled in 15 seconds. Say 'Cancel shutdown' to abort." };
      }

      case "restart_pc": {
        spawn("shutdown.exe", ["/r", "/t", "15", "/c", "Bharat Vani: PC Restarting in 15 seconds."], {
          detached: true,
          stdio: "ignore",
        }).unref();
        return { success: true, message: "PC restart scheduled in 15 seconds. Say 'Cancel shutdown' to abort." };
      }

      case "cancel_shutdown": {
        spawn("shutdown.exe", ["/a"], { detached: true, stdio: "ignore" }).unref();
        return { success: true, message: "Pending shutdown or restart canceled." };
      }

      default:
        return { success: false, message: `Unknown Windows action: ${act}` };
    }
  } catch (err: any) {
    console.error(`[Windows Action] Error executing ${act}:`, err);
    return { success: false, message: err.message };
  }
}

// Endpoint to execute Windows Voice Access & System actions
app.post("/api/system/windows-action", async (req, res) => {
  const result = await executeWindowsAction(req.body);
  res.json(result);
});

// --- Free Python Speech Recognition (Port 3001) Endpoints ---
// 1. Check Python Free STT Service status
app.get("/api/voice/status", (req, res) => {
  http.get(`${STT_SERVICE_URL}/status`, (proxyRes) => {
    proxyRes.pipe(res);
  }).on("error", () => {
    res.json({ status: "offline", engine: "Python Speech Service" });
  });
});

// 2. Direct hardware mic recording via Python PyAudio (Works 100% in Electron!)
app.get("/api/voice/listen", (req, res) => {
  const proxyReq = http.get(`${STT_SERVICE_URL}/listen`, (proxyRes) => {
    proxyRes.pipe(res);
  });
  proxyReq.on("error", (err) => {
    res.json({ success: false, text: "", error: "Python Speech service is starting: " + err.message });
  });
});

// 3. Background Wake-Word listener Start / Stop / Poll
app.get("/api/voice/wakeword/start", (req, res) => {
  http.get(`${STT_SERVICE_URL}/wakeword/start`, (proxyRes) => {
    proxyRes.pipe(res);
  }).on("error", (err) => res.json({ success: false, error: err.message }));
});

app.get("/api/voice/wakeword/stop", (req, res) => {
  http.get(`${STT_SERVICE_URL}/wakeword/stop`, (proxyRes) => {
    proxyRes.pipe(res);
  }).on("error", (err) => res.json({ success: false, error: err.message }));
});

app.get("/api/voice/wakeword/poll", (req, res) => {
  http.get(`${STT_SERVICE_URL}/wakeword/poll`, (proxyRes) => {
    proxyRes.pipe(res);
  }).on("error", () => res.json({ detected: false, isFresh: false }));
});

// 4. Transcribe audio payload (Base64 or raw WAV) via Free Python STT + Windows SAPI
app.post("/api/voice/transcribe", (req, res) => {
  let audioBuffer: Buffer;
  if (req.body && req.body.audioBase64) {
    audioBuffer = Buffer.from(req.body.audioBase64, "base64");
  } else if (Buffer.isBuffer(req.body)) {
    audioBuffer = req.body;
  } else {
    audioBuffer = Buffer.alloc(0);
  }

  const options = {
    hostname: "127.0.0.1",
    port: 3001,
    path: "/transcribe",
    method: "POST",
    headers: {
      "Content-Type": "audio/wav",
      "Content-Length": audioBuffer.length,
    },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on("error", (err) => {
    res.json({
      success: false,
      text: "",
      error: "Could not reach Free Speech service: " + err.message,
    });
  });

  if (audioBuffer.length > 0) {
    proxyReq.write(audioBuffer);
  }
  proxyReq.end();
});

// Process Voice or Text Command
app.post("/api/assistant/process", async (req, res) => {
  try {
    const {
      prompt,
      conversationHistory = [],
      languagePreference = "mix",
      userProfile,
      todayEvents = [],
      activeReminders = [],
    } = req.body;

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Missing prompt" });
    }

    const trimmed = prompt.trim();
    const cleanPrompt = trimmed
      .replace(/^(hey vani|ok vani|namaste vani|suno vani|vani)[,\s]*/i, "")
      .trim();
    const lowerPrompt = cleanPrompt.toLowerCase();

    // 1. Check Custom Commands from active User Profile first
    if (userProfile && Array.isArray(userProfile.customCommands)) {
      for (const cmd of userProfile.customCommands) {
        if (
          cmd.phrase &&
          lowerPrompt.includes(cmd.phrase.toLowerCase())
        ) {
          return res.json({
            isAction: true,
            actionType: cmd.actionType || "custom_command",
            actionDetails: cmd.actionDetails || {},
            spokenResponse:
              cmd.spokenResponse ||
              `Executing your custom command: "${cmd.phrase}".`,
            displayText: `✨ **Custom Command Triggered**: *"${cmd.phrase}"*\n- Profile: **${userProfile.name}**\n- Action: ${cmd.actionType}`,
            engine: "user-custom-shortcut",
          });
        }
      }
    }

    // 2. Check deterministic fast-path actions first (Instant execution for system, windows, overlays, and voice control)
    const fastAction = handleDeterministicBrain(
      trimmed,
      "deterministic-brain",
      languagePreference,
      userProfile,
      todayEvents,
      activeReminders
    );
    if (fastAction.isAction) {
      return res.json(fastAction);
    }

    // 3. Server-side Gemini AI processing
    try {
      const ai = getGeminiClient();

      const userName = userProfile?.name || "Boss";
      const userCity = userProfile?.city || "India";

      const now = new Date();
      const timeStr = now.toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      const dateStr = now.toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const systemInstruction = `You are "Bharat Vani" (Voice of India 🇮🇳), an intelligent, conversational AI voice assistant for Windows running directly on the user's PC.
Your user is: ${userName} located in ${userCity}.
Language Preference: ${languagePreference} (en-IN: Indian English, hi-IN: Pure Hindi, mix: Hinglish / colloquial Hindi-English).

Current Real-Time Indian Context:
- Exact Current Time: ${timeStr} IST
- Exact Today's Date & Day: ${dateStr}
- User Location: ${userCity}, India
- Today's active calendar events: ${JSON.stringify(todayEvents || [])}
- Active reminders: ${JSON.stringify(activeReminders || [])}

Language Rules:
- If languagePreference is "hi-IN" or user asks in Hindi: Respond in respectful, natural Hindi (Devanagari or Romanized), e.g. "नमस्ते ${userName}! अभी समय ${timeStr} हुआ है।"
- If languagePreference is "mix" or user asks in Hinglish (e.g. "Kal 4 baje meeting add karo", "Mujhe 5 baje yaad dilana", "Mausam kaisa hai"): Respond in friendly, natural Hinglish.
- If languagePreference is "en-IN": Respond in crisp, polite Indian English.

CRITICAL INSTRUCTIONS FOR NORMAL & GENERAL QUESTIONS:
- For general questions (weather forecasts, rain predictions, time, date, science, news, coding, calculations, history, explanations, trivia, chat): Set actionType to "chat", isAction to false, and ALWAYS provide a direct, helpful, natural, and factual answer in spokenResponse and displayText!
- If the user asks about the time or date, answer directly using the Exact Current Time (${timeStr} IST) and Date (${dateStr}) provided above.
- If the user asks about weather or rain in ${userCity}, provide a realistic, informative forecast answer (e.g., whether rain is expected tomorrow or current conditions).
- NEVER refuse to answer general questions or show generic command suggestions when the user asks a normal question. Answer them directly and warmly!

Analyze user intent into one of these action types:
1. "add_calendar_event": User wants to schedule or add an event/meeting/appointment. (e.g. "Kal 3 baje team meeting add karo", "Schedule dentist tomorrow at 5 PM", "Meeting with client at 4 PM"). Extract eventTitle, eventDate (YYYY-MM-DD or relative 'tomorrow'/'today'), eventTime (HH:mm), and durationMinutes.
2. "check_schedule": User asks about schedule, plans, calendar, or upcoming meetings (e.g. "What is on my schedule today?", "Aaj mere kya plans hain?", "Show my meetings").
3. "set_reminder": User wants to set a reminder/alarm (e.g. "Remind me to call Rahul in 10 minutes", "Mujhe 5 baje chai ki yaad dilana", "Remind me to take medicine at 8 PM"). Extract reminderText, reminderTime (HH:mm or relative like 'in 10 minutes'), and reminderDate.
5. "whatsapp_message": User specifically wants to send a WhatsApp message to someone (e.g. "Send message to Rahul on WhatsApp", "WhatsApp Priya that I reached"). Extract recipient name and message text. NOTE: If the user only asks to open or launch WhatsApp without sending a message (e.g. "Open WhatsApp", "WhatsApp kholo"), classify it as "launch_app" with target "WhatsApp".
  Never infer WhatsApp for a generic request such as "send hi" or "send hi to Rahul". If no messaging app or channel is explicitly named, classify it as "chat" with isAction false and ask which app or channel to use (for example WhatsApp, email, or another messaging app). Do not launch an app until the user specifies the channel.
6. "launch_app": User wants to open/launch any desktop application (e.g. "Open Chrome" -> target: "Google Chrome", "Open Python" -> target: "Python", "Open WhatsApp" -> target: "WhatsApp", "Open VS Code" -> target: "Visual Studio Code", Notepad, Calculator, Spotify, Terminal, File Explorer, YouTube, or Hindi: "Chrome kholo", "Python kholo"). Always extract the specific app name as target.
7. "windows_action": Windows Voice Access actions for PC, window, mouse, keyboard and power:
   - Window control: "minimize window", "maximize window", "restore window", "close window", "go to desktop" / "minimize all windows", "show task switcher", "snap window to left/right/up/down", "touch keyboard"
   - Mouse & keyboard: "click", "right click", "double click", "scroll down", "scroll up", "press enter", "press tab", "press escape", "press backspace", "copy that", "paste that", "undo that", "redo that", "bold that", "type <text>"
   - PC Power: "shutdown pc", "restart pc", "sleep pc", "lock screen" / "lock pc", "cancel shutdown"
   Set subAction to one of: go_to_desktop, minimize_window, maximize_window, restore_window, close_window, task_switcher, snap_left, snap_right, snap_up, snap_down, search_windows, touch_keyboard, mouse_click, mouse_scroll, key_press, key_combo, key_repeat, dictate_text, lock_pc, sleep_pc, shutdown_pc, restart_pc, cancel_shutdown.
8. "voice_control": User controls Vani listening state ("Vani wake up" -> control: "wake", "Unmute" -> "wake", "Vani sleep" -> "sleep", "Mute" -> "sleep", "Turn off microphone" -> "mute", "Close vani" / "Quit vani" -> "exit").
9. "voice_mode": User switches voice mode ("Commands mode" -> mode: "commands", "Dictation mode" -> mode: "dictation", "Default mode" -> mode: "default").
10. "show_overlay": User controls screen overlays ("Show numbers" -> overlay: "numbers", "Hide numbers" -> overlay: "none", "Show grid" / "Mouse grid" -> overlay: "grid", "Hide grid" -> overlay: "none").
11. "show_commands": User asks what to say or asks for commands list ("What can I say", "Show all commands", "Show command list", "Show commands", "Open vani guide", "Open vani help").
12. "system_control": PC system controls like volume up, volume down, mute, battery check, CPU/RAM check.
13. "screenshot": User wants to capture a screenshot ("Take a screenshot", "Screenshot lo").
14. "chat": General questions, conversational greetings, programming help, weather, calculations, jokes, general knowledge.

Respond in strict JSON with the following schema:
- isAction: boolean
- actionType: "add_calendar_event" | "check_schedule" | "set_reminder" | "check_reminders" | "whatsapp_message" | "launch_app" | "windows_action" | "voice_control" | "voice_mode" | "show_overlay" | "show_commands" | "web_search" | "system_control" | "screenshot" | "chat"
- actionDetails: {
    target?: string,
    message?: string,
    query?: string,
    command?: string,
    subAction?: string,
    control?: string,
    mode?: string,
    overlay?: string,
    number?: number,
    key?: string,
    keys?: string,
    count?: number,
    direction?: string,
    button?: string,
    text?: string,
    eventTitle?: string,
    eventDate?: string,
    eventTime?: string,
    durationMinutes?: number,
    reminderText?: string,
    reminderTime?: string,
    reminderDate?: string
  }
- spokenResponse: Short, natural voice response (1-2 sentences max, respectful, matching language tone).
- displayText: Clear, markdown-friendly text for the HUD chat log.
- engine: "gemini-3.6-flash"`;

      let response;
      let usedEngine = "gemini-3.6-flash";
      const modelConfig = {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isAction: { type: Type.BOOLEAN },
            actionType: {
              type: Type.STRING,
              description:
                "add_calendar_event, check_schedule, set_reminder, check_reminders, launch_app, whatsapp_message, windows_action, voice_control, voice_mode, show_overlay, show_commands, web_search, system_control, screenshot, or chat",
            },
            actionDetails: {
              type: Type.OBJECT,
              properties: {
                target: { type: Type.STRING },
                message: { type: Type.STRING },
                query: { type: Type.STRING },
                command: { type: Type.STRING },
                subAction: { type: Type.STRING },
                control: { type: Type.STRING },
                mode: { type: Type.STRING },
                overlay: { type: Type.STRING },
                number: { type: Type.NUMBER },
                key: { type: Type.STRING },
                keys: { type: Type.STRING },
                count: { type: Type.NUMBER },
                direction: { type: Type.STRING },
                button: { type: Type.STRING },
                text: { type: Type.STRING },
                eventTitle: { type: Type.STRING },
                eventDate: { type: Type.STRING },
                eventTime: { type: Type.STRING },
                durationMinutes: { type: Type.NUMBER },
                reminderText: { type: Type.STRING },
                reminderTime: { type: Type.STRING },
                reminderDate: { type: Type.STRING },
              },
            },
            spokenResponse: { type: Type.STRING },
            displayText: { type: Type.STRING },
            engine: { type: Type.STRING },
          },
          required: ["isAction", "actionType", "spokenResponse", "displayText"],
        },
      };

      try {
        response = await ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: cleanPrompt || trimmed,
          config: modelConfig,
        });
      } catch (primaryErr: any) {
        console.warn("Primary gemini-3.6-flash error, retrying after short backoff:", primaryErr?.message);
        await new Promise((r) => setTimeout(r, 600));
        response = await ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: cleanPrompt || trimmed,
          config: modelConfig,
        });
      }

      const raw = response.text || "{}";
      const parsed = JSON.parse(raw);
      parsed.engine = usedEngine;
      return res.json(parsed);
    } catch (geminiError) {
      console.warn(
        "Gemini API call failed, automatically failing over to local deterministic fallback:",
        geminiError
      );
      // Failover to local deterministic fallback
      const fallback = handleDeterministicBrain(
        cleanPrompt || trimmed,
        "deterministic-system",
        languagePreference,
        userProfile,
        todayEvents,
        activeReminders
      );
      fallback.note =
        "Executed via Deterministic Action Router (Internet/API failover)";
      return res.json(fallback);
    }
  } catch (error: any) {
    console.error("Assistant process error:", error);
    res.status(500).json({
      error: error.message || "Failed to process voice command",
      spokenResponse:
        "I encountered an issue processing that command. Please try again.",
      displayText: "Error processing command. Switching to standby.",
      isAction: false,
      actionType: "chat",
      engine: "fallback",
    });
  }
});

// Deterministic Rule-based Assistant Router
interface DeterministicBrainResult {
  isAction: boolean;
  actionType: string;
  actionDetails?: {
    target?: string;
    message?: string;
    query?: string;
    command?: string;
    subAction?: string;
    control?: string;
    mode?: string;
    overlay?: string;
    number?: number;
    key?: string;
    keys?: string;
    count?: number;
    direction?: string;
    button?: string;
    text?: string;
    eventTitle?: string;
    eventDate?: string;
    eventTime?: string;
    reminderText?: string;
    reminderTime?: string;
    reminderDate?: string;
  };
  spokenResponse: string;
  displayText: string;
  engine: string;
  note?: string;
}

function handleDeterministicBrain(
  prompt: string,
  engineName = "deterministic-system",
  languagePreference = "mix",
  userProfile?: any,
  todayEvents: any[] = [],
  activeReminders: any[] = []
): DeterministicBrainResult {
  const rawP = prompt.toLowerCase().trim();
  const p = rawP.replace(/^(hey vani|ok vani|namaste vani|suno vani|vani)[,\s]*/i, "").trim();
  const userName = userProfile?.name || "Boss";
  const isHindi = languagePreference === "hi-IN" || /[\u0900-\u097F]/.test(prompt);

  // =========================================================================
  // WINDOWS VOICE ACCESS (VANI) INTENTS
  // =========================================================================

  // 1. Vani Voice & Mic Control
  if (
    rawP === "unmute" ||
    rawP === "vani wake up" ||
    p === "unmute" ||
    p === "wake up" ||
    rawP.includes("wake up") ||
    rawP.includes("start listening") ||
    rawP.includes("vani suno")
  ) {
    return {
      isAction: true,
      actionType: "voice_control",
      actionDetails: { control: "wake" },
      spokenResponse: isHindi ? `नमस्ते ${userName}, वानी सक्रिय है और सुन रही है।` : "Vani is awake and listening to your voice commands.",
      displayText: "🎙️ **Voice Access**: Vani Unmuted & Active.",
      engine: engineName,
    };
  }

  if (
    rawP === "mute" ||
    rawP === "vani sleep" ||
    rawP === "sleep" ||
    p === "mute" ||
    p === "sleep" ||
    rawP.includes("vani sleep") ||
    rawP.includes("go to sleep") ||
    rawP.includes("sleep vani") ||
    rawP.includes("stop listening") ||
    rawP.includes("chup ho jao")
  ) {
    return {
      isAction: true,
      actionType: "voice_control",
      actionDetails: { control: "sleep" },
      spokenResponse: isHindi ? `वानी अब स्लीप मोड में है। जब भी जरूरत हो, 'Vani wake up' कहें।` : "Vani is now in sleep mode. Say 'Vani wake up' or 'Unmute' when you need me.",
      displayText: "💤 **Voice Access**: Vani is in sleep mode. Say **'Vani wake up'** to resume.",
      engine: engineName,
    };
  }

  if (
    p.includes("turn off microphone") ||
    p.includes("mute microphone") ||
    p.includes("disable mic") ||
    p.includes("mic band karo")
  ) {
    return {
      isAction: true,
      actionType: "voice_control",
      actionDetails: { control: "mute" },
      spokenResponse: isHindi ? "माइक्रोफ़ोन बंद कर दिया गया है।" : "Turning off the microphone.",
      displayText: "🔇 **Voice Access**: Microphone disabled.",
      engine: engineName,
    };
  }

  if (
    p.includes("close vani") ||
    p.includes("stop vani") ||
    p.includes("exit vani") ||
    p.includes("quit vani") ||
    p.includes("turn off vani") ||
    p.includes("vani band karo")
  ) {
    return {
      isAction: true,
      actionType: "voice_control",
      actionDetails: { control: "exit" },
      spokenResponse: isHindi ? "भारत वानी वॉइस एक्सेस बंद की जा रही है। अलविदा!" : "Closing Bharat Vani Voice Access. Goodbye!",
      displayText: "⏹️ **Voice Access**: Closing Bharat Vani application.",
      engine: engineName,
    };
  }

  // 2. What can I say / Commands list / Help
  if (
    p.includes("what can i say") ||
    p.includes("show all commands") ||
    p.includes("show command list") ||
    p.includes("show commands") ||
    p.includes("commands list") ||
    p.includes("open vani guide") ||
    p.includes("open vani help") ||
    p.includes("commands guide")
  ) {
    return {
      isAction: true,
      actionType: "show_commands",
      actionDetails: {},
      spokenResponse: isHindi ? "विंडोज़ वॉइस एक्सेस की सभी कमांड्स की सूची खोली जा रही है।" : "Opening the Windows Voice Access guide for Vani.",
      displayText: "📖 **Voice Access**: Displaying full Vani Commands Guide.",
      engine: engineName,
    };
  }

  if (p.includes("open vani settings") || p.includes("vani settings")) {
    return {
      isAction: true,
      actionType: "open_settings",
      actionDetails: {},
      spokenResponse: isHindi ? "वानी सेटिंग्स खोली जा रही हैं।" : "Opening Vani settings.",
      displayText: "⚙️ **Settings**: Configuration panel opened.",
      engine: engineName,
    };
  }

  // 3. Voice Access Operational Modes
  if (p.includes("commands mode") || p.includes("command mode") || p.includes("switch to command mode")) {
    return {
      isAction: true,
      actionType: "voice_mode",
      actionDetails: { mode: "commands" },
      spokenResponse: isHindi ? "कमांड्स मोड चालू कर दिया गया है।" : "Switched to Commands Mode. Only navigation and control commands are active.",
      displayText: "⚡ **Voice Access Mode**: **Commands Mode** active.",
      engine: engineName,
    };
  }

  if (p.includes("dictation mode") || p.includes("switch to dictation mode")) {
    return {
      isAction: true,
      actionType: "voice_mode",
      actionDetails: { mode: "dictation" },
      spokenResponse: isHindi ? "डिक्टेशन मोड चालू कर दिया गया है। आप जो बोलेंगे वह सीधे टाइप होगा।" : "Switched to Dictation Mode. Spoken words will be typed directly into focused fields.",
      displayText: "✍️ **Voice Access Mode**: **Dictation Mode** active.",
      engine: engineName,
    };
  }

  if (p.includes("default mode") || p.includes("switch to default mode")) {
    return {
      isAction: true,
      actionType: "voice_mode",
      actionDetails: { mode: "default" },
      spokenResponse: isHindi ? "डिफ़ॉल्ट मोड चालू कर दिया गया है।" : "Switched to Default Mode. Both commands and dictation are active.",
      displayText: "🔄 **Voice Access Mode**: **Default Mode** active.",
      engine: engineName,
    };
  }

  // 4. Screen Overlays (Numbers & Mouse Grid)
  if (
    p.includes("show number") ||
    p.includes("show numbers") ||
    p.includes("display numbers") ||
    p.includes("number labels")
  ) {
    return {
      isAction: true,
      actionType: "show_overlay",
      actionDetails: { overlay: "numbers" },
      spokenResponse: isHindi ? "स्क्रीन एलिमेंट्स पर नंबर लेबल्स दिखाए जा रहे हैं।" : "Showing numbers on interactive screen elements. Say 'Click <number>' to choose.",
      displayText: "🔢 **Voice Access**: Numbers Overlay active.",
      engine: engineName,
    };
  }

  if (
    p.includes("hide number") ||
    p.includes("hide numbers") ||
    p.includes("clear numbers") ||
    p.includes("dismiss numbers")
  ) {
    return {
      isAction: true,
      actionType: "show_overlay",
      actionDetails: { overlay: "none" },
      spokenResponse: isHindi ? "नंबर लेबल्स हटा दिए गए हैं।" : "Hiding numbers overlay.",
      displayText: "🔢 **Voice Access**: Numbers Overlay dismissed.",
      engine: engineName,
    };
  }

  if (p.includes("show grid") || p.includes("mouse grid") || p.includes("open grid")) {
    return {
      isAction: true,
      actionType: "show_overlay",
      actionDetails: { overlay: "grid" },
      spokenResponse: isHindi ? "माउस ग्रिड दिखाया जा रहा है। 1 से 9 तक कोई नंबर बोलें।" : "Showing mouse grid. Say a number from 1 to 9 to zoom into that quadrant.",
      displayText: "🎯 **Voice Access**: 3x3 Mouse Grid active.",
      engine: engineName,
    };
  }

  if (p.includes("hide grid") || p.includes("close grid") || p.includes("dismiss grid") || p.includes("cancel grid")) {
    return {
      isAction: true,
      actionType: "show_overlay",
      actionDetails: { overlay: "none" },
      spokenResponse: isHindi ? "माउस ग्रिड बंद कर दिया गया है।" : "Hiding mouse grid.",
      displayText: "🎯 **Voice Access**: Mouse Grid dismissed.",
      engine: engineName,
    };
  }

  const numClickMatch = p.match(/^(?:click\s+)?([1-9]|1[0-2])$/i);
  if (numClickMatch) {
    const chosenNum = parseInt(numClickMatch[1], 10);
    return {
      isAction: true,
      actionType: "overlay_click",
      actionDetails: { number: chosenNum },
      spokenResponse: isHindi ? `नंबर ${chosenNum} पर क्लिक किया जा रहा है।` : `Clicking item #${chosenNum}.`,
      displayText: `🖱️ **Voice Access**: Clicked element badge #${chosenNum}.`,
      engine: engineName,
    };
  }

  // 5. Windows Manipulation & Window Management
  if (
    p.includes("go to desktop") ||
    p.includes("minimize all windows") ||
    p.includes("show desktop") ||
    p === "desktop"
  ) {
    return {
      isAction: true,
      actionType: "windows_action",
      actionDetails: { subAction: "go_to_desktop" },
      spokenResponse: isHindi ? "डेस्कटॉप दिखाया जा रहा है।" : "Minimizing all windows to show desktop.",
      displayText: "🪟 **Window Management**: Desktop displayed (All windows minimized).",
      engine: engineName,
    };
  }

  if (p.includes("task switcher") || p.includes("alt tab") || p.includes("show open apps")) {
    return {
      isAction: true,
      actionType: "windows_action",
      actionDetails: { subAction: "task_switcher" },
      spokenResponse: isHindi ? "टास्क स्विचर खोला जा रहा है।" : "Opening Task Switcher (Alt+Tab).",
      displayText: "🔀 **Window Management**: Task Switcher active.",
      engine: engineName,
    };
  }

  if (p.includes("snap") && (p.includes("left") || p.includes("baye"))) {
    return {
      isAction: true,
      actionType: "windows_action",
      actionDetails: { subAction: "snap_left" },
      spokenResponse: isHindi ? "विंडो को बाएँ स्नैप किया जा रहा है।" : "Snapping window to the left.",
      displayText: "🪟 **Window Management**: Snapped window left.",
      engine: engineName,
    };
  }

  if (p.includes("snap") && (p.includes("right") || p.includes("daye"))) {
    return {
      isAction: true,
      actionType: "windows_action",
      actionDetails: { subAction: "snap_right" },
      spokenResponse: isHindi ? "विंडो को दाएँ स्नैप किया जा रहा है।" : "Snapping window to the right.",
      displayText: "🪟 **Window Management**: Snapped window right.",
      engine: engineName,
    };
  }

  if (p.includes("snap") && p.includes("up")) {
    return {
      isAction: true,
      actionType: "windows_action",
      actionDetails: { subAction: "snap_up" },
      spokenResponse: "Snapping window up.",
      displayText: "🪟 **Window Management**: Snapped window up.",
      engine: engineName,
    };
  }

  if (p.includes("snap") && p.includes("down")) {
    return {
      isAction: true,
      actionType: "windows_action",
      actionDetails: { subAction: "snap_down" },
      spokenResponse: "Snapping window down.",
      displayText: "🪟 **Window Management**: Snapped window down.",
      engine: engineName,
    };
  }

  if (p.includes("minimize window") || p.includes("minimize that") || p.includes("window minimize")) {
    return {
      isAction: true,
      actionType: "windows_action",
      actionDetails: { subAction: "minimize_window" },
      spokenResponse: isHindi ? "सक्रिय विंडो मिनिमाइज़ की जा रही है।" : "Minimizing active window.",
      displayText: "🪟 **Window Management**: Minimized active window.",
      engine: engineName,
    };
  }

  if (p.includes("maximize window") || p.includes("maximize that") || p.includes("full screen window")) {
    return {
      isAction: true,
      actionType: "windows_action",
      actionDetails: { subAction: "maximize_window" },
      spokenResponse: isHindi ? "सक्रिय विंडो मैक्सिमाइज़ की जा रही है।" : "Maximizing active window.",
      displayText: "🪟 **Window Management**: Maximized active window.",
      engine: engineName,
    };
  }

  if (p.includes("restore window") || p.includes("restore that") || p.includes("unmaximize window")) {
    return {
      isAction: true,
      actionType: "windows_action",
      actionDetails: { subAction: "restore_window" },
      spokenResponse: isHindi ? "विंडो को रीस्टोर किया जा रहा है।" : "Restoring active window.",
      displayText: "🪟 **Window Management**: Restored window.",
      engine: engineName,
    };
  }

  if (
    p.includes("close window") ||
    p.includes("close that") ||
    p.includes("close this") ||
    p.includes("window band karo")
  ) {
    return {
      isAction: true,
      actionType: "windows_action",
      actionDetails: { subAction: "close_window" },
      spokenResponse: isHindi ? "सक्रिय विंडो बंद की जा रही है।" : "Closing active window (Alt+F4).",
      displayText: "🪟 **Window Management**: Closed active window.",
      engine: engineName,
    };
  }

  const switchMatch = p.match(/^switch to (.+)$/i);
  if (switchMatch) {
    const targetApp = switchMatch[1].trim();
    return {
      isAction: true,
      actionType: "windows_action",
      actionDetails: { subAction: "switch_app", target: targetApp },
      spokenResponse: isHindi ? `${targetApp} पर स्विच किया जा रहा है।` : `Switching to ${targetApp}.`,
      displayText: `🪟 **Window Management**: Switched to **${targetApp}**.`,
      engine: engineName,
    };
  }

  if (
    p.includes("touch keyboard") ||
    p.includes("on-screen keyboard") ||
    p.includes("virtual keyboard")
  ) {
    return {
      isAction: true,
      actionType: "windows_action",
      actionDetails: { subAction: "touch_keyboard" },
      spokenResponse: isHindi ? "ऑन-स्क्रीन कीबोर्ड खोला जा रहा है।" : "Opening Windows On-Screen Touch Keyboard.",
      displayText: "⌨️ **Touch Keyboard**: Opened Windows On-Screen Keyboard.",
      engine: engineName,
    };
  }

  // 6. Mouse Actions
  if (p.includes("double click")) {
    return {
      isAction: true,
      actionType: "windows_action",
      actionDetails: { subAction: "mouse_click", button: "double" },
      spokenResponse: "Double clicking.",
      displayText: "🖱️ **Mouse Action**: Double click executed.",
      engine: engineName,
    };
  }

  if (p.includes("right click") || p.includes("context menu")) {
    return {
      isAction: true,
      actionType: "windows_action",
      actionDetails: { subAction: "mouse_click", button: "right" },
      spokenResponse: "Right clicking.",
      displayText: "🖱️ **Mouse Action**: Right click executed.",
      engine: engineName,
    };
  }

  if (p === "click" || p.includes("left click")) {
    return {
      isAction: true,
      actionType: "windows_action",
      actionDetails: { subAction: "mouse_click", button: "left" },
      spokenResponse: "Clicking.",
      displayText: "🖱️ **Mouse Action**: Left click executed.",
      engine: engineName,
    };
  }

  if (p.includes("scroll down")) {
    return {
      isAction: true,
      actionType: "windows_action",
      actionDetails: { subAction: "mouse_scroll", direction: "down" },
      spokenResponse: "Scrolling down.",
      displayText: "🖱️ **Mouse Action**: Scrolled down.",
      engine: engineName,
    };
  }

  if (p.includes("scroll up")) {
    return {
      isAction: true,
      actionType: "windows_action",
      actionDetails: { subAction: "mouse_scroll", direction: "up" },
      spokenResponse: "Scrolling up.",
      displayText: "🖱️ **Mouse Action**: Scrolled up.",
      engine: engineName,
    };
  }

  // 7. Keyboard, Shortcuts & Formatting
  if (p.includes("select all")) {
    return {
      isAction: true,
      actionType: "windows_action",
      actionDetails: { subAction: "key_combo", keys: "^a" },
      spokenResponse: "Selected all.",
      displayText: "⌨️ **Shortcut**: Select All (Ctrl+A).",
      engine: engineName,
    };
  }

  if (p.includes("copy that") || p === "copy") {
    return {
      isAction: true,
      actionType: "windows_action",
      actionDetails: { subAction: "key_combo", keys: "^c" },
      spokenResponse: "Copied to clipboard.",
      displayText: "📋 **Clipboard**: Copied (Ctrl+C).",
      engine: engineName,
    };
  }

  if (p.includes("paste that") || p === "paste") {
    return {
      isAction: true,
      actionType: "windows_action",
      actionDetails: { subAction: "key_combo", keys: "^v" },
      spokenResponse: "Pasted from clipboard.",
      displayText: "📋 **Clipboard**: Pasted (Ctrl+V).",
      engine: engineName,
    };
  }

  if (p.includes("cut that") || p === "cut") {
    return {
      isAction: true,
      actionType: "windows_action",
      actionDetails: { subAction: "key_combo", keys: "^x" },
      spokenResponse: "Cut to clipboard.",
      displayText: "✂️ **Clipboard**: Cut (Ctrl+X).",
      engine: engineName,
    };
  }

  if (p.includes("undo that") || p === "undo") {
    return {
      isAction: true,
      actionType: "windows_action",
      actionDetails: { subAction: "key_combo", keys: "^z" },
      spokenResponse: "Undone.",
      displayText: "↩️ **Edit Action**: Undo (Ctrl+Z).",
      engine: engineName,
    };
  }

  if (p.includes("redo that") || p === "redo") {
    return {
      isAction: true,
      actionType: "windows_action",
      actionDetails: { subAction: "key_combo", keys: "^y" },
      spokenResponse: "Redone.",
      displayText: "↪️ **Edit Action**: Redo (Ctrl+Y).",
      engine: engineName,
    };
  }

  if (p.includes("bold that") || p.includes("make bold")) {
    return {
      isAction: true,
      actionType: "windows_action",
      actionDetails: { subAction: "key_combo", keys: "^b" },
      spokenResponse: "Formatted as bold.",
      displayText: "𝐁 **Formatting**: Bold (Ctrl+B).",
      engine: engineName,
    };
  }

  if (p.includes("italicize that") || p.includes("make italic")) {
    return {
      isAction: true,
      actionType: "windows_action",
      actionDetails: { subAction: "key_combo", keys: "^i" },
      spokenResponse: "Formatted as italic.",
      displayText: "𝐼 **Formatting**: Italic (Ctrl+I).",
      engine: engineName,
    };
  }

  if (p.includes("underline that") || p.includes("make underline")) {
    return {
      isAction: true,
      actionType: "windows_action",
      actionDetails: { subAction: "key_combo", keys: "^u" },
      spokenResponse: "Formatted as underline.",
      displayText: "𝐔 **Formatting**: Underline (Ctrl+U).",
      engine: engineName,
    };
  }

  if (p.includes("press enter") || p === "enter" || p === "hit enter") {
    return {
      isAction: true,
      actionType: "windows_action",
      actionDetails: { subAction: "key_press", key: "Enter" },
      spokenResponse: "Pressed Enter.",
      displayText: "⌨️ **Key Pressed**: Enter / Return.",
      engine: engineName,
    };
  }

  if (p.includes("press tab") || p === "tab") {
    return {
      isAction: true,
      actionType: "windows_action",
      actionDetails: { subAction: "key_press", key: "Tab" },
      spokenResponse: "Pressed Tab.",
      displayText: "⌨️ **Key Pressed**: Tab.",
      engine: engineName,
    };
  }

  if (p.includes("dismiss") || p.includes("press escape") || p === "escape" || p === "esc") {
    return {
      isAction: true,
      actionType: "windows_action",
      actionDetails: { subAction: "key_press", key: "Escape" },
      spokenResponse: "Dismissed.",
      displayText: "⌨️ **Key Pressed**: Escape / Dismiss.",
      engine: engineName,
    };
  }

  const repeatMatch = p.match(/(?:press\s+)?backspace\s+(\d+)\s+times/i);
  if (repeatMatch) {
    const count = parseInt(repeatMatch[1], 10);
    return {
      isAction: true,
      actionType: "windows_action",
      actionDetails: { subAction: "key_repeat", key: "Backspace", count },
      spokenResponse: `Deleted ${count} characters.`,
      displayText: `⌨️ **Key Repeated**: Backspace x ${count}.`,
      engine: engineName,
    };
  }

  if (p.includes("press backspace") || p === "backspace" || p.includes("delete that")) {
    return {
      isAction: true,
      actionType: "windows_action",
      actionDetails: { subAction: "key_press", key: "Backspace" },
      spokenResponse: "Deleted.",
      displayText: "⌨️ **Key Pressed**: Backspace.",
      engine: engineName,
    };
  }

  if (p.includes("press delete") || p === "delete") {
    return {
      isAction: true,
      actionType: "windows_action",
      actionDetails: { subAction: "key_press", key: "Delete" },
      spokenResponse: "Pressed Delete.",
      displayText: "⌨️ **Key Pressed**: Delete.",
      engine: engineName,
    };
  }

  const typeMatch = p.match(/^type\s+(.+)$/i);
  if (typeMatch) {
    const textToType = typeMatch[1].trim();
    return {
      isAction: true,
      actionType: "windows_action",
      actionDetails: { subAction: "dictate_text", text: textToType },
      spokenResponse: `Typed: ${textToType}.`,
      displayText: `✍️ **Dictated Text**: "${textToType}"`,
      engine: engineName,
    };
  }

  // 8. PC Power Actions
  if (p.includes("cancel shutdown") || p.includes("abort shutdown")) {
    return {
      isAction: true,
      actionType: "windows_action",
      actionDetails: { subAction: "cancel_shutdown" },
      spokenResponse: isHindi ? "शटडाउन या रीस्टार्ट रद्द कर दिया गया है।" : "Scheduled shutdown or restart has been canceled.",
      displayText: "🛑 **Power Action**: Scheduled shutdown aborted.",
      engine: engineName,
    };
  }

  if (
    p.includes("shutdown") ||
    p.includes("turn off computer") ||
    p.includes("power down pc") ||
    p.includes("pc band kar do") ||
    p.includes("computer band karo")
  ) {
    return {
      isAction: true,
      actionType: "windows_action",
      actionDetails: { subAction: "shutdown_pc" },
      spokenResponse: isHindi ? "15 सेकंड में कंप्यूटर बंद हो जाएगा। रद्द करने के लिए 'Cancel shutdown' कहें।" : "Shutting down the PC in 15 seconds. Say 'Cancel shutdown' to abort.",
      displayText: "⚡ **Power Action**: Windows Shutdown initiated (15-second grace period).",
      engine: engineName,
    };
  }

  if (
    p.includes("restart pc") ||
    p.includes("reboot computer") ||
    p.includes("restart computer") ||
    p.includes("pc restart karo")
  ) {
    return {
      isAction: true,
      actionType: "windows_action",
      actionDetails: { subAction: "restart_pc" },
      spokenResponse: isHindi ? "15 सेकंड में कंप्यूटर रीस्टार्ट हो जाएगा। रद्द करने के लिए 'Cancel shutdown' कहें।" : "Restarting the PC in 15 seconds. Say 'Cancel shutdown' to abort.",
      displayText: "🔄 **Power Action**: Windows Restart initiated (15-second grace period).",
      engine: engineName,
    };
  }

  if (
    p.includes("sleep pc") ||
    p.includes("put pc to sleep") ||
    p.includes("computer ko sulao") ||
    (p.includes("sleep") && (p.includes("pc") || p.includes("computer")))
  ) {
    return {
      isAction: true,
      actionType: "windows_action",
      actionDetails: { subAction: "sleep_pc" },
      spokenResponse: isHindi ? "कंप्यूटर को स्लीप मोड में भेजा जा रहा है।" : "Putting your computer to sleep now.",
      displayText: "💤 **Power Action**: Suspending PC to Sleep state.",
      engine: engineName,
    };
  }

  if (
    (p.includes("lock") && (p.includes("screen") || p.includes("pc") || p.includes("computer"))) ||
    p.includes("lock karo")
  ) {
    return {
      isAction: true,
      actionType: "windows_action",
      actionDetails: { subAction: "lock_pc" },
      spokenResponse: isHindi ? "विंडोज पीसी लॉक किया जा रहा है।" : "Locking your Windows PC right away.",
      displayText: "🔒 **Power Action**: Windows Workstation Locked.",
      engine: engineName,
    };
  }

  // =========================================================================
  // EXISTING PRODUCTIVITY & APP INTENTS
  // =========================================================================

  // Calendar: Add Event or Meeting
  if (
    p.includes("add event") ||
    p.includes("schedule") ||
    p.includes("meeting") ||
    p.includes("appointment") ||
    p.includes("calendar me add") ||
    p.includes("meeting add karo")
  ) {
    let title = "Meeting";
    let time = "15:00";
    let date = "today";

    if (p.includes("tomorrow") || p.includes("kal")) date = "tomorrow";
    const timeMatch = p.match(/(\d{1,2})\s*(?:baje|am|pm|:00)?/i);
    if (timeMatch) {
      let hr = parseInt(timeMatch[1], 10);
      if ((p.includes("shaam") || p.includes("pm") || p.includes("afternoon")) && hr < 12) {
        hr += 12;
      }
      time = `${String(hr).padStart(2, "0")}:00`;
    }

    const titleExtract = prompt.replace(/(schedule|add|meeting|appointment|tomorrow|kal|today|at|baje|on|calendar|in|karo)/gi, "").trim();
    if (titleExtract.length > 2) title = titleExtract;

    return {
      isAction: true,
      actionType: "add_calendar_event",
      actionDetails: {
        eventTitle: title,
        eventDate: date,
        eventTime: time,
      },
      spokenResponse: isHindi
        ? `जी ${userName}, ${date === "tomorrow" ? "कल" : "आज"} ${time} पर "${title}" का इवेंट कैलेंडर में जोड़ दिया है।`
        : `Scheduled "${title}" for ${date} at ${time} in your calendar.`,
      displayText: `📅 **Calendar Event Added**:\n- **Title**: ${title}\n- **Date**: ${date}\n- **Time**: ${time}\n- *Synced to Windows Calendar (.ics ready)*`,
      engine: engineName,
    };
  }

  // 2. Calendar: Check Schedule
  if (
    p.includes("schedule") ||
    p.includes("plans") ||
    p.includes("calendar") ||
    p.includes("aaj kya hai") ||
    p.includes("mere plans")
  ) {
    const count = todayEvents.length;
    return {
      isAction: true,
      actionType: "check_schedule",
      spokenResponse: isHindi
        ? `आपके आज के शेड्यूल में ${count} इवेंट्स हैं।`
        : `You have ${count} events scheduled for today, ${userName}.`,
      displayText: `📅 **Today's Schedule**: Found ${count} events on your Windows Calendar.`,
      engine: engineName,
    };
  }

  // 3. Reminders: Set Reminder
  if (
    p.includes("remind") ||
    p.includes("reminder") ||
    p.includes("yaad dilana") ||
    p.includes("yaad dila do")
  ) {
    let reminderText = "Reminder Alert";
    let reminderTime = "17:00";
    let reminderDate = "today";

    if (p.includes("tomorrow") || p.includes("kal")) reminderDate = "tomorrow";
    const timeMatch = p.match(/(\d{1,2})\s*(?:baje|am|pm|:00)?/i);
    if (timeMatch) {
      let hr = parseInt(timeMatch[1], 10);
      if ((p.includes("shaam") || p.includes("pm")) && hr < 12) hr += 12;
      reminderTime = `${String(hr).padStart(2, "0")}:00`;
    }

    const cleanReminder = prompt.replace(/(remind me to|reminder for|yaad dilana|ki yaad dila do|mujhe|baje|kal|today|shaam|subah)/gi, "").trim();
    if (cleanReminder.length > 2) reminderText = cleanReminder;

    return {
      isAction: true,
      actionType: "set_reminder",
      actionDetails: {
        reminderText,
        reminderTime,
        reminderDate,
      },
      spokenResponse: isHindi
        ? `जी, आपको ${reminderTime} पर "${reminderText}" की याद दिला दूंगी।`
        : `I have set a reminder for "${reminderText}" at ${reminderTime}.`,
      displayText: `⏰ **Voice Reminder Set**:\n- **Task**: ${reminderText}\n- **Time**: ${reminderTime} (${reminderDate})\n- *Alert Chime & TTS notification activated*`,
      engine: engineName,
    };
  }

  // 4. Reminders: Check Reminders
  if (p.includes("check reminder") || p.includes("reminders") || p.includes("yaad")) {
    const pendingCount = activeReminders.filter((r) => r.status === "pending").length;
    return {
      isAction: true,
      actionType: "check_reminders",
      spokenResponse: isHindi
        ? `आपके पास ${pendingCount} पेंडिंग रिमाइंडर्स हैं।`
        : `You have ${pendingCount} active reminders pending, ${userName}.`,
      displayText: `⏰ **Active Reminders**: ${pendingCount} pending alarms scheduled.`,
      engine: engineName,
    };
  }

  // 5. WhatsApp
  // 5. WhatsApp: Open App vs Send Message
  const isWhatsAppLaunch =
    (p === "whatsapp" ||
      p === "open whatsapp" ||
      p === "whatsapp kholo" ||
      p === "start whatsapp" ||
      p === "launch whatsapp" ||
      p.includes("open whatsapp") ||
      p.includes("whatsapp open") ||
      p.includes("whatsapp launch") ||
      p.includes("whatsapp chalao") ||
      p.includes("whatsapp kholo")) &&
    !p.includes("send") &&
    !p.includes("bhejo") &&
    !p.includes("saying") &&
    !p.includes("msg") &&
    !p.includes("message");

  if (isWhatsAppLaunch) {
    return {
      isAction: true,
      actionType: "launch_app",
      actionDetails: {
        target: "WhatsApp",
        command: "start whatsapp:",
      },
      spokenResponse: isHindi
        ? `आपके लिए व्हाट्सएप खोला जा रहा है।`
        : `Opening WhatsApp for you now.`,
      displayText: `⚡ **App Launcher**: Opening native **WhatsApp** on Windows.`,
      engine: engineName,
    };
  }

  const hasMessageIntent = /\b(send|message|text|bhejo)\b/i.test(p);
  const hasExplicitWhatsApp = p.includes("whatsapp") || p.includes("whatsapp karo");

  if (hasMessageIntent && !hasExplicitWhatsApp) {
    return {
      isAction: false,
      actionType: "chat",
      actionDetails: {},
      spokenResponse: isHindi
        ? "आप किस ऐप या चैनल से संदेश भेजना चाहते हैं, जैसे WhatsApp, ईमेल या कोई अन्य मैसेजिंग ऐप?"
        : "Which app or channel should I use to send it, such as WhatsApp, email, or another messaging app?",
      displayText: "Please specify the app or channel before I send the message.",
      engine: engineName,
    };
  }

  if (hasExplicitWhatsApp) {
    let recipient = "Contact";
    let message = "Hello from Bharat Vani";

    const match = prompt.match(/(?:send|whatsapp)\s+(.+?)\s+to\s+(.+?)(?:\s+(?:on|in)\s+whatsapp)?$/i);
    const match2 = prompt.match(/(?:send\s+whatsapp\s+message\s+to\s+|to\s+)(.+?)(?:\s+saying\s+|\s+that\s+|\s*:\s*)(.+)/i);
    const match3 = prompt.match(/^whatsapp\s+(.+?)[,:]?\s+(?:saying\s+|that\s+)?(.+)$/i);

    if (match) {
      message = match[1].trim();
      recipient = match[2].trim();
    } else if (match2) {
      recipient = match2[1].trim();
      message = match2[2].trim();
    } else if (match3) {
      recipient = match3[1].trim();
      message = match3[2].trim();
    } else {
      const clean = prompt.replace(/\b(send|whatsapp|message|bhejo|karo|to|on)\b/gi, "").trim();
      if (clean) recipient = clean;
    }

    const recipientIsPhoneNumber = /^\+?[0-9][0-9\s().-]{6,}$/.test(recipient);
    const spokenResponse = recipientIsPhoneNumber
      ? isHindi
        ? `व्हाट्सएप में ${recipient} की चैट खोली गई है और संदेश तैयार है। भेजने के लिए Send दबाएं।`
        : `I opened the WhatsApp chat for ${recipient} with the message ready. Press Send to deliver it.`
      : isHindi
        ? `व्हाट्सएप खोला गया है। कृपया ${recipient} का संपर्क चुनकर Send दबाएं।`
        : `I opened WhatsApp with the message ready. Please choose ${recipient} and press Send.`;

    return {
      isAction: true,
      actionType: "whatsapp_message",
      actionDetails: {
        target: recipient,
        message: message,
        command: `start whatsapp://send?text=${encodeURIComponent(message)}`,
      },
      spokenResponse,
      displayText: `📱 **WhatsApp Automation**: Preparing to send message.\n- **Recipient**: ${recipient}\n- **Message**: "${message}"\n- *Executed via ActionExecutor*`,
      engine: engineName,
    };
  }

  // 6. App Launcher (English & Hindi "kholo", "chalao", "start", "run", "open")
  if (
    p.includes("open") ||
    p.includes("launch") ||
    p.includes("start") ||
    p.includes("kholo") ||
    p.includes("chalao") ||
    p.includes("run")
  ) {
    let app = "";
    if (p.includes("python") || p.includes("idle") || p === "py" || p.includes("python3")) {
      app = p.includes("idle") ? "Python IDLE" : "Python";
    } else if (p.includes("whatsapp")) {
      app = "WhatsApp";
    } else if (p.includes("chrome") || p.includes("google chrome")) {
      app = "Google Chrome";
    } else if (p.includes("edge") || p.includes("msedge")) {
      app = "Microsoft Edge";
    } else if (p.includes("vs code") || p.includes("code") || p.includes("visual studio")) {
      app = "Visual Studio Code";
    } else if (p.includes("notepad") || p.includes("editor")) {
      app = "Notepad";
    } else if (p.includes("calculator") || p.includes("calc")) {
      app = "Calculator";
    } else if (p.includes("spotify") || p.includes("music") || p.includes("gaana")) {
      app = "Spotify";
    } else if (p.includes("terminal") || p.includes("cmd") || p.includes("command prompt")) {
      app = "Command Prompt";
    } else if (p.includes("powershell")) {
      app = "PowerShell";
    } else if (p.includes("file explorer") || p.includes("files") || p.includes("folder")) {
      app = "File Explorer";
    } else if (p.includes("youtube")) {
      app = "YouTube";
    } else if (p.includes("browser")) {
      app = "Google Chrome";
    } else {
      // Dynamic extraction of app name from user utterance
      const extracted = prompt
        .replace(/^(please\s+)?(open|launch|start|run|chalao|kholo)\s+/i, "")
        .replace(/\s+(kholo|chalao|open|please|app)$/i, "")
        .trim();
      app = extracted.length > 0 ? extracted : "Application";
    }

    return {
      isAction: true,
      actionType: "launch_app",
      actionDetails: {
        target: app,
        command: `start ${app.toLowerCase()}`,
      },
      spokenResponse: isHindi
        ? `आपके लिए ${app} खोला जा रहा है।`
        : `Opening ${app} for you now.`,
      displayText: `⚡ **App Launcher**: Successfully launched **${app}** on Windows.`,
      engine: engineName,
    };
  }

  // 7. Screenshot
  if (
    p.includes("screenshot") ||
    p.includes("screen capture") ||
    p.includes("snapshot") ||
    p.includes("photo lo")
  ) {
    return {
      isAction: true,
      actionType: "screenshot",
      actionDetails: {
        target: "Screen",
        command: "pyautogui.screenshot('screenshot.png')",
      },
      spokenResponse: isHindi
        ? "आपकी स्क्रीन का स्क्रीनशॉट ले लिया गया है।"
        : "Capturing your screen now, Sir.",
      displayText: `📸 **Screenshot Captured**: Saved to Windows Pictures directory.`,
      engine: engineName,
    };
  }

  // 8. Lock screen (English & Hindi "lock karo", "band karo")
  if (
    (p.includes("lock") && (p.includes("screen") || p.includes("pc") || p.includes("computer"))) ||
    p.includes("lock karo") ||
    p.includes("pc band karo")
  ) {
    return {
      isAction: true,
      actionType: "lock_screen",
      actionDetails: {
        target: "Windows Lock",
        command: "ctypes.windll.user32.LockWorkStation()",
      },
      spokenResponse: isHindi
        ? "विंडोज पीसी लॉक किया जा रहा है।"
        : "Locking your Windows PC right away.",
      displayText: `🔒 **System Control**: Windows Workstation Locked.`,
      engine: engineName,
    };
  }

  // 9. System controls (Volume, Battery, CPU)
  if (p.includes("volume") || p.includes("mute") || p.includes("sound") || p.includes("awaaz")) {
    const isUp = p.includes("up") || p.includes("increase") || p.includes("badhao");
    const isDown = p.includes("down") || p.includes("decrease") || p.includes("kam karo");
    const isMute = p.includes("mute") || p.includes("chup");

    const target = isMute ? "mute" : isUp ? "volume_up" : isDown ? "volume_down" : "volume_check";
    return {
      isAction: true,
      actionType: "system_control",
      actionDetails: {
        target,
        command: "nircmd.exe changesysvolume",
      },
      spokenResponse: isHindi
        ? isMute ? "आवाज म्यूट कर दी गई है।" : isUp ? "आवाज बढ़ा दी गई है।" : "आवाज कम कर दी गई है।"
        : isMute ? "Audio muted." : isUp ? "Increasing volume." : "Decreasing volume.",
      displayText: `🔊 **Audio Telemetry**: System volume adjusted (${target}).`,
      engine: engineName,
    };
  }

  // 10. Web search
  if (p.includes("search") || p.includes("google") || p.includes("find") || p.includes("khojo")) {
    const cleanQuery = prompt.replace(/(search for|search|google|on youtube|on google|khojo)/gi, "").trim();
    return {
      isAction: true,
      actionType: "web_search",
      actionDetails: {
        query: cleanQuery || prompt,
        target: p.includes("youtube") ? "YouTube" : "Google",
        command: `webbrowser.open("https://www.google.com/search?q=${encodeURIComponent(cleanQuery || prompt)}")`,
      },
      spokenResponse: isHindi
        ? `"${cleanQuery || prompt}" खोजा जा रहा है।`
        : `Searching ${p.includes("youtube") ? "YouTube" : "Google"} for "${cleanQuery || prompt}".`,
      displayText: `🔍 **Web Search**: Query dispatched to ${p.includes("youtube") ? "YouTube" : "Google"}: *"${cleanQuery || prompt}"*`,
      engine: engineName,
    };
  }

  // 11. Real-time Live Clock & Time
  if (
    p === "what is the time" ||
    p === "what time is it" ||
    p === "time" ||
    p === "current time" ||
    p.includes("what is the time") ||
    p.includes("what time is it") ||
    p.includes("time kya") ||
    p.includes("kitne baje") ||
    p.includes("samay kya") ||
    p.includes("kya time hua") ||
    p.includes("time batao") ||
    p.includes("tell me the time")
  ) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return {
      isAction: true,
      actionType: "chat",
      spokenResponse: isHindi
        ? `अभी समय ${timeStr} हुआ है।`
        : `It is currently ${timeStr} IST, ${userName}.`,
      displayText: `🕒 **Live System Time**: **${timeStr} IST** (Asia/Kolkata)`,
      engine: engineName,
    };
  }

  // 12. Real-time Live Calendar & Date
  if (
    p === "what is the date" ||
    p === "what's the date" ||
    p === "today date" ||
    p === "today's date" ||
    p === "date" ||
    p.includes("tarikh") ||
    p.includes("tareekh") ||
    p.includes("what is the date") ||
    p.includes("what's the date") ||
    p.includes("aaj kya date") ||
    p.includes("aaj ki date") ||
    p.includes("konsa din") ||
    p.includes("kaun sa din") ||
    p.includes("kaun si tarikh") ||
    p.includes("today's day") ||
    p.includes("what day is it")
  ) {
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    return {
      isAction: true,
      actionType: "chat",
      spokenResponse: isHindi
        ? `आज ${dateStr} है।`
        : `Today is ${dateStr}, ${userName}.`,
      displayText: `📅 **Today's Date**: **${dateStr}**`,
      engine: engineName,
    };
  }

  // 13. Weather / Rain (Failover when Gemini is unavailable)
  if (
    p.includes("rain") ||
    p.includes("weather") ||
    p.includes("barish") ||
    p.includes("mausam") ||
    p.includes("temperature") ||
    p.includes("forecast")
  ) {
    if (engineName !== "deterministic-brain") {
      const city = userProfile?.city || "India";
      const weatherQuery = `weather forecast ${city} tomorrow`;
      return {
        isAction: true,
        actionType: "web_search",
        actionDetails: {
          query: weatherQuery,
          target: "Google",
          command: `webbrowser.open("https://www.google.com/search?q=${encodeURIComponent(weatherQuery)}")`,
        },
        spokenResponse: isHindi
          ? `${city} के मौसम और बारिश का पूर्वानुमान गूगल पर खोला जा रहा है।`
          : `Checking the live weather and rain forecast for ${city} on Google.`,
        displayText: `⛅ **Live Weather & Rain Forecast**: Searching live forecast for **${city}** on Google...`,
        engine: engineName,
      };
    }
  }

  // 14. Greetings & Identity (Hindi & English)
  if (
    p === "namaste" ||
    p === "hello" ||
    p === "hey" ||
    p === "hi" ||
    p.includes("kaise ho") ||
    p.includes("kya haal hai")
  ) {
    return {
      isAction: true,
      actionType: "chat",
      spokenResponse: isHindi
        ? `नमस्ते ${userName}! मैं भारत वानी हूँ। मैं आपकी क्या मदद कर सकती हूँ?`
        : `Namaste ${userName}! I am Bharat Vani, your personal Windows AI assistant. How may I assist you today?`,
      displayText: `🇮🇳 **Namaste ${userName}!** I am **Bharat Vani**, your AI voice assistant for Windows powered by Gemini AI.`,
      engine: engineName,
    };
  }

  if (p.includes("who are you") || p.includes("your name") || p.includes("kaun ho")) {
    return {
      isAction: true,
      actionType: "chat",
      spokenResponse: isHindi
        ? "मैं भारत वानी हूँ, विंडोज के लिए आपकी अपनी भारतीय एआई वॉइस असिस्टेंट।"
        : "I am Bharat Vani, your personal voice assistant for Windows, built specifically for India with full voice and PC automation.",
      displayText: `🤖 **About Bharat Vani**:\nI am your custom AI voice assistant for Windows. I listen for **'Hey Vani'**, transcribe Indian English, Hindi, and Hinglish, execute native Windows commands, automate WhatsApp, manage calendar and reminders, and operate seamlessly powered by Google Gemini AI.`,
      engine: engineName,
    };
  }

  // If in pre-check (deterministic-brain), return isAction: false so it reaches Gemini AI!
  if (engineName === "deterministic-brain") {
    return {
      isAction: false,
      actionType: "chat",
      spokenResponse: "",
      displayText: "",
      engine: engineName,
    };
  }

  // If we reach here in failover (Gemini API offline/exhausted), launch Google Web Search for user's question!
  return {
    isAction: true,
    actionType: "web_search",
    actionDetails: {
      query: prompt,
      target: "Google",
      command: `webbrowser.open("https://www.google.com/search?q=${encodeURIComponent(prompt)}")`,
    },
    spokenResponse: isHindi
      ? `"${prompt}" के लिए गूगल पर खोज की जा रही है।`
      : `Searching Google for "${prompt}".`,
    displayText: `🔍 **Live Web Search**: Searching Google for *"${prompt}"*`,
    engine: engineName,
  };
}

// Vision AI: Live Screen & Camera Region Selection & Search
app.post("/api/vision/analyze", async (req, res) => {
  try {
    const {
      image,
      prompt,
      mode = "search",
      source = "screen",
      languagePreference = "mix",
      cropArea,
      userName = "User",
    } = req.body;

    if (!image || typeof image !== "string") {
      return res.status(400).json({ error: "Missing image data" });
    }

    // Parse data URL
    let mimeType = "image/png";
    let base64Data = image;
    const match = image.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (match) {
      mimeType = match[1];
      base64Data = match[2];
    }

    try {
      const ai = getGeminiClient();

      let systemInstruction = `You are Bharat Vani Vision AI, an intelligent screen and camera visual search assistant for Windows.
The user is ${userName}.
Current Language Preference: ${languagePreference} (Hinglish/Hindi/English).
You are analyzing a visual capture from the user's ${source === "camera" ? "live camera" : "active computer screen"}.
${cropArea ? `The user specifically selected a focused region (${cropArea.width}x${cropArea.height} px).` : "Full frame capture."}

Objectives:
1. Provide a comprehensive, accurate visual analysis.
2. If text, code, errors, or formulas are visible, transcribe or fix them.
3. If products, brands, movies, UI elements, or landmarks are visible, identify them and provide context.
4. Keep the tone helpful, professional, and clear.`;

      let queryText = prompt || "Analyze this image and explain what is visible.";
      if (mode === "ocr") {
        queryText = prompt
          ? `${prompt}\nExtract all readable text, code, and labels from this image with exact precision.`
          : "Extract and transcribe all text, code snippets, logs, URLs, and labels from this image. Keep formatting intact with markdown code blocks.";
      } else if (mode === "explain") {
        queryText = prompt
          ? `${prompt}\nExplain this in detail, diagnosing any issues, errors, or key concepts.`
          : "Explain what is shown here in detail. If it is code or an error message, explain the root cause and provide the exact solution.";
      } else if (mode === "search") {
        queryText = prompt
          ? `${prompt}\nPerform a visual search and find relevant web information, articles, or resources.`
          : "Identify what is in this selected screen area and find the latest relevant information, references, solutions, or documentation using Google Search.";
      }

      const imagePart = {
        inlineData: {
          mimeType,
          data: base64Data,
        },
      };

      const textPart = {
        text: queryText,
      };

      const config: any = {
        systemInstruction,
      };

      // Enable Google Search grounding for search mode
      if (mode === "search") {
        config.tools = [{ googleSearch: {} }];
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: { parts: [imagePart, textPart] },
        config,
      });

      const fullText = response.text || "Analysis complete.";
      const groundingSources: Array<{ uri: string; title: string }> = [];

      // Extract search grounding sources if available
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (Array.isArray(chunks)) {
        for (const chunk of chunks) {
          if (chunk.web?.uri) {
            groundingSources.push({
              uri: chunk.web.uri,
              title: chunk.web.title || "Source",
            });
          }
        }
      }

      let spokenResponse = "";
      if (mode === "ocr") {
        spokenResponse = "I have extracted the text and code from your selected area.";
      } else if (mode === "search") {
        spokenResponse = "I analyzed your screen selection and found relevant Google Search results.";
      } else {
        spokenResponse = fullText.slice(0, 160).replace(/[#*`_]/g, "").trim() + "...";
      }

      return res.json({
        success: true,
        displayText: fullText,
        spokenResponse,
        groundingSources,
        mode,
        source,
        engine: "gemini-3.6-flash",
      });
    } catch (apiError: any) {
      console.warn("Gemini Vision call failed, switching to fallback inspection:", apiError?.message);

      return res.json({
        success: true,
        displayText: `🔍 **Visual Region Inspection (${source.toUpperCase()})**\n\n- **Target**: Selected region on ${source}\n- **Mode**: ${mode.toUpperCase()}\n- **Status**: Captured snapshot (${base64Data.length > 500 ? "High Resolution" : "Standard"})\n\n💡 *Vision Notice:* Visual snapshot captured. Active internet connection with Gemini API enables real-time visual grounding and OCR.`,
        spokenResponse: `Captured your ${source} selection for ${mode}.`,
        groundingSources: [],
        mode,
        source,
        engine: "gemini-vision-inspector",
      });
    }
  } catch (err: any) {
    console.error("Vision endpoint error:", err);
    return res.status(500).json({ error: err.message || "Failed to process visual capture" });
  }
});

// Grounded Query Endpoint (Google Search & Google Maps Grounding)
app.post("/api/gemini/grounded-query", async (req, res) => {
  try {
    const { query, type = "search", latLng, userName = "User" } = req.body;
    if (!query || typeof query !== "string") {
      return res.status(400).json({ error: "Missing query" });
    }

    const ai = getGeminiClient();
    const config: any = {};

    if (type === "maps") {
      config.tools = [{ googleMaps: {} }];
      if (latLng && typeof latLng.latitude === "number" && typeof latLng.longitude === "number") {
        config.toolConfig = {
          retrievalConfig: {
            latLng: {
              latitude: latLng.latitude,
              longitude: latLng.longitude,
            },
          },
        };
      }
    } else {
      config.tools = [{ googleSearch: {} }];
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: query,
      config,
    });

    const sources: Array<{ title: string; url: string; type: string }> = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (Array.isArray(chunks)) {
      for (const chunk of chunks) {
        if (chunk.web?.uri) {
          sources.push({
            title: chunk.web.title || chunk.web.uri,
            url: chunk.web.uri,
            type: "web",
          });
        }
        if (chunk.maps?.uri) {
          sources.push({
            title: chunk.maps.title || "View on Google Maps",
            url: chunk.maps.uri,
            type: "maps",
          });
        }
      }
    }

    return res.json({
      success: true,
      text: response.text || "",
      sources,
      engine: "gemini-3.6-flash",
      type,
    });
  } catch (err: any) {
    console.error("Grounded query error:", err);
    return res.status(500).json({ error: err.message || "Failed to execute grounded query" });
  }
});

// Audio Transcription Endpoint (using multimodal Gemini)
app.post("/api/gemini/transcribe", async (req, res) => {
  try {
    const { audioBase64, mimeType = "audio/webm" } = req.body;
    if (!audioBase64 || typeof audioBase64 !== "string") {
      return res.status(400).json({ error: "Missing audioBase64 data" });
    }

    const ai = getGeminiClient();
    const audioPart = {
      inlineData: {
        mimeType,
        data: audioBase64.replace(/^data:[^;]+;base64,/, ""),
      },
    };

    let transcriptionText = "";
    let usedEngine = "gemini-3.6-flash";

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: {
          parts: [
            audioPart,
            {
              text: "Transcribe this audio accurately. Capture the exact spoken words in Hindi, Indian English, or Hinglish without adding editorial commentary.",
            },
          ],
        },
      });
      transcriptionText = response.text || "";
    } catch (modelErr: any) {
      console.warn("Primary transcription model error:", modelErr?.message);
      try {
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: {
            parts: [
              audioPart,
              {
                text: "Transcribe this audio accurately in Hindi or English.",
              },
            ],
          },
        });
        transcriptionText = response.text || "";
        usedEngine = "gemini-2.5-flash";
      } catch (fbErr: any) {
        throw new Error(modelErr?.message || fbErr?.message);
      }
    }

    return res.json({
      success: true,
      transcription: transcriptionText.trim(),
      engine: usedEngine,
    });
  } catch (err: any) {
    console.error("Transcription error:", err);
    return res.status(500).json({ error: err.message || "Failed to transcribe audio" });
  }
});

// Windows Auto-Start Configuration State (In-Memory default, synced to client)
let autoStartConfig = {
  enabled: true,
  startMinimizedToIcon: false,
  playGreetingOnBoot: true,
  launchPath: "https://ais-dev-4ju56hikevwqvc657qlyka-495426905578.asia-southeast1.run.app",
  installMethod: "startup_folder",
};

// GET /api/system/autostart
app.get("/api/system/autostart", (req, res) => {
  const currentUrl = `${req.protocol}://${req.get("host") || "localhost:3000"}`;
  res.json({
    config: {
      ...autoStartConfig,
      launchPath: currentUrl,
    },
    windowsStartupFolder: "%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup",
    registryKey: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
    powershellCmd: `$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut("$env:APPDATA\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\BharatVani.lnk"); $Shortcut.TargetPath = "msedge.exe"; $Shortcut.Arguments = "--app=${currentUrl}"; $Shortcut.Save()`,
  });
});

// POST /api/system/autostart
app.post("/api/system/autostart", (req, res) => {
  const { enabled, startMinimizedToIcon, playGreetingOnBoot, installMethod } = req.body;
  if (typeof enabled === "boolean") autoStartConfig.enabled = enabled;
  if (typeof startMinimizedToIcon === "boolean") autoStartConfig.startMinimizedToIcon = startMinimizedToIcon;
  if (typeof playGreetingOnBoot === "boolean") autoStartConfig.playGreetingOnBoot = playGreetingOnBoot;
  if (installMethod) autoStartConfig.installMethod = installMethod;

  res.json({
    success: true,
    message: autoStartConfig.enabled
      ? "Auto-Start enabled for Windows boot."
      : "Auto-Start disabled.",
    config: autoStartConfig,
  });
});

// GET /api/system/autostart/script - Generate and download Windows Auto-Start batch file
app.get("/api/system/autostart/script", (req, res) => {
  const hostUrl = `${req.protocol}://${req.get("host") || "localhost:3000"}`;
  const minimizedParam = req.query.minimized === "true" ? "?mode=icon" : "";
  const finalUrl = `${hostUrl}/${minimizedParam}`;

  const scriptContent = `@echo off
:: ============================================================================
:: Bharat Vani - Windows Auto-Start Setup
:: Registers Bharat Vani AI Assistant to automatically start when PC turns on.
:: ============================================================================
echo [Bharat Vani] Setting up Windows Auto-Launch on System Boot...
echo Target URL: ${finalUrl}

set "STARTUP_FOLDER=%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup"
set "SHORTCUT_PATH=%STARTUP_FOLDER%\\BharatVani.lnk"

:: Create shortcut in Windows Startup directory using PowerShell
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$WshShell = New-Object -ComObject WScript.Shell; " ^
  "$Shortcut = $WshShell.CreateShortcut('%SHORTCUT_PATH%'); " ^
  "$Shortcut.TargetPath = 'msedge.exe'; " ^
  "$Shortcut.Arguments = '--app=${finalUrl} --enable-features=OverlayScrollbar'; " ^
  "$Shortcut.Description = 'Bharat Vani Windows AI Assistant'; " ^
  "$Shortcut.WindowStyle = 1; " ^
  "$Shortcut.Save(); " ^
  "Write-Host '[SUCCESS] Bharat Vani shortcut placed in Windows Startup folder!';"

:: Also add registry backup
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "BharatVaniAssistant" /t REG_SZ /d "msedge.exe --app=${finalUrl}" /f >nul 2>&1

echo.
echo ============================================================================
echo  Bharat Vani is now configured to start automatically on Windows Boot!
echo  Location: %SHORTCUT_PATH%
echo ============================================================================
echo You can close this window now.
pause
`;

  res.setHeader("Content-Type", "application/x-bat");
  res.setHeader("Content-Disposition", 'attachment; filename="BharatVani_AutoStart_Setup.bat"');
  res.send(scriptContent);
});

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🇮🇳 Bharat Vani server running on http://0.0.0.0:${PORT}`);
    ensurePythonSTTService();
  });
}

function ensurePythonSTTService() {
  const checkAndStart = () => {
    const req = http.get(`${STT_SERVICE_URL}/status`, (res) => {
      if (res.statusCode === 200) {
        // Python STT service is healthy
      }
    });
    req.on("error", () => {
      console.log("🎙️ [STT] Python Free Speech Service not responding. Starting on port 3001...");
      const sttScript = path.join(process.cwd(), "stt_service.py");
      if (fs.existsSync(sttScript)) {
        const p = spawn("python", [sttScript], {
          cwd: process.cwd(),
          detached: true,
          stdio: "ignore",
        });
        p.on("error", (e) => console.warn("Could not auto-start stt_service.py:", e.message));
        p.unref();
      }
    });
  };

  checkAndStart();
  // Check every 15 seconds to ensure stt_service.py stays alive
  setInterval(checkAndStart, 15000);
}

startServer();
