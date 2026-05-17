// options/options.js

const DEFAULTS = {
  theme: {
    enabled: true, preset: 'midnight',
    colors: {
      bgPrimary:'#0a0a12',bgSecondary:'#111122',bgCard:'#161628',
      accent:'#7c5cbf',accentHover:'#9b78e0',text:'#ddd6f0',
      textMuted:'#7a7a99',border:'#252540',playerOne:'#7c5cbf',
      playerTwo:'#bf5c7c',barricade:'#3a3a5c',boardLight:'#1a1a30',boardDark:'#131325'
    }
  },
  sounds:   { enabled: true, volume: 1.0, muted: false, mappings: {} },
  ui:       { statsOverlay: true, moveHistory: true, boardCoordinates: true,
              turnIndicator: true, overlayPosition: 'top-right' },
  keybinds: { toggleTheme:'Alt+T', toggleStats:'Alt+S', quickRematch:'Alt+R',
              toggleMute:'Alt+M', showHistory:'Alt+H' },
  stats:    { trackEnabled: true },
  auto:     { autoRematch: false, autoRematchDelay: 3000,
              desktopNotifications: true, notifyGameEnd: true,
              notifyOpponentMove: false, notifyTurnStart: false }
};

function deepMerge(target, source) {
  const out = Object.assign({}, target);
  for (const key of Object.keys(source || {})) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      out[key] = deepMerge(target[key] || {}, source[key]);
    } else { out[key] = source[key]; }
  }
  return out;
}

let settings = deepMerge({}, DEFAULTS);

// ── Load & Save ───────────────────────────────────────────────────────────
function load() {
  chrome.storage.sync.get('be_settings', data => {
    settings = deepMerge(DEFAULTS, data.be_settings || {});
    populateAll();
  });
}

function save() {
  readAll();
  chrome.storage.sync.set({ be_settings: settings }, () => {
    const el = document.getElementById('save-status');
    el.textContent = '✓ Saved';
    el.classList.add('visible');
    setTimeout(() => el.classList.remove('visible'), 2000);
  });
}

document.getElementById('btn-save').addEventListener('click', save);

// ── Tab navigation ────────────────────────────────────────────────────────
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    item.classList.add('active');
    document.getElementById('tab-' + item.dataset.tab).classList.add('active');
    if (item.dataset.tab === 'stats') loadStats();
  });
});

// ── Theme ─────────────────────────────────────────────────────────────────
function populateTheme() {
  document.getElementById('theme-enabled').checked = !!settings.theme.enabled;
  const preset = settings.theme.preset || 'midnight';
  const radio = document.querySelector(`input[name="preset"][value="${preset}"]`);
  if (radio) radio.checked = true;
  document.getElementById('custom-colors').classList.toggle('hidden', preset !== 'custom');
  // Set color inputs
  document.querySelectorAll('[data-color]').forEach(inp => {
    const key = inp.dataset.color;
    inp.value = settings.theme.colors[key] || '#000000';
  });
}

document.querySelectorAll('input[name="preset"]').forEach(r => {
  r.addEventListener('change', () => {
    document.getElementById('custom-colors').classList.toggle('hidden', r.value !== 'custom');
  });
});

// ── Sounds ────────────────────────────────────────────────────────────────
function populateSounds() {
  document.getElementById('sounds-enabled').checked = !!settings.sounds.enabled;
  document.getElementById('sounds-muted').checked   = !!settings.sounds.muted;
  const vol = Math.round((settings.sounds.volume || 1) * 100);
  document.getElementById('sounds-volume').value = vol;
  document.getElementById('sounds-volume-val').textContent = vol + '%';
  renderMappings();
}

document.getElementById('sounds-volume').addEventListener('input', e => {
  document.getElementById('sounds-volume-val').textContent = e.target.value + '%';
});

// Sound mappings
function renderMappings() {
  const list = document.getElementById('sound-mappings-list');
  list.innerHTML = '';
  const mappings = settings.sounds.mappings || {};
  for (const [pattern, dataUrl] of Object.entries(mappings)) {
    addMappingRow(pattern, dataUrl);
  }
}

function addMappingRow(pattern = '', dataUrl = '') {
  const list = document.getElementById('sound-mappings-list');
  const row = document.createElement('div');
  row.className = 'mapping-row';

  const patternInput = document.createElement('input');
  patternInput.type = 'text';
  patternInput.placeholder = 'URL pattern (e.g. move.mp3)';
  patternInput.value = pattern;
  patternInput.className = 'mapping-pattern';

  const fileLabel = document.createElement('label');
  fileLabel.className = 'mapping-file-label';
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'audio/*';
  fileLabel.appendChild(fileInput);
  fileLabel.appendChild(document.createTextNode(dataUrl ? '✓ File loaded' : '📁 Upload audio'));

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      fileInput._dataUrl = e.target.result;
      fileLabel.lastChild.textContent = '✓ ' + file.name;
    };
    reader.readAsDataURL(file);
  });

  const removeBtn = document.createElement('button');
  removeBtn.className = 'btn-remove-mapping';
  removeBtn.textContent = '✕';
  removeBtn.addEventListener('click', () => row.remove());

  row.appendChild(patternInput);
  row.appendChild(fileLabel);
  row.appendChild(removeBtn);
  list.appendChild(row);
}

document.getElementById('btn-add-mapping').addEventListener('click', () => addMappingRow());

// ── UI ────────────────────────────────────────────────────────────────────
function populateUI() {
  const ui = settings.ui || {};
  ['statsOverlay','moveHistory','boardCoordinates','turnIndicator'].forEach(key => {
    const el = document.getElementById('ui-' + key);
    if (el) el.checked = !!ui[key];
  });
  const pos = ui.overlayPosition || 'top-right';
  const radio = document.querySelector(`input[name="overlay-pos"][value="${pos}"]`);
  if (radio) radio.checked = true;
}

// ── Keybinds ──────────────────────────────────────────────────────────────
function populateKeybinds() {
  const kb = settings.keybinds || {};
  ['toggleTheme','toggleStats','quickRematch','toggleMute','showHistory'].forEach(key => {
    const el = document.getElementById('kb-' + key);
    if (el) el.value = kb[key] || '';
  });
}

document.querySelectorAll('.keybind-input').forEach(input => {
  input.addEventListener('focus', () => {
    input.value = '...';
    input.classList.add('recording');
  });

  input.addEventListener('keydown', e => {
    e.preventDefault();
    input.classList.remove('recording');

    if (e.key === 'Escape') {
      input.value = '';
      input.blur();
      return;
    }

    const parts = [];
    if (e.ctrlKey)  parts.push('Ctrl');
    if (e.altKey)   parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    if (e.metaKey)  parts.push('Meta');
    const key = e.key === ' ' ? 'Space' : e.key;
    if (!['Control','Alt','Shift','Meta'].includes(key)) parts.push(key);
    if (parts.length) input.value = parts.join('+');
    input.blur();
  });

  input.addEventListener('blur', () => {
    input.classList.remove('recording');
  });
});

// ── Stats display ─────────────────────────────────────────────────────────
function populateStatsSettings() {
  const el = document.getElementById('stats-trackEnabled');
  if (el) el.checked = !!settings.stats.trackEnabled;
}

function loadStats() {
  chrome.runtime.sendMessage({ type: 'GET_STATS' }, res => {
    const s = res?.stats;
    if (!s) return;
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    const wr = s.gamesPlayed > 0 ? Math.round(s.wins / s.gamesPlayed * 100) + '%' : '—';
    const avg = s.gamesPlayed > 0 ? Math.round(s.totalMoves / s.gamesPlayed) : '—';
    const streak = s.currentStreak === 0 ? '—' :
      s.currentStreak > 0 ? `🔥${s.currentStreak}W` : `❄️${Math.abs(s.currentStreak)}L`;

    set('stat-games',    s.gamesPlayed || 0);
    set('stat-wins',     s.wins || 0);
    set('stat-losses',   s.losses || 0);
    set('stat-winrate',  wr);
    set('stat-streak',   streak);
    set('stat-avgmoves', avg);

    // History
    const histList = document.getElementById('game-history-list');
    histList.innerHTML = '';
    (s.history || []).forEach(g => {
      const entry = document.createElement('div');
      entry.className = 'history-entry';
      const resultSpan = document.createElement('span');
      resultSpan.className = 'history-result ' + g.result;
      resultSpan.textContent = g.result;
      const movesSpan = document.createElement('span');
      movesSpan.className = 'history-moves';
      movesSpan.textContent = `${g.moves} moves`;
      const dateSpan = document.createElement('span');
      dateSpan.className = 'history-date';
      dateSpan.textContent = new Date(g.ts).toLocaleDateString();
      entry.append(resultSpan, movesSpan, dateSpan);
      histList.appendChild(entry);
    });
    if (!s.history?.length) {
      histList.innerHTML = '<div style="color:var(--muted);font-size:12px;padding:8px 0">No games recorded yet.</div>';
    }
  });
}

document.getElementById('btn-reset-stats').addEventListener('click', () => {
  if (!confirm('Reset all stats? This cannot be undone.')) return;
  chrome.runtime.sendMessage({ type: 'RESET_STATS' }, () => loadStats());
});

// ── Auto features ─────────────────────────────────────────────────────────
function populateAuto() {
  const auto = settings.auto || {};
  ['autoRematch','desktopNotifications','notifyGameEnd','notifyOpponentMove','notifyTurnStart'].forEach(key => {
    const el = document.getElementById('auto-' + key);
    if (el) el.checked = !!auto[key];
  });
  const delay = auto.autoRematchDelay || 3000;
  const delayEl = document.getElementById('auto-rematchDelay');
  const delayVal = document.getElementById('auto-rematchDelay-val');
  if (delayEl) delayEl.value = delay;
  if (delayVal) delayVal.textContent = (delay / 1000).toFixed(1) + 's';
}

document.getElementById('auto-rematchDelay').addEventListener('input', e => {
  document.getElementById('auto-rematchDelay-val').textContent = (e.target.value / 1000).toFixed(1) + 's';
});

// ── Read all settings back from DOM ──────────────────────────────────────
function readAll() {
  // Theme
  settings.theme.enabled = document.getElementById('theme-enabled').checked;
  settings.theme.preset  = document.querySelector('input[name="preset"]:checked')?.value || 'midnight';
  document.querySelectorAll('[data-color]').forEach(inp => {
    settings.theme.colors[inp.dataset.color] = inp.value;
  });

  // Sounds
  settings.sounds.enabled = document.getElementById('sounds-enabled').checked;
  settings.sounds.muted   = document.getElementById('sounds-muted').checked;
  settings.sounds.volume  = parseInt(document.getElementById('sounds-volume').value) / 100;
  settings.sounds.mappings = {};
  document.querySelectorAll('.mapping-row').forEach(row => {
    const pattern = row.querySelector('.mapping-pattern')?.value?.trim();
    const fileInput = row.querySelector('input[type="file"]');
    const dataUrl   = fileInput?._dataUrl || null;
    if (pattern && dataUrl) settings.sounds.mappings[pattern] = dataUrl;
  });

  // UI
  ['statsOverlay','moveHistory','boardCoordinates','turnIndicator'].forEach(key => {
    const el = document.getElementById('ui-' + key);
    if (el) settings.ui[key] = el.checked;
  });
  settings.ui.overlayPosition = document.querySelector('input[name="overlay-pos"]:checked')?.value || 'top-right';

  // Keybinds
  ['toggleTheme','toggleStats','quickRematch','toggleMute','showHistory'].forEach(key => {
    const el = document.getElementById('kb-' + key);
    if (el && el.value) settings.keybinds[key] = el.value;
  });

  // Stats settings
  const trackEl = document.getElementById('stats-trackEnabled');
  if (trackEl) settings.stats.trackEnabled = trackEl.checked;

  // Auto
  ['autoRematch','desktopNotifications','notifyGameEnd','notifyOpponentMove','notifyTurnStart'].forEach(key => {
    const el = document.getElementById('auto-' + key);
    if (el) settings.auto[key] = el.checked;
  });
  const delayEl = document.getElementById('auto-rematchDelay');
  if (delayEl) settings.auto.autoRematchDelay = parseInt(delayEl.value);
}

function populateAll() {
  populateTheme();
  populateSounds();
  populateUI();
  populateKeybinds();
  populateStatsSettings();
  populateAuto();
}

// ── Boot ──────────────────────────────────────────────────────────────────
load();
