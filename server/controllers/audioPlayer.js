const player = require('play-sound')();
const EventEmitter = require('events');

class AudioPlayer extends EventEmitter {
  constructor() {
    super();
    this.queue = [];
    this.isPlaying = false;
    this.currentProcess = null;
    this.currentSound = null;
    this.isStoppedManually = false;

    // Add error handler to prevent unhandled errors
    this.on('error', (err) => {
      console.error('Audio player error:', err);
    });
  }

  /**
   * Play a sound file based on the specified mode
   * @param {string} filePath - Path to the audio file
   * @param {string} mode - Playback mode: 'queue', 'interrupt', or 'block'
   * @returns {Promise<void>}
   */
  async play(filePath, mode = 'queue') {
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
