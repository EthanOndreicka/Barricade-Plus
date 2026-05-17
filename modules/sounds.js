// modules/sounds.js — Audio interception and replacement
// Runs at document_start so it wraps Audio before the page creates any.
//
// HOW IT WORKS:
//   We wrap the native HTMLAudioElement and Audio constructor. When a sound is
//   created or its src is set, we check if the user has mapped that src to a
//   custom file. If so, we silently swap the src before playback happens.
//
// HOW TO MAP SOUNDS:
//   In the Options page, Sound Mods tab. You paste a portion of the original
//   audio URL and upload a replacement file. The replacement is stored as a
//   base64 data URL in chrome.storage.sync under be_settings.sounds.mappings.

(function () {
  // We need to communicate with chrome.storage from document_start context.
  // Content scripts have full access to chrome APIs even at document_start.

  let soundMappings = {};
  let soundsEnabled = true;
  let masterVolume = 1.0;
  let muted = false;

  function loadSoundSettings() {
    chrome.storage.sync.get('be_settings', data => {
      const s = (data.be_settings || {}).sounds || {};
      soundsEnabled = s.enabled !== false;
      masterVolume  = typeof s.volume === 'number' ? s.volume : 1.0;
      muted         = !!s.muted;
      soundMappings = s.mappings || {};
    });
  }

  loadSoundSettings();

  chrome.storage.onChanged.addListener(changes => {
    if (changes.be_settings) {
      const s = (changes.be_settings.newValue || {}).sounds || {};
      soundsEnabled = s.enabled !== false;
      masterVolume  = typeof s.volume === 'number' ? s.volume : 1.0;
      muted         = !!s.muted;
      soundMappings = s.mappings || {};
    }
  });

  // ── Find a mapped replacement for a given src ────────────────────────────
  function getMappedSrc(src) {
    if (!src || !soundsEnabled) return null;
    for (const [pattern, replacement] of Object.entries(soundMappings)) {
      if (pattern && src.includes(pattern)) return replacement;
    }
    return null;
  }

  // ── Patch HTMLAudioElement prototype ────────────────────────────────────
  const NativeAudio = window.Audio;
  const nativeSrcDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');
  const nativeVolDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'volume');

  // Override 'src' setter so we can swap it
  Object.defineProperty(HTMLMediaElement.prototype, 'src', {
    get() {
      return nativeSrcDescriptor.get.call(this);
    },
    set(val) {
      const mapped = getMappedSrc(val);
      nativeSrcDescriptor.set.call(this, mapped || val);
      // Apply volume
      try {
        const effectiveVol = muted ? 0 : Math.min(1, Math.max(0, masterVolume));
        nativeVolDescriptor.set.call(this, effectiveVol);
      } catch (_) {}
    },
    configurable: true
  });

  // Override volume so mute/master volume applies globally
  Object.defineProperty(HTMLMediaElement.prototype, 'volume', {
    get() {
      return nativeVolDescriptor.get.call(this);
    },
    set(val) {
      const effectiveVol = muted ? 0 : Math.min(1, Math.max(0, val * masterVolume));
      nativeVolDescriptor.set.call(this, effectiveVol);
    },
    configurable: true
  });

  // Wrap Audio constructor
  window.Audio = function (src) {
    const el = src ? new NativeAudio(src) : new NativeAudio();
    if (src) {
      const mapped = getMappedSrc(src);
      if (mapped) el.src = mapped;
    }
    return el;
  };
  window.Audio.prototype = NativeAudio.prototype;

  // ── Expose control API for other modules ────────────────────────────────
  window.BESounds = {
    setMuted(val) {
      muted = val;
      // Persist
      chrome.storage.sync.get('be_settings', data => {
        const settings = data.be_settings || {};
        settings.sounds = settings.sounds || {};
        settings.sounds.muted = val;
        chrome.storage.sync.set({ be_settings: settings });
      });
    },
    toggleMute() {
      this.setMuted(!muted);
    },
    isMuted() { return muted; },
    setVolume(v) {
      masterVolume = Math.min(1, Math.max(0, v));
    }
  };
})();
