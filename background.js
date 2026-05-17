// background.js — Service worker for Barricade Enhancer
// Handles: desktop notifications, badge updates, cross-tab messaging

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    // Set defaults on first install
    chrome.storage.sync.get('be_settings', data => {
      if (!data.be_settings) {
        // Trigger options page on first install so user can configure
        chrome.tabs.create({ url: 'options/options.html' });
      }
    });
    chrome.storage.local.get('be_stats', data => {
      if (!data.be_stats) {
        chrome.storage.local.set({
          be_stats: {
            wins: 0,
            losses: 0,
            draws: 0,
            totalMoves: 0,
            gamesPlayed: 0,
            currentStreak: 0,
            bestStreak: 0,
            history: [] // last 50 games
          }
        });
      }
    });
  }
});

// ── Message handler ────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  switch (msg.type) {

    case 'NOTIFY': {
      chrome.storage.sync.get('be_settings', data => {
        const settings = data.be_settings || {};
        const autoSettings = settings.auto || {};
        if (!autoSettings.desktopNotifications) return;
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'assets/icons/icon48.png',
          title: msg.title || 'Barricade.gg',
          message: msg.message || '',
          priority: 1
        });
      });
      break;
    }

    case 'RECORD_GAME': {
      // msg.result = 'win' | 'loss' | 'draw', msg.moves = number
      chrome.storage.local.get('be_stats', data => {
        const stats = data.be_stats || {
          wins: 0, losses: 0, draws: 0,
          totalMoves: 0, gamesPlayed: 0,
          currentStreak: 0, bestStreak: 0, history: []
        };

        stats.gamesPlayed++;
        stats.totalMoves += (msg.moves || 0);

        if (msg.result === 'win') {
          stats.wins++;
          stats.currentStreak = Math.max(0, stats.currentStreak) + 1;
          stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak);
        } else if (msg.result === 'loss') {
          stats.losses++;
          stats.currentStreak = Math.min(0, stats.currentStreak) - 1;
        } else {
          stats.draws++;
          stats.currentStreak = 0;
        }

        stats.history.unshift({ result: msg.result, moves: msg.moves, ts: Date.now() });
        if (stats.history.length > 50) stats.history.pop();

        chrome.storage.local.set({ be_stats: stats }, () => {
          sendResponse({ ok: true, stats });
        });
      });
      return true; // async response
    }

    case 'GET_STATS': {
      chrome.storage.local.get('be_stats', data => {
        sendResponse({ stats: data.be_stats || null });
      });
      return true;
    }

    case 'RESET_STATS': {
      chrome.storage.local.set({
        be_stats: {
          wins: 0, losses: 0, draws: 0,
          totalMoves: 0, gamesPlayed: 0,
          currentStreak: 0, bestStreak: 0, history: []
        }
      }, () => sendResponse({ ok: true }));
      return true;
    }

    case 'OPEN_OPTIONS': {
      chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html') });
      break;
    }
  }
});
