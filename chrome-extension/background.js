// SmartTab AI - Background Service Worker

const SUPABASE_URL = 'https://wjmkijvckvnrrsjzgwge.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqbWtpanZja3ZucnJzanpnd2dlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzMTg4MjMsImV4cCI6MjA3ODg5NDgyM30.pFICzrCrIXUofun1W5ZtTPVSyKvwjmvQFDQc1asvxX4';
const WEB_APP_URL = 'https://tab-mind-ai.lovable.app';

// Tab activity tracking (in-memory, rebuilt on every wake)
const tabActivity = new Map();
let activeTabId = null;
let activeTabStartTime = null;

// Initialize side panel behavior
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// ── Helpers to get URL/title from tabs, including discarded/sleeping ones ──

function getTabUrl(tab) {
  // pendingUrl is set when a tab hasn't fully loaded yet (e.g. discarded)
  return tab.url || tab.pendingUrl || null;
}

function getTabTitle(tab) {
  return tab.title || 'Untitled';
}

// ── Initialization: Scan ALL existing tabs (including discarded) ──

async function initializeExistingTabs() {
  try {
    // Query all tabs in all windows; discarded tabs are included by default
    const tabs = await chrome.tabs.query({});
    const now = Date.now();
    const currentTabIds = new Set();

    for (const tab of tabs) {
      const url = getTabUrl(tab);

      // Skip internal pages
      if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:') || url.startsWith('edge://')) {
        continue;
      }

      currentTabIds.add(tab.id);

      const existing = tabActivity.get(tab.id);
      if (existing) {
        tabActivity.set(tab.id, {
          ...existing,
          url,
          title: getTabTitle(tab),
          favIconUrl: tab.favIconUrl || existing.favIconUrl,
          discarded: !!tab.discarded,
        });
      } else {
        tabActivity.set(tab.id, {
          id: tab.id,
          url,
          title: getTabTitle(tab),
          favIconUrl: tab.favIconUrl || null,
          visits: 1,
          totalTime: 0,
          lastVisit: now,
          firstVisit: now,
          discarded: !!tab.discarded,
        });
      }
    }

    // Prune tabs that no longer exist
    for (const tabId of tabActivity.keys()) {
      if (!currentTabIds.has(tabId)) {
        tabActivity.delete(tabId);
      }
    }

    // Track the currently active tab for time tracking
    const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTabs.length > 0 && activeTabs[0].id) {
      activeTabId = activeTabs[0].id;
      activeTabStartTime = Date.now();
    }

    console.log(`SmartTab AI: Initialized ${tabActivity.size} tabs (including discarded/sleeping)`);

    // Trigger sync if we have a session
    debouncedSync();
  } catch (error) {
    console.error('SmartTab AI: Error initializing tabs:', error);
  }
}

// ── Lifecycle Events ──

// Run on every service-worker wake (script evaluation)
initializeExistingTabs();

chrome.runtime.onStartup.addListener(() => {
  console.log('SmartTab AI: Browser started, scanning tabs');
  initializeExistingTabs();
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('SmartTab AI: Extension installed/updated, scanning tabs');
  initializeExistingTabs();
  // Set up periodic alarm so the worker wakes up to sync
  setupAlarm();
});

// ── Periodic Alarm ──
// Chrome MV3 service workers go to sleep after ~30s of inactivity.
// An alarm ensures we wake up and sync periodically.

const SYNC_ALARM_NAME = 'smarttab-periodic-sync';

function setupAlarm() {
  chrome.alarms.create(SYNC_ALARM_NAME, {
    delayInMinutes: 1,
    periodInMinutes: 2, // Every 2 minutes
  });
}

// Re-create alarm on every wake (alarms persist, but be safe)
setupAlarm();

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === SYNC_ALARM_NAME) {
    console.log('SmartTab AI: Alarm fired, re-scanning & syncing');
    await initializeExistingTabs();
  }
});

// ── Tab Event Listeners ──

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  if (activeTabId && activeTabStartTime) {
    updateTimeSpent(activeTabId);
  }

  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    trackTabActivity(tab);
  } catch (e) {
    console.warn('Could not get activated tab:', e);
  }

  activeTabId = activeInfo.tabId;
  activeTabStartTime = Date.now();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Track on complete OR when a discarded tab gets a URL
  if (changeInfo.status === 'complete' || changeInfo.url || changeInfo.title) {
    const url = getTabUrl(tab);
    if (url) {
      trackTabActivity(tab);
    }
  }
  // When a tab is discarded/frozen by Chrome, update our record
  if (changeInfo.discarded !== undefined) {
    const existing = tabActivity.get(tabId);
    if (existing) {
      tabActivity.set(tabId, { ...existing, discarded: !!changeInfo.discarded });
    }
  }
});

chrome.tabs.onCreated.addListener((tab) => {
  const url = getTabUrl(tab);
  if (url) {
    trackTabActivity(tab);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (activeTabId === tabId) {
    updateTimeSpent(tabId);
    activeTabId = null;
    activeTabStartTime = null;
  }
  tabActivity.delete(tabId);
});

// Also listen for tab replacement (e.g. pre-rendered pages)
chrome.tabs.onReplaced.addListener(async (addedTabId, removedTabId) => {
  const old = tabActivity.get(removedTabId);
  tabActivity.delete(removedTabId);
  try {
    const tab = await chrome.tabs.get(addedTabId);
    trackTabActivity(tab);
    // Carry over time data
    if (old) {
      const current = tabActivity.get(addedTabId);
      if (current) {
        tabActivity.set(addedTabId, {
          ...current,
          totalTime: (current.totalTime || 0) + (old.totalTime || 0),
          firstVisit: old.firstVisit || current.firstVisit,
        });
      }
    }
  } catch (e) {
    console.warn('Could not get replaced tab:', e);
  }
});

// ── Time Tracking ──

function updateTimeSpent(tabId) {
  const existing = tabActivity.get(tabId);
  if (existing && activeTabStartTime) {
    const timeSpent = Date.now() - activeTabStartTime;
    tabActivity.set(tabId, {
      ...existing,
      totalTime: (existing.totalTime || 0) + timeSpent,
    });
  }
}

// ── Activity Tracking ──

function trackTabActivity(tab) {
  const url = getTabUrl(tab);
  if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:') || url.startsWith('edge://')) {
    return;
  }

  const now = Date.now();
  const existing = tabActivity.get(tab.id) || {
    visits: 0,
    totalTime: 0,
    lastVisit: null,
  };

  tabActivity.set(tab.id, {
    id: tab.id,
    url,
    title: getTabTitle(tab),
    favIconUrl: tab.favIconUrl || existing.favIconUrl || null,
    visits: existing.visits + 1,
    totalTime: existing.totalTime || 0,
    lastVisit: now,
    firstVisit: existing.firstVisit || now,
    discarded: !!tab.discarded,
  });

  debouncedSync();
}

// ── Sync ──

let syncTimeout = null;
function debouncedSync() {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(syncTabData, 3000); // Reduced from 5s to 3s
}

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
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ tabs }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`SmartTab AI: Synced ${result.synced} tabs`);
    } else {
      console.error('SmartTab AI: Sync failed:', response.status, await response.text());
    }
  } catch (error) {
    console.error('SmartTab AI: Sync error:', error);
  }
}

// ── Session Management ──

async function getStoredSession() {
  const result = await chrome.storage.local.get(['session']);
  return result.session || null;
}

async function storeSession(session) {
  await chrome.storage.local.set({ session });
}

async function clearSession() {
  await chrome.storage.local.remove(['session']);
  tabActivity.clear();
}

// ── Message Handling ──

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
    // Re-scan all tabs (including discarded) before responding
    chrome.tabs.query({}).then((tabs) => {
      const now = Date.now();
      const currentTabIds = new Set();
      const enrichedTabs = [];

      for (const tab of tabs) {
        const url = getTabUrl(tab);
        if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:') || url.startsWith('edge://')) {
          continue;
        }

        currentTabIds.add(tab.id);

        const existing = tabActivity.get(tab.id);
        if (!existing) {
          tabActivity.set(tab.id, {
            id: tab.id,
            url,
            title: getTabTitle(tab),
            favIconUrl: tab.favIconUrl || null,
            visits: 1,
            totalTime: 0,
            lastVisit: now,
            firstVisit: now,
            discarded: !!tab.discarded,
          });
        } else {
          tabActivity.set(tab.id, {
            ...existing,
            url,
            title: getTabTitle(tab),
            favIconUrl: tab.favIconUrl || existing.favIconUrl,
            discarded: !!tab.discarded,
          });
        }

        enrichedTabs.push({
          ...tab,
          activity: tabActivity.get(tab.id),
        });
      }

      // Prune stale entries
      for (const tabId of tabActivity.keys()) {
        if (!currentTabIds.has(tabId)) {
          tabActivity.delete(tabId);
        }
      }

      sendResponse(enrichedTabs);

      if (enrichedTabs.length > 0) {
        debouncedSync();
      }
    });
    return true;
  }

  if (message.type === 'REFRESH_TABS') {
    initializeExistingTabs().then(() => {
      sendResponse({ success: true, count: tabActivity.size });
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

// ── Recommendations ──

async function getRecommendations(session) {
  if (!session) return { recommendations: [], archived: [] };

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/tabs-recommend`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': SUPABASE_ANON_KEY,
      },
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

// ── Archive ──

async function archiveTab(session, url) {
  if (!session) return { success: false };

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/tabs-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ action: 'archive', url }),
    });

    return { success: response.ok };
  } catch (error) {
    console.error('Error archiving tab:', error);
    return { success: false };
  }
}

// ── Stats ──

async function getTabStats() {
  const tabs = Array.from(tabActivity.values());
  const totalTabs = tabs.length;
  const totalTime = tabs.reduce((acc, tab) => acc + (tab.totalTime || 0), 0);

  const domains = {};
  tabs.forEach((tab) => {
    try {
      const domain = new URL(tab.url).hostname.replace('www.', '');
      domains[domain] = (domains[domain] || 0) + 1;
    } catch {}
  });

  const topDomains = Object.entries(domains)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([domain, count]) => ({ domain, count }));

  return { totalTabs, totalTime, topDomains };
}

// ── Storage Change Listener ──

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.session) {
    if (changes.session.newValue) {
      debouncedSync();
    }
  }
});
