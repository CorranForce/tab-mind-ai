# SmartTab AI Chrome Extension

AI-powered tab organization that surfaces the tabs you need, when you need them.

## Features

- **Tab Tracking**: Automatically tracks your tab usage patterns
- **Smart Recommendations**: AI-powered suggestions for tabs you might need
- **Recently Used**: Quick access to your recently visited tabs
- **Archived Tabs**: View and restore tabs that were auto-archived

## Installation (Development)

1. Open Chrome and navigate to `chrome://extensions`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked"
4. Select the `chrome-extension` folder from this project

## Usage

1. Click the SmartTab AI icon in your browser toolbar to open the sidebar
2. Sign in with your SmartTab AI account (opens the web app for authentication)
3. Your tabs will be tracked automatically
4. View recommendations and recently used tabs in the sidebar

## File Structure

- `manifest.json` - Extension configuration
- `background.js` - Service worker for tab tracking and API communication
- `sidepanel.html` - Sidebar UI structure
- `sidepanel.js` - Sidebar functionality
- `styles.css` - Sidebar styling
- `icons/` - Extension icons (need to be added)

## Required Backend Functions

The extension communicates with these edge functions:

- `tabs-sync` - Syncs tab activity data to the backend
- `tabs-recommend` - Gets AI-powered tab recommendations

## Icons

You'll need to add extension icons in the `icons/` folder:
- `icon16.png` (16x16)
- `icon32.png` (32x32)  
- `icon48.png` (48x48)
- `icon128.png` (128x128)
