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
  const sql = 'SELECT id, full_name, email, password_hash, profile_image_url, welcome_shown, created_at, updated_at FROM users WHERE id = ?';
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
  const sql = 'SELECT id, full_name, email, password_hash, profile_image_url, welcome_shown, created_at, updated_at FROM users WHERE email = ?';
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
  const sql = 'SELECT id, full_name, email, password_hash, profile_image_url, created_at, updated_at, reset_token_expiry FROM users WHERE reset_token = ?';
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
  markWelcomeShown
};