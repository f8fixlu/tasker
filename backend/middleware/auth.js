const jwt = require('jsonwebtoken');
const { db } = require('../config/database');
const { JWT_SECRET } = require('../config/auth');
const { verifyAccessToken } = require('../utils/jwtManagement');
const { updateLastActivity } = require('../models/Session');

// Middleware to authenticate token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.writeHead(401, { 'Content-Type': 'application/json' })
      .end(JSON.stringify({ error: 'Access token is required' }));
  }

  if (typeof verifyAccessToken !== 'function') {
    return res.writeHead(500, { 'Content-Type': 'application/json' })
      .end(JSON.stringify({ error: 'Server configuration error: Authentication service unavailable' }));
  }
  
  // Use Promise-based approach with better error handling
  const verificationPromise = verifyAccessToken(token);
  
  if (!verificationPromise || typeof verificationPromise.then !== 'function') {
    return res.writeHead(403, { 'Content-Type': 'application/json' })
      .end(JSON.stringify({ error: 'Authentication error: Invalid token verification result' }));
  }
  
  // Handle the promise with proper error handling to avoid the .catch() error
  verificationPromise.then(
    // Success handler
    (user) => {
      req.user = user;

      // Throttle session activity updates to once per 60 seconds to reduce DB writes
      if (token) {
        const decoded = jwt.decode(token);
        if (decoded && decoded.id) {
          const now = Date.now();
          if (!req._lastSessionUpdate || (now - req._lastSessionUpdate > 60000)) {
            req._lastSessionUpdate = now;
            const { runQuery } = require('../utils/database');
            runQuery(`
              UPDATE sessions
              SET last_activity_at = CURRENT_TIMESTAMP
              WHERE user_id = ? AND expires_at > CURRENT_TIMESTAMP
            `, [decoded.id]).catch(err => {});
          }
        }
      }

      next();
    },
    // Error handler (this replaces .catch)
    (error) => {
      if (!res.headersSent) {
        if (error.message.includes('expired')) {
          return res.writeHead(403, { 'Content-Type': 'application/json' })
            .end(JSON.stringify({ error: 'Token has expired' }));
        } else if (error.message.includes('revoked') || error.message.includes('Invalid')) {
          return res.writeHead(403, { 'Content-Type': 'application/json' })
            .end(JSON.stringify({ error: 'Invalid token' }));
        } else {
          return res.writeHead(403, { 'Content-Type': 'application/json' })
            .end(JSON.stringify({ error: 'Invalid token' }));
        }
      }
    }
  ).catch((error) => {
    if (!res.headersSent) {
      return res.writeHead(500, { 'Content-Type': 'application/json' })
        .end(JSON.stringify({ error: 'Internal server error during authentication' }));
    }
  });
}

// Middleware for handling JSON requests
function jsonParser(req, res, next) {
  // Check if this is a multipart request and skip JSON parsing for those
  const contentType = req.headers['content-type'];
  if (contentType && contentType.includes('multipart/form-data')) {
    // For multipart requests, just continue without parsing JSON
    // Don't set up data/end listeners as they would consume the request stream
    // The multipart parser in handleFileUpload will handle the request body
    req.body = {};
    next();
    return;
  }

  let body = '';

  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', () => {
    if (body) {
      try {
        req.body = JSON.parse(body);
      } catch (error) {
        return res.writeHead(400, { 'Content-Type': 'application/json' })
          .end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    } else {
      // Initialize empty body object if no body was received
      req.body = {};
    }
    next();
  });
}

// Function to check if user is admin
function isAdmin(user) {
  // Check if user is admin based on the ADMIN_EMAILS environment variable
  if (!user || !user.email) {
    return false;
  }
  
  // Check if user's email is in the ADMIN_EMAILS list
  const adminEmails = process.env.ADMIN_EMAILS ? 
    process.env.ADMIN_EMAILS.split(',').map(email => email.trim().toLowerCase()) : 
    ['admin@example.com']; // Default admin email
  
  return adminEmails.includes(user.email.toLowerCase()) ||
         (user.role && user.role.toLowerCase() === 'admin');
}

// Function to ensure admin role is set for eligible users
function ensureAdminRole(user) {
  if (!user || !user.email) {
    return user;
  }
  
  // Check if user's email is in the ADMIN_EMAILS list
  const adminEmails = process.env.ADMIN_EMAILS ? 
    process.env.ADMIN_EMAILS.split(',').map(email => email.trim().toLowerCase()) : 
    ['admin@example.com']; // Default admin email
  
  if (adminEmails.includes(user.email.toLowerCase())) {
    if (!user.role || user.role.toLowerCase() !== 'admin') {
      user.role = 'admin';
    }
  }
  
  return user;
}

// Middleware for logging requests
function requestLogger(req, res, next) {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  }
  next();
}

module.exports = {
  authenticateToken,
  jsonParser,
  requestLogger,
  isAdmin,
  ensureAdminRole
};