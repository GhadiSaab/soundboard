const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Get database path from environment variable
const dbPath = process.env.DATABASE_PATH || './data/sounds.db';

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Create tables
const createSoundsTable = `
  CREATE TABLE IF NOT EXISTS sounds (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    filename TEXT NOT NULL UNIQUE,
    file_path TEXT NOT NULL,
    mime_type TEXT,
    file_size INTEGER,
    duration REAL,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`;

const createSettingsTable = `
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )
`;

db.exec(createSoundsTable);
db.exec(createSettingsTable);

// Initialize default settings if they don't exist
const insertDefaultSettings = db.prepare(`
  INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)
`);

const defaultSettings = [
  ['playback_mode', 'queue'],
  ['max_file_size', '10485760'],
  ['volume', '80'],
  ['pin_enabled', 'false'],
  ['pin_code', '1234']
];

for (const [key, value] of defaultSettings) {
  insertDefaultSettings.run(key, value);
}

console.log('Database initialized successfully');

module.exports = db;
