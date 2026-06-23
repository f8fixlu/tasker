const { db } = require('../config/database');
const { runQuery, getRow, getAll } = require('../utils/database');
const bcrypt = require('bcrypt');
const saltRounds = 12;

// User model

// Create a new user
async function createUser(userData) {
  const { full_name, email, password_hash, profile_image_url } = userData;

  const sql = `
    INSERT INTO users (full_name, email, password_hash, profile_image_url, welcome_shown)
    VALUES (?, ?, ?, ?, 0)
  `;

  const params = [full_name, email, password_hash, profile_image_url];

  try {
    const result = await runQuery(sql, params);
    return { id: result.lastID, ...userData };
  } catch (error) {
    throw new Error(`Error creating user: ${error.message}`);
  }
}

// Get user by ID
async function getUserById(id) {
  const sql = 'SELECT id, full_name, email, password_hash, profile_image_url, welcome_shown, role, status, created_at, updated_at, signatories, header_image, footer_image, show_default_header, report_title, header_on_all_pages FROM users WHERE id = ?';
  const params = [id];

  try {
    const user = await getRow(sql, params);
    // Parse signatories if it exists and is a string
    if (user && user.signatories) {
      try {
        user.signatories = JSON.parse(user.signatories);
      } catch (parseError) {
        console.error('Error parsing signatories:', parseError);
        // If parsing fails, return as-is or set to empty array
        user.signatories = [];
      }
    }
    return user;
  } catch (error) {
    throw new Error(`Error fetching user: ${error.message}`);
  }
}

// Get user by email
async function getUserByEmail(email) {
  const sql = 'SELECT id, full_name, email, password_hash, profile_image_url, welcome_shown, role, status, created_at, updated_at FROM users WHERE email = ?';
  const params = [email];

  try {
    const user = await getRow(sql, params);
    return user;
  } catch (error) {
    throw new Error(`Error fetching user by email: ${error.message}`);
  }
}

// Update user
async function updateUser(id, userData) {
  // Build dynamic SQL query based on provided fields
  const fields = [];
  const params = [];

  if (userData.full_name !== undefined) {
    fields.push('full_name = ?');
    params.push(userData.full_name);
  }
  if (userData.email !== undefined) {
    fields.push('email = ?');
    params.push(userData.email);
  }
  if (userData.profile_image_url !== undefined) {
    fields.push('profile_image_url = ?');
    params.push(userData.profile_image_url);
  }
  if (userData.role !== undefined) {
    fields.push('role = ?');
    params.push(userData.role);
  }
  if (userData.signatories !== undefined) {
    // Convert signatories object/array to JSON string for storage
    const signatoriesJson = typeof userData.signatories === 'string' 
      ? userData.signatories 
      : JSON.stringify(userData.signatories);
    fields.push('signatories = ?');
    params.push(signatoriesJson);
  }
  if (userData.header_image !== undefined) {
    fields.push('header_image = ?');
    params.push(userData.header_image);
  }
  if (userData.footer_image !== undefined) {
    fields.push('footer_image = ?');
    params.push(userData.footer_image);
  }
  if (userData.show_default_header !== undefined) {
    fields.push('show_default_header = ?');
    params.push(userData.show_default_header ? 1 : 0);
  }
  if (userData.report_title !== undefined) {
    fields.push('report_title = ?');
    params.push(userData.report_title);
  }
  if (userData.header_on_all_pages !== undefined) {
    fields.push('header_on_all_pages = ?');
    params.push(userData.header_on_all_pages ? 1 : 0);
  }

  // Add updated_at timestamp
  fields.push('updated_at = CURRENT_TIMESTAMP');
  // Add the ID for WHERE clause
  params.push(id);

  const sql = `
    UPDATE users
    SET ${fields.join(', ')}
    WHERE id = ?
  `;

  try {
    const result = await runQuery(sql, params);
    return result.changes > 0;
  } catch (error) {
    throw new Error(`Error updating user: ${error.message}`);
  }
}

// Delete user
async function deleteUser(id) {
  const sql = 'DELETE FROM users WHERE id = ?';
  const params = [id];
  
  try {
    const result = await runQuery(sql, params);
    return result.changes > 0;
  } catch (error) {
    throw new Error(`Error deleting user: ${error.message}`);
  }
}

// Hash password using bcrypt
async function hashPassword(password) {
  try {
    const salt = await bcrypt.genSalt(saltRounds);
    const hash = await bcrypt.hash(password, salt);
    return hash;
  } catch (error) {
    throw new Error(`Error hashing password: ${error.message}`);
  }
}

// Verify password using bcrypt
async function verifyPassword(password, hash) {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    throw new Error(`Error verifying password: ${error.message}`);
  }
}

// Update user password
async function updateUserPassword(userId, newPassword) {
  const { db } = require('../config/database');
  const { runQuery } = require('../utils/database');

  try {
    // Hash the new password
    const hashedPassword = await hashPassword(newPassword);

    const sql = 'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    const params = [hashedPassword, userId];

    const result = await runQuery(sql, params);
    return result.changes > 0;
  } catch (error) {
    throw new Error(`Error updating user password: ${error.message}`);
  }
}

// Update user reset token
async function updateUserResetToken(userId, resetToken, resetTokenExpiry) {
  const { db } = require('../config/database');
  const { runQuery } = require('../utils/database');

  try {
    const sql = 'UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?';
    const params = [resetToken, resetTokenExpiry, userId];

    const result = await runQuery(sql, params);
    return result.changes > 0;
  } catch (error) {
    throw new Error(`Error updating user reset token: ${error.message}`);
  }
}

// Get user by reset token
async function getUserByResetToken(resetToken) {
  const sql = 'SELECT id, full_name, email, password_hash, profile_image_url, role, status, created_at, updated_at, reset_token_expiry FROM users WHERE reset_token = ?';
  const params = [resetToken];

  try {
    const user = await getRow(sql, params);
    return user;
  } catch (error) {
    throw new Error(`Error fetching user by reset token: ${error.message}`);
  }
}

// Clear reset token
async function clearResetToken(userId) {
  const { db } = require('../config/database');
  const { runQuery } = require('../utils/database');

  try {
    const sql = 'UPDATE users SET reset_token = NULL, reset_token_expiry = NULL WHERE id = ?';
    const params = [userId];

    const result = await runQuery(sql, params);
    return result.changes > 0;
  } catch (error) {
    throw new Error(`Error clearing reset token: ${error.message}`);
  }
}

// Mark welcome modal as shown for user
async function markWelcomeShown(userId) {
  const { db } = require('../config/database');
  const { runQuery } = require('../utils/database');

  try {
    const sql = 'UPDATE users SET welcome_shown = 1 WHERE id = ?';
    const params = [userId];

    const result = await runQuery(sql, params);
    return result.changes > 0;
  } catch (error) {
    throw new Error(`Error marking welcome as shown: ${error.message}`);
  }
}

// Update user status
async function updateUserStatus(userId, newStatus, reason = '') {
  const { runQuery, getRow } = require('../utils/database');

  try {
    // Get current status from the users table
    const userResult = await getRow(`
      SELECT status as current_status
      FROM users
      WHERE id = ?
    `, [userId]);

    const currentStatus = userResult?.current_status || 'offline';

    // Update the user's status in the users table
    // Note: status_updated_at column was added in a later migration, so we handle both cases
    await runQuery(`
      UPDATE users
      SET status = ?, status_updated_at = datetime('now')
      WHERE id = ?
    `, [newStatus, userId]);

    // Insert the status change into the status_history table
    await runQuery(`
      INSERT INTO status_history (user_id, previous_status, new_status, reason)
      VALUES (?, ?, ?, ?)
    `, [userId, currentStatus, newStatus, reason]);

    return true;
  } catch (error) {
    console.error(`Error updating user status for user ${userId}:`, error);
    throw new Error(`Error updating user status: ${error.message}`);
  }
}

// Get users with pending offline status
async function getUsersWithPendingOffline() {
  const { getAll } = require('../utils/database');

  try {
    // Find users whose status is 'pending_offline' in the users table
    const sql = `
      SELECT id, email, full_name
      FROM users
      WHERE status = 'pending_offline'
    `;

    const users = await getAll(sql);
    return users;
  } catch (error) {
    console.error('Error getting users with pending offline status:', error);
    throw new Error(`Error getting users with pending offline status: ${error.message}`);
  }
}

// Set user status to pending offline
async function setUserPendingOffline(userId) {
  return await updateUserStatus(userId, 'pending_offline', 'set_pending_offline');
}

// Set user status to online
async function setUserOnline(userId) {
  return await updateUserStatus(userId, 'online', 'set_online');
}

module.exports = {
  createUser,
  getUserById,
  getUserByEmail,
  updateUser,
  deleteUser,
  hashPassword,
  verifyPassword,
  updateUserPassword,
  updateUserResetToken,
  getUserByResetToken,
  clearResetToken,
  markWelcomeShown,
  updateUserStatus,
  getUsersWithPendingOffline,
  setUserPendingOffline,
  setUserOnline
};