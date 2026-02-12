const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const soundController = require('../controllers/soundController');
const audioPlayer = require('../controllers/audioPlayer');
const db = require('../db');

// Get all sounds
router.get('/', soundController.getAllSounds);

// Get a single sound
router.get('/:id', soundController.getSoundById);

// Upload a new sound
router.post('/upload', upload.single('sound'), soundController.uploadSound);

// Update a sound name
router.patch('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Name is required'
      });
    }

    const db = require('../db');
    const sound = db.prepare('SELECT * FROM sounds WHERE id = ?').get(id);

    if (!sound) {
      return res.status(404).json({
        success: false,
        error: 'Sound not found'
      });
    }

    db.prepare('UPDATE sounds SET name = ? WHERE id = ?').run(name.trim(), id);
    const updatedSound = db.prepare('SELECT * FROM sounds WHERE id = ?').get(id);

    res.json({
      success: true,
      message: 'Sound renamed successfully',
      sound: updatedSound
    });
  } catch (err) {
    next(err);
  }
});

// Delete a sound
router.delete('/:id', soundController.deleteSound);

// Play a sound
router.post('/:id/play', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get the sound from database
    const sound = db.prepare('SELECT * FROM sounds WHERE id = ?').get(id);

    if (!sound) {
      return res.status(404).json({
        success: false,
        error: 'Sound not found'
      });
    }

    // Get playback mode from settings
    const modeSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('playback_mode');
    const playbackMode = modeSetting ? modeSetting.value : 'queue';

    // Get volume from settings
    const volumeSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('volume');
    const volume = volumeSetting ? parseInt(volumeSetting.value) : 80;

    // Play the sound with volume
    await audioPlayer.play(sound.file_path, playbackMode, volume);

    res.json({
      success: true,
      message: `Sound is playing (mode: ${playbackMode})`,
      playbackMode
    });
  } catch (err) {
    next(err);
  }
});

// Stop all playback
router.post('/stop', (req, res, next) => {
  try {
    audioPlayer.stop();
    res.json({
      success: true,
      message: 'Playback stopped'
    });
  } catch (err) {
    next(err);
  }
});

// Get playback status
router.get('/status/current', (req, res, next) => {
  try {
    const status = audioPlayer.getStatus();
    res.json({
      success: true,
      status
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
