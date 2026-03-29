// Singleton audio manager — survives React component unmount/remount
const TRACK_URL = '/sounds/light-economy-anthem.mp3';

// Prevent duplicate instances from HMR
const WIN = window as unknown as { __ga_audio?: HTMLAudioElement; __ga_autoplay?: boolean };

let _volume = 0.5;
let _playing = false;

function getAudio(): HTMLAudioElement {
  if (!WIN.__ga_audio) {
    const a = new Audio(TRACK_URL);
    a.loop = true;
    a.volume = _volume;
    a.addEventListener('pause', () => { _playing = false; notify(); });
    a.addEventListener('play', () => { _playing = true; notify(); });
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
  // Sync from actual audio element
  const a = WIN.__ga_audio;
  if (a) _playing = !a.paused;
  return { playing: _playing, volume: _volume };
}

export function play() {
  const a = getAudio();
  a.play().catch(() => { _playing = false; notify(); });
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
  const events = ['click', 'touchstart', 'keydown'] as const;
  function handler() {
    const a = getAudio();
    if (!a.paused) {
      events.forEach(e => document.removeEventListener(e, handler, true));
      return;
    }
    a.play().then(() => {
      events.forEach(e => document.removeEventListener(e, handler, true));
    }).catch(() => {
      // Browser blocked — retry on next interaction
    });
  }
  events.forEach(e => document.addEventListener(e, handler, { once: false, capture: true }));
}
