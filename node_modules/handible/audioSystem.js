// Audio System for Button Sounds and UI Feedback
// Provides high-quality, low-latency audio feedback for user interactions

class AudioSystem {
  constructor() {
    this.audioContext = null;
    this.isEnabled = true;
    this.volume = 0.3;
    this.init();
  }

  init() {
    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not supported, button sounds disabled');
      this.isEnabled = false;
    }
  }

  // Create a click sound using oscillators
  createClickSound() {
    if (!this.audioContext || !this.isEnabled) return;

    try {
      // Resume audio context if it's suspended (required by modern browsers)
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      // Connect oscillator to gain to destination
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      // Configure the click sound
      oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime); // High frequency for click
      oscillator.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 0.1); // Drop frequency
      
      // Configure envelope (quick attack, fast decay)
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(this.volume, this.audioContext.currentTime + 0.01); // Quick attack
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.15); // Quick decay
      
      // Start and stop
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.15);
      
    } catch (e) {
      console.warn('Error playing click sound:', e);
    }
  }

  // Create a success sound for scene switches
  createSuccessSound() {
    if (!this.audioContext || !this.isEnabled) return;

    try {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      // Success sound: rising tone
      oscillator.frequency.setValueAtTime(523, this.audioContext.currentTime); // C5
      oscillator.frequency.linearRampToValueAtTime(659, this.audioContext.currentTime + 0.1); // E5
      oscillator.frequency.linearRampToValueAtTime(784, this.audioContext.currentTime + 0.2); // G5
      
      // Smoother envelope for success sound
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(this.volume * 0.6, this.audioContext.currentTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(this.volume * 0.4, this.audioContext.currentTime + 0.15);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.3);
      
    } catch (e) {
      console.warn('Error playing success sound:', e);
    }
  }

  // Create a hover sound for button hover effects
  createHoverSound() {
    if (!this.audioContext || !this.isEnabled) return;

    try {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      // Subtle hover sound
      oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime);
      
      // Very subtle envelope for hover
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(this.volume * 0.2, this.audioContext.currentTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.08);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.08);
      
    } catch (e) {
      console.warn('Error playing hover sound:', e);
    }
  }

  // Create an error sound for invalid actions
  createErrorSound() {
    if (!this.audioContext || !this.isEnabled) return;

    try {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      // Error sound: low, buzzy tone
      oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
      oscillator.frequency.linearRampToValueAtTime(150, this.audioContext.currentTime + 0.2);
      
      // Sharp envelope for error
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(this.volume * 0.4, this.audioContext.currentTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.2);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.2);
      
    } catch (e) {
      console.warn('Error playing error sound:', e);
    }
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  setEnabled(enabled) {
    this.isEnabled = enabled;
  }

  getVolume() {
    return this.volume;
  }

  getEnabled() {
    return this.isEnabled;
  }
}

// Create and export the global audio system instance
export const audioSystem = new AudioSystem();

// Convenience functions for console control
export const toggleButtonSounds = () => {
  audioSystem.setEnabled(!audioSystem.isEnabled);
  console.log(`Button sounds ${audioSystem.isEnabled ? 'enabled' : 'disabled'}`);
  return audioSystem.isEnabled;
};

export const setButtonVolume = (volume) => {
  audioSystem.setVolume(volume);
  console.log(`Button volume set to ${audioSystem.volume}`);
  return audioSystem.volume;
};

// Make functions available globally for console access
if (typeof window !== 'undefined') {
  window.toggleButtonSounds = toggleButtonSounds;
  window.setButtonVolume = setButtonVolume;
}

// Export the AudioSystem class as well for custom instances
export { AudioSystem };
