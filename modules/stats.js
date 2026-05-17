// modules/stats.js — Game state tracking via DOM observation
//
// SELECTORS NOTE:
//   Update GAME_SEL to match barricade.gg's actual DOM structure.
//   Open DevTools → Inspector and search for elements that appear when:
//     - A game ends (win/loss screen)
//     - A move is made (move sound plays or a cell changes class)
//     - The turn changes
//   Update the selector values in GAME_SEL accordingly.

window.BEStats = (() => {

  // ── Verified selectors from real barricade.gg DOM ────────────────────────
  // Move detection: watch the player pawn's style.transform — it changes on every move.
  //   [data-tutorial="player-pawn"] has inline style: transform: translate(X%, Y%)
  //
  // Turn detection: [data-tutorial="legal-move"] elements appear when it's your turn.
  //
  // Game end: watch for elements appearing with win/loss text. The exact selector
  //   may vary — update winIndicator/lossIndicator if needed once you see the game-over screen.
  const GAME_SEL = {
    playerPawn:    '[data-tutorial="player-pawn"]',
    legalMove:     '[data-tutorial="legal-move"]',
    winIndicator:  '[class*="win"], [class*="victory"], [class*="winner"]',
    lossIndicator: '[class*="lose"], [class*="defeat"], [class*="loser"]',
    board:         '[data-tutorial="board"]',
  };

  let moveCount = 0;
  let gameActive = false;
  let observer = null;
  let onGameEnd = null; // callback(result, moves)
  let onMove = null;    // callback(moveCount)

  function resetGame() {
    moveCount = 0;
    gameActive = true;
    window.BEUI?.clearMoveHistory();
  }

  // Track last known pawn position to detect moves
  let lastPawnTransform = null;

  function detectGameEnd(mutations) {
    if (!gameActive) return;

    const docText = document.body.innerText;

    const winEl = document.querySelector(GAME_SEL.winIndicator);
    const lossEl = document.querySelector(GAME_SEL.lossIndicator);

    // Check if any matching element is actually visible
    const isVisible = el => el && el.offsetParent !== null && el.offsetWidth > 0;

    const isWin  = isVisible(winEl)  || /you win|you won|victory/i.test(docText.slice(-300));
    const isLoss = isVisible(lossEl) || /you lose|you lost|defeat/i.test(docText.slice(-300));

    if (isWin || isLoss) {
      gameActive = false;
      onGameEnd?.(isWin ? 'win' : 'loss', moveCount);
    }
  }

  function detectMove(mutations) {
    if (!gameActive) return;

    for (const m of mutations) {
      // Pawn moved: style.transform changed on [data-tutorial="player-pawn"]
      if (
        m.type === 'attributes' &&
        m.attributeName === 'style' &&
        m.target.matches?.(GAME_SEL.playerPawn)
      ) {
        const currentTransform = m.target.style.transform;
        if (currentTransform !== lastPawnTransform) {
          lastPawnTransform = currentTransform;
          moveCount++;
          onMove?.(moveCount);
        }
      }

      // Wall placed: a slot div gets a visible child (the wall bar appears)
      if (m.type === 'childList') {
        for (const node of m.addedNodes) {
          if (
            node.nodeType === 1 &&
            (node.closest?.('[id^="slot-horizontal-"]') || node.closest?.('[id^="slot-vertical-"]'))
          ) {
            // A wall element was added
            moveCount++;
            onMove?.(moveCount);
          }
        }
      }

      // Wall bar opacity changed from 0 to visible (the inner absolute div)
      if (
        m.type === 'attributes' &&
        m.attributeName === 'class' &&
        m.target.matches?.('[id^="slot-horizontal-"] > div, [id^="slot-vertical-"] > div')
      ) {
        if (!m.target.classList.contains('opacity-0')) {
          moveCount++;
          onMove?.(moveCount);
        }
      }
    }
  }

  function startObserving() {
    if (observer) { observer.disconnect(); observer = null; }

    const board = document.querySelector(GAME_SEL.board);
    const root  = board || document.body;

    // Get initial pawn transform so first move is detected correctly
    const pawn = document.querySelector(GAME_SEL.playerPawn);
    lastPawnTransform = pawn?.style?.transform || null;

    observer = new MutationObserver(mutations => {
      detectMove(mutations);
      detectGameEnd(mutations);
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });
  }

  function stopObserving() {
    observer?.disconnect();
    observer = null;
  }

  function init({ onEnd, onMoveCallback }) {
    onGameEnd = onEnd;
    onMove = onMoveCallback;

    // Watch for game board to appear (SPA navigation)
    const pageObs = new MutationObserver(() => {
      const board = document.querySelector(GAME_SEL.board);
      if (board && !observer) {
        resetGame();
        startObserving();
      } else if (!board && observer) {
        stopObserving();
        gameActive = false;
      }
    });
    pageObs.observe(document.body, { childList: true, subtree: true });

    // If board already present on load
    if (document.querySelector(GAME_SEL.board)) {
      resetGame();
      startObserving();
    }
  }

  function getMoveCount() { return moveCount; }
  function isGameActive() { return gameActive; }

  return { init, resetGame, getMoveCount, isGameActive, GAME_SEL };
})();
