// modules/theme.js — Theme engine

window.BETheme = (() => {
  // Each preset defines ALL CSS variables used in content.css
  const COLOR_PRESETS = {
    midnight: {
      // Page
      bgPrimary:   '#0d0d14', bgSecondary: '#141420',
      bgCard:      '#1a1a2e', text:        '#e8e0ff',
      textMuted:   '#6e6e99', border:      '#2a2a48',
      accent:      '#a78bfa', accentHover: '#c4b5fd',
      // Board cells — must be visibly different from each other and the board bg
      boardLight:  '#1e1e38', boardDark:   '#171730',
      boardHover:  '#2a2a50',
      // Goal row
      goalRow:     '#2a1a40', goalBorder:  '#5a3a80', goalHover: '#3a2050',
      // Legal moves
      legalMove:   '#1a3a2a', legalHover:  '#244d38',
      // Pawns — MUST be bright and distinct on a dark board
      playerOne:   '#ff4d6d',   // vivid red-pink
      playerTwo:   '#38bdf8',   // sky blue
      // Walls
      barricade:   '#5a3a8a',
      wallA:       '#7c3aed', wallB: '#a78bfa',
      // Misc
      dot:         '#2e2e50', coord: '#6e6e99',
    },
    forest: {
      bgPrimary:   '#0a0f0a', bgSecondary: '#111811',
      bgCard:      '#162016', text:        '#d8f0d8',
      textMuted:   '#6a8a6a', border:      '#223022',
      accent:      '#4ade80', accentHover: '#86efac',
      boardLight:  '#1a2e1a', boardDark:   '#142214',
      boardHover:  '#243824',
      goalRow:     '#2a3a14', goalBorder:  '#5a7a28', goalHover: '#344a1c',
      legalMove:   '#1a3a1a', legalHover:  '#224d22',
      playerOne:   '#fb923c',   // orange
      playerTwo:   '#4ade80',   // green
      barricade:   '#3a6a28',
      wallA:       '#16a34a', wallB: '#4ade80',
      dot:         '#243a24', coord: '#6a8a6a',
    },
    ember: {
      bgPrimary:   '#0f0a08', bgSecondary: '#1a1008',
      bgCard:      '#221a10', text:        '#f5e8d8',
      textMuted:   '#9a7a5a', border:      '#3a2a18',
      accent:      '#fb923c', accentHover: '#fdba74',
      boardLight:  '#2a1c10', boardDark:   '#221508',
      boardHover:  '#382418',
      goalRow:     '#3a1a08', goalBorder:  '#8a3a10', goalHover: '#4a2210',
      legalMove:   '#2a1a08', legalHover:  '#3a2410',
      playerOne:   '#f97316',   // orange
      playerTwo:   '#facc15',   // yellow
      barricade:   '#7a3a10',
      wallA:       '#c2410c', wallB: '#fb923c',
      dot:         '#3a2818', coord: '#9a7a5a',
    },
    ice: {
      bgPrimary:   '#08101a', bgSecondary: '#0e1c2e',
      bgCard:      '#142438', text:        '#d0eeff',
      textMuted:   '#6a9ab0', border:      '#1a3050',
      accent:      '#38bdf8', accentHover: '#7dd3fc',
      boardLight:  '#142840', boardDark:   '#0e1e34',
      boardHover:  '#1c3454',
      goalRow:     '#0e2040', goalBorder:  '#1e5080', goalHover: '#162848',
      legalMove:   '#0e283a', legalHover:  '#143448',
      playerOne:   '#f472b6',   // pink
      playerTwo:   '#38bdf8',   // cyan
      barricade:   '#1e5080',
      wallA:       '#0ea5e9', wallB: '#7dd3fc',
      dot:         '#1a3050', coord: '#6a9ab0',
    }
  };

  let styleEl = null;

  function buildCSS(colors) {
    return `:root {
      --be-bg-primary:   ${colors.bgPrimary};
      --be-bg-secondary: ${colors.bgSecondary};
      --be-bg-card:      ${colors.bgCard};
      --be-text:         ${colors.text};
      --be-text-muted:   ${colors.textMuted};
      --be-border:       ${colors.border};
      --be-accent:       ${colors.accent};
      --be-accent-hover: ${colors.accentHover};
      --be-board-light:  ${colors.boardLight};
      --be-board-dark:   ${colors.boardDark};
      --be-board-hover:  ${colors.boardHover};
      --be-goal-row:     ${colors.goalRow};
      --be-goal-border:  ${colors.goalBorder};
      --be-goal-hover:   ${colors.goalHover};
      --be-legal-move:   ${colors.legalMove};
      --be-legal-hover:  ${colors.legalHover};
      --be-player-one:   ${colors.playerOne};
      --be-player-two:   ${colors.playerTwo};
      --be-barricade:    ${colors.barricade};
      --be-wall-a:       ${colors.wallA};
      --be-wall-b:       ${colors.wallB};
      --be-dot:          ${colors.dot};
      --be-coord:        ${colors.coord};
    }`;
  }

  function applyColors(colors) {
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'be-theme-vars';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = buildCSS(colors);
  }

  function disable() {
    if (styleEl) styleEl.textContent = '';
  }

  async function init() {
    chrome.storage.sync.get('be_settings', data => {
      const settings = data.be_settings || {};
      const theme = settings.theme || {};
      if (!theme.enabled) { disable(); return; }

      const preset = theme.preset || 'midnight';
      const base = COLOR_PRESETS[preset] || COLOR_PRESETS.midnight;
      // For custom preset, merge saved custom colors on top of midnight base
      const colors = Object.assign({}, base, preset === 'custom' ? (theme.colors || {}) : {});
      applyColors(colors);
    });

    chrome.storage.onChanged.addListener((changes) => {
      if (!changes.be_settings) return;
      const settings = changes.be_settings.newValue || {};
      const theme = settings.theme || {};
      if (!theme.enabled) { disable(); return; }

      const preset = theme.preset || 'midnight';
      const base = COLOR_PRESETS[preset] || COLOR_PRESETS.midnight;
      const colors = Object.assign({}, base, preset === 'custom' ? (theme.colors || {}) : {});
      applyColors(colors);
    });
  }

  return { init, applyColors, disable, COLOR_PRESETS };
})();
