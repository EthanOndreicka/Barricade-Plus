// modules/keybinds.js — Configurable keyboard shortcuts

window.BEKeybinds = (() => {

  // Parse a shortcut string like "Alt+T" → { alt, ctrl, shift, key }
  function parseShortcut(str) {
    if (!str) return null;
    const parts = str.split('+');
    const key = parts[parts.length - 1].toLowerCase();
    return {
      alt:   parts.includes('Alt'),
      ctrl:  parts.includes('Ctrl') || parts.includes('Control'),
      shift: parts.includes('Shift'),
      meta:  parts.includes('Meta') || parts.includes('Cmd'),
      key
    };
  }

  function matches(e, shortcut) {
    if (!shortcut) return false;
    return (
      e.altKey   === shortcut.alt   &&
      e.ctrlKey  === shortcut.ctrl  &&
      e.shiftKey === shortcut.shift &&
      e.metaKey  === shortcut.meta  &&
      e.key.toLowerCase() === shortcut.key
    );
  }

  // Action handlers — populated by content.js after all modules init
  const handlers = {};

  function registerHandler(action, fn) {
    handlers[action] = fn;
  }

  let shortcuts = {};

  function loadShortcuts(keybindSettings) {
    shortcuts = {};
    for (const [action, str] of Object.entries(keybindSettings || {})) {
      shortcuts[action] = parseShortcut(str);
    }
  }

  function handleKeydown(e) {
    // Don't fire inside text inputs
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

    for (const [action, shortcut] of Object.entries(shortcuts)) {
      if (matches(e, shortcut) && handlers[action]) {
        e.preventDefault();
        handlers[action]();
        break;
      }
    }
  }

  function init(keybindSettings) {
    loadShortcuts(keybindSettings);
    document.addEventListener('keydown', handleKeydown);

    // Live update when settings change
    chrome.storage.onChanged.addListener(changes => {
      if (changes.be_settings) {
        const kb = (changes.be_settings.newValue || {}).keybinds || {};
        loadShortcuts(kb);
      }
    });
  }

  // Helper to record a new shortcut from a keydown event
  function recordShortcut(e) {
    if (e.key === 'Escape') return 'Escape';
    const parts = [];
    if (e.ctrlKey)  parts.push('Ctrl');
    if (e.altKey)   parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    if (e.metaKey)  parts.push('Meta');
    const key = e.key === ' ' ? 'Space' : e.key;
    if (!['Control','Alt','Shift','Meta'].includes(key)) parts.push(key);
    return parts.join('+');
  }

  return { init, registerHandler, recordShortcut, parseShortcut };
})();
