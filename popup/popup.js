document.addEventListener('DOMContentLoaded', function() {
  var saveButton = document.getElementById('savePhrase');
  var phraseInput = document.getElementById('phraseInput');
  var phrasesList = document.getElementById('phrasesList');
  var customStyle = document.getElementById('customStyle');
  var predefinedStylesDiv = document.getElementById('predefinedStyles');
  var statusMessage = document.getElementById('statusMessage');

  // Predefined styles
  var predefinedStyles = {
    "Yellow Highlight": "background-color: yellow;",
    "Red Text": "color: red;",
    "Green Border": "border: 2px solid green; padding: 2px;",
    "Blue Background": "background-color: blue; color: white;"
  };

  // Add predefined styles to the UI
  for (let styleName in predefinedStyles) {
    let styleElement = document.createElement('span');
    styleElement.textContent = styleName;
    styleElement.className = 'predefined-style';
    styleElement.addEventListener('click', function() {
      customStyle.value = predefinedStyles[styleName];
    });
    predefinedStylesDiv.appendChild(styleElement);
  }

  // Load existing phrases and their styles
  chrome.storage.sync.get('phraseStyles', function(data) {
    if (chrome.runtime.lastError) {
      showStatusMessage('Error loading phrases', 'error');
      return;
    }
    updatePhrasesList(data.phraseStyles || {});
  });

  saveButton.addEventListener('click', function() {
    var phrase = phraseInput.value.trim();
    var style = customStyle.value.trim();
    if (phrase) {
      chrome.storage.sync.get('phraseStyles', function(data) {
        if (chrome.runtime.lastError) {
          showStatusMessage('Error saving phrase', 'error');
          return;
        }
        var phraseStyles = data.phraseStyles || {};
        phraseStyles[phrase] = style; // Associate the new style with the new phrase
        savePhraseStyles(phraseStyles);
        phraseInput.value = '';
        customStyle.value = ''; // Clear style input for next phrase
      });
    }
  });

  // Function to update the phrases list in the UI
  function updatePhrasesList(phraseStyles) {
    phrasesList.innerHTML = '';
    Object.entries(phraseStyles).forEach(([phrase, style]) => {
      var phraseSpan = document.createElement('span');
      phraseSpan.textContent = phrase + ' ';
      phraseSpan.addEventListener('click', function() {
        deletePhrase(phrase);
      });

      var styleSpan = document.createElement('span');
      styleSpan.textContent = 'Style';
      styleSpan.style.color = 'blue';
      styleSpan.style.cursor = 'pointer';
      styleSpan.style.textDecoration = 'underline';
      styleSpan.addEventListener('click', function() {
        editStyle(phrase, style);
      });

      var styleText = document.createElement('span');
      styleText.textContent = `: ${style}`;
      styleText.style.fontSize = '0.8em';

      var lineBreak = document.createElement('br');

      phrasesList.appendChild(phraseSpan);
      phrasesList.appendChild(document.createTextNode(' '));
      phrasesList.appendChild(styleSpan);
      phrasesList.appendChild(styleText);
      phrasesList.appendChild(lineBreak);
    });
  }

  // Function to save phrases and their styles to storage and update the UI
  function savePhraseStyles(phraseStyles) {
    chrome.storage.sync.set({phraseStyles: phraseStyles}, function() {
      if (chrome.runtime.lastError) {
        showStatusMessage('Error saving phrases', 'error');
        return;
      }
      updatePhrasesList(phraseStyles);
      showStatusMessage('Phrase saved successfully', 'success');
      // Notify content script for updating highlights
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {action: "updatePhrases", phraseStyles: phraseStyles});
      });
    });
  }

  // Function to delete a phrase
  function deletePhrase(phrase) {
    chrome.storage.sync.get('phraseStyles', function(data) {
      if (chrome.runtime.lastError) {
        showStatusMessage('Error deleting phrase', 'error');
        return;
      }
      var phraseStyles = data.phraseStyles || {};
      if (phrase in phraseStyles) { 
        delete phraseStyles[phrase];
        savePhraseStyles(phraseStyles);
      }
    });
  }

  // Function to edit the style of a phrase
  function editStyle(phrase, currentStyle) {
    customStyle.value = currentStyle; // Populate the customStyle textarea with the current style
    phraseInput.value = phrase; // Set the phrase input to the current phrase
    saveButton.textContent = 'Update'; // Change button text to reflect the new action

    // Save the original save function to revert later
    var originalSave = saveButton.onclick;
    
    // Override the save button's click handler for this edit session
    saveButton.onclick = function() {
      var newStyle = customStyle.value.trim();
      if (newStyle) {
        chrome.storage.sync.get('phraseStyles', function(data) {
          if (chrome.runtime.lastError) {
            showStatusMessage('Error updating style', 'error');
            return;
          }
          var phraseStyles = data.phraseStyles || {};
          phraseStyles[phrase] = newStyle;
          savePhraseStyles(phraseStyles);
          customStyle.value = ''; // Clear the style input
          phraseInput.value = ''; // Clear the phrase input
          saveButton.textContent = 'Save'; // Reset button text
          saveButton.onclick = originalSave; // Reset the save function
        });
      }
    };
  }

  function showStatusMessage(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = type;
    setTimeout(() => {
      statusMessage.textContent = '';
      statusMessage.className = '';
    }, 3000);
  }
});