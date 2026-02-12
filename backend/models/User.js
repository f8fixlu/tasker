const { db } = require('../config/database');
const { runQuery, getRow, getAll } = require('../utils/database');
const bcrypt = require('bcrypt');
const saltRounds = 12;

// User model

// Create a new user
async function createUser(userData) {
  const { full_name, email, password_hash, profile_image_url, role } = userData;

  const sql = `
    INSERT INTO users (full_name, email, password_hash, profile_image_url, welcome_shown, role)
    VALUES (?, ?, ?, ?, 0, ?)
  `;

  const params = [full_name, email, password_hash, profile_image_url, role || null];

  try {
    const result = await runQuery(sql, params);
    return { id: result.lastID, ...userData };
  } catch (error) {
    throw new Error(`Error creating user: ${error.message}`);
  }
}

// Get user by ID
async function getUserById(id) {
  const sql = 'SELECT id, full_name, email, password_hash, profile_image_url, welcome_shown, role, created_at, updated_at, status, status_updated_at FROM users WHERE id = ?';
  const params = [id];

  try {
    const user = await getRow(sql, params);
    return user;
  } catch (error) {
    throw new Error(`Error fetching user: ${error.message}`);
  }
}

// Get user by email
async function getUserByEmail(email) {
  const sql = 'SELECT id, full_name, email, password_hash, profile_image_url, welcome_shown, role, created_at, updated_at, status, status_updated_at FROM users WHERE email = ?';
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
  if (userData.status !== undefined) {
    fields.push('status = ?');
    params.push(userData.status);
  }

  // Add updated_at timestamp
  fields.push('updated_at = CURRENT_TIMESTAMP');
  
  // Add status_updated_at timestamp if status is being updated
  if (userData.status !== undefined) {
    fields.push('status_updated_at = CURRENT_TIMESTAMP');
  }
  
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
  const sql = 'SELECT id, full_name, email, password_hash, profile_image_url, created_at, updated_at, reset_token_expiry, status, status_updated_at FROM users WHERE reset_token = ?';
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
async function updateUserStatus(userId, status, customReason = null) {
  const { runQuery, getRow } = require('../utils/database');
  const StatusTracker = require('../utils/statusTracker');

  try {
    // Get current status to log the change
    const currentUser = await getRow('SELECT status FROM users WHERE id = ?', [userId]);
    const previousStatus = currentUser?.status || 'unknown';

    const sql = 'UPDATE users SET status = ?, status_updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    const params = [status, userId];

    const result = await runQuery(sql, params);
    
    // Log the status change if the update was successful
    if (result.changes > 0) {
      let reason = customReason || 'manual_update';
      if (!customReason) { // Only auto-determine reason if not provided
        if (status === 'online') reason = 'login';
        else if (status === 'pending_offline') reason = 'logout';
        else if (status === 'offline') reason = 'cleanup_service';
      }
      
      await StatusTracker.logStatusChange(userId, previousStatus, status, reason);
    }
    
    return result.changes > 0;
  } catch (error) {
    throw new Error(`Error updating user status: ${error.message}`);
  }
}

// Get users with pending offline status
async function getUsersWithPendingOffline() {
  const { getAll } = require('../utils/database');

  try {
    const sql = `
      SELECT id, email, status_updated_at
      FROM users
      WHERE status = 'pending_offline'
      AND datetime(status_updated_at) <= datetime('now', '-30 seconds')
    `;

    const users = await getAll(sql);
    return users;
  } catch (error) {
    throw new Error(`Error fetching users with pending offline status: ${error.message}`);
  }
}

// Get user online status based on sessions and user status
async function getUserOnlineStatus(userId) {
  const { getRow } = require('../utils/database');

  try {
    // First check if user has explicit status
    const userSql = 'SELECT status, status_updated_at FROM users WHERE id = ?';
    const user = await getRow(userSql, [userId]);

    if (user) {
      // If user is explicitly online, return online
      if (user.status === 'online') {
        return 'online';
      }
      
      // If user is pending_offline and within 30 seconds window, still show as online
      if (user.status === 'pending_offline') {
        const statusTime = new Date(user.status_updated_at);
        const now = new Date();
        const diffInSeconds = (now - statusTime) / 1000;
        
        if (diffInSeconds < 30) {
          return 'online';
        } else {
          return 'offline';
        }
      }
      
      // If user is offline, check sessions to see if they might be online
      if (user.status === 'offline') {
        const sessionSql = `
          SELECT COUNT(*) as active_sessions
          FROM sessions
          WHERE user_id = ? 
          AND expires_at > CURRENT_TIMESTAMP 
          AND last_activity_at > datetime('now', '-5 minutes')
        `;
        
        const sessionResult = await getRow(sessionSql, [userId]);

        if (sessionResult && sessionResult.active_sessions > 0) {
          // Don't automatically update status - just return online for display purposes
          return 'online';
        }
      }
    }

    // Default to offline
    return 'offline';
  } catch (error) {
    console.error(`Error getting user online status for user ${userId}:`, error);
    return 'offline';
  }
}

// Set user status to online (for login/heartbeat)
async function setUserOnline(userId) {
  return await updateUserStatus(userId, 'online', 'activity'); // Using 'activity' to indicate non-login online status
}

// Set user status to pending offline (for logout)
async function setUserPendingOffline(userId) {
  return await updateUserStatus(userId, 'pending_offline', 'logout');
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
  getUserOnlineStatus,
  setUserOnline,
  setUserPendingOffline
};