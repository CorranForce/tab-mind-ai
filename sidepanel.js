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

// State
let currentSession = null;
let allTabs = [];
let searchQuery = '';

// Initialize
async function init() {
  showView('loading');
  
  // Check for session
  currentSession = await getSession();
  
  if (currentSession) {
    await loadDashboard();
  } else {
    showView('login');
  }
  
  // Listen for session updates from web app
  listenForWebAppSession();
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

// Get all tabs
async function getAllTabs() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_ALL_TABS' }, resolve);
  });
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
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_RECOMMENDATIONS', session: currentSession }, resolve);
  });
}

// Get tab stats
async function getTabStats() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_TAB_STATS' }, resolve);
  });
}

// Load dashboard data
async function loadDashboard() {
  showView('dashboard');
  
  // Load tabs
  allTabs = await getAllTabs();
  renderRecentTabs();
  
  // Load recommendations
  const data = await getRecommendations();
  renderRecommendations(data.recommendations || []);
  renderArchivedTabs(data.archived || []);
  
  // Load stats
  const stats = await getTabStats();
  renderStats(stats);
}

// Render stats
function renderStats(stats) {
  if (!statsContainer) return;
  
  const totalTimeMinutes = Math.round((stats.totalTime || 0) / 60000);
  const hours = Math.floor(totalTimeMinutes / 60);
  const minutes = totalTimeMinutes % 60;
  const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  
  statsContainer.innerHTML = `
    <div class="stat-item">
      <span class="stat-value">${stats.totalTabs || 0}</span>
      <span class="stat-label">Open Tabs</span>
    </div>
    <div class="stat-item">
      <span class="stat-value">${timeStr}</span>
      <span class="stat-label">Tracked Today</span>
    </div>
  `;
}

// Render recent tabs
function renderRecentTabs() {
  let filteredTabs = allTabs;
  
  // Apply search filter
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filteredTabs = allTabs.filter(tab => 
      (tab.title && tab.title.toLowerCase().includes(query)) ||
      (tab.url && tab.url.toLowerCase().includes(query))
    );
  }
  
  if (filteredTabs.length === 0) {
    recentTabsEl.innerHTML = `<p class="empty-state">${searchQuery ? 'No matching tabs' : 'No open tabs'}</p>`;
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
  
  // Sort groups by most recent activity
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
    .sort((a, b) => b.latestVisit - a.latestVisit)
    .slice(0, 5);
  
  let html = '';
  sortedGroups.forEach(group => {
    html += `
      <div class="tab-group">
        <div class="tab-group-header">
          <span class="tab-group-domain">${group.domain}</span>
          <span class="tab-group-count">${group.tabs.length}</span>
        </div>
        ${group.tabs.slice(0, 3).map(tab => createTabElement(tab)).join('')}
        ${group.tabs.length > 3 ? `<div class="tab-group-more">+${group.tabs.length - 3} more</div>` : ''}
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
      // Refresh tabs
      allTabs = await getAllTabs();
      renderRecentTabs();
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
    return url;
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
        loadDashboard();
      }
    };
  } catch (e) {
    console.log("BroadcastChannel not supported, using storage listener");
  }
  
  // Also listen for storage changes
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.session) {
      if (changes.session.newValue) {
        currentSession = changes.session.newValue;
        loadDashboard();
      } else {
        currentSession = null;
        showView('login');
      }
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
  showView('login');
});

archivedToggle.addEventListener('click', () => {
  archivedToggle.classList.toggle('expanded');
  archivedTabsEl.classList.toggle('collapsed');
});

// Search functionality
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderRecentTabs();
  });
}

// Refresh button
if (refreshBtn) {
  refreshBtn.addEventListener('click', async () => {
    refreshBtn.classList.add('spinning');
    await loadDashboard();
    setTimeout(() => refreshBtn.classList.remove('spinning'), 500);
  });
}

// Refresh data periodically
setInterval(async () => {
  if (currentSession) {
    allTabs = await getAllTabs();
    renderRecentTabs();
  }
}, 30000);

// Initialize on load
init();