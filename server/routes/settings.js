const express = require('express');
const router = express.Router();
const db = require('../db');
const audioPlayer = require('../controllers/audioPlayer');

// Get all settings
router.get('/', (req, res, next) => {
  try {
    const settings = db.prepare('SELECT * FROM settings').all();

    // Convert array to object for easier access
    const settingsObject = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});

    res.json({
      success: true,
      settings: settingsObject
    });
  } catch (err) {
    next(err);
  }
});

// Get a specific setting
router.get('/:key', (req, res, next) => {
  try {
    const { key } = req.params;
    const setting = db.prepare('SELECT * FROM settings WHERE key = ?').get(key);

    if (!setting) {
      return res.status(404).json({
        success: false,
        error: 'Setting not found'
      });
    }

    res.json({
      success: true,
      setting
    });
  } catch (err) {
    next(err);
  }
});

// Update a setting
router.put('/:key', async (req, res, next) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Value is required'
      });
    }

    // Validate playback_mode values
    if (key === 'playback_mode') {
      const validModes = ['queue', 'interrupt', 'block'];
      if (!validModes.includes(value)) {
        return res.status(400).json({
          success: false,
          error: `Invalid playback mode. Valid modes are: ${validModes.join(', ')}`
        });
      }
    }

    // Validate max_file_size values
    if (key === 'max_file_size') {
      const numValue = parseInt(value);
      if (isNaN(numValue) || numValue <= 0) {
        return res.status(400).json({
          success: false,
          error: 'max_file_size must be a positive number'
        });
      }
    }

    // Validate volume values
    if (key === 'volume') {
      const numValue = parseInt(value);
      if (isNaN(numValue) || numValue < 0 || numValue > 100) {
        return res.status(400).json({
          success: false,
          error: 'Volume must be a number between 0 and 100'
        });
      }
    }

    // Update or insert setting
    const updateSetting = db.prepare(`
      INSERT INTO settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = ?
    `);

    updateSetting.run(key, value, value);

    const setting = db.prepare('SELECT * FROM settings WHERE key = ?').get(key);

    // Update audio player volume if volume setting changed
    if (key === 'volume') {
      const volumeValue = parseInt(value);
      audioPlayer.setVolume(volumeValue);
    }

    res.json({
      success: true,
      message: 'Setting updated successfully',
      setting
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
