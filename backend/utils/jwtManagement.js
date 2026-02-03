// JWT token management with blacklisting

const jwt = require('jsonwebtoken');
const { db } = require('../config/database');
const { runQuery, getRow } = require('../utils/database');
const {
  JWT_SECRET,
  JWT_REFRESH_SECRET,
  JWT_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN
} = require('../config/auth');
const { isSessionInactive } = require('./sessionManagement');

// Blacklist a token
async function blacklistToken(token, userId, expiresAt) {
  const sql = `
    INSERT INTO token_blacklist (token, user_id, expires_at)
    VALUES (?, ?, ?)
  `;
  const params = [token, userId, expiresAt];
  
  try {
    await runQuery(sql, params);
    return true;
  } catch (error) {
    throw new Error(`Error blacklisting token: ${error.message}`);
  }
}

// Check if token is blacklisted
async function isTokenBlacklisted(token) {
  const sql = `
    SELECT id FROM token_blacklist 
    WHERE token = ? AND expires_at > CURRENT_TIMESTAMP
  `;
  const params = [token];
  
  try {
    const row = await getRow(sql, params);
    return !!row;
  } catch (error) {
    throw new Error(`Error checking token blacklist: ${error.message}`);
  }
}

// Clean up expired blacklisted tokens
async function cleanupExpiredTokens() {
  const sql = 'DELETE FROM token_blacklist WHERE expires_at < CURRENT_TIMESTAMP';
  
  try {
    await runQuery(sql);
    return true;
  } catch (error) {
    throw new Error(`Error cleaning up expired tokens: ${error.message}`);
  }
}

// Generate access token
async function generateAccessToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Generate refresh token
async function generateRefreshToken(payload) {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
}

// Verify access token with blacklisting check and inactivity check
async function verifyAccessToken(token) {
  // Validate inputs
  if (!token) {
    throw new Error('Token is required');
  }

  if (!JWT_SECRET) {
    console.error('JWT_SECRET is not defined');
    throw new Error('Server configuration error: JWT secret is not defined');
  }

  try {
    // Check if token is blacklisted
    const isBlacklisted = await isTokenBlacklisted(token);
    if (isBlacklisted) {
      throw new Error('Token has been revoked');
    }

    // Check if session is inactive (no activity for more than 15 minutes)
    const isInactive = await isSessionInactive(token, 15);
    if (isInactive) {
      throw new Error('Session has expired due to inactivity');
    }

    // Verify the token - jwt.verify is synchronous but the function is async
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Access token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid access token');
    }
    // Re-throw other errors as well
    throw error;
  }
}

// Verify refresh token with blacklisting check and inactivity check
async function verifyRefreshToken(token) {
  try {
    // Check if token is blacklisted
    const isBlacklisted = await isTokenBlacklisted(token);
    if (isBlacklisted) {
      throw new Error('Refresh token has been revoked');
    }

    // Check if session is inactive (no activity for more than 15 minutes)
    const isInactive = await isSessionInactive(token, 15);
    if (isInactive) {
      throw new Error('Session has expired due to inactivity');
    }

    // Verify the token
    return jwt.verify(token, JWT_REFRESH_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Refresh token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid refresh token');
    }
    throw error;
  }
}

// Revoke a token (add to blacklist)
async function revokeToken(token, userId) {
  try {
    // Decode the token to get expiration time
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      throw new Error('Invalid token');
    }
    
    // Add token to blacklist
    const expiresAt = new Date(decoded.exp * 1000); // Convert seconds to milliseconds
    await blacklistToken(token, userId, expiresAt);
    
    return true;
  } catch (error) {
    throw new Error(`Error revoking token: ${error.message}`);
  }
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  revokeToken,
  blacklistToken,
  isTokenBlacklisted,
  cleanupExpiredTokens
};