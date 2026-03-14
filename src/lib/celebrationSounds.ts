// Celebration sounds - MP3 based

let activeCelebrationAudio: HTMLAudioElement | null = null;

const isCelebrationMuted = (): boolean => {
  try {
    return localStorage.getItem('celebration_muted') === 'true';
  } catch {
    return false;
  }
};

export const stopCelebrationMusic = () => {
  if (!activeCelebrationAudio) return;

  activeCelebrationAudio.pause();
  activeCelebrationAudio.currentTime = 0;
  activeCelebrationAudio = null;
};

const playCelebration = (soundId: string, loop: boolean): HTMLAudioElement | null => {
  try {
    if (isCelebrationMuted()) return null;

    // Prevent overlapping "rich rich rich" sounds.
    stopCelebrationMusic();

    const audio = new Audio(`/sounds/${soundId}.mp3`);
    audio.volume = 0.7;
    audio.loop = loop;
    activeCelebrationAudio = audio;

    audio.addEventListener('ended', () => {
      if (activeCelebrationAudio === audio) {
        activeCelebrationAudio = null;
      }
    });

    audio.play().catch(() => {});
    return audio;
  } catch {
    return null;
  }
};

/** Play celebration music from MP3 file */
export const playCelebrationMusic = (soundId: string = 'rich-1'): HTMLAudioElement | null => {
  return playCelebration(soundId, false);
};

/** Play celebration music in a continuous loop. Returns audio element to stop later. */
export const playCelebrationMusicLoop = (soundId: string = 'rich-3'): HTMLAudioElement | null => {
  return playCelebration(soundId, true);
};

/** Legacy compatibility - plays the default celebration MP3 */
export const playCelebrationSounds = () => {
  playCelebrationMusic('rich-1');
};

/** Play notification sound for recipient (looped rich-3) */
export const playReceivedNotificationSound = (): HTMLAudioElement | null => {
  return playCelebrationMusicLoop('rich-3');
};
