// Celebration sounds - MP3 based
// Replaces Web Audio API with pre-recorded MP3 files

/** Play celebration music from MP3 file */
export const playCelebrationMusic = (soundId: string = 'rich-1'): HTMLAudioElement | null => {
  try {
    const audio = new Audio(`/sounds/${soundId}.mp3`);
    audio.volume = 0.7;
    audio.play().catch(() => {});
    return audio;
  } catch {
    return null;
  }
};

/** Legacy compatibility - plays the default celebration MP3 */
export const playCelebrationSounds = () => {
  playCelebrationMusic('rich-1');
};

/** Play notification sound for recipient */
export const playReceivedNotificationSound = () => {
  playCelebrationMusic('rich-2');
};
