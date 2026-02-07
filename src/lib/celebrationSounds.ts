// Celebration sounds using Web Audio API
// No external files needed - generates sounds programmatically

const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

// Play coin drop sound
const playCoinsSound = () => {
  const numberOfCoins = 8;
  
  for (let i = 0; i < numberOfCoins; i++) {
    setTimeout(() => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Metallic coin sound
      oscillator.frequency.setValueAtTime(800 + Math.random() * 600, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(
        200 + Math.random() * 200,
        audioContext.currentTime + 0.1
      );
      
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
    }, i * 80);
  }
};

// Play celebration fanfare
const playCelebrationFanfare = () => {
  const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
  
  notes.forEach((freq, i) => {
    setTimeout(() => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
      oscillator.type = 'triangle';
      
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    }, i * 120);
  });
};

// Play sparkle sound
const playSparkleSound = () => {
  for (let i = 0; i < 5; i++) {
    setTimeout(() => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(2000 + Math.random() * 2000, audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    }, i * 50 + 400);
  }
};

// Main function to play all celebration sounds
export const playCelebrationSounds = () => {
  // Resume audio context if suspended (required for autoplay policy)
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  
  // Play sounds in sequence
  playCoinsSound();
  
  setTimeout(() => {
    playCelebrationFanfare();
  }, 300);
  
  setTimeout(() => {
    playSparkleSound();
  }, 600);
};

// Play a simple notification sound for recipient
export const playReceivedNotificationSound = () => {
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  
  // Cheerful ascending chime
  const notes = [440, 554, 659, 880]; // A4, C#5, E5, A5
  
  notes.forEach((freq, i) => {
    setTimeout(() => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.25);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.25);
    }, i * 100);
  });
  
  // Then play coin sounds
  setTimeout(() => {
    playCoinsSound();
  }, 500);
};
