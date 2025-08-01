// Content script for Phrase Highlighter Extension
// Handles highlighting phrases on web pages

class PhraseHighlighter {
  constructor() {
    this.highlightClass = 'phrase-highlighter-span';
    this.isInitialized = false;
    this.observer = null;
    this.init();
  }

  init() {
    if (this.isInitialized) return;
    
    this.addStyles();
    this.loadAndApplyHighlights();
    this.setupMessageListener();
    this.setupMutationObserver();
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
    const style = document.getElementById('phrase-highlighter-styles');
    if (style) {
      style.remove();
    }
  }
}

// Initialize the highlighter
const phraseHighlighter = new PhraseHighlighter();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  phraseHighlighter.destroy();
});