// Secure file storage utilities

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
const SECURE_UPLOAD_DIR = path.join(UPLOAD_DIR, 'secure');

// Ensure upload directories exist
function ensureDirectories() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
  
  if (!fs.existsSync(SECURE_UPLOAD_DIR)) {
    fs.mkdirSync(SECURE_UPLOAD_DIR, { recursive: true });
  }
}

// Generate a unique filename
function generateUniqueFilename(originalName) {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  const extension = path.extname(originalName);
  const basename = path.basename(originalName, extension);
  
  // Limit basename to prevent overly long filenames
  const safeBasename = basename.substring(0, 50).replace(/[^a-zA-Z0-9-_]/g, '_');
  
  return `${safeBasename}_${timestamp}_${randomString}${extension}`;
}

// Validate and sanitize file path
function sanitizeFilePath(filepath) {
  // Resolve the path to prevent directory traversal attacks
  const resolvedPath = path.resolve(filepath);

  // Ensure the path is within the secure upload directory
  const secureBase = path.resolve(SECURE_UPLOAD_DIR);
  if (!resolvedPath.startsWith(secureBase)) {
    throw new Error('File path is outside of allowed directory');
  }

  return resolvedPath;
}

// Store file securely
async function storeFile(fileBuffer, originalName, userId) {
  try {
    // Ensure directories exist
    ensureDirectories();
    
    // Generate unique filename
    const uniqueFilename = generateUniqueFilename(originalName);
    
    // Create user-specific directory
    const userDir = path.join(SECURE_UPLOAD_DIR, userId.toString());
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    
    // Full file path
    const filepath = path.join(userDir, uniqueFilename);
    
    // Write file
    await fs.promises.writeFile(filepath, fileBuffer);
    
    // Calculate file hash for integrity checking
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    
    return {
      filepath,
      filename: uniqueFilename,
      fileHash,
      fileSize: fileBuffer.length
    };
  } catch (error) {
    throw new Error(`Error storing file: ${error.message}`);
  }
}

// Retrieve file securely
async function retrieveFile(filepath, userId) {
  try {
    // Sanitize file path
    const safePath = sanitizeFilePath(filepath);
    
    // Check if file belongs to user
    const userDir = path.join(SECURE_UPLOAD_DIR, userId.toString());
    if (!safePath.startsWith(userDir)) {
      throw new Error('Access denied: File does not belong to user');
    }
    
    // Check if file exists
    if (!fs.existsSync(safePath)) {
      throw new Error('File not found');
    }
    
    // Read file
    const fileBuffer = await fs.promises.readFile(safePath);
    
    return fileBuffer;
  } catch (error) {
    throw new Error(`Error retrieving file: ${error.message}`);
  }
}

// Delete file securely
async function deleteFile(filepath, userId) {
  try {
    // Sanitize file path
    const safePath = sanitizeFilePath(filepath);
    
    // Check if file belongs to user
    const userDir = path.join(SECURE_UPLOAD_DIR, userId.toString());
    if (!safePath.startsWith(userDir)) {
      throw new Error('Access denied: File does not belong to user');
    }
    
    // Check if file exists
    if (!fs.existsSync(safePath)) {
      throw new Error('File not found');
    }
    
    // Delete file
    await fs.promises.unlink(safePath);
  } catch (error) {
    throw new Error(`Error deleting file: ${error.message}`);
  }
}

// Get file info
function getFileInfo(filepath) {
  try {
    const stats = fs.statSync(filepath);
    return {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime
    };
  } catch (error) {
    throw new Error(`Error getting file info: ${error.message}`);
  }
}

module.exports = {
  ensureDirectories,
  generateUniqueFilename,
  sanitizeFilePath,
  storeFile,
  retrieveFile,
  deleteFile,
  getFileInfo,
  UPLOAD_DIR,
  SECURE_UPLOAD_DIR
};