// Singleton audio manager — survives React component unmount/remount
const TRACK_URL = '/sounds/light-economy-anthem.mp3';

// Prevent duplicate instances/listeners from HMR
const WIN = window as unknown as {
  __ga_audio?: HTMLAudioElement;
  __ga_autoplay?: boolean;
  __ga_attempting?: Promise<void> | null;
  __ga_cleanup?: (() => void) | null;
};

let _volume = 0.5;
let _playing = false;

function syncStateFromAudio() {
  const a = WIN.__ga_audio;
  if (!a) return;
  _volume = a.volume;
  _playing = !a.paused && !a.ended;
}

function getAudio(): HTMLAudioElement {
  if (!WIN.__ga_audio) {
    const a = new Audio(TRACK_URL);
    a.loop = true;
    a.preload = 'auto';
    a.volume = _volume;
    a.addEventListener('pause', () => { _playing = false; notify(); });
    a.addEventListener('play', () => { _playing = true; notify(); });
    a.addEventListener('volumechange', () => { syncStateFromAudio(); notify(); });
    a.addEventListener('error', () => { _playing = false; WIN.__ga_audio = undefined; notify(); });
    WIN.__ga_audio = a;
  }
  return WIN.__ga_audio;
}

type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach(fn => fn());
}

export function subscribe(fn: Listener) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function getState() {
  syncStateFromAudio();
  return { playing: _playing, volume: _volume };
}

function attemptAutoplay() {
  const a = getAudio();
  syncStateFromAudio();

  if (!a.paused) {
    notify();
    return Promise.resolve();
  }

  if (WIN.__ga_attempting) return WIN.__ga_attempting;

  WIN.__ga_attempting = a.play()
    .then(() => {
      syncStateFromAudio();
      notify();
    })
    .catch(() => {
      syncStateFromAudio();
      notify();
      throw new Error('AUTOPLAY_BLOCKED');
    })
    .finally(() => {
      WIN.__ga_attempting = null;
    });

  return WIN.__ga_attempting;
}

export function play() {
  attemptAutoplay().catch(() => {
    _playing = false;
    notify();
  });
}

export function pause() {
  WIN.__ga_audio?.pause();
}

export function toggle() {
  const a = WIN.__ga_audio;
  if (a && !a.paused) {
    pause();
  } else {
    play();
  }
}

export function setVolume(v: number) {
  _volume = v;
  if (WIN.__ga_audio) WIN.__ga_audio.volume = v;
  notify();
}

// Auto-play on first user interaction (only register once globally)
if (!WIN.__ga_autoplay) {
  WIN.__ga_autoplay = true;
  const pointerEvents = ['click', 'touchstart', 'keydown', 'pointerdown'] as const;

  const interactionHandler = () => {
    attemptAutoplay()
      .then(() => {
        WIN.__ga_cleanup?.();
        WIN.__ga_cleanup = null;
      })
      .catch(() => {
        // Browser blocked — keep listeners and retry on next signal
      });
  };

  const visibilityHandler = () => {
    if (document.visibilityState === 'visible') {
      interactionHandler();
    }
  };

  pointerEvents.forEach(e => document.addEventListener(e, interactionHandler, { capture: true }));
  window.addEventListener('focus', interactionHandler);
  window.addEventListener('pageshow', interactionHandler);
  document.addEventListener('visibilitychange', visibilityHandler);

  WIN.__ga_cleanup = () => {
    pointerEvents.forEach(e => document.removeEventListener(e, interactionHandler, true));
    window.removeEventListener('focus', interactionHandler);
    window.removeEventListener('pageshow', interactionHandler);
    document.removeEventListener('visibilitychange', visibilityHandler);
  };

  // Best-effort attempt immediately on page load; some browsers allow it.
  interactionHandler();
}
