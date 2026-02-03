// File validation utilities

// Allowed file types with their MIME types
const ALLOWED_FILE_TYPES = {
  // Images
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/gif': ['gif'],
  'image/svg+xml': ['svg'],
  'image/webp': ['webp'],
  
  // Documents
  'application/pdf': ['pdf'],
  'application/msword': ['doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
  'application/vnd.ms-excel': ['xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
  'application/vnd.ms-powerpoint': ['ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['pptx'],
  'text/plain': ['txt'],
  'text/csv': ['csv'],
  
  // Archives
  'application/zip': ['zip'],
  'application/x-rar-compressed': ['rar'],
  'application/x-7z-compressed': ['7z'],
  
  // Audio
  'audio/mpeg': ['mp3'],
  'audio/wav': ['wav'],
  'audio/ogg': ['ogg'],
  
  // Video
  'video/mp4': ['mp4'],
  'video/quicktime': ['mov'],
  'video/x-msvideo': ['avi']
};

// File extensions mapped to MIME types for reverse lookup
const EXTENSION_TO_MIME_TYPE = {};
for (const [mimeType, extensions] of Object.entries(ALLOWED_FILE_TYPES)) {
  for (const ext of extensions) {
    EXTENSION_TO_MIME_TYPE[ext.toLowerCase()] = mimeType;
  }
}

// Validate file type
function validateFileType(mimeType, fileName) {
  if (!mimeType || !fileName) {
    return false;
  }
  
  // Check if MIME type is allowed
  if (ALLOWED_FILE_TYPES[mimeType]) {
    return true;
  }
  
  // If MIME type validation fails, try to validate by extension
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (extension && EXTENSION_TO_MIME_TYPE[extension]) {
    return true;
  }
  
  return false;
}

// Default maximum file size (10MB)
const MAX_FILE_SIZE = process.env.MAX_FILE_SIZE ? parseInt(process.env.MAX_FILE_SIZE) : 10 * 1024 * 1024;

// Validate file size (in bytes)
function validateFileSize(fileSize, maxSize = MAX_FILE_SIZE) { // Default from env or 10MB
  if (typeof fileSize !== 'number' || fileSize < 0) {
    return false;
  }
  
  return fileSize <= maxSize;
}

// Get allowed file types as a readable string
function getAllowedFileTypesString() {
  const extensions = [];
  for (const exts of Object.values(ALLOWED_FILE_TYPES)) {
    extensions.push(...exts);
  }
  return extensions.join(', ');
}

// Get maximum file size as a readable string
function getMaxFileSizeString(maxSize = 10 * 1024 * 1024) {
  if (maxSize >= 1024 * 1024 * 1024) {
    return `${(maxSize / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  } else if (maxSize >= 1024 * 1024) {
    return `${(maxSize / (1024 * 1024)).toFixed(1)} MB`;
  } else if (maxSize >= 1024) {
    return `${(maxSize / 1024).toFixed(1)} KB`;
  } else {
    return `${maxSize} bytes`;
  }
}

// Validate file name for security
function validateFileName(fileName) {
  if (typeof fileName !== 'string' || fileName.length === 0) {
    return false;
  }
  
  // Check for invalid characters
  const invalidChars = /[<>:"/\\|?*\x00-\x1F]/;
  if (invalidChars.test(fileName)) {
    return false;
  }
  
  // Check for reserved names on Windows
  const reservedNames = [
    'CON', 'PRN', 'AUX', 'NUL',
    'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
    'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
  ];
  
  const nameWithoutExt = fileName.split('.')[0].toUpperCase();
  if (reservedNames.includes(nameWithoutExt)) {
    return false;
  }
  
  return true;
}

// Validate file upload
function validateFileUpload(fileData, maxSize = MAX_FILE_SIZE) {
  const errors = [];
  
  // Validate file name
  if (!validateFileName(fileData.filename)) {
    errors.push('Invalid file name');
  }
  
  // Validate file type
  if (!validateFileType(fileData.file_type, fileData.filename)) {
    errors.push(`Invalid file type. Allowed types: ${getAllowedFileTypesString()}`);
  }
  
  // Validate file size
  if (!validateFileSize(fileData.file_size, maxSize)) {
    errors.push(`File size exceeds limit of ${getMaxFileSizeString(maxSize)}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

module.exports = {
  ALLOWED_FILE_TYPES,
  EXTENSION_TO_MIME_TYPE,
  validateFileType,
  validateFileSize,
  validateFileName,
  validateFileUpload,
  getAllowedFileTypesString,
  getMaxFileSizeString
};