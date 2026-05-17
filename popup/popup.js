// popup/popup.js

const DEFAULT_SETTINGS = {
  theme:  { enabled: true },
  sounds: { enabled: true, muted: false },
  ui:     { statsOverlay: true },
  auto:   { autoRematch: false }
};

let settings = {};

function getNestedVal(obj, path) {
  return path.split('.').reduce((o, k) => o?.[k], obj);
}

function setNestedVal(obj, path, val) {
  const keys = path.split('.');
  const last = keys.pop();
  const target = keys.reduce((o, k) => { o[k] = o[k] || {}; return o[k]; }, obj);
  target[last] = val;
}

function renderToggles() {
  document.querySelectorAll('.toggle-switch').forEach(sw => {
    const key = sw.dataset.key;
    const val = getNestedVal(settings, key);
    sw.classList.toggle('active', !!val);
  });
}

async function loadSettings() {
  return new Promise(resolve => {
    chrome.storage.sync.get('be_settings', data => {
      settings = Object.assign({}, DEFAULT_SETTINGS, data.be_settings || {});
      resolve();
    });
  });
}

function saveSettings() {
  chrome.storage.sync.set({ be_settings: settings });
}

// ── Init ──────────────────────────────────────────────────────────────────
loadSettings().then(() => {
  renderToggles();

  // Check if on barricade.gg
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const url = tabs[0]?.url || '';
    const statusEl = document.getElementById('active-site-status');
    if (url.includes('barricade.gg')) {
      statusEl.textContent = '● Active on barricade.gg';
      statusEl.classList.add('active');
    } else {
      statusEl.textContent = 'Navigate to barricade.gg';
    }
  });
});

// Toggle clicks
document.querySelectorAll('.toggle-switch').forEach(sw => {
  sw.closest('.toggle-row').addEventListener('click', () => {
    const key = sw.dataset.key;
    const cur = getNestedVal(settings, key);
    setNestedVal(settings, key, !cur);
    saveSettings();
    renderToggles();
  });
});

// Open options
document.getElementById('btn-open-options').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html') });
});
