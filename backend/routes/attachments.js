const url = require('url');
const { jsonParser, authenticateToken } = require('../middleware/auth');
const { validateFileUpload } = require('../utils/fileValidation');
const { storeFile } = require('../utils/secureFileStorage');
const { getRow } = require('../utils/database');
const { 
  createAttachment,
  getAttachmentById,
  getAttachmentsByUserId,
  deleteAttachment,
  getAttachmentsByTaskId,
  getAttachmentsByEventId
} = require('../models/Attachment');

// Handle attachment routes
function attachmentRoutes(req, res, parsedUrl) {
  const path = parsedUrl.pathname;
  const method = req.method;
  
  // Extract attachment ID from URL if it exists
  const pathParts = path.split('/');
  const attachmentId = pathParts.length > 3 ? parseInt(pathParts[3]) : null;
  
  if (method === 'POST' && path === '/api/attachments') {
    // For file upload, we need to handle multipart data directly
    handleUploadAttachment(req, res, req.user.id);
  } else if (method === 'GET' && path === `/api/attachments/${attachmentId}`) {
    // Parse the request body for other methods (even though GET doesn't use it)
    jsonParser(req, res, async () => {
      handleGetAttachment(req, res, attachmentId, req.user.id);
    });
  } else if (method === 'DELETE' && path === `/api/attachments/${attachmentId}`) {
    // Parse the request body for other methods (even though DELETE might not use it)
    jsonParser(req, res, async () => {
      handleDeleteAttachment(req, res, attachmentId, req.user.id);
    });
  } else if (method === 'GET' && path.startsWith('/api/attachments')) {
    // Parse the request body for other methods (even though GET doesn't use it)
    jsonParser(req, res, async () => {
      // Handle query-based requests
      if (parsedUrl.query.task_id) {
        handleGetAttachmentsByTaskId(req, res, parseInt(parsedUrl.query.task_id), req.user.id);
      } else if (parsedUrl.query.event_id) {
        handleGetAttachmentsByEventId(req, res, parseInt(parsedUrl.query.event_id), req.user.id);
      } else {
        handleGetAttachments(req, res, req.user.id, parsedUrl.query);
      }
    });
  } else {
    // Parse the request body for other methods
    jsonParser(req, res, async () => {
      // Route not found
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Route not found' }));
    });
  }
}

// Handle uploading an attachment from base64 data
async function handleUploadAttachment(req, res, userId) {
  try {
    // For base64 uploads, request body will be parsed by jsonParser
    const { filename, content, file_type, file_size, task_id, event_id } = req.body;

    if (!filename || !content) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Filename and content are required' }));
    }

    // Validate file upload
    const fileValidation = validateFileUpload({
      filename,
      file_type,
      file_size
    });

    if (!fileValidation.isValid) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: fileValidation.errors.join(', ') }));
    }

    // Verify that the task or event belongs to the user (lightweight check)
    if (task_id) {
      const taskOwner = await getRow('SELECT user_id FROM tasks WHERE id = ?', [task_id]);
      if (!taskOwner || taskOwner.user_id !== userId) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Access denied or task not found' }));
      }
    } else if (event_id) {
      const eventOwner = await getRow('SELECT user_id FROM events WHERE id = ?', [event_id]);
      if (!eventOwner || eventOwner.user_id !== userId) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Access denied or event not found' }));
      }
    }

    // Convert base64 to buffer
    const fileBuffer = Buffer.from(content, 'base64');

    // Store file securely
    const { filepath, filename: storedFilename, fileHash, fileSize } = await storeFile(
      fileBuffer,
      filename,
      userId
    );

    // Import createAttachment after the function is defined to avoid circular dependency
    const { createAttachment } = require('../models/Attachment');

    // Create attachment record
    const attachment = {
      filename: storedFilename,
      filepath,
      file_type: file_type || null,
      file_size: fileSize,
      file_hash: fileHash,
      task_id: task_id || null,
      event_id: event_id || null,
      user_id: userId
    };

    const newAttachment = await createAttachment(attachment);

    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ attachment: newAttachment }));
  } catch (error) {
    console.error('File upload error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during file upload' }));
  }
}

// Handle getting an attachment
async function handleGetAttachment(req, res, attachmentId, userId) {
  try {
    const attachment = await getAttachmentById(attachmentId);

    // Check if the attachment belongs to the authenticated user
    if (!attachment || attachment.user_id !== userId) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Attachment not found' }));
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ attachment }));
  } catch (error) {
    console.error('Get attachment error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during attachment retrieval' }));
  }
}

// Handle getting attachments by user
async function handleGetAttachments(req, res, userId, query) {
  try {
    const options = {
      task_id: query.task_id ? parseInt(query.task_id) : null,
      event_id: query.event_id ? parseInt(query.event_id) : null,
      limit: query.limit ? parseInt(query.limit) : 10,
      offset: query.offset ? parseInt(query.offset) : 0
    };

    const attachments = await getAttachmentsByUserId(userId, options);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ attachments, total: attachments.length })); // In a real app, you'd return actual total
  } catch (error) {
    console.error('Get attachments error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during attachments retrieval' }));
  }
}

// Handle getting attachments by task ID
async function handleGetAttachmentsByTaskId(req, res, taskId, userId) {
  try {
    const taskOwner = await getRow('SELECT user_id FROM tasks WHERE id = ?', [taskId]);
    if (!taskOwner || taskOwner.user_id !== userId) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Access denied or task not found' }));
    }

    const attachments = await getAttachmentsByTaskId(taskId);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ attachments }));
  } catch (error) {
    console.error('Get attachments by task ID error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during attachments retrieval by task ID' }));
  }
}

// Handle getting attachments by event ID
async function handleGetAttachmentsByEventId(req, res, eventId, userId) {
  try {
    const eventOwner = await getRow('SELECT user_id FROM events WHERE id = ?', [eventId]);
    if (!eventOwner || eventOwner.user_id !== userId) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Access denied or event not found' }));
    }

    const attachments = await getAttachmentsByEventId(eventId);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ attachments }));
  } catch (error) {
    console.error('Get attachments by event ID error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during attachments retrieval by event ID' }));
  }
}

// Handle deleting an attachment
async function handleDeleteAttachment(req, res, attachmentId, userId) {
  try {
    const attachment = await getAttachmentById(attachmentId);

    // Check if the attachment belongs to the authenticated user
    if (!attachment || attachment.user_id !== userId) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Attachment not found' }));
    }

    const success = await deleteAttachment(attachmentId);

    if (!success) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Attachment not found' }));
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Attachment deleted successfully' }));
  } catch (error) {
    console.error('Delete attachment error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during attachment deletion' }));
  }
}

// Handle downloading an attachment
async function handleDownloadAttachment(req, res, attachmentId, userId) {
  try {
    const { retrieveFile } = require('../utils/secureFileStorage');
    const attachment = await getAttachmentById(attachmentId);

    // Check if the attachment belongs to the authenticated user
    if (!attachment || attachment.user_id !== userId) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Attachment not found' }));
    }

    // Retrieve the file from secure storage
    try {
      const fileBuffer = await retrieveFile(attachment.filepath, userId);

      // Set appropriate headers for file download
      res.writeHead(200, {
        'Content-Type': attachment.file_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${attachment.filename}"`,
        'Content-Length': attachment.file_size,
        'Content-Security-Policy': 'default-src \'none\''
      });

      // Send the file content
      res.end(fileBuffer);
    } catch (fileError) {
      console.error('File retrieval error:', fileError);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Error retrieving file' }));
    }
  } catch (error) {
    console.error('Download attachment error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during attachment download' }));
  }
}

// Main router function
function attachmentRoutes(req, res, parsedUrl) {
  const path = parsedUrl.pathname;
  const method = req.method;

  // Extract attachment ID from URL if it exists
  const pathParts = path.split('/');
  const attachmentId = pathParts.length > 3 ? parseInt(pathParts[3]) : null;

  if (method === 'POST' && path === '/api/attachments/upload') {  // For file uploads
    // Parse the request body for file uploads (base64 encoded)
    jsonParser(req, res, async () => {
      handleUploadAttachment(req, res, req.user.id);
    });
  } else if (method === 'POST' && path === '/api/attachments') {
    // Parse the request body for other methods
    jsonParser(req, res, async () => {
      // Create attachment record (for when attachment details are sent separately)
      const { filename, filepath, file_type, file_size, task_id, event_id } = req.body;

      if (!filename || !filepath) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Filename and filepath are required' }));
      }

      // Validate file upload
      const fileValidation = validateFileUpload({
        filename,
        file_type,
        file_size
      });

      if (!fileValidation.isValid) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: fileValidation.errors.join(', ') }));
      }

      // Verify that the task or event belongs to the user (lightweight check)
      if (task_id) {
        const taskOwner = await getRow('SELECT user_id FROM tasks WHERE id = ?', [task_id]);
        if (!taskOwner || taskOwner.user_id !== req.user.id) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Access denied or task not found' }));
        }
      } else if (event_id) {
        const eventOwner = await getRow('SELECT user_id FROM events WHERE id = ?', [event_id]);
        if (!eventOwner || eventOwner.user_id !== req.user.id) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Access denied or event not found' }));
        }
      }

      const attachment = {
        filename,
        filepath,
        file_type: file_type || null,
        file_size: file_size || null,
        task_id: task_id || null,
        event_id: event_id || null,
        user_id: req.user.id
      };

      const newAttachment = await createAttachment(attachment);

      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ attachment: newAttachment }));
    });
  } else if (method === 'GET' && path === `/api/attachments/${attachmentId}/download`) {
    // Handle download requests
    handleDownloadAttachment(req, res, attachmentId, req.user.id);
  } else if (method === 'GET' && path === `/api/attachments/${attachmentId}`) {
    // Parse the request body for other methods (even though GET doesn't use it)
    jsonParser(req, res, async () => {
      handleGetAttachment(req, res, attachmentId, req.user.id);
    });
  } else if (method === 'DELETE' && path === `/api/attachments/${attachmentId}`) {
    // Parse the request body for other methods (even though DELETE might not use it)
    jsonParser(req, res, async () => {
      handleDeleteAttachment(req, res, attachmentId, req.user.id);
    });
  } else if (method === 'GET' && path.startsWith('/api/attachments')) {
    // Parse the request body for other methods (even though GET doesn't use it)
    jsonParser(req, res, async () => {
      // Handle query-based requests
      if (parsedUrl.query.task_id) {
        handleGetAttachmentsByTaskId(req, res, parseInt(parsedUrl.query.task_id), req.user.id);
      } else if (parsedUrl.query.event_id) {
        handleGetAttachmentsByEventId(req, res, parseInt(parsedUrl.query.event_id), req.user.id);
      } else {
        handleGetAttachments(req, res, req.user.id, parsedUrl.query);
      }
    });
  } else {
    // Parse the request body for other methods
    jsonParser(req, res, async () => {
      // Route not found
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Route not found' }));
    });
  }
}

module.exports = attachmentRoutes;