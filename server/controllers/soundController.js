const db = require('../db');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * Get all sounds from the database
 */
const getAllSounds = (req, res, next) => {
  try {
    const sounds = db.prepare('SELECT * FROM sounds ORDER BY uploaded_at DESC').all();
    res.json({
      success: true,
      sounds
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get a single sound by ID
 */
const getSoundById = (req, res, next) => {
  try {
    const { id } = req.params;
    const sound = db.prepare('SELECT * FROM sounds WHERE id = ?').get(id);

    if (!sound) {
      return res.status(404).json({
        success: false,
        error: 'Sound not found'
      });
    }

    res.json({
      success: true,
      sound
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Upload a new sound
 */
const uploadSound = (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const soundId = uuidv4();
    const soundName = req.body.name || path.parse(req.file.originalname).name;

    const insertSound = db.prepare(`
      INSERT INTO sounds (id, name, filename, file_path, mime_type, file_size, uploaded_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    insertSound.run(
      soundId,
      soundName,
      req.file.filename,
      req.file.path,
      req.file.mimetype,
      req.file.size
    );

    const sound = db.prepare('SELECT * FROM sounds WHERE id = ?').get(soundId);

    res.status(201).json({
      success: true,
      message: 'Sound uploaded successfully',
      sound
    });
  } catch (err) {
    // If there's an error, delete the uploaded file
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, (unlinkErr) => {
        if (unlinkErr) console.error('Error deleting file:', unlinkErr);
      });
    }
    next(err);
  }
};

/**
 * Delete a sound
 */
const deleteSound = (req, res, next) => {
  try {
    const { id } = req.params;
    const sound = db.prepare('SELECT * FROM sounds WHERE id = ?').get(id);

    if (!sound) {
      return res.status(404).json({
        success: false,
        error: 'Sound not found'
      });
    }

    // Delete the file from disk
    if (fs.existsSync(sound.file_path)) {
      fs.unlinkSync(sound.file_path);
    }

    // Delete from database
    db.prepare('DELETE FROM sounds WHERE id = ?').run(id);

    res.json({
      success: true,
      message: 'Sound deleted successfully'
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllSounds,
  getSoundById,
  uploadSound,
  deleteSound
};
