const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * Check if PIN protection is enabled
 */
router.get('/enabled', (req, res, next) => {
  try {
    const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get('pin_enabled');
    const enabled = setting ? setting.value === 'true' : false;

    res.json({
      success: true,
      enabled
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Verify PIN
 */
router.post('/verify', (req, res, next) => {
  try {
    const { pin } = req.body;

    if (!pin) {
      return res.status(400).json({
        success: false,
        error: 'PIN is required'
      });
    }

    // Get stored PIN
    const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get('pin_code');
    const storedPin = setting ? setting.value : '1234';

    if (pin === storedPin) {
      res.json({
        success: true,
        message: 'PIN verified'
      });
    } else {
      res.status(401).json({
        success: false,
        error: 'Invalid PIN'
      });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * Change PIN
 */
router.post('/change', (req, res, next) => {
  try {
    const { currentPin, newPin } = req.body;

    if (!currentPin || !newPin) {
      return res.status(400).json({
        success: false,
        error: 'Current PIN and new PIN are required'
      });
    }

    // Validate new PIN (4-6 digits)
    if (!/^\d{4,6}$/.test(newPin)) {
      return res.status(400).json({
        success: false,
        error: 'PIN must be 4-6 digits'
      });
    }

    // Verify current PIN
    const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get('pin_code');
    const storedPin = setting ? setting.value : '1234';

    if (currentPin !== storedPin) {
      return res.status(401).json({
        success: false,
        error: 'Current PIN is incorrect'
      });
    }

    // Update PIN
    db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(newPin, 'pin_code');

    res.json({
      success: true,
      message: 'PIN changed successfully'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
