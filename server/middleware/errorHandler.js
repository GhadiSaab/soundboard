/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: 'File size too large. Maximum size is 10MB.'
    });
  }

  // Multer file type error
  if (err.message && err.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }

  // Multer MIME type error
  if (err.message && err.message.includes('Invalid MIME type')) {
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }

  // Audio player errors (block mode)
  if (err.message && err.message.includes('Already playing')) {
    return res.status(409).json({
      success: false,
      error: err.message
    });
  }

  // Database errors
  if (err.code === 'SQLITE_CONSTRAINT') {
    return res.status(409).json({
      success: false,
      error: 'A sound with this filename already exists.'
    });
  }

  // File not found
  if (err.code === 'ENOENT') {
    return res.status(404).json({
      success: false,
      error: 'File not found.'
    });
  }

  // Default error
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
};

module.exports = errorHandler;
