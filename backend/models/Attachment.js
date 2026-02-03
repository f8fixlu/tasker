const { db } = require('../config/database');
const { runQuery, getRow, getAll } = require('../utils/database');

// Attachment model

// Create a new attachment
async function createAttachment(attachmentData) {
  const { filename, filepath, file_type, file_size, task_id, event_id, user_id } = attachmentData;
  
  const sql = `
    INSERT INTO attachments (filename, filepath, file_type, file_size, task_id, event_id, user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  
  const params = [filename, filepath, file_type, file_size, task_id, event_id, user_id];
  
  try {
    const result = await runQuery(sql, params);
    return { id: result.lastID, ...attachmentData };
  } catch (error) {
    throw new Error(`Error creating attachment: ${error.message}`);
  }
}

// Get attachment by ID
async function getAttachmentById(id) {
  const sql = `
    SELECT id, filename, filepath, file_type, file_size, task_id, event_id, user_id, created_at
    FROM attachments 
    WHERE id = ?
  `;
  const params = [id];
  
  try {
    const attachment = await getRow(sql, params);
    return attachment;
  } catch (error) {
    throw new Error(`Error fetching attachment: ${error.message}`);
  }
}

// Get attachments by user ID
async function getAttachmentsByUserId(user_id, options = {}) {
  let sql = `
    SELECT id, filename, filepath, file_type, file_size, task_id, event_id, user_id, created_at
    FROM attachments 
    WHERE user_id = ?
  `;
  const params = [user_id];
  
  // Filter by task or event if provided
  if (options.task_id) {
    sql += ` AND task_id = ?`;
    params.push(options.task_id);
  } else if (options.event_id) {
    sql += ` AND event_id = ?`;
    params.push(options.event_id);
  }
  
  sql += ` ORDER BY created_at DESC`;
  
  // Add pagination
  if (options.limit) {
    sql += ` LIMIT ?`;
    params.push(options.limit);
    
    if (options.offset) {
      sql += ` OFFSET ?`;
      params.push(options.offset);
    }
  }
  
  try {
    const attachments = await getAll(sql, params);
    return attachments;
  } catch (error) {
    throw new Error(`Error fetching attachments: ${error.message}`);
  }
}

// Delete attachment
async function deleteAttachment(id) {
  // First, get the attachment to retrieve the file path
  const attachment = await getAttachmentById(id);
  if (!attachment) {
    return false; // Attachment doesn't exist
  }
  
  const sql = 'DELETE FROM attachments WHERE id = ?';
  const params = [id];
  
  try {
    const result = await runQuery(sql, params);
    const deleted = result.changes > 0;
    
    if (deleted && attachment.filepath) {
      // If the attachment was successfully deleted from DB, try to delete the file
      try {
        const { deleteFile } = require('../utils/secureFileStorage');
        await deleteFile(attachment.filepath, attachment.user_id);
        console.log(`Deleted attachment file: ${attachment.filepath}`);
      } catch (fileError) {
        // Log the error but don't fail the operation since the DB record is already deleted
        console.error(`Error deleting attachment file ${attachment.filepath}:`, fileError.message);
      }
    }
    
    return deleted;
  } catch (error) {
    throw new Error(`Error deleting attachment: ${error.message}`);
  }
}

// Get attachments by task ID
async function getAttachmentsByTaskId(task_id) {
  const sql = `
    SELECT id, filename, filepath, file_type, file_size, user_id, created_at
    FROM attachments 
    WHERE task_id = ?
    ORDER BY created_at DESC
  `;
  const params = [task_id];
  
  try {
    const attachments = await getAll(sql, params);
    return attachments;
  } catch (error) {
    throw new Error(`Error fetching attachments by task ID: ${error.message}`);
  }
}

// Get attachments by event ID
async function getAttachmentsByEventId(event_id) {
  const sql = `
    SELECT id, filename, filepath, file_type, file_size, user_id, created_at
    FROM attachments 
    WHERE event_id = ?
    ORDER BY created_at DESC
  `;
  const params = [event_id];
  
  try {
    const attachments = await getAll(sql, params);
    return attachments;
  } catch (error) {
    throw new Error(`Error fetching attachments by event ID: ${error.message}`);
  }
}

module.exports = {
  createAttachment,
  getAttachmentById,
  getAttachmentsByUserId,
  deleteAttachment,
  getAttachmentsByTaskId,
  getAttachmentsByEventId
};