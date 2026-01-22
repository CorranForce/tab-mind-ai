// SmartTab AI - Content Script
// This script runs on the web app to transfer auth session to the extension

const WEB_APP_ORIGIN = 'https://tab-mind-ai.lovable.app';

// Only run on the web app
if (window.location.origin === WEB_APP_ORIGIN || window.location.origin.includes('lovable.app')) {
  console.log('[SmartTab] Content script loaded on web app');
  
  // Listen for BroadcastChannel messages from the web app
  try {
    const channel = new BroadcastChannel('smarttab-auth');
    channel.onmessage = async (event) => {
      if (event.data.type === 'AUTH_SESSION' && event.data.session) {
        console.log('[SmartTab] Received auth session via BroadcastChannel');
        // Forward to extension background
        chrome.runtime.sendMessage({
          type: 'SET_SESSION',
          session: event.data.session
        }, (response) => {
          console.log('[SmartTab] Session stored in extension:', response);
        });
      }
    };
  } catch (e) {
    console.log('[SmartTab] BroadcastChannel not supported');
  }
  
  // Also listen for custom window events as fallback
  window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin) return;
    
    if (event.data.type === 'SMARTTAB_AUTH_SESSION' && event.data.session) {
      console.log('[SmartTab] Received auth session via window.postMessage');
      chrome.runtime.sendMessage({
        type: 'SET_SESSION',
        session: event.data.session
      });
    }
  });
  
  // Check if we're on the auth page with extension=true param
  if (window.location.pathname === '/auth' && window.location.search.includes('extension=true')) {
    // Inject a listener that will capture the session when auth completes
    console.log('[SmartTab] Extension auth flow detected');
  }
}
