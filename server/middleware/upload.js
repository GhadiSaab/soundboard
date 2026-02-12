const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Allowed audio MIME types
const ALLOWED_MIME_TYPES = [
  'audio/mpeg',       // MP3
  'audio/wav',        // WAV
  'audio/wave',       // WAV alternative
  'audio/x-wav',      // WAV alternative
  'audio/ogg',        // OGG
  'audio/mp4',        // M4A
  'audio/x-m4a',      // M4A alternative
  'audio/aac',        // AAC
  'audio/flac',       // FLAC
  'audio/webm'        // WEBM
];

// Allowed file extensions
const ALLOWED_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.webm'];

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uniqueId}${ext}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  // Check file extension
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(new Error(`Invalid file type. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`), false);
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error(`Invalid MIME type. File must be an audio file.`), false);
  }

  cb(null, true);
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760 // 10MB default
  }
});

module.exports = upload;
