chrome.storage.sync.get('phraseStyles', function(data) {
  if (chrome.runtime.lastError) {
    console.error('Error loading phrases:', chrome.runtime.lastError);
    return;
  }
  updateHighlights(data.phraseStyles || {});
});

function updateHighlights(phraseStyles) {
  removeHighlights();
  for (let phrase in phraseStyles) {
    highlightPhrase(phrase, phraseStyles[phrase]);
  }
}

function highlightPhrase(phrase, style) {
  var regex = new RegExp(`(${phrase})`, 'gi');
  document.body.innerHTML = document.body.innerHTML.replace(regex, `<span style="${style}">$1</span>`);
}

function removeHighlights() {
  var highlightedElements = document.querySelectorAll('span[style]');
  highlightedElements.forEach(element => {
    element.outerHTML = element.innerHTML;
  });
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "updatePhrases") {
    updateHighlights(request.phraseStyles);
  }
});