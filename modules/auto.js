// modules/auto.js — Automated actions: auto-rematch, notifications, turn alerts
//
// SELECTORS NOTE:
//   Update AUTO_SEL to match barricade.gg's buttons/elements.
//   Look for the rematch/play-again button that appears after a game ends.

window.BEAuto = (() => {

  // ── Verified selectors from real barricade.gg DOM ────────────────────────
  // legal-move cells appear when it's YOUR turn. When they're absent = opponent's turn.
  // Rematch button: not yet confirmed — update once you see the post-game screen.
  const AUTO_SEL = {
    rematchBtn:   'button:is([class*="rematch"], [class*="again"], [class*="play"])',
    yourTurnEl:   '[data-tutorial="legal-move"]',  // present = your turn
  };

  let settings = {};
  let rematchTimer = null;
  let yourTurnObserver = null;
  let lastTurnState = null;

  // ── Desktop notification ─────────────────────────────────────────────────
  function notify(title, message) {
    chrome.runtime.sendMessage({ type: 'NOTIFY', title, message });
  }

  // ── Auto-rematch ─────────────────────────────────────────────────────────
  function scheduleRematch(delayMs) {
    clearTimeout(rematchTimer);
    rematchTimer = setTimeout(() => {
      const btn = document.querySelector(AUTO_SEL.rematchBtn);
      if (btn) {
        btn.click();
        console.log('[BE] Auto-rematch clicked');
      } else {
        // Try again after a short delay (button may not be rendered yet)
        rematchTimer = setTimeout(() => {
          document.querySelector(AUTO_SEL.rematchBtn)?.click();
        }, 1000);
      }
    }, delayMs);
  }

  function cancelRematch() {
    clearTimeout(rematchTimer);
    rematchTimer = null;
  }

  // ── Turn detection ───────────────────────────────────────────────────────
  // [data-tutorial="legal-move"] cells are injected when it's your turn and
  // removed when it's the opponent's. We watch for childList changes on the board.
  function startTurnObserver() {
    if (yourTurnObserver) return;

    yourTurnObserver = new MutationObserver(() => {
      const legalMoves = document.querySelectorAll('[data-tutorial="legal-move"]');
      const isYourTurn = legalMoves.length > 0;

      if (isYourTurn && lastTurnState !== true) {
        lastTurnState = true;
        if (settings.auto?.notifyTurnStart) {
          notify('Your turn!', 'Make your move on Barricade.gg');
        }
        if (settings.ui?.turnIndicator) {
          window.BEUI?.setTurnBanner('Your turn!', 'var(--be-accent)');
        }
      } else if (!isYourTurn && lastTurnState !== false) {
        lastTurnState = false;
        if (settings.auto?.notifyOpponentMove) {
          notify("Opponent moved", "Waiting for your next move.");
        }
      }
    });

    const board = document.querySelector('[data-tutorial="board"]') || document.body;
    yourTurnObserver.observe(board, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['data-tutorial', 'class']
    });
  }

  function stopTurnObserver() {
    yourTurnObserver?.disconnect();
    yourTurnObserver = null;
  }

  // ── Game-end hook (called by content.js after result recorded) ───────────
  function onGameEnd(result, moves) {
    const auto = settings.auto || {};

    if (auto.desktopNotifications && auto.notifyGameEnd) {
      const resultText = result === 'win' ? '🏆 You won!' : result === 'loss' ? '😞 You lost.' : '🤝 Draw.';
      notify(resultText, `Game over in ${moves} moves.`);
    }

    if (auto.autoRematch) {
      scheduleRematch(auto.autoRematchDelay || 3000);
    }
  }

  // ── Init ─────────────────────────────────────────────────────────────────
  function init(appSettings) {
    settings = appSettings;
    startTurnObserver();

    chrome.storage.onChanged.addListener(changes => {
      if (changes.be_settings) {
        settings = changes.be_settings.newValue || {};
        // Re-evaluate turn observer
        stopTurnObserver();
        startTurnObserver();
      }
    });
  }

  return { init, onGameEnd, scheduleRematch, cancelRematch, notify, AUTO_SEL };
})();
