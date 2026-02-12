const { execSync } = require('child_process');
const EventEmitter = require('events');

function detectPlayer() {
  const preferred = ['ffplay', 'mpg123', 'mplayer', 'mpg321', 'aplay'];
  for (const p of preferred) {
    try {
      execSync(`which ${p}`, { stdio: 'ignore' });
      return p;
    } catch {
      continue;
    }
  }
  return null;
}

const detectedPlayer = detectPlayer();
const player = require('play-sound')({ player: detectedPlayer });

class AudioPlayer extends EventEmitter {
  constructor() {
    super();
    this.queue = [];
    this.isPlaying = false;
    this.currentProcess = null;
    this.currentSound = null;
    this.isStoppedManually = false;
    this.currentVolume = 80; // Default volume (0-100)
    this.playerBinary = detectedPlayer;

    // Add error handler to prevent unhandled errors
    this.on('error', (err) => {
      console.error('Audio player error:', err);
    });

    console.log(`🎵 Audio player initialized using ${this.playerBinary || 'auto-detect'}`);
  }

  /**
   * Set playback volume (does not affect system volume)
   * @param {number} volumePercent - Volume level (0-100)
   */
  setVolume(volumePercent) {
    this.currentVolume = Math.max(0, Math.min(100, volumePercent));
    console.log(`♪ Playback volume set to ${this.currentVolume}%`);
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
      this.setVolume(volume);
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
   * Play a sound immediately with volume control
   * @param {string} filePath - Path to the audio file
   * @returns {Promise<void>}
   */
  playNow(filePath) {
    return new Promise((resolve, reject) => {
      this.isPlaying = true;
      this.currentSound = filePath;
      this.isStoppedManually = false;

      this.emit('playing', { filePath });

      // Build volume args for the detected player
      const playerOptions = {};
      const vol = this.currentVolume;

      if (this.playerBinary === 'ffplay') {
        playerOptions.ffplay = ['-volume', vol.toString(), '-nodisp', '-autoexit', '-loglevel', 'quiet'];
      } else if (this.playerBinary === 'mpg123') {
        const scaledVol = Math.round((vol / 100) * 32768);
        playerOptions.mpg123 = ['-f', scaledVol.toString()];
      } else if (this.playerBinary === 'mplayer') {
        playerOptions.mplayer = ['-volume', vol.toString()];
      } else if (this.playerBinary === 'mpg321') {
        playerOptions.mpg321 = ['-g', vol.toString()];
      } else if (this.playerBinary === 'afplay') {
        playerOptions.afplay = ['-v', (vol / 100).toString()];
      }

      this.currentProcess = player.play(filePath, playerOptions, (err) => {
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
