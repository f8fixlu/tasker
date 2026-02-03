const { db } = require('../config/database');
const { runQuery, getRow, getAll } = require('../utils/database');
const crypto = require('crypto');

// Session model (for managing JWT refresh tokens)

// Generate a secure session ID
function generateSessionId() {
  return crypto.randomBytes(32).toString('hex');
}

// Create a new session
async function createSession(sessionData) {
  const { user_id, token, expires_at, ip_address = null, user_agent = null } = sessionData;

  // Generate a unique session ID
  const session_id = generateSessionId();

  // First, try to delete any existing session with the same token to prevent unique constraint errors
  await deleteSessionByToken(token);

  const sql = `
    INSERT INTO sessions (session_id, user_id, token, expires_at, ip_address, user_agent, last_activity_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `;

  const params = [session_id, user_id, token, expires_at, ip_address, user_agent];

  try {
    const result = await runQuery(sql, params);
    return { id: result.lastID, session_id, ...sessionData };
  } catch (error) {
    throw new Error(`Error creating session: ${error.message}`);
  }
}

// Get session by token
async function getSessionByToken(token) {
  const sql = `
    SELECT id, session_id, user_id, token, expires_at, ip_address, user_agent, created_at
    FROM sessions 
    WHERE token = ?
  `;
  const params = [token];
  
  try {
    const session = await getRow(sql, params);
    return session;
  } catch (error) {
    throw new Error(`Error fetching session: ${error.message}`);
  }
}

// Get session by session ID
async function getSessionById(session_id) {
  const sql = `
    SELECT id, session_id, user_id, token, expires_at, ip_address, user_agent, created_at
    FROM sessions 
    WHERE session_id = ?
  `;
  const params = [session_id];
  
  try {
    const session = await getRow(sql, params);
    return session;
  } catch (error) {
    throw new Error(`Error fetching session: ${error.message}`);
  }
}

// Get sessions by user ID
async function getSessionsByUserId(user_id) {
  const sql = `
    SELECT id, session_id, user_id, token, expires_at, ip_address, user_agent, created_at
    FROM sessions 
    WHERE user_id = ?
    ORDER BY created_at DESC
  `;
  const params = [user_id];
  
  try {
    const sessions = await getAll(sql, params);
    return sessions;
  } catch (error) {
    throw new Error(`Error fetching sessions: ${error.message}`);
  }
}

// Delete session by token
async function deleteSessionByToken(token) {
  const sql = 'DELETE FROM sessions WHERE token = ?';
  const params = [token];
  
  try {
    const result = await runQuery(sql, params);
    return result.changes > 0;
  } catch (error) {
    throw new Error(`Error deleting session: ${error.message}`);
  }
}

// Delete session by session ID
async function deleteSessionById(session_id) {
  const sql = 'DELETE FROM sessions WHERE session_id = ?';
  const params = [session_id];
  
  try {
    const result = await runQuery(sql, params);
    return result.changes > 0;
  } catch (error) {
    throw new Error(`Error deleting session: ${error.message}`);
  }
}

// Delete all sessions for a user (for logout all devices)
async function deleteAllSessionsForUser(user_id) {
  const sql = 'DELETE FROM sessions WHERE user_id = ?';
  const params = [user_id];
  
  try {
    const result = await runQuery(sql, params);
    return result.changes;
  } catch (error) {
    throw new Error(`Error deleting all sessions for user: ${error.message}`);
  }
}

// Delete expired sessions
async function deleteExpiredSessions() {
  const sql = 'DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP';
  
  try {
    const result = await runQuery(sql);
    return result.changes;
  } catch (error) {
    throw new Error(`Error deleting expired sessions: ${error.message}`);
  }
}

// Update session with IP address and user agent
async function updateSessionMetadata(session_id, ip_address, user_agent) {
  const sql = `
    UPDATE sessions
    SET ip_address = ?, user_agent = ?
    WHERE session_id = ?
  `;
  const params = [ip_address, user_agent, session_id];

  try {
    const result = await runQuery(sql, params);
    return result.changes > 0;
  } catch (error) {
    throw new Error(`Error updating session metadata: ${error.message}`);
  }
}

// Update session last activity time
async function updateLastActivity(token) {
  const sql = `
    UPDATE sessions
    SET last_activity_at = CURRENT_TIMESTAMP
    WHERE token = ?
  `;
  const params = [token];

  try {
    const result = await runQuery(sql, params);
    return result.changes > 0;
  } catch (error) {
    throw new Error(`Error updating session activity: ${error.message}`);
  }
}

module.exports = {
  createSession,
  getSessionByToken,
  getSessionById,
  getSessionsByUserId,
  deleteSessionByToken,
  deleteSessionById,
  deleteAllSessionsForUser,
  deleteExpiredSessions,
  updateSessionMetadata,
  updateLastActivity,
  generateSessionId
};