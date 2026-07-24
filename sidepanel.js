// SmartTab AI - Sidepanel Script

const WEB_APP_URL = 'https://tab-mind-ai.lovable.app';

// DOM Elements
const loadingEl = document.getElementById('loading');
const loginViewEl = document.getElementById('login-view');
const dashboardViewEl = document.getElementById('dashboard-view');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const recommendationsEl = document.getElementById('recommendations');
const recentTabsEl = document.getElementById('recent-tabs');
const archivedTabsEl = document.getElementById('archived-tabs');
const archivedToggle = document.getElementById('archived-toggle');
const searchInput = document.getElementById('search-input');
const statsContainer = document.getElementById('stats-container');
const refreshBtn = document.getElementById('refresh-btn');
const refreshIntervalSelect = document.getElementById('refresh-interval-select');
const internalTabsToggle = document.getElementById('internal-tabs-toggle');
const lastUpdatedEl = document.getElementById('last-updated');
const debugToggle = document.getElementById('debug-toggle');
const debugPanel = document.getElementById('debug-panel');

// State
let currentSession = null;
let allTabs = [];
let searchQuery = '';
let liveRefreshTimeout = null;
let tabListenersRegistered = false;
let autoRefreshIntervalMs = 3000;
let autoRefreshTimer = null;
let lastRefreshAt = null;
let lastUpdatedTicker = null;
let includeInternalTabs = false;
let activeRefreshPromise = null;
let lastRescanResult = null;
let lastBrowserTabCount = 0;
let lastBackgroundTabCount = 0;

const REFRESH_INTERVAL_OPTIONS = [1000, 3000, 5000];
const INTERNAL_TAB_PREFIXES = ['chrome://', 'about:', 'edge://', 'chrome-search://', 'devtools://', 'view-source:'];

// Initialize
async function init() {
  showView('loading');

  await Promise.all([
    initializeRefreshSettings(),
    initializeInternalTabsSetting(),
  ]);

  // Check for session
  currentSession = await getSession();

  if (currentSession) {
    await loadDashboard({ forceRescan: true });
    startAutoRefresh({ immediate: false });
    startLastUpdatedTicker();
  } else {
    showView('login');
    stopAutoRefresh();
    stopLastUpdatedTicker();
  }

  // Listen for session updates from web app
  listenForWebAppSession();
  setupRealtimeTabListeners();
}

// Show specific view
function showView(view) {
  loadingEl.classList.add('hidden');
  loginViewEl.classList.add('hidden');
  dashboardViewEl.classList.add('hidden');
  
  switch (view) {
    case 'loading':
      loadingEl.classList.remove('hidden');
      break;
    case 'login':
      loginViewEl.classList.remove('hidden');
      break;
    case 'dashboard':
      dashboardViewEl.classList.remove('hidden');
      break;
  }
}

// Get session from background
async function getSession() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_SESSION' }, resolve);
  });
}

// Set session in background
async function setSession(session) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'SET_SESSION', session }, resolve);
  });
}

// Clear session
async function clearSession() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'CLEAR_SESSION' }, resolve);
  });
}

// Get all tabs (direct browser query first, then merge background activity when available)
async function getAllTabs() {
  const [browserTabs, backgroundTabs] = await Promise.all([
    new Promise((resolve) => {
      chrome.tabs.query({}, (tabs) => {
        const normalizedTabs = (tabs || [])
          .map((tab) => {
            const rawUrl = tab.url || tab.pendingUrl;
            const isExtensionPage = rawUrl?.startsWith('chrome-extension://');
            if (isExtensionPage) return null;

            const normalizedUrl = rawUrl || `tab://${tab.id}`;
            return {
              ...tab,
              url: normalizedUrl,
              title: tab.title || 'Untitled',
              favIconUrl: tab.favIconUrl || null,
              isInternal: isInternalBrowserUrl(normalizedUrl),
            };
          })
          .filter(Boolean);

        resolve(normalizedTabs);
      });
    }),
    fetchFromBackground('GET_ALL_TABS', {}, 1600, []),
  ]);

  lastBrowserTabCount = browserTabs.length;
  lastBackgroundTabCount = (backgroundTabs || []).length;

  const activityById = new Map((backgroundTabs || []).map((tab) => [tab.id, tab.activity]));
  return browserTabs.map((tab) => ({
    ...tab,
    activity: activityById.get(tab.id) || tab.activity || null,
  }));
}

function isInternalBrowserUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return INTERNAL_TAB_PREFIXES.some((prefix) => url.startsWith(prefix));
}

function getVisibleTabs(tabs) {
  if (includeInternalTabs) return tabs;
  return tabs.filter((tab) => !isInternalBrowserUrl(tab.url));
}

async function fetchFromBackground(type, payload = {}, timeoutMs = 1500, fallback = null) {
  return new Promise((resolve) => {
    let settled = false;
    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(fallback);
    }, timeoutMs);

    chrome.runtime.sendMessage({ type, ...payload }, (response) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);

      if (chrome.runtime.lastError) {
        resolve(fallback);
        return;
      }

      resolve(response ?? fallback);
    });
  });
}

async function requestBackgroundRescan() {
  const result = await fetchFromBackground('REFRESH_TABS', {}, 2000, { success: false });
  lastRescanResult = result?.success ? 'ok' : 'failed';
  return result;
}

// Switch to tab
async function switchToTab(tabId, windowId) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'SWITCH_TO_TAB', tabId, windowId }, resolve);
  });
}

// Close tab
async function closeTab(tabId) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'CLOSE_TAB', tabId }, resolve);
  });
}

// Open web login
async function openWebLogin() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'OPEN_WEB_LOGIN' }, resolve);
  });
}

// Get recommendations
async function getRecommendations() {
  const data = await fetchFromBackground('GET_RECOMMENDATIONS', { session: currentSession }, 2500, { recommendations: [], archived: [] });
  return data || { recommendations: [], archived: [] };
}

// Get tab stats
async function getTabStats() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_TAB_STATS' }, resolve);
  });
}

// Get refresh interval setting
async function getStoredRefreshInterval() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['refreshIntervalMs'], (result) => {
      resolve(result.refreshIntervalMs);
    });
  });
}

// Save refresh interval setting
async function setStoredRefreshInterval(intervalMs) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ refreshIntervalMs: intervalMs }, resolve);
  });
}

async function getStoredInternalTabsVisibility() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['includeInternalTabs'], (result) => {
      resolve(Boolean(result.includeInternalTabs));
    });
  });
}

async function setStoredInternalTabsVisibility(value) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ includeInternalTabs: Boolean(value) }, resolve);
  });
}

function normalizeRefreshInterval(value) {
  const parsed = Number(value);
  return REFRESH_INTERVAL_OPTIONS.includes(parsed) ? parsed : 3000;
}

async function initializeRefreshSettings() {
  const storedInterval = await getStoredRefreshInterval();
  autoRefreshIntervalMs = normalizeRefreshInterval(storedInterval);

  if (refreshIntervalSelect) {
    refreshIntervalSelect.value = String(autoRefreshIntervalMs);
  }
}

async function initializeInternalTabsSetting() {
  includeInternalTabs = await getStoredInternalTabsVisibility();
  if (internalTabsToggle) {
    internalTabsToggle.checked = includeInternalTabs;
  }
}

function renderLastUpdated() {
  if (!lastUpdatedEl) return;
  if (!lastRefreshAt) {
    lastUpdatedEl.textContent = 'Updated —';
    return;
  }

  const secondsAgo = Math.max(0, Math.floor((Date.now() - lastRefreshAt) / 1000));
  lastUpdatedEl.textContent = `Updated ${secondsAgo}s ago`;
}

function startLastUpdatedTicker() {
  if (lastUpdatedTicker) clearInterval(lastUpdatedTicker);
  renderLastUpdated();
  lastUpdatedTicker = setInterval(renderLastUpdated, 1000);
}

function stopLastUpdatedTicker() {
  if (!lastUpdatedTicker) return;
  clearInterval(lastUpdatedTicker);
  lastUpdatedTicker = null;
}

function markLastUpdated() {
  lastRefreshAt = Date.now();
  renderLastUpdated();
  renderDebugPanel();
}

async function refreshVisibleTabs({ forceRescan = false } = {}) {
  if (!currentSession) return;
  if (activeRefreshPromise) return activeRefreshPromise;

  activeRefreshPromise = (async () => {
    if (forceRescan) {
      await requestBackgroundRescan();
    }

    allTabs = await getAllTabs();
    renderRecentTabs();
    renderStats(computeStatsFromTabs(allTabs));
    markLastUpdated();
  })();

  try {
    await activeRefreshPromise;
  } finally {
    activeRefreshPromise = null;
  }
}

function stopAutoRefresh() {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
}

function startAutoRefresh({ immediate = true } = {}) {
  stopAutoRefresh();
  if (!currentSession) return;

  if (immediate) {
    refreshVisibleTabs();
  }

  autoRefreshTimer = setInterval(() => {
    refreshVisibleTabs();
  }, autoRefreshIntervalMs);
}

// Load dashboard data
async function loadDashboard({ forceRescan = false } = {}) {
  showView('dashboard');

  if (forceRescan) {
    await requestBackgroundRescan();
  }

  const [tabs, data] = await Promise.all([
    getAllTabs(),
    getRecommendations(),
  ]);

  allTabs = tabs;
  renderRecentTabs();
  renderStats(computeStatsFromTabs(allTabs));
  markLastUpdated();

  renderRecommendations(data?.recommendations || []);
  renderArchivedTabs(data?.archived || []);
}

// Compute stats from the tabs array directly (no background round-trip)
function computeStatsFromTabs(tabs) {
  const totalTabs = tabs.length;
  const visibleTabs = getVisibleTabs(tabs);
  const totalTime = visibleTabs.reduce((acc, tab) => acc + (tab.activity?.totalTime || 0), 0);

  const domains = {};
  visibleTabs.forEach((tab) => {
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
    visibleTabs: visibleTabs.length,
    hiddenInternalTabs: Math.max(0, totalTabs - visibleTabs.length),
    totalTime,
    topDomains,
  };
}

// Render stats
function renderStats(stats) {
  if (!statsContainer) return;
  
  const totalTimeMinutes = Math.round((stats.totalTime || 0) / 60000);
  const hours = Math.floor(totalTimeMinutes / 60);
  const minutes = totalTimeMinutes % 60;
  const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  const openTabsLabel = includeInternalTabs
    ? 'Open Tabs (all)'
    : `Open Tabs (${stats.visibleTabs || 0} shown / ${stats.totalTabs || 0} total)`;
  
  statsContainer.innerHTML = `
    <div class="stat-item">
      <span class="stat-value">${includeInternalTabs ? (stats.totalTabs || 0) : (stats.visibleTabs || 0)}</span>
      <span class="stat-label">${openTabsLabel}</span>
    </div>
    <div class="stat-item">
      <span class="stat-value">${timeStr}</span>
      <span class="stat-label">Tracked Today</span>
    </div>
  `;
}

// Render debug panel
function renderDebugPanel() {
  if (!debugPanel) return;
  const visibleTabs = getVisibleTabs(allTabs);
  const hiddenCount = Math.max(0, allTabs.length - visibleTabs.length);
  const rescanClass = lastRescanResult === 'ok' ? 'ok' : lastRescanResult === 'failed' ? 'err' : '';
  const rescanText = lastRescanResult || '—';
  const refreshAgo = lastRefreshAt ? `${Math.floor((Date.now() - lastRefreshAt) / 1000)}s ago` : '—';

  const debugData = {
    browserTabsQueried: lastBrowserTabCount,
    backgroundTabsReturned: lastBackgroundTabCount,
    visibleTabs: visibleTabs.length,
    hiddenInternalTabs: hiddenCount,
    totalAllTabs: allTabs.length,
    lastRescan: rescanText,
    lastRefresh: refreshAgo,
    refreshInterval: `${autoRefreshIntervalMs}ms`,
    includeInternal: includeInternalTabs,
    session: currentSession ? 'active' : 'none',
  };

  debugPanel.innerHTML = `
    <div class="debug-row"><span class="debug-key">Browser tabs queried</span><span class="debug-value">${debugData.browserTabsQueried}</span></div>
    <div class="debug-row"><span class="debug-key">Background tabs returned</span><span class="debug-value">${debugData.backgroundTabsReturned}</span></div>
    <div class="debug-row"><span class="debug-key">Visible tabs</span><span class="debug-value">${debugData.visibleTabs}</span></div>
    <div class="debug-row"><span class="debug-key">Hidden internal tabs</span><span class="debug-value">${debugData.hiddenInternalTabs}</span></div>
    <div class="debug-row"><span class="debug-key">Total (allTabs[])</span><span class="debug-value">${debugData.totalAllTabs}</span></div>
    <div class="debug-row"><span class="debug-key">Last rescan</span><span class="debug-value ${rescanClass}">${debugData.lastRescan}</span></div>
    <div class="debug-row"><span class="debug-key">Last refresh</span><span class="debug-value">${debugData.lastRefresh}</span></div>
    <div class="debug-row"><span class="debug-key">Refresh interval</span><span class="debug-value">${debugData.refreshInterval}</span></div>
    <div class="debug-row"><span class="debug-key">Include internal</span><span class="debug-value">${debugData.includeInternal ? 'yes' : 'no'}</span></div>
    <div class="debug-row"><span class="debug-key">Session</span><span class="debug-value ${currentSession ? 'ok' : 'warn'}">${debugData.session}</span></div>
    <button id="copy-debug-btn" class="copy-debug-btn">📋 Copy debug info</button>
  `;

  document.getElementById('copy-debug-btn').addEventListener('click', () => {
    const text = Object.entries(debugData).map(([k, v]) => `${k}: ${v}`).join('\n');
    navigator.clipboard.writeText(`SmartTab AI Debug\n${new Date().toISOString()}\n\n${text}`).then(() => {
      const btn = document.getElementById('copy-debug-btn');
      btn.textContent = '✅ Copied!';
      setTimeout(() => { btn.textContent = '📋 Copy debug info'; }, 1500);
    });
  });
}

// Render recent tabs
function renderRecentTabs() {
  const visibleTabs = getVisibleTabs(allTabs);
  let filteredTabs = visibleTabs;
  
  // Apply search filter
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filteredTabs = visibleTabs.filter(tab => 
      (tab.title && tab.title.toLowerCase().includes(query)) ||
      (tab.url && tab.url.toLowerCase().includes(query))
    );
  }
  
  if (filteredTabs.length === 0) {
    const emptyMessage = searchQuery
      ? 'No matching tabs'
      : includeInternalTabs
        ? 'No open tabs'
        : 'No visible tabs (enable internal tabs toggle to include chrome:// and about pages)';
    recentTabsEl.innerHTML = `<p class="empty-state">${emptyMessage}</p>`;
    return;
  }
  
  // Group by domain
  const groupedTabs = {};
  filteredTabs.forEach(tab => {
    const domain = getDomain(tab.url);
    if (!groupedTabs[domain]) {
      groupedTabs[domain] = [];
    }
    groupedTabs[domain].push(tab);
  });
  
  // Sort groups by most recent activity (show all groups)
  const sortedGroups = Object.entries(groupedTabs)
    .map(([domain, tabs]) => ({
      domain,
      tabs: tabs.sort((a, b) => {
        const aTime = a.activity?.lastVisit || 0;
        const bTime = b.activity?.lastVisit || 0;
        return bTime - aTime;
      }),
      latestVisit: Math.max(...tabs.map(t => t.activity?.lastVisit || 0))
    }))
    .sort((a, b) => b.latestVisit - a.latestVisit);
  
  let html = '';
  sortedGroups.forEach(group => {
    html += `
      <div class="tab-group">
        <div class="tab-group-header">
          <span class="tab-group-domain">${group.domain}</span>
          <span class="tab-group-count">${group.tabs.length}</span>
        </div>
        ${group.tabs.map(tab => createTabElement(tab)).join('')}
      </div>
    `;
  });
  
  recentTabsEl.innerHTML = html;
  
  // Add click handlers
  recentTabsEl.querySelectorAll('.tab-item').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('.tab-close')) return;
      const tabId = parseInt(el.dataset.tabId);
      const windowId = parseInt(el.dataset.windowId);
      switchToTab(tabId, windowId);
    });
  });
  
  // Add close handlers
  recentTabsEl.querySelectorAll('.tab-close').forEach(el => {
    el.addEventListener('click', async (e) => {
      e.stopPropagation();
      const tabId = parseInt(el.dataset.tabId);
      await closeTab(tabId);
      await refreshVisibleTabs();
    });
  });
}

// Render recommendations
function renderRecommendations(recommendations) {
  if (recommendations.length === 0) {
    recommendationsEl.innerHTML = '<p class="empty-state">No recommendations yet. Keep browsing!</p>';
    return;
  }
  
  recommendationsEl.innerHTML = recommendations.slice(0, 6).map(rec => 
    createRecommendationElement(rec)
  ).join('');
  
  // Add click handlers
  recommendationsEl.querySelectorAll('.tab-item').forEach(el => {
    el.addEventListener('click', () => {
      const url = el.dataset.url;
      chrome.tabs.create({ url });
    });
  });
}

// Render archived tabs
function renderArchivedTabs(archived) {
  if (archived.length === 0) {
    archivedTabsEl.innerHTML = '<p class="empty-state">No archived tabs</p>';
    return;
  }
  
  archivedTabsEl.innerHTML = archived.map(tab => 
    createArchivedTabElement(tab)
  ).join('');
  
  // Add click handlers
  archivedTabsEl.querySelectorAll('.tab-item').forEach(el => {
    el.addEventListener('click', () => {
      const url = el.dataset.url;
      chrome.tabs.create({ url });
    });
  });
}

// Create tab element
function createTabElement(tab) {
  const domain = getDomain(tab.url);
  const favicon = tab.favIconUrl 
    ? `<img src="${tab.favIconUrl}" class="tab-favicon" alt="" onerror="this.outerHTML='<div class=\\'tab-favicon placeholder\\'>${domain[0].toUpperCase()}</div>'">`
    : `<div class="tab-favicon placeholder">${domain[0].toUpperCase()}</div>`;
  
  // Format time spent
  const timeSpent = tab.activity?.totalTime || 0;
  const timeStr = formatTime(timeSpent);
  
  return `
    <div class="tab-item" data-tab-id="${tab.id}" data-window-id="${tab.windowId}">
      ${favicon}
      <div class="tab-info">
        <div class="tab-title">${escapeHtml(tab.title || 'Untitled')}</div>
        <div class="tab-meta">
          ${timeStr ? `<span class="tab-time">${timeStr}</span>` : ''}
        </div>
      </div>
      <button class="tab-close" data-tab-id="${tab.id}" title="Close tab">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  `;
}

// Create recommendation element
function createRecommendationElement(rec) {
  const domain = getDomain(rec.url);
  const favicon = rec.favicon_url 
    ? `<img src="${rec.favicon_url}" class="tab-favicon" alt="" onerror="this.outerHTML='<div class=\\'tab-favicon placeholder\\'>${domain[0].toUpperCase()}</div>'">`
    : `<div class="tab-favicon placeholder">${domain[0].toUpperCase()}</div>`;
  
  const score = Math.round((rec.score || 0) * 100);
  
  return `
    <div class="tab-item recommendation-badge" data-url="${escapeHtml(rec.url)}">
      ${favicon}
      <div class="tab-info">
        <div class="tab-title">${escapeHtml(rec.title || 'Untitled')}</div>
        <div class="tab-url">${domain}</div>
      </div>
      <div class="tab-score">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
        ${score}%
      </div>
    </div>
  `;
}

// Create archived tab element
function createArchivedTabElement(tab) {
  const domain = getDomain(tab.url);
  
  return `
    <div class="tab-item" data-url="${escapeHtml(tab.url)}">
      <div class="tab-favicon placeholder">${domain[0].toUpperCase()}</div>
      <div class="tab-info">
        <div class="tab-title">${escapeHtml(tab.title || 'Untitled')}</div>
        <div class="tab-url">${domain}</div>
      </div>
    </div>
  `;
}

// Format time in milliseconds to human readable
function formatTime(ms) {
  if (!ms || ms < 60000) return '';
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

// Get domain from URL
function getDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url || 'Unknown';
  }
}


// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Listen for session from web app
function listenForWebAppSession() {
  // Listen via BroadcastChannel
  try {
    const channel = new BroadcastChannel("smarttab-auth");
    channel.onmessage = async (event) => {
      if (event.data.type === "AUTH_SESSION" && event.data.session) {
        await setSession(event.data.session);
        currentSession = event.data.session;
        await loadDashboard({ forceRescan: true });
        startAutoRefresh({ immediate: false });
        startLastUpdatedTicker();
      }
    };
  } catch (e) {
    console.log("BroadcastChannel not supported, using storage listener");
  }
  
  // Also listen for storage changes
  chrome.storage.onChanged.addListener(async (changes, namespace) => {
    if (namespace === 'local' && changes.session) {
      if (changes.session.newValue) {
        currentSession = changes.session.newValue;
        await loadDashboard({ forceRescan: true });
        startAutoRefresh({ immediate: false });
        startLastUpdatedTicker();
      } else {
        currentSession = null;
        stopAutoRefresh();
        stopLastUpdatedTicker();
        lastRefreshAt = null;
        renderLastUpdated();
        showView('login');
      }
    }

    if (namespace === 'sync' && changes.refreshIntervalMs) {
      autoRefreshIntervalMs = normalizeRefreshInterval(changes.refreshIntervalMs.newValue);
      if (refreshIntervalSelect) {
        refreshIntervalSelect.value = String(autoRefreshIntervalMs);
      }
      startAutoRefresh({ immediate: true });
    }

    if (namespace === 'sync' && changes.includeInternalTabs !== undefined) {
      includeInternalTabs = Boolean(changes.includeInternalTabs.newValue);
      if (internalTabsToggle) {
        internalTabsToggle.checked = includeInternalTabs;
      }
      renderRecentTabs();
      renderStats(computeStatsFromTabs(allTabs));
    }
  });
}

// Event Listeners
loginBtn.addEventListener('click', () => {
  openWebLogin();
});

logoutBtn.addEventListener('click', async () => {
  await clearSession();
  currentSession = null;
  stopAutoRefresh();
  stopLastUpdatedTicker();
  lastRefreshAt = null;
  renderLastUpdated();
  showView('login');
});

archivedToggle.addEventListener('click', () => {
  archivedToggle.classList.toggle('expanded');
  archivedTabsEl.classList.toggle('collapsed');
});

if (debugToggle) {
  debugToggle.addEventListener('click', () => {
    debugToggle.classList.toggle('expanded');
    debugPanel.classList.toggle('collapsed');
    if (!debugPanel.classList.contains('collapsed')) {
      renderDebugPanel();
    }
  });
}

// Search functionality
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderRecentTabs();
  });
}

// Auto-refresh interval setting
if (refreshIntervalSelect) {
  refreshIntervalSelect.addEventListener('change', async (e) => {
    autoRefreshIntervalMs = normalizeRefreshInterval(e.target.value);
    await setStoredRefreshInterval(autoRefreshIntervalMs);
    startAutoRefresh({ immediate: true });
  });
}

if (internalTabsToggle) {
  internalTabsToggle.addEventListener('change', async (e) => {
    includeInternalTabs = Boolean(e.target.checked);
    await setStoredInternalTabsVisibility(includeInternalTabs);
    renderRecentTabs();
    renderStats(computeStatsFromTabs(allTabs));
  });
}

// Refresh button - force re-scan then reload dashboard
if (refreshBtn) {
  refreshBtn.addEventListener('click', async () => {
    refreshBtn.classList.add('spinning');

    await loadDashboard({ forceRescan: true });
    startAutoRefresh({ immediate: false });
    startLastUpdatedTicker();
    setTimeout(() => refreshBtn.classList.remove('spinning'), 500);
  });
}

function scheduleLiveRefresh(delay = 250) {
  if (liveRefreshTimeout) clearTimeout(liveRefreshTimeout);

  liveRefreshTimeout = setTimeout(async () => {
    await refreshVisibleTabs();
  }, delay);
}

function setupRealtimeTabListeners() {
  if (tabListenersRegistered) return;
  tabListenersRegistered = true;

  chrome.tabs.onCreated.addListener(() => scheduleLiveRefresh());
  chrome.tabs.onRemoved.addListener(() => scheduleLiveRefresh());
  chrome.tabs.onActivated.addListener(() => scheduleLiveRefresh());
  chrome.tabs.onReplaced.addListener(() => scheduleLiveRefresh());
  chrome.tabs.onUpdated.addListener((_, changeInfo) => {
    if (changeInfo.status === 'complete' || changeInfo.url || changeInfo.title || changeInfo.discarded !== undefined) {
      scheduleLiveRefresh();
    }
  });
}

// Initialize on load
init();