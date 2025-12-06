// SmartTab AI - Sidepanel Script

const WEB_APP_URL = 'https://24b95c2b-2f73-44d7-9dbd-bc0e1eca3d36.lovableproject.com';

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

// State
let currentSession = null;
let allTabs = [];

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
}

// Render recent tabs
function renderRecentTabs() {
  if (allTabs.length === 0) {
    recentTabsEl.innerHTML = '<p class="empty-state">No open tabs</p>';
    return;
  }
  
  // Sort by last accessed (most recent first)
  const sortedTabs = [...allTabs].sort((a, b) => {
    const aTime = a.activity?.lastVisit || 0;
    const bTime = b.activity?.lastVisit || 0;
    return bTime - aTime;
  }).slice(0, 10);
  
  recentTabsEl.innerHTML = sortedTabs.map(tab => createTabElement(tab)).join('');
  
  // Add click handlers
  recentTabsEl.querySelectorAll('.tab-item').forEach(el => {
    el.addEventListener('click', () => {
      const tabId = parseInt(el.dataset.tabId);
      const windowId = parseInt(el.dataset.windowId);
      switchToTab(tabId, windowId);
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
  
  return `
    <div class="tab-item" data-tab-id="${tab.id}" data-window-id="${tab.windowId}">
      ${favicon}
      <div class="tab-info">
        <div class="tab-title">${escapeHtml(tab.title || 'Untitled')}</div>
        <div class="tab-url">${domain}</div>
      </div>
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

// Listen for session from web app (via storage events)
function listenForWebAppSession() {
  // Check for session token in URL (from web app redirect)
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

// Refresh data periodically
setInterval(async () => {
  if (currentSession) {
    allTabs = await getAllTabs();
    renderRecentTabs();
  }
}, 30000);

// Initialize on load
init();
