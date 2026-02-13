const { execSync, spawn } = require('child_process');
const EventEmitter = require('events');

function commandExists(command) {
  try {
    execSync(`which ${command}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function detectPlayer() {
  const preferred = ['ffplay', 'mpg123', 'mplayer', 'mpg321'];
  for (const p of preferred) {
    if (commandExists(p)) {
      return p;
    }
  }

  // aplay has no native software gain control. If ffmpeg is available,
  // use an ffmpeg->aplay pipeline so volume remains app-local.
  if (commandExists('ffmpeg') && commandExists('aplay')) {
    return 'ffmpeg-aplay';
  }

  if (commandExists('aplay')) {
    return 'aplay';
  }

  return null;
}

const detectedPlayer = detectPlayer();
const player = detectedPlayer && detectedPlayer !== 'ffmpeg-aplay'
  ? require('play-sound')({ player: detectedPlayer })
  : null;

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

      if (!this.playerBinary) {
        const noPlayerErr = new Error('No supported audio player found');
        this.isPlaying = false;
        this.currentSound = null;
        this.emit('error', { filePath, error: noPlayerErr });
        reject(noPlayerErr);
        return;
      }

      if (this.playerBinary === 'ffmpeg-aplay') {
        this.playViaFfmpegAplay(filePath)
          .then(() => {
            const wasStoppedManually = this.isStoppedManually;
            this.isPlaying = false;
            this.currentProcess = null;
            this.currentSound = null;
            this.isStoppedManually = false;
            if (wasStoppedManually) {
              this.emit('stopped', { filePath });
            } else {
              this.emit('finished', { filePath });
            }
            resolve();
          })
          .catch((err) => {
            const wasStoppedManually = this.isStoppedManually;
            this.isPlaying = false;
            this.currentProcess = null;
            this.currentSound = null;
            this.isStoppedManually = false;

            if (wasStoppedManually) {
              this.emit('stopped', { filePath });
              resolve();
            } else {
              this.emit('error', { filePath, error: err });
              reject(err);
            }
          });
        return;
      }

      // Build software volume args for the detected player
      const playerOptions = {};
      const vol = this.currentVolume;

      if (this.playerBinary === 'ffplay') {
        const gain = (vol / 100).toFixed(2);
        playerOptions.ffplay = ['-nodisp', '-autoexit', '-loglevel', 'quiet', '-af', `volume=${gain}`];
      } else if (this.playerBinary === 'mpg123') {
        const scaledVol = Math.round((vol / 100) * 32768);
        playerOptions.mpg123 = ['-f', scaledVol.toString()];
      } else if (this.playerBinary === 'mplayer') {
        // Force software volume so app volume never changes system mixer state.
        playerOptions.mplayer = ['-really-quiet', '-softvol', '-softvol-max', '100', '-volume', vol.toString()];
      } else if (this.playerBinary === 'mpg321') {
        playerOptions.mpg321 = ['-g', vol.toString()];
      } else if (this.playerBinary === 'aplay') {
        playerOptions.aplay = ['-q'];
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
   * Play audio through ffmpeg->aplay with software gain.
   * This path is used when only ALSA aplay is available.
   * @param {string} filePath
   * @returns {Promise<void>}
   */
  playViaFfmpegAplay(filePath) {
    return new Promise((resolve, reject) => {
      const gain = (this.currentVolume / 100).toFixed(2);
      const ffmpegArgs = [
        '-hide_banner',
        '-loglevel', 'error',
        '-i', filePath,
        '-filter:a', `volume=${gain}`,
        '-f', 'wav',
        'pipe:1'
      ];

      const ffmpegProcess = spawn('ffmpeg', ffmpegArgs, {
        stdio: ['ignore', 'pipe', 'pipe']
      });
      const aplayProcess = spawn('aplay', ['-q'], {
        stdio: ['pipe', 'ignore', 'pipe']
      });

      ffmpegProcess.stdout.pipe(aplayProcess.stdin);

      let settled = false;
      const finalize = (err = null) => {
        if (settled) return;
        settled = true;
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      };

      this.currentProcess = {
        kill: () => {
          ffmpegProcess.kill('SIGTERM');
          aplayProcess.kill('SIGTERM');
        }
      };

      ffmpegProcess.on('error', (err) => {
        if (this.isStoppedManually) {
          finalize();
          return;
        }
        finalize(new Error(`ffmpeg failed: ${err.message}`));
      });

      aplayProcess.on('error', (err) => {
        if (this.isStoppedManually) {
          finalize();
          return;
        }
        finalize(new Error(`aplay failed: ${err.message}`));
      });

      ffmpegProcess.on('close', (code) => {
        if (this.isStoppedManually) return;
        if (code !== 0) {
          finalize(new Error(`ffmpeg exited with code ${code}`));
        }
      });

      aplayProcess.on('close', (code) => {
        if (this.isStoppedManually || code === 0) {
          finalize();
          return;
        }
        finalize(new Error(`aplay exited with code ${code}`));
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
