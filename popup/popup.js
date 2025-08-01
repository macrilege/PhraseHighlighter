// Popup script for Phrase Highlighter Extension
// Handles user interactions and storage management

class PopupManager {
  constructor() {
    this.elements = {};
    this.predefinedStyles = {
      "Yellow": "background-color: #ffeb3b; color: #000; padding: 2px 4px; border-radius: 3px;",
      "Blue": "background-color: #2196f3; color: #fff; padding: 2px 4px; border-radius: 3px;",
      "Green": "background-color: #4caf50; color: #fff; padding: 2px 4px; border-radius: 3px;",
      "Red": "background-color: #f44336; color: #fff; padding: 2px 4px; border-radius: 3px;",
      "Orange": "background-color: #ff9800; color: #000; padding: 2px 4px; border-radius: 3px;",
      "Purple": "background-color: #9c27b0; color: #fff; padding: 2px 4px; border-radius: 3px;",
      "Underline": "text-decoration: underline; text-decoration-color: #2196f3; text-decoration-thickness: 2px;",
      "Bold": "font-weight: bold; color: #1976d2;"
    };
    this.isEditing = false;
    this.editingPhrase = null;
    this.init();
  }

  init() {
    this.bindElements();
    this.setupEventListeners();
    this.loadPredefinedStyles();
    this.loadSettings();
    this.loadPhrases();
  }

  bindElements() {
    this.elements = {
      enableToggle: document.getElementById('enableToggle'),
      phraseInput: document.getElementById('phraseInput'),
      customStyle: document.getElementById('customStyle'),
      saveButton: document.getElementById('savePhrase'),
      toggleSelectionButton: document.getElementById('toggleSelection'),
      clearAllButton: document.getElementById('clearAll'),
      predefinedStyles: document.getElementById('predefinedStyles'),
      phrasesList: document.getElementById('phrasesList'),
      emptyState: document.getElementById('emptyState'),
      statusMessage: document.getElementById('statusMessage')
    };
  }

  setupEventListeners() {
    // Enable/disable toggle
    this.elements.enableToggle.addEventListener('change', (e) => {
      this.toggleHighlighting(e.target.checked);
    });

    // Save button
    this.elements.saveButton.addEventListener('click', () => {
      this.savePhrase();
    });

    // Toggle selection mode button
    this.elements.toggleSelectionButton.addEventListener('click', () => {
      this.toggleSelectionMode();
    });

    // Clear all button
    this.elements.clearAllButton.addEventListener('click', () => {
      this.clearAllPhrases();
    });

    // Input validation
    this.elements.phraseInput.addEventListener('input', () => {
      this.validateInput();
    });

    this.elements.customStyle.addEventListener('input', () => {
      this.validateInput();
    });

    // Enter key to save
    this.elements.phraseInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && this.elements.saveButton.disabled === false) {
        this.savePhrase();
      }
    });

    // Escape key to cancel edit
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isEditing) {
        this.cancelEdit();
      }
    });
  }

  loadPredefinedStyles() {
    const container = this.elements.predefinedStyles;
    container.innerHTML = '';

    Object.entries(this.predefinedStyles).forEach(([name, style]) => {
      const button = document.createElement('button');
      button.className = 'predefined-style';
      button.textContent = name;
      button.title = `Click to use: ${style}`;
      
      button.addEventListener('click', () => {
        this.selectPredefinedStyle(name, style, button);
      });

      container.appendChild(button);
    });
  }

  selectPredefinedStyle(name, style, button) {
    // Clear previous selections
    document.querySelectorAll('.predefined-style').forEach(btn => {
      btn.classList.remove('selected');
    });

    // Select current style
    button.classList.add('selected');
    this.elements.customStyle.value = style;
    this.validateInput();
  }

  async loadSettings() {
    try {
      const data = await this.getStorageData(['highlightEnabled']);
      this.elements.enableToggle.checked = data.highlightEnabled !== false;
    } catch (error) {
      console.error('Error loading settings:', error);
      this.showStatus('Error loading settings', 'error');
    }
  }

  async loadPhrases() {
    try {
      const data = await this.getStorageData(['phraseStyles']);
      const phraseStyles = data.phraseStyles || {};
      this.updatePhrasesList(phraseStyles);
    } catch (error) {
      console.error('Error loading phrases:', error);
      this.showStatus('Error loading phrases', 'error');
    }
  }

  updatePhrasesList(phraseStyles) {
    const container = this.elements.phrasesList;
    const emptyState = this.elements.emptyState;
    
    container.innerHTML = '';
    
    const phrases = Object.entries(phraseStyles);
    
    if (phrases.length === 0) {
      emptyState.style.display = 'block';
      return;
    }
    
    emptyState.style.display = 'none';
    
    phrases.forEach(([phrase, style]) => {
      const item = this.createPhraseItem(phrase, style);
      container.appendChild(item);
    });
  }

  createPhraseItem(phrase, style) {
    const item = document.createElement('div');
    item.className = 'phrase-item';
    
    const content = document.createElement('div');
    content.className = 'phrase-content';
    
    const phraseText = document.createElement('div');
    phraseText.className = 'phrase-text';
    phraseText.textContent = phrase;
    
    const styleText = document.createElement('div');
    styleText.className = 'phrase-style';
    styleText.textContent = style || 'No style';
    
    content.appendChild(phraseText);
    content.appendChild(styleText);
    
    const actions = document.createElement('div');
    actions.className = 'phrase-actions';
    
    const editBtn = document.createElement('button');
    editBtn.className = 'action-btn edit-btn';
    editBtn.textContent = 'Edit';
    editBtn.title = 'Edit this phrase';
    editBtn.addEventListener('click', () => this.editPhrase(phrase, style));
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'action-btn delete-btn';
    deleteBtn.textContent = 'Delete';
    deleteBtn.title = 'Delete this phrase';
    deleteBtn.addEventListener('click', () => this.deletePhrase(phrase));
    
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    
    item.appendChild(content);
    item.appendChild(actions);
    
    return item;
  }

  async savePhrase() {
    const phrase = this.elements.phraseInput.value.trim();
    const style = this.elements.customStyle.value.trim();
    
    if (!phrase) {
      this.showStatus('Please enter a phrase', 'warning');
      return;
    }

    // Validate CSS
    if (style && !this.validateCSS(style)) {
      this.showStatus('Invalid CSS syntax', 'error');
      return;
    }

    try {
      const data = await this.getStorageData(['phraseStyles']);
      const phraseStyles = data.phraseStyles || {};
      
      // Check for duplicates (unless editing)
      if (!this.isEditing && phraseStyles.hasOwnProperty(phrase)) {
        const overwrite = confirm(`Phrase "${phrase}" already exists. Overwrite?`);
        if (!overwrite) return;
      }
      
      phraseStyles[phrase] = style;
      
      await this.saveStorageData({ phraseStyles });
      await this.notifyContentScript(phraseStyles);
      
      this.updatePhrasesList(phraseStyles);
      this.clearForm();
      this.showStatus(
        this.isEditing ? 'Phrase updated successfully' : 'Phrase saved successfully', 
        'success'
      );
      
      if (this.isEditing) {
        this.cancelEdit();
      }
    } catch (error) {
      console.error('Error saving phrase:', error);
      this.showStatus('Error saving phrase', 'error');
    }
  }

  editPhrase(phrase, style) {
    this.isEditing = true;
    this.editingPhrase = phrase;
    
    this.elements.phraseInput.value = phrase;
    this.elements.customStyle.value = style;
    this.elements.saveButton.textContent = 'Update Phrase';
    this.elements.phraseInput.focus();
    
    // Clear predefined style selections
    document.querySelectorAll('.predefined-style').forEach(btn => {
      btn.classList.remove('selected');
    });
    
    this.validateInput();
  }

  cancelEdit() {
    this.isEditing = false;
    this.editingPhrase = null;
    this.elements.saveButton.textContent = 'Save Phrase';
    this.clearForm();
  }

  async deletePhrase(phrase) {
    const confirmed = confirm(`Delete phrase "${phrase}"?`);
    if (!confirmed) return;
    
    try {
      const data = await this.getStorageData(['phraseStyles']);
      const phraseStyles = data.phraseStyles || {};
      
      delete phraseStyles[phrase];
      
      await this.saveStorageData({ phraseStyles });
      await this.notifyContentScript(phraseStyles);
      
      this.updatePhrasesList(phraseStyles);
      this.showStatus('Phrase deleted', 'success');
    } catch (error) {
      console.error('Error deleting phrase:', error);
      this.showStatus('Error deleting phrase', 'error');
    }
  }

  async toggleSelectionMode() {
    try {
      await this.sendMessageToContentScript({ action: 'toggleSelectionMode' });
      this.showStatus('Click and drag text on the page to select phrases! Press Ctrl+Shift+H or Esc to exit.', 'success');
      
      // Close popup after a short delay to let user see the message
      setTimeout(() => {
        window.close();
      }, 2000);
    } catch (error) {
      console.error('Error toggling selection mode:', error);
      this.showStatus('Error activating selection mode', 'error');
    }
  }

  async clearAllPhrases() {
    const confirmed = confirm('Delete all phrases? This cannot be undone.');
    if (!confirmed) return;
    
    try {
      await this.saveStorageData({ phraseStyles: {} });
      await this.notifyContentScript({});
      
      this.updatePhrasesList({});
      this.showStatus('All phrases cleared', 'success');
    } catch (error) {
      console.error('Error clearing phrases:', error);
      this.showStatus('Error clearing phrases', 'error');
    }
  }

  async toggleHighlighting(enabled) {
    try {
      await this.saveStorageData({ highlightEnabled: enabled });
      
      if (enabled) {
        const data = await this.getStorageData(['phraseStyles']);
        await this.notifyContentScript(data.phraseStyles || {});
        this.showStatus('Highlighting enabled', 'success');
      } else {
        await this.sendMessageToContentScript({ action: 'removeHighlights' });
        this.showStatus('Highlighting disabled', 'warning');
      }
    } catch (error) {
      console.error('Error toggling highlighting:', error);
      this.showStatus('Error updating settings', 'error');
    }
  }

  clearForm() {
    this.elements.phraseInput.value = '';
    this.elements.customStyle.value = '';
    
    // Clear predefined style selections
    document.querySelectorAll('.predefined-style').forEach(btn => {
      btn.classList.remove('selected');
    });
    
    this.validateInput();
  }

  validateInput() {
    const phrase = this.elements.phraseInput.value.trim();
    const hasPhrase = phrase.length > 0;
    
    this.elements.saveButton.disabled = !hasPhrase;
  }

  validateCSS(css) {
    // Basic CSS validation
    try {
      const element = document.createElement('div');
      element.style.cssText = css;
      return true;
    } catch (e) {
      return false;
    }
  }

  async notifyContentScript(phraseStyles) {
    if (!this.elements.enableToggle.checked) return;
    
    try {
      await this.sendMessageToContentScript({
        action: 'updatePhrases',
        phraseStyles: phraseStyles
      });
    } catch (error) {
      console.warn('Could not update content script:', error);
    }
  }

  async sendMessageToContentScript(message) {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0) {
      await chrome.tabs.sendMessage(tabs[0].id, message);
    }
  }

  showStatus(message, type = 'success') {
    const statusEl = this.elements.statusMessage;
    statusEl.textContent = message;
    statusEl.className = `status-message ${type}`;
    
    // Clear after 3 seconds
    setTimeout(() => {
      statusEl.textContent = '';
      statusEl.className = 'status-message';
    }, 3000);
  }

  // Storage helper methods
  getStorageData(keys) {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get(keys, (data) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(data);
        }
      });
    });
  }

  saveStorageData(data) {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.set(data, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});