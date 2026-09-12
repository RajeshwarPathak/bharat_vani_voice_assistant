// Bharat Vani Chrome / Edge Extension Background Service Worker

// Create context menu items on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "bharat_vani_ask_selection",
    title: "Ask Bharat Vani: \"%s\"",
    contexts: ["selection"],
  });

  chrome.contextMenus.create({
    id: "bharat_vani_summarize_page",
    title: "Summarize this page with Bharat Vani",
    contexts: ["page"],
  });

  // Enable side panel to open on action click if supported
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});
  }
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab || !tab.id) return;

  if (info.menuItemId === "bharat_vani_ask_selection" && info.selectionText) {
    await chrome.storage.local.set({
      pendingQuery: `Please explain this selected text: "${info.selectionText}"`,
      timestamp: Date.now(),
    });

    if (chrome.sidePanel && chrome.sidePanel.open) {
      await chrome.sidePanel.open({ tabId: tab.id });
    }
  } else if (info.menuItemId === "bharat_vani_summarize_page") {
    await chrome.storage.local.set({
      pendingQuery: "Please summarize this webpage for me.",
      triggerPageAnalysis: true,
      timestamp: Date.now(),
    });

    if (chrome.sidePanel && chrome.sidePanel.open) {
      await chrome.sidePanel.open({ tabId: tab.id });
    }
  }
});

// Handle keyboard shortcut commands
chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command === "open_side_panel" && tab && tab.id) {
    if (chrome.sidePanel && chrome.sidePanel.open) {
      await chrome.sidePanel.open({ tabId: tab.id });
    }
  }
});

// Listen for messages from popup or sidepanel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "OPEN_SIDE_PANEL" && sender.tab?.id) {
    if (chrome.sidePanel && chrome.sidePanel.open) {
      chrome.sidePanel.open({ tabId: sender.tab.id });
      sendResponse({ success: true });
    }
  } else if (message.type === "EXTRACT_PAGE_TEXT") {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs[0] || !tabs[0].id) {
        sendResponse({ error: "No active tab found" });
        return;
      }
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: () => {
            const title = document.title || "";
            const body = document.body ? document.body.innerText.slice(0, 4000) : "";
            return { title, body, url: window.location.href };
          },
        });
        sendResponse({ data: results[0]?.result });
      } catch (err) {
        sendResponse({ error: err.message });
      }
    });
    return true; // async sendResponse
  }
});
