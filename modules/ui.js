// modules/ui.js — Custom UI injections
//
// IMPORTANT — SELECTORS:
//   Barricade.gg's DOM may use obfuscated or framework-generated class names.
//   After installing, open DevTools on barricade.gg and update the SELECTORS
//   object below to match the actual DOM. Look for the game board, cells,
//   turn indicator, and end-game overlay.

window.BEUI = (() => {

  // ── Verified selectors from real barricade.gg DOM ────────────────────────
  const SEL = {
    gameBoard:      '[data-tutorial="board"]',
    boardCell:      '[data-tutorial="board"] > div.bg-gray-50',
    goalRow:        '[data-tutorial="goal-row"]',
    legalMove:      '[data-tutorial="legal-move"]',
    playerPawn:     '[data-tutorial="player-pawn"]',
    slotHorizontal: '[id^="slot-horizontal-"]',
    slotVertical:   '[id^="slot-vertical-"]',
    gameContainer:  'main, [class*="game"]',
    turnInfo:       '[data-tutorial="legal-move"]',
    gameOver:       '[class*="game-over"], [class*="result"], [class*="winner"]',
  };

  let settings = {};
  let statsData = {};

  // ── Stats Overlay ────────────────────────────────────────────────────────
  function createStatsOverlay() {
    if (document.getElementById('be-stats-overlay')) return;

    const el = document.createElement('div');
    el.id = 'be-stats-overlay';
    el.className = `be-overlay be-pos-${settings.ui?.overlayPosition || 'top-right'}`;
    el.innerHTML = `
      <div class="be-overlay-header">
        <span class="be-overlay-icon">📊</span>
        <span>Stats</span>
        <button class="be-overlay-close" id="be-stats-close">×</button>
      </div>
      <div class="be-overlay-body" id="be-stats-body">
        <div class="be-stat-row">
          <span class="be-stat-label">W / L / D</span>
          <span class="be-stat-value" id="be-wld">— / — / —</span>
        </div>
        <div class="be-stat-row">
          <span class="be-stat-label">Win Rate</span>
          <span class="be-stat-value" id="be-winrate">—%</span>
        </div>
        <div class="be-stat-row">
          <span class="be-stat-label">Streak</span>
          <span class="be-stat-value" id="be-streak">—</span>
        </div>
        <div class="be-stat-row">
          <span class="be-stat-label">Avg Moves</span>
          <span class="be-stat-value" id="be-avg-moves">—</span>
        </div>
        <div class="be-stat-row">
          <span class="be-stat-label">Games</span>
          <span class="be-stat-value" id="be-games">0</span>
        </div>
      </div>
    `;

    document.body.appendChild(el);

    // Close button
    document.getElementById('be-stats-close')?.addEventListener('click', () => {
      el.classList.toggle('be-collapsed');
    });

    // Make draggable
    makeDraggable(el);
  }

  function updateStatsOverlay(stats) {
    if (!stats) return;
    const wr = stats.gamesPlayed > 0
      ? Math.round((stats.wins / stats.gamesPlayed) * 100)
      : 0;
    const avg = stats.gamesPlayed > 0
      ? Math.round(stats.totalMoves / stats.gamesPlayed)
      : 0;

    const setText = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setText('be-wld',       `${stats.wins} / ${stats.losses} / ${stats.draws}`);
    setText('be-winrate',   `${wr}%`);
    setText('be-streak',    streakLabel(stats.currentStreak));
    setText('be-avg-moves', avg || '—');
    setText('be-games',     stats.gamesPlayed);
  }

  function streakLabel(n) {
    if (n === 0) return '—';
    return n > 0 ? `🔥 ${n}W` : `❄️ ${Math.abs(n)}L`;
  }

  // ── Move History Panel ───────────────────────────────────────────────────
  function createMoveHistory() {
    if (document.getElementById('be-history-panel')) return;

    const el = document.createElement('div');
    el.id = 'be-history-panel';
    el.className = 'be-panel be-hidden';
    el.innerHTML = `
      <div class="be-panel-header">
        <span>Move History</span>
        <button class="be-overlay-close" id="be-history-close">×</button>
      </div>
      <ol id="be-history-list" class="be-history-list"></ol>
    `;
    document.body.appendChild(el);

    document.getElementById('be-history-close')?.addEventListener('click', () => {
      el.classList.add('be-hidden');
    });
  }

  function addMoveToHistory(moveText) {
    const list = document.getElementById('be-history-list');
    if (!list) return;
    const li = document.createElement('li');
    li.textContent = moveText;
    list.appendChild(li);
    list.scrollTop = list.scrollHeight;
  }

  function clearMoveHistory() {
    const list = document.getElementById('be-history-list');
    if (list) list.innerHTML = '';
  }

  // ── Board Coordinates ────────────────────────────────────────────────────
  // barricade.gg already renders a–i and 1–9 labels as .font-mono.text-gray-500
  // so we just restyle them rather than injecting duplicates.
  function addBoardCoordinates() {
    const style = document.getElementById('be-coord-style');
    if (style) return; // already applied
    const el = document.createElement('style');
    el.id = 'be-coord-style';
    el.textContent = `
      [data-tutorial="board"] .text-gray-500.select-none {
        color: var(--be-accent) !important;
        font-weight: 600 !important;
        opacity: 0.85;
      }
    `;
    document.head.appendChild(el);
  }

  // ── Turn Indicator Banner ────────────────────────────────────────────────
  function createTurnIndicator() {
    if (document.getElementById('be-turn-banner')) return;
    const el = document.createElement('div');
    el.id = 'be-turn-banner';
    el.className = 'be-turn-banner be-hidden';
    document.body.appendChild(el);
  }

  function setTurnBanner(text, color) {
    const el = document.getElementById('be-turn-banner');
    if (!el) return;
    el.textContent = text;
    el.style.borderColor = color || 'var(--be-accent)';
    el.classList.remove('be-hidden');
    clearTimeout(el._timeout);
    el._timeout = setTimeout(() => el.classList.add('be-hidden'), 3000);
  }

  // ── Draggable utility ────────────────────────────────────────────────────
  function makeDraggable(el) {
    let startX, startY, startL, startT;

    const header = el.querySelector('.be-overlay-header, .be-panel-header');
    if (!header) return;

    header.style.cursor = 'move';
    header.addEventListener('mousedown', e => {
      if (e.target.closest('button')) return;
      startX = e.clientX; startY = e.clientY;
      const rect = el.getBoundingClientRect();
      startL = rect.left; startT = rect.top;
      el.style.right = 'auto'; el.style.bottom = 'auto';

      const onMove = e => {
        el.style.left = (startL + e.clientX - startX) + 'px';
        el.style.top  = (startT + e.clientY - startY) + 'px';
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  // ── Toggle visibility ────────────────────────────────────────────────────
  function toggleStats() {
    const el = document.getElementById('be-stats-overlay');
    if (el) el.classList.toggle('be-hidden');
  }

  function toggleHistory() {
    const el = document.getElementById('be-history-panel');
    if (el) el.classList.toggle('be-hidden');
  }

  // ── Init ─────────────────────────────────────────────────────────────────
  async function init(appSettings, appStats) {
    settings = appSettings;
    statsData = appStats;

    const ui = settings.ui || {};
    if (ui.statsOverlay)      createStatsOverlay();
    if (ui.moveHistory)       createMoveHistory();
    if (ui.turnIndicator)     createTurnIndicator();
    if (ui.boardCoordinates)  {
      // Board may not exist yet; retry with observer
      const tryCoords = () => {
        if (document.querySelector(SEL.gameBoard)) {
          addBoardCoordinates();
        }
      };
      tryCoords();
      const obs = new MutationObserver(tryCoords);
      obs.observe(document.body, { childList: true, subtree: true });
    }

    updateStatsOverlay(appStats);
  }

  return {
    init,
    updateStatsOverlay,
    addMoveToHistory,
    clearMoveHistory,
    setTurnBanner,
    toggleStats,
    toggleHistory,
    SEL
  };
})();
