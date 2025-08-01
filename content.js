// Content script for Phrase Highlighter Extension
// Handles highlighting phrases on web pages

class PhraseHighlighter {
  constructor() {
    this.highlightClass = 'phrase-highlighter-span';
    this.selectionClass = 'phrase-highlighter-selection';
    this.isInitialized = false;
    this.observer = null;
    this.isSelectionMode = false;
    this.selectionOverlay = null;
    this.init();
  }

  init() {
    if (this.isInitialized) return;
    
    this.addStyles();
    this.loadAndApplyHighlights();
    this.setupMessageListener();
    this.setupMutationObserver();
    this.setupTextSelection();
    this.isInitialized = true;
  }

  addStyles() {
    const styleId = 'phrase-highlighter-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .${this.highlightClass} {
        position: relative;
        border-radius: 2px;
        transition: opacity 0.2s ease;
      }
      .${this.highlightClass}:hover {
        opacity: 0.8;
      }
      .${this.selectionClass} {
        background-color: rgba(255, 235, 59, 0.3) !important;
        border: 2px dashed #2196F3 !important;
        border-radius: 3px !important;
        cursor: pointer !important;
        animation: pulseSelection 1s ease-in-out infinite;
      }
      @keyframes pulseSelection {
        0%, 100% { opacity: 0.7; }
        50% { opacity: 1; }
      }
      .phrase-highlighter-tooltip {
        position: absolute;
        background: #333;
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 12px;
        z-index: 10000;
        pointer-events: none;
        white-space: nowrap;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      }
      .phrase-highlighter-tooltip::after {
        content: '';
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        border: 5px solid transparent;
        border-top-color: #333;
      }
      .phrase-highlighter-selection-mode {
        cursor: crosshair !important;
      }
      .phrase-highlighter-selection-mode * {
        cursor: crosshair !important;
      }
    `;
    document.head.appendChild(style);
  }

  async loadAndApplyHighlights() {
    try {
      const data = await chrome.storage.sync.get(['phraseStyles', 'highlightEnabled']);
      if (data.highlightEnabled !== false && data.phraseStyles) {
        this.updateHighlights(data.phraseStyles);
      }
    } catch (error) {
      console.error('Error loading phrases:', error);
    }
  }

  updateHighlights(phraseStyles) {
    this.removeHighlights();
    if (!phraseStyles || Object.keys(phraseStyles).length === 0) return;

    const textNodes = this.getTextNodes(document.body);
    
    for (const [phrase, style] of Object.entries(phraseStyles)) {
      if (phrase.trim()) {
        this.highlightPhrase(phrase, style, textNodes);
      }
    }
  }

  getTextNodes(element) {
    const textNodes = [];
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // Skip script, style, and already highlighted content
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          
          const tagName = parent.tagName.toLowerCase();
          if (['script', 'style', 'noscript'].includes(tagName)) {
            return NodeFilter.FILTER_REJECT;
          }
          
          if (parent.classList.contains(this.highlightClass)) {
            return NodeFilter.FILTER_REJECT;
          }
          
          return node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      }
    );

    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }
    return textNodes;
  }

  highlightPhrase(phrase, style, textNodes) {
    const regex = new RegExp(`(${this.escapeRegex(phrase)})`, 'gi');
    
    textNodes.forEach(textNode => {
      const text = textNode.textContent;
      if (regex.test(text)) {
        const highlightedHTML = text.replace(regex, 
          `<span class="${this.highlightClass}" style="${this.sanitizeStyle(style)}">$1</span>`
        );
        
        if (highlightedHTML !== text) {
          const wrapper = document.createElement('div');
          wrapper.innerHTML = highlightedHTML;
          
          // Replace the text node with highlighted content
          const parent = textNode.parentNode;
          while (wrapper.firstChild) {
            parent.insertBefore(wrapper.firstChild, textNode);
          }
          parent.removeChild(textNode);
        }
      }
    });
  }

  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  sanitizeStyle(style) {
    // Basic CSS sanitization
    return style.replace(/[<>]/g, '').trim();
  }

  removeHighlights() {
    const highlighted = document.querySelectorAll(`.${this.highlightClass}`);
    highlighted.forEach(element => {
      const parent = element.parentNode;
      parent.insertBefore(document.createTextNode(element.textContent), element);
      parent.removeChild(element);
      parent.normalize(); // Merge adjacent text nodes
    });
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.action) {
        case 'updatePhrases':
          this.updateHighlights(request.phraseStyles);
          sendResponse({ success: true });
          break;
        case 'toggleHighlights':
          this.toggleHighlights();
          sendResponse({ success: true });
          break;
        case 'removeHighlights':
          this.removeHighlights();
          sendResponse({ success: true });
          break;
        case 'toggleSelectionMode':
          this.toggleSelectionMode();
          sendResponse({ success: true });
          break;
        case 'getSelectedText':
          const selectedText = this.getSelectedText();
          sendResponse({ selectedText: selectedText });
          break;
      }
      return true; // Keep message channel open for async response
    });
  }

  setupMutationObserver() {
    // Re-apply highlights when page content changes
    this.observer = new MutationObserver((mutations) => {
      let shouldReapply = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Check if any added nodes contain text
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.TEXT_NODE || 
                (node.nodeType === Node.ELEMENT_NODE && node.textContent.trim())) {
              shouldReapply = true;
              break;
            }
          }
        }
      });

      if (shouldReapply) {
        // Debounce re-application
        clearTimeout(this.reapplyTimeout);
        this.reapplyTimeout = setTimeout(() => {
          this.loadAndApplyHighlights();
        }, 500);
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  toggleHighlights() {
    const highlights = document.querySelectorAll(`.${this.highlightClass}`);
    const isVisible = highlights.length > 0 && highlights[0].style.display !== 'none';
    
    highlights.forEach(highlight => {
      highlight.style.display = isVisible ? 'none' : '';
    });
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.removeHighlights();
    this.disableSelectionMode();
    const style = document.getElementById('phrase-highlighter-styles');
    if (style) {
      style.remove();
    }
  }

  // Text Selection Functionality
  setupTextSelection() {
    // Listen for keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Ctrl+Shift+H to toggle selection mode
      if (e.ctrlKey && e.shiftKey && e.key === 'H') {
        e.preventDefault();
        this.toggleSelectionMode();
      }
      // Escape to exit selection mode
      if (e.key === 'Escape' && this.isSelectionMode) {
        e.preventDefault();
        this.disableSelectionMode();
      }
    });

    // Listen for text selection events
    document.addEventListener('mouseup', (e) => {
      if (this.isSelectionMode) {
        this.handleTextSelection(e);
      }
    });
  }

  toggleSelectionMode() {
    if (this.isSelectionMode) {
      this.disableSelectionMode();
    } else {
      this.enableSelectionMode();
    }
  }

  enableSelectionMode() {
    this.isSelectionMode = true;
    document.body.classList.add('phrase-highlighter-selection-mode');
    this.showTooltip('Selection mode enabled! Click and drag to select text to highlight. Press Esc to exit.', { x: window.innerWidth / 2, y: 50 });
  }

  disableSelectionMode() {
    this.isSelectionMode = false;
    document.body.classList.remove('phrase-highlighter-selection-mode');
    this.hideTooltip();
    this.clearSelectionHighlight();
  }

  handleTextSelection(e) {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (selectedText.length > 0 && selectedText.length <= 100) {
      this.highlightSelection(selection);
      this.showSelectionOptions(selectedText, e.pageX, e.pageY);
    }
  }

  highlightSelection(selection) {
    this.clearSelectionHighlight();
    
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const span = document.createElement('span');
      span.className = this.selectionClass;
      
      try {
        range.surroundContents(span);
        this.selectionOverlay = span;
      } catch (e) {
        // If we can't surround contents (e.g., across multiple elements)
        // Create a temporary highlight
        console.warn('Could not highlight selection:', e);
      }
    }
  }

  clearSelectionHighlight() {
    if (this.selectionOverlay) {
      const parent = this.selectionOverlay.parentNode;
      parent.insertBefore(document.createTextNode(this.selectionOverlay.textContent), this.selectionOverlay);
      parent.removeChild(this.selectionOverlay);
      parent.normalize();
      this.selectionOverlay = null;
    }
  }

  showSelectionOptions(selectedText, x, y) {
    this.hideTooltip();
    
    const tooltip = document.createElement('div');
    tooltip.className = 'phrase-highlighter-tooltip';
    tooltip.style.left = x + 'px';
    tooltip.style.top = (y - 60) + 'px';
    tooltip.innerHTML = `
      <div style="margin-bottom: 4px;">Selected: "${selectedText.substring(0, 30)}${selectedText.length > 30 ? '...' : ''}"</div>
      <button id="phraseHighlighterSave" style="background: #2196F3; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; margin-right: 4px;">Save Phrase</button>
      <button id="phraseHighlighterCancel" style="background: #666; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer;">Cancel</button>
    `;
    
    document.body.appendChild(tooltip);
    
    // Add event listeners to buttons
    const saveBtn = tooltip.querySelector('#phraseHighlighterSave');
    const cancelBtn = tooltip.querySelector('#phraseHighlighterCancel');
    
    saveBtn.addEventListener('click', () => {
      this.saveSelectedPhrase(selectedText);
    });
    
    cancelBtn.addEventListener('click', () => {
      this.hideTooltip();
      this.clearSelectionHighlight();
    });
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
      this.hideTooltip();
      this.clearSelectionHighlight();
    }, 10000);
  }

  async saveSelectedPhrase(selectedText) {
    try {
      // Get current phrases
      const data = await chrome.storage.sync.get(['phraseStyles']);
      const phraseStyles = data.phraseStyles || {};
      
      // Add new phrase with default yellow highlight
      const defaultStyle = 'background-color: #ffeb3b; color: #000; padding: 2px 4px; border-radius: 3px;';
      phraseStyles[selectedText] = defaultStyle;
      
      // Save to storage
      await chrome.storage.sync.set({ phraseStyles });
      
      // Apply highlighting immediately
      this.updateHighlights(phraseStyles);
      
      // Show success message
      this.showTooltip(`Phrase "${selectedText.substring(0, 20)}${selectedText.length > 20 ? '...' : ''}" saved!`, 
        { x: window.innerWidth / 2, y: 100 });
      
      this.clearSelectionHighlight();
      
      // Auto-hide success message
      setTimeout(() => {
        this.hideTooltip();
      }, 3000);
      
    } catch (error) {
      console.error('Error saving phrase:', error);
      this.showTooltip('Error saving phrase. Please try again.', 
        { x: window.innerWidth / 2, y: 100 });
      
      setTimeout(() => {
        this.hideTooltip();
      }, 3000);
    }
  }

  showTooltip(message, position) {
    this.hideTooltip();
    
    const tooltip = document.createElement('div');
    tooltip.className = 'phrase-highlighter-tooltip';
    tooltip.textContent = message;
    tooltip.style.left = (position.x - 100) + 'px';
    tooltip.style.top = position.y + 'px';
    tooltip.style.transform = 'translateX(-50%)';
    
    document.body.appendChild(tooltip);
  }

  hideTooltip() {
    const existingTooltips = document.querySelectorAll('.phrase-highlighter-tooltip');
    existingTooltips.forEach(tooltip => tooltip.remove());
  }

  getSelectedText() {
    const selection = window.getSelection();
    return selection.toString().trim();
  }
}

// Initialize the highlighter
const phraseHighlighter = new PhraseHighlighter();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  phraseHighlighter.destroy();
});