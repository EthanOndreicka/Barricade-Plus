// content.js — Main orchestrator
// Runs at document_idle, initializes all modules with loaded settings.

(async function () {
  // ── Load settings ─────────────────────────────────────────────────────────
  const data = await new Promise(r => chrome.storage.sync.get('be_settings', r));
  const rawSettings = data.be_settings || {};

  const BE_DEFAULTS = {
    theme:    { enabled: true, preset: 'midnight', colors: {} },
    sounds:   { enabled: true, volume: 1.0, muted: false, mappings: {} },
    ui:       { statsOverlay: true, moveHistory: true, boardCoordinates: true,
                turnIndicator: true, overlayPosition: 'top-right' },
    keybinds: { toggleTheme: 'Alt+T', toggleStats: 'Alt+S',
                quickRematch: 'Alt+R', toggleMute: 'Alt+M', showHistory: 'Alt+H' },
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
      } else {
        out[key] = source[key];
      }
    }
    return out;
  }

  const settings = deepMerge(BE_DEFAULTS, rawSettings);

  // ── Load stats ────────────────────────────────────────────────────────────
  const statsData = await new Promise(r => {
    chrome.runtime.sendMessage({ type: 'GET_STATS' }, res => r(res?.stats || null));
  });

  // ── Init modules ──────────────────────────────────────────────────────────
  BETheme.init();
  await BEUI.init(settings, statsData);
  BEAuto.init(settings);

  // ── Stats tracking ────────────────────────────────────────────────────────
  if (settings.stats.trackEnabled) {
    BEStats.init({
      onEnd: (result, moves) => {
        // Record in background
        chrome.runtime.sendMessage({ type: 'RECORD_GAME', result, moves }, res => {
          if (res?.stats) BEUI.updateStatsOverlay(res.stats);
        });
        BEAuto.onGameEnd(result, moves);
        if (settings.auto.desktopNotifications && settings.auto.notifyGameEnd) {
          const msg = result === 'win' ? '🏆 Victory!' : result === 'loss' ? '😞 Defeat' : '🤝 Draw';
          BEAuto.notify(msg, `${moves} moves played`);
        }
      },
      onMoveCallback: (count) => {
        BEUI.addMoveToHistory(`Move ${count}`);
      }
    });
  }

  // ── Register keybind handlers ─────────────────────────────────────────────
  BEKeybinds.registerHandler('toggleTheme', () => {
    chrome.storage.sync.get('be_settings', d => {
      const s = d.be_settings || {};
      s.theme = s.theme || {};
      s.theme.enabled = !s.theme.enabled;
      chrome.storage.sync.set({ be_settings: s });
    });
  });

  BEKeybinds.registerHandler('toggleStats',  () => BEUI.toggleStats());
  BEKeybinds.registerHandler('showHistory',  () => BEUI.toggleHistory());
  BEKeybinds.registerHandler('toggleMute',   () => BESounds.toggleMute());
  BEKeybinds.registerHandler('quickRematch', () => {
    const btn = document.querySelector(BEAuto.AUTO_SEL.rematchBtn);
    if (btn) btn.click();
    else BEAuto.notify('No rematch button found', 'Game may still be in progress.');
  });

  BEKeybinds.init(settings.keybinds);

  // ── Listen for messages from popup ───────────────────────────────────────
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'TOGGLE_THEME')  BETheme.init(); // re-reads storage
    if (msg.type === 'TOGGLE_STATS')  BEUI.toggleStats();
    if (msg.type === 'TOGGLE_MUTE')   BESounds.toggleMute();
    if (msg.type === 'QUICK_REMATCH') BEKeybinds.handlers?.quickRematch?.();
  });

  console.log('[Barricade Enhancer] Initialized ✓');
})();
