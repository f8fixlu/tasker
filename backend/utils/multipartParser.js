// Simple multipart form data parser for file uploads

const fs = require('fs');
const path = require('path');
const { validateFileUpload } = require('./fileValidation');

// Parse multipart form data
async function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      return reject(new Error('Content-Type must be multipart/form-data'));
    }
    
    // Extract boundary from Content-Type header
    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/);
    if (!boundaryMatch) {
      return reject(new Error('Invalid multipart boundary'));
    }
    // The boundary from regex match could be in group 1 or 2
    const boundaryStr = boundaryMatch[1] || boundaryMatch[2];
    const boundary = '--' + boundaryStr;
    
    let body = Buffer.alloc(0);
    let fileInfo = null;
    let fields = {};
    
    // Handle data chunks
    req.on('data', (chunk) => {
      try {
        body = Buffer.concat([body, chunk]);
      } catch (error) {
        reject(error);
      }
    });
    
    // Handle request end
    req.on('end', () => {
      try {
        // Split the body by boundary
        const parts = splitBufferByBoundary(body, boundary);
        
        // Process each part
        for (const part of parts) {
          if (part.length === 0) continue;
          
          try {
            // Parse part headers and content
            const { headers, content } = parsePart(part);
            
            // Check if this is a file field
            const contentDisposition = headers['content-disposition'] || '';
            if (contentDisposition && contentDisposition.includes('filename')) {
              // Extract field name and filename
              const fieldNameMatch = contentDisposition.match(/name="([^"]+)"/);
              const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
              
              if (fieldNameMatch && filenameMatch) {
                const fieldName = fieldNameMatch[1];
                const filename = filenameMatch[1];
                
                // Get file type from headers
                const fileType = headers['content-type'] || 'application/octet-stream';
                
                // Create file info object
                fileInfo = {
                  fieldName,
                  filename,
                  fileType,
                  fileSize: content.length,
                  buffer: content
                };
              }
            } else if (contentDisposition) {
              // This is a regular form field
              const fieldNameMatch = contentDisposition.match(/name="([^"]+)"/);
              if (fieldNameMatch) {
                const fieldName = fieldNameMatch[1];
                try {
                  const fieldValue = content.toString().trim();
                  fields[fieldName] = fieldValue;
                } catch (decodeError) {
                  // Skip if field value can't be decoded
                  console.warn('Could not decode field value:', decodeError.message);
                }
              }
            }
          } catch (partError) {
            console.error('Error processing multipart part:', partError);
            // Continue processing other parts
          }
        }
        
        resolve({
          fileInfo,
          fields
        });
      } catch (error) {
        reject(error);
      }
    });
    
    // Handle request errors
    req.on('error', (error) => {
      reject(error);
    });
  });
}

// Split buffer by boundary
function splitBufferByBoundary(buffer, boundary) {
  const parts = [];
  const boundaryBytes = Buffer.from(boundary);
  
  let startIndex = 0;
  let boundaryIndex;
  
  while ((boundaryIndex = buffer.indexOf(boundaryBytes, startIndex)) !== -1) {
    if (startIndex > 0) {
      // Extract part between previous boundary and current boundary
      const part = buffer.slice(startIndex, boundaryIndex);
      parts.push(part);
    }
    
    // Move past the boundary and CRLF
    startIndex = boundaryIndex + boundaryBytes.length + 2; // +2 for \r\n
  }
  
  // Handle the last part (after the final boundary)
  if (startIndex < buffer.length) {
    const lastPart = buffer.slice(startIndex);
    // Check if it's not just the closing boundary
    if (!lastPart.toString().trim().startsWith('--')) {
      parts.push(lastPart);
    }
  }
  
  return parts;
}

// Parse part headers and content
function parsePart(part) {
  // Find the first empty line (headers/content separator)
  let separatorIndex = part.indexOf('\r\n\r\n');
  if (separatorIndex === -1) {
    // Try with just \n\n as some clients may use different line endings
    separatorIndex = part.indexOf('\n\n');
    if (separatorIndex === -1) {
      throw new Error('Invalid part format');
    }
  }

  // Extract headers
  const headersBuffer = part.slice(0, separatorIndex);
  const headersText = headersBuffer.toString();
  const headers = {};

  // Parse headers
  const headerLines = headersText.split(/\r?\n/); // Handle both \r\n and \n line endings
  for (const line of headerLines) {
    if (!line.trim()) continue; // Skip empty lines

    const colonIndex = line.indexOf(':');
    if (colonIndex !== -1) {
      const key = line.substring(0, colonIndex).trim().toLowerCase();
      const value = line.substring(colonIndex + 1).trim();
      headers[key] = value;
    }
  }

  // Calculate the actual separator length to determine content start position
  let separatorLength;
  if (separatorIndex + 4 <= part.length && part.slice(separatorIndex, separatorIndex + 4).toString() === '\r\n\r\n') {
    separatorLength = 4; // \r\n\r\n
  } else {
    separatorLength = 2; // \n\n
  }

  // Extract content (everything after the headers)
  const content = part.slice(separatorIndex + separatorLength);

  // Remove trailing CRLF if present
  if (content.length >= 2 &&
      content[content.length - 2] === 0x0D &&
      content[content.length - 1] === 0x0A) {
    return {
      headers,
      content: content.slice(0, content.length - 2)
    };
  }

  return {
    headers,
    content
  };
}

// Handle file upload with validation and secure storage
async function handleFileUpload(req, res, userId, uploadType = 'attachment') {
  try {
    // Parse multipart form data
    const { fileInfo, fields } = await parseMultipart(req);

    if (!fileInfo) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'No file uploaded' }));
    }

    // Validate file
    const fileValidation = validateFileUpload({
      filename: fileInfo.filename,
      file_type: fileInfo.fileType,
      file_size: fileInfo.fileSize
    });

    if (!fileValidation.isValid) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: fileValidation.errors.join(', ') }));
    }

    if (uploadType === 'attachment') {
      // Extract task_id and event_id from fields
      const task_id = fields.task_id ? parseInt(fields.task_id) : null;
      const event_id = fields.event_id ? parseInt(fields.event_id) : null;

      // Ensure either task_id or event_id is provided
      if (!task_id && !event_id) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Either task_id or event_id must be provided' }));
      }

      // Verify that the task or event belongs to the user
      if (task_id) {
        const { getTaskById } = require('../models/Task');
        const task = await getTaskById(task_id);
        if (!task || task.user_id !== userId) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Access denied or task not found' }));
        }
      } else if (event_id) {
        const { getEventById } = require('../models/Event');
        const event = await getEventById(event_id);
        if (!event || event.user_id !== userId) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Access denied or event not found' }));
        }
      }

      // Store file securely for attachments
      const { storeFile } = require('./secureFileStorage');
      const { filepath, filename, fileHash, fileSize } = await storeFile(
        fileInfo.buffer,
        fileInfo.filename,
        userId
      );

      // Import createAttachment after the function is defined to avoid circular dependency
      const Attachment = require('../models/Attachment');

      // Create attachment record
      const attachment = {
        filename,
        filepath,
        file_type: fileInfo.fileType,
        file_size: fileSize,
        file_hash: fileHash,
        task_id: task_id || null,
        event_id: event_id || null,
        user_id: userId
      };

      const newAttachment = await Attachment.createAttachment(attachment);

      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ attachment: newAttachment }));
    } else if (uploadType === 'profile') {
      // Handle profile image upload with optimization
      const fs = require('fs');
      const path = require('path');
      const { UPLOAD_DIR } = require('./secureFileStorage');
      const { optimizeImage, getOptimizationSettings } = require('./imageOptimizer');

      // Get optimization settings for profile images
      const optimizationSettings = getOptimizationSettings('profile');

      // Optimize the image before saving
      const optimizedBuffer = await optimizeImage(fileInfo.buffer, optimizationSettings);

      // Store file securely in a user-specific directory for profile images
      const profileDir = path.join(UPLOAD_DIR, 'profiles', userId.toString());

      // Create profile directory if it doesn't exist
      if (!fs.existsSync(profileDir)) {
        fs.mkdirSync(profileDir, { recursive: true });
      }

      // Generate a unique filename based on user ID and timestamp
      const ext = path.extname(fileInfo.filename);
      const filename = `profile_${userId}_${Date.now()}.jpg`; // Convert to jpg for consistency and smaller size
      const filepath = path.join(profileDir, filename);

      // Write the optimized file
      fs.writeFileSync(filepath, optimizedBuffer);

      // Calculate file size and hash
      const fileSize = optimizedBuffer.length; // Use optimized buffer size
      const crypto = require('crypto');
      const fileHash = crypto.createHash('md5').update(optimizedBuffer).digest('hex');

      // Update user's profile image URL with the full URL using the request's host
      const protocol = req.headers['x-forwarded-proto'] || 'http'; // Use forwarded protocol if available
      const host = req.headers['x-forwarded-host'] || req.headers['host'] || '';

      let profileImageUrl;
      if (host) {
        // Use the actual host from the request (useful for proxies like Cloudflare)
        profileImageUrl = `${protocol}://${host}/uploads/profiles/${userId}/${filename}`;
      } else {
        // Fallback to environment variables
        const BACKEND_PORT = process.env.PORT || 5000;
        const BACKEND_HOST = process.env.BACKEND_HOST || 'localhost';
        profileImageUrl = `http://${BACKEND_HOST}:${BACKEND_PORT}/uploads/profiles/${userId}/${filename}`;
      }
      const User = require('../models/User');

      // Update only the profile_image_url field
      const updateData = {
        profile_image_url: profileImageUrl
      };
      const updateSuccess = await User.updateUser(userId, updateData);

      if (!updateSuccess) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'User not found for profile image update' }));
      }

      // Get updated user data to return
      const { getUserById } = require('../models/User');
      const updatedUser = await getUserById(userId);
      if (!updatedUser) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Failed to retrieve updated user data' }));
      }

      // Return updated user info (excluding password hash)
      const { password_hash: _, ...userResponse } = updatedUser;

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        user: userResponse,
        message: 'Profile image updated successfully'
      }));
    } else {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Invalid upload type' }));
    }
  } catch (error) {
    console.error('File upload error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during file upload' }));
  }
}

module.exports = {
  parseMultipart,
  handleFileUpload
};