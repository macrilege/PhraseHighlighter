// Service Worker for Phrase Highlighter Extension
// Handles installation and runtime events

chrome.runtime.onInstalled.addListener(() => {
  console.log('Phrase Highlighter extension installed');
  
  // Initialize storage with default settings if not present
  chrome.storage.sync.get(['phraseStyles', 'highlightEnabled'], (data) => {
    if (!data.phraseStyles) {
      chrome.storage.sync.set({
        phraseStyles: {},
        highlightEnabled: true
      });
    }
  });
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getTabId') {
    sendResponse({ tabId: sender.tab?.id });
  }
});

// Optional: Handle extension icon click when popup is disabled
chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { action: 'toggleHighlights' });
});