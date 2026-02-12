const player = require('play-sound')();
const EventEmitter = require('events');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class AudioPlayer extends EventEmitter {
  constructor() {
    super();
    this.queue = [];
    this.isPlaying = false;
    this.currentProcess = null;
    this.currentSound = null;
    this.isStoppedManually = false;
    this.currentVolume = 80; // Default volume
    this.volumeControl = null; // Will be detected on first use

    // Add error handler to prevent unhandled errors
    this.on('error', (err) => {
      console.error('Audio player error:', err);
    });

    // Detect available volume control on startup
    this.detectVolumeControl();
  }

  /**
   * Detect which ALSA volume control is available
   * @returns {Promise<void>}
   */
  async detectVolumeControl() {
    try {
      // Try different common controls in order of preference for Raspberry Pi
      const controlsToTry = [
        'PCM',           // Digital audio control (common on RPi)
        'Master',        // Main volume control
        'Headphone',     // Headphone output
        'Speaker',       // Speaker output
        'Digital',       // Alternative digital control
        'Playback'       // Generic playback control
      ];

      for (const control of controlsToTry) {
        try {
          // Test if this control exists and is writable
          await execAsync(`amixer sget '${control}' 2>/dev/null`);
          this.volumeControl = control;
          console.log(`✓ Volume control detected: ${control}`);
          return;
        } catch (err) {
          // Control not available, try next
          continue;
        }
      }

      console.warn('⚠ No volume control detected. Volume changes may not work.');
    } catch (err) {
      console.warn('⚠ Could not detect volume control:', err.message);
    }
  }

  /**
   * Set system volume using amixer
   * @param {number} volumePercent - Volume level (0-100)
   * @returns {Promise<void>}
   */
  async setVolume(volumePercent) {
    try {
      this.currentVolume = Math.max(0, Math.min(100, volumePercent));

      // If no control detected yet, try to detect it now
      if (!this.volumeControl) {
        await this.detectVolumeControl();
      }

      if (this.volumeControl) {
        // Set volume using the detected control
        const cmd = `amixer sset '${this.volumeControl}' ${this.currentVolume}% unmute 2>&1`;
        const { stdout, stderr } = await execAsync(cmd);

        // Log success
        console.log(`♪ Volume set to ${this.currentVolume}% via ${this.volumeControl}`);

        // Also try to unmute if there's a mute switch
        try {
          await execAsync(`amixer sset '${this.volumeControl}' unmute 2>/dev/null`);
        } catch (e) {
          // Ignore unmute errors - some controls don't have mute
        }
      } else {
        console.warn(`⚠ No volume control available. Volume change to ${this.currentVolume}% skipped.`);
      }
    } catch (err) {
      console.warn(`⚠ Could not set system volume to ${volumePercent}%:`, err.message);
      // Continue anyway - volume control is optional
    }
  }

  /**
   * Play a sound file based on the specified mode
   * @param {string} filePath - Path to the audio file
   * @param {string} mode - Playback mode: 'queue', 'interrupt', or 'block'
   * @param {number} volume - Volume level (0-100), optional
   * @returns {Promise<void>}
   */
  async play(filePath, mode = 'queue', volume = null) {
    // Set volume if provided
    if (volume !== null) {
      await this.setVolume(volume);
    }

    if (mode === 'queue') {
      this.queue.push(filePath);
      if (!this.isPlaying) {
        await this.processQueue();
      }
    } else if (mode === 'interrupt') {
      this.stop();
      await this.playNow(filePath);
    } else if (mode === 'block') {
      if (this.isPlaying) {
        throw new Error('Already playing a sound. Please wait until it finishes.');
      }
      await this.playNow(filePath);
    } else {
      throw new Error(`Invalid playback mode: ${mode}`);
    }
  }

  /**
   * Play a sound immediately
   * @param {string} filePath - Path to the audio file
   * @returns {Promise<void>}
   */
  playNow(filePath) {
    return new Promise((resolve, reject) => {
      this.isPlaying = true;
      this.currentSound = filePath;
      this.isStoppedManually = false;

      this.emit('playing', { filePath });

      this.currentProcess = player.play(filePath, (err) => {
        const wasStoppedManually = this.isStoppedManually;

        this.isPlaying = false;
        this.currentProcess = null;
        this.currentSound = null;
        this.isStoppedManually = false;

        // If we manually stopped it, don't treat it as an error
        if (wasStoppedManually) {
          this.emit('stopped', { filePath });
          resolve();
        } else if (err) {
          // Only emit error for actual playback errors, not stop/kill
          this.emit('error', { filePath, error: err });
          reject(err);
        } else {
          this.emit('finished', { filePath });
          resolve();
        }
      });
    });
  }

  /**
   * Process the queue of sounds
   * @returns {Promise<void>}
   */
  async processQueue() {
    while (this.queue.length > 0) {
      const filePath = this.queue.shift();
      try {
        await this.playNow(filePath);
      } catch (err) {
        console.error('Error playing sound from queue:', err);
      }
    }
  }

  /**
   * Stop current playback
   */
  stop() {
    if (this.currentProcess) {
      // Mark as manually stopped before killing
      this.isStoppedManually = true;
      this.currentProcess.kill();
    }
    // Clear the queue
    this.queue = [];
  }

  /**
   * Get current playback status
   * @returns {Object} Status object
   */
  getStatus() {
    return {
      isPlaying: this.isPlaying,
      currentSound: this.currentSound,
      queueLength: this.queue.length,
      queue: this.queue
    };
  }
}

// Create a singleton instance
const audioPlayer = new AudioPlayer();

module.exports = audioPlayer;
