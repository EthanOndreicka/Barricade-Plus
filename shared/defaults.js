// shared/defaults.js — Default settings for all features
// This file is inlined into modules that need it since content scripts share scope.

const BE_DEFAULTS = {
  // ── Theme ─────────────────────────────────────────────────────────────────
  theme: {
    enabled: true,
    preset: 'midnight', // 'midnight' | 'forest' | 'ember' | 'custom'
    colors: {
      bgPrimary:    '#0a0a12',
      bgSecondary:  '#111122',
      bgCard:       '#161628',
      accent:       '#7c5cbf',
      accentHover:  '#9b78e0',
      text:         '#ddd6f0',
      textMuted:    '#7a7a99',
      border:       '#252540',
      playerOne:    '#7c5cbf',
      playerTwo:    '#bf5c7c',
      barricade:    '#3a3a5c',
      boardLight:   '#1a1a30',
      boardDark:    '#131325',
    }
  },

  // ── Sounds ────────────────────────────────────────────────────────────────
  sounds: {
    enabled: true,
    volume: 1.0,
    muted: false,
    // Maps original audio src substrings → base64 data URL or extension asset path
    // Users populate this via the options page
    mappings: {}
  },

  // ── UI Additions ──────────────────────────────────────────────────────────
  ui: {
    statsOverlay: true,
    moveHistory: true,
    boardCoordinates: true,
    turnIndicator: true,
    overlayPosition: 'top-right', // 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  },

  // ── Keybinds ──────────────────────────────────────────────────────────────
  keybinds: {
    toggleTheme:  'Alt+T',
    toggleStats:  'Alt+S',
    quickRematch: 'Alt+R',
    toggleMute:   'Alt+M',
    showHistory:  'Alt+H',
  },

  // ── Stats ─────────────────────────────────────────────────────────────────
  stats: {
    trackEnabled: true,
    showWinRate: true,
    showStreak: true,
    showAvgMoves: true,
    // Stored separately in chrome.storage.local under 'be_stats'
  },

  // ── Auto Features ─────────────────────────────────────────────────────────
  auto: {
    autoRematch: false,
    autoRematchDelay: 3000,   // ms before clicking rematch
    desktopNotifications: true,
    notifyGameEnd: true,
    notifyOpponentMove: false,
    notifyTurnStart: false,
  }
};

// Helper: load settings, merging with defaults so missing keys are always present
async function beLoadSettings() {
  return new Promise(resolve => {
    chrome.storage.sync.get('be_settings', data => {
      const saved = data.be_settings || {};
      resolve(deepMerge(BE_DEFAULTS, saved));
    });
  });
}

function deepMerge(target, source) {
  const out = Object.assign({}, target);
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      out[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      out[key] = source[key];
    }
  }
  return out;
}
