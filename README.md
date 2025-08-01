# 🎨 Phrase Highlighter - Chrome Extension

A modern Chrome extension that allows you to highlight specific phrases on web pages with customizable styles.

## ✨ Features

- **🎯 Phrase Highlighting**: Highlight any phrase on web pages with custom CSS styles
- **🎨 Predefined Styles**: Quick access to common highlighting styles (Yellow, Blue, Green, Red, etc.)
- **🔧 Custom CSS**: Create your own highlighting styles with custom CSS
- **⚡ Toggle Control**: Easily enable/disable highlighting with a toggle switch
- **📝 Phrase Management**: Edit, delete, and manage all your saved phrases
- **🔄 Real-time Updates**: Highlights update automatically as you add or modify phrases
- **🌐 Universal**: Works on all websites
- **💾 Sync Storage**: Phrases sync across your Chrome instances

## 🚀 Installation

### From Source (Development)

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/PhraseHighlighter.git
   cd PhraseHighlighter
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" in the top right corner

4. Click "Load unpacked" and select the extension directory

5. The extension will appear in your Chrome toolbar

### From Chrome Web Store

*Coming soon - extension will be published to the Chrome Web Store*

## 📖 How to Use

1. **Click the extension icon** in your Chrome toolbar to open the popup

2. **Add a phrase**:
   - Enter the phrase you want to highlight
   - Choose a predefined style or create custom CSS
   - Click "Save Phrase"

3. **Manage phrases**:
   - View all saved phrases in the list
   - Click "Edit" to modify a phrase or its style
   - Click "Delete" to remove a phrase
   - Use "Clear All" to remove all phrases

4. **Toggle highlighting**:
   - Use the toggle switch to enable/disable highlighting
   - Phrases are highlighted immediately when you save them

## 🎨 Predefined Styles

- **Yellow**: Classic yellow highlight
- **Blue**: Blue background with white text
- **Green**: Green background with white text
- **Red**: Red background with white text
- **Orange**: Orange background with black text
- **Purple**: Purple background with white text
- **Underline**: Blue underline styling
- **Bold**: Bold text with blue color

## 🛠️ Technical Details

- **Manifest Version**: 3 (latest Chrome extension standard)
- **Permissions**: `storage`, `activeTab`
- **Architecture**: 
  - Service Worker background script
  - Content script for DOM manipulation
  - Modern popup interface
- **Storage**: Chrome Sync Storage (syncs across devices)
- **Performance**: Efficient TreeWalker-based DOM manipulation

## 📁 Project Structure

```
PhraseHighlighter/
├── manifest.json          # Extension manifest (V3)
├── background.js          # Service worker
├── content.js            # Content script for highlighting
├── popup/
│   ├── popup.html        # Popup interface
│   ├── popup.css         # Modern styling
│   └── popup.js          # Popup functionality
├── images/
│   └── icon128.jpg       # Extension icon
└── README.md            # This file
```

## 🔧 Development

### Prerequisites

- Chrome Browser (latest version recommended)
- Basic knowledge of HTML, CSS, and JavaScript

### Making Changes

1. **Modify the code** in your preferred editor
2. **Reload the extension** in `chrome://extensions/`
3. **Test your changes** on various websites
4. **Debug using** Chrome DevTools for the popup and content scripts

### Key Files

- `manifest.json`: Extension configuration and permissions
- `content.js`: Handles highlighting logic on web pages
- `popup/popup.js`: Manages the user interface and storage
- `popup/popup.css`: Modern styling for the popup interface

## 🚀 Recent Improvements (v2.0)

- ✅ Upgraded to Manifest V3
- ✅ Modern, professional UI design
- ✅ Better performance with TreeWalker DOM manipulation
- ✅ Enhanced error handling and validation
- ✅ Improved CSS sanitization and security
- ✅ Real-time highlighting updates
- ✅ Keyboard shortcuts (Enter to save, Escape to cancel)
- ✅ Better mobile-responsive design
- ✅ Smooth animations and transitions

## 🐛 Known Issues

- None currently reported

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**micmc**

## 🙏 Acknowledgments

- Chrome Extension API documentation
- Modern web development best practices
- Community feedback and suggestions

---

**⭐ If you find this extension useful, please consider giving it a star!**
