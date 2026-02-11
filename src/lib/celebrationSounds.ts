// Celebration sounds - MP3 based

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

/** Play celebration music in a continuous loop. Returns audio element to stop later. */
export const playCelebrationMusicLoop = (soundId: string = 'rich-3'): HTMLAudioElement | null => {
  try {
    const audio = new Audio(`/sounds/${soundId}.mp3`);
    audio.volume = 0.7;
    audio.loop = true;
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

/** Play notification sound for recipient (looped rich-3) */
export const playReceivedNotificationSound = (): HTMLAudioElement | null => {
  return playCelebrationMusicLoop('rich-3');
};
