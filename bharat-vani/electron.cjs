const { app, BrowserWindow, Tray, Menu, shell, nativeImage, session, dialog } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const http = require("http");
const fs = require("fs");

const PORT = 3000;
let mainWindow = null;
let tray = null;
let serverProcess = null;

// Configure media and audio flags for microphone capture
app.commandLine.appendSwitch("use-fake-ui-for-media-stream");
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
app.commandLine.appendSwitch("enable-features", "AudioServiceOutOfProcess");

// Single-instance lock: Prevent duplicate windows
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
  }
});

// Check if server is already responding
function isServerActive(url, timeoutMs = 800) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve(res.statusCode < 500);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Start the Express / Vite backend server
function startServer() {
  const isProduction = app.isPackaged || process.env.NODE_ENV === "production";
  const distServer = path.join(__dirname, "dist", "server.cjs");
  
  if (isProduction && fs.existsSync(distServer)) {
    console.log("[Desktop App] Launching bundled server:", distServer);
    serverProcess = spawn(process.execPath, [distServer], {
      cwd: __dirname,
      env: { ...process.env, NODE_ENV: "production", ELECTRON: "1" },
      stdio: "pipe",
      shell: false,
    });
  } else {
    // Development mode
    const tsxCmd = process.platform === "win32"
      ? path.join(__dirname, "node_modules", ".bin", "tsx.cmd")
      : path.join(__dirname, "node_modules", ".bin", "tsx");
    const serverFile = path.join(__dirname, "server.ts");

    console.log("[Desktop App] Launching dev server:", serverFile);
    serverProcess = spawn(tsxCmd, [serverFile], {
      cwd: __dirname,
      env: { ...process.env, ELECTRON: "1" },
      stdio: "pipe",
      shell: true,
    });
  }

  serverProcess.stdout?.on("data", (d) => console.log("[Server]", d.toString().trim()));
  serverProcess.stderr?.on("data", (d) => console.error("[Server ERR]", d.toString().trim()));
  serverProcess.on("exit", (code) => console.log(`[Server] Exited with code ${code}`));
}

// Wait until server is ready
function waitForServer(url, retries = 30, delay = 500) {
  return new Promise((resolve, reject) => {
    const check = async (n) => {
      const active = await isServerActive(url);
      if (active) {
        resolve();
      } else if (n <= 0) {
        reject(new Error("Server did not respond in time"));
      } else {
        setTimeout(() => check(n - 1), delay);
      }
    };
    check(retries);
  });
}

function createWindow() {
  const iconPath = path.join(__dirname, "icon.png");

  mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    title: "Bharat Vani — AI Desktop Voice Assistant",
    backgroundColor: "#07090f",
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: false,
    },
    autoHideMenuBar: true,
    show: false, // Show when ready to prevent white flash
  });

  mainWindow.loadURL(`http://localhost:${PORT}`);

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Open external links in default browser, not in Electron app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Minimize to tray instead of closing directly
  mainWindow.on("close", (e) => {
    if (!app.isQuiting) {
      e.preventDefault();
      mainWindow.hide();
      if (tray) {
        tray.displayBalloon?.({
          title: "Bharat Vani Active",
          content: "Bharat Vani is running quietly in your system tray. Click the tray icon to re-open.",
        });
      }
    }
  });
}

function createTray() {
  const iconPath = path.join(__dirname, "icon.png");
  let icon;

  if (fs.existsSync(iconPath)) {
    icon = nativeImage.createFromPath(iconPath).resize({ width: 24, height: 24 });
  } else {
    // Fallback simple base64 16x16 icon
    icon = nativeImage.createFromDataURL(
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAZElEQVQ4T2NkoBAwUqifYdQAkGkg2wFI9v+nBGBjY8Mhjm45kg8wMDCgG0DURzCJ0c3A6UZsg2FsXAZgqCGGgeTqJkYDYi0h1QBiLAFlg8UvGFiQ2YQ043MDOgYGYoORPInFAwBv4BEB9/Vn0wAAAABJRU5ErkJggg=="
    );
  }

  tray = new Tray(icon);
  const contextMenu = Menu.buildFromTemplate([
    { label: "🇮🇳 Bharat Vani AI Assistant", enabled: false },
    { type: "separator" },
    {
      label: "Show Assistant Window",
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow();
        }
      },
    },
    {
      label: "Hide Window",
      click: () => {
        mainWindow?.hide();
      },
    },
    { type: "separator" },
    {
      label: "Open in Browser",
      click: () => {
        shell.openExternal(`http://localhost:${PORT}`);
      },
    },
    { type: "separator" },
    {
      label: "Quit Completely",
      click: () => {
        app.isQuiting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip("Bharat Vani — AI Desktop Voice Assistant");
  tray.setContextMenu(contextMenu);

  tray.on("click", () => {
    if (!mainWindow) {
      createWindow();
    } else if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// Grant microphone, display media, and audio permissions automatically
function setupPermissions() {
  const ses = session.defaultSession;
  ses.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowed = [
      "media",
      "audioCapture",
      "desktopCapture",
      "notifications",
      "clipboard-read",
      "clipboard-write",
      "pointerLock",
    ];
    if (allowed.includes(permission)) {
      return callback(true);
    }
    return callback(true);
  });

  ses.setPermissionCheckHandler(() => true);
}

app.whenReady().then(async () => {
  setupPermissions();
  createTray();

  const serverUrl = `http://localhost:${PORT}`;
  const alreadyRunning = await isServerActive(serverUrl);

  if (alreadyRunning) {
    console.log("[Desktop App] Bharat Vani server already active on port 3000!");
    createWindow();
  } else {
    console.log("[Desktop App] Starting backend server...");
    startServer();
    try {
      console.log("[Desktop App] Waiting for server response...");
      await waitForServer(serverUrl);
      console.log("[Desktop App] Server is ready! Displaying desktop window...");
      createWindow();
    } catch (err) {
      console.error("[Desktop App] Server startup failed:", err);
      dialog.showErrorBox(
        "Bharat Vani Startup Error",
        "Could not connect to the backend server. Please verify Node.js is installed and try again."
      );
      app.quit();
    }
  }
});

app.on("window-all-closed", () => {
  // On Windows, keep alive in system tray unless explicitly quit
  if (process.platform === "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  app.isQuiting = true;
  if (serverProcess) {
    console.log("[Desktop App] Terminating background server process...");
    serverProcess.kill();
  }
});

app.on("activate", () => {
  if (!mainWindow) {
    createWindow();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
});
