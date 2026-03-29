// Singleton audio manager — survives React component unmount/remount
const TRACK_URL = '/sounds/light-economy-anthem.mp3';

let audio: HTMLAudioElement | null = null;
let _volume = 0.5;
let _playing = false;

function getAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio(TRACK_URL);
    audio.loop = true;
    audio.volume = _volume;
    audio.addEventListener('pause', () => { _playing = false; notify(); });
    audio.addEventListener('play', () => { _playing = true; notify(); });
    audio.addEventListener('error', () => { _playing = false; audio = null; notify(); });
  }
  return audio;
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
  return { playing: _playing, volume: _volume };
}

export function play() {
  const a = getAudio();
  a.play().catch(() => { _playing = false; notify(); });
}

export function pause() {
  audio?.pause();
}

export function toggle() {
  _playing ? pause() : play();
}

export function setVolume(v: number) {
  _volume = v;
  if (audio) audio.volume = v;
  notify();
}

// Auto-play on first user interaction
function autoplay() {
  if (_playing) return;
  const events = ['click', 'touchstart', 'keydown'] as const;
  function handler() {
    if (_playing) {
      events.forEach(e => document.removeEventListener(e, handler, true));
      return;
    }
    const a = getAudio();
    a.play().then(() => {
      // Success — remove listeners
      events.forEach(e => document.removeEventListener(e, handler, true));
    }).catch(() => {
      // Browser blocked — keep listeners to retry on next interaction
    });
  }
  events.forEach(e => document.addEventListener(e, handler, { once: false, capture: true }));
}

autoplay();
