// SmartTab AI - Background Service Worker

const SUPABASE_URL = 'https://wjmkijvckvnrrsjzgwge.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqbWtpanZja3ZucnJzanpnd2dlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzMTg4MjMsImV4cCI6MjA3ODg5NDgyM30.pFICzrCrIXUofun1W5ZtTPVSyKvwjmvQFDQc1asvxX4';
const WEB_APP_URL = 'https://tab-mind-ai.lovable.app';

// Tab activity tracking
const tabActivity = new Map();
let activeTabId = null;
let activeTabStartTime = null;

// Initialize side panel behavior
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Track tab activation
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  // Update time spent on previous tab
  if (activeTabId && activeTabStartTime) {
    updateTimeSpent(activeTabId);
  }
  
  const tab = await chrome.tabs.get(activeInfo.tabId);
  trackTabActivity(tab);
  
  // Set new active tab
  activeTabId = activeInfo.tabId;
  activeTabStartTime = Date.now();
});

// Track tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    trackTabActivity(tab);
  }
});

// Track when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (activeTabId === tabId) {
    updateTimeSpent(tabId);
    activeTabId = null;
    activeTabStartTime = null;
  }
});

// Update time spent on a tab
function updateTimeSpent(tabId) {
  const existing = tabActivity.get(tabId);
  if (existing && activeTabStartTime) {
    const timeSpent = Date.now() - activeTabStartTime;
    tabActivity.set(tabId, {
      ...existing,
      totalTime: (existing.totalTime || 0) + timeSpent
    });
  }
}

// Track tab activity
function trackTabActivity(tab) {
  if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
    return;
  }

  const now = Date.now();
  const existing = tabActivity.get(tab.id) || {
    visits: 0,
    totalTime: 0,
    lastVisit: null
  };

  tabActivity.set(tab.id, {
    id: tab.id,
    url: tab.url,
    title: tab.title,
    favIconUrl: tab.favIconUrl,
    visits: existing.visits + 1,
    totalTime: existing.totalTime || 0,
    lastVisit: now,
    firstVisit: existing.firstVisit || now
  });

  // Sync to backend periodically
  debouncedSync();
}

// Debounce sync to avoid too many API calls
let syncTimeout = null;
function debouncedSync() {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(syncTabData, 5000);
}

// Sync tab data to backend
async function syncTabData() {
  const session = await getStoredSession();
  if (!session) return;

  const tabs = Array.from(tabActivity.values());
  if (tabs.length === 0) return;

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/tabs-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({ tabs })
    });

    if (!response.ok) {
      console.error('Failed to sync tabs:', await response.text());
    }
  } catch (error) {
    console.error('Error syncing tabs:', error);
  }
}

// Get stored session from chrome.storage
async function getStoredSession() {
  const result = await chrome.storage.local.get(['session']);
  return result.session || null;
}

// Store session
async function storeSession(session) {
  await chrome.storage.local.set({ session });
}

// Clear session
async function clearSession() {
  await chrome.storage.local.remove(['session']);
  tabActivity.clear();
}

// Message handling from sidepanel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_SESSION') {
    getStoredSession().then(sendResponse);
    return true;
  }

  if (message.type === 'SET_SESSION') {
    storeSession(message.session).then(() => sendResponse({ success: true }));
    return true;
  }

  if (message.type === 'CLEAR_SESSION') {
    clearSession().then(() => sendResponse({ success: true }));
    return true;
  }

  if (message.type === 'GET_ALL_TABS') {
    chrome.tabs.query({}, (tabs) => {
      const enrichedTabs = tabs
        .filter(tab => !tab.url?.startsWith('chrome://') && !tab.url?.startsWith('chrome-extension://'))
        .map(tab => ({
          ...tab,
          activity: tabActivity.get(tab.id) || null
        }));
      sendResponse(enrichedTabs);
    });
    return true;
  }

  if (message.type === 'SWITCH_TO_TAB') {
    chrome.tabs.update(message.tabId, { active: true });
    chrome.windows.update(message.windowId, { focused: true });
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'CLOSE_TAB') {
    chrome.tabs.remove(message.tabId).then(() => {
      tabActivity.delete(message.tabId);
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === 'OPEN_WEB_LOGIN') {
    chrome.tabs.create({ url: `${WEB_APP_URL}/auth?extension=true` });
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'GET_RECOMMENDATIONS') {
    getRecommendations(message.session).then(sendResponse);
    return true;
  }

  if (message.type === 'ARCHIVE_TAB') {
    archiveTab(message.session, message.url).then(sendResponse);
    return true;
  }

  if (message.type === 'GET_TAB_STATS') {
    getTabStats().then(sendResponse);
    return true;
  }
});

// Get tab recommendations from backend
async function getRecommendations(session) {
  if (!session) return { recommendations: [], archived: [] };

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/tabs-recommend`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': SUPABASE_ANON_KEY
      }
    });

    if (!response.ok) {
      console.error('Failed to get recommendations');
      return { recommendations: [], archived: [] };
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting recommendations:', error);
    return { recommendations: [], archived: [] };
  }
}

// Archive a tab
async function archiveTab(session, url) {
  if (!session) return { success: false };

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/tabs-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({ 
        action: 'archive',
        url 
      })
    });

    return { success: response.ok };
  } catch (error) {
    console.error('Error archiving tab:', error);
    return { success: false };
  }
}

// Get tab statistics
async function getTabStats() {
  const tabs = Array.from(tabActivity.values());
  const totalTabs = tabs.length;
  const totalTime = tabs.reduce((acc, tab) => acc + (tab.totalTime || 0), 0);
  
  // Get domain distribution
  const domains = {};
  tabs.forEach(tab => {
    try {
      const domain = new URL(tab.url).hostname.replace('www.', '');
      domains[domain] = (domains[domain] || 0) + 1;
    } catch {}
  });
  
  const topDomains = Object.entries(domains)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([domain, count]) => ({ domain, count }));

  return {
    totalTabs,
    totalTime,
    topDomains
  };
}

// Listen for auth from web app via content script or storage
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.session) {
    if (changes.session.newValue) {
      // Session was set - trigger sync
      debouncedSync();
    }
  }
});
