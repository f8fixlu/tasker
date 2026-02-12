const jwt = require('jsonwebtoken');
const { db } = require('../config/database');
const { JWT_SECRET } = require('../config/auth');
const { verifyAccessToken } = require('../utils/jwtManagement');
const { updateLastActivity } = require('../models/Session');

// Middleware to authenticate token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  console.log('Authentication attempt for path:', req.url);
  console.log('Authorization header:', authHeader);
  console.log('Extracted token:', token ? 'Present' : 'Missing');
  console.log('Token length:', token && typeof token === 'string' ? token.length : 'N/A or not string');

  if (!token) {
    console.log('No token provided, returning 401');
    return res.writeHead(401, { 'Content-Type': 'application/json' })
      .end(JSON.stringify({ error: 'Access token is required' }));
  }

  console.log('verifyAccessToken function exists:', typeof verifyAccessToken);
  if (typeof verifyAccessToken !== 'function') {
    console.error('verifyAccessToken is not a function! Value:', verifyAccessToken);
    console.error('Available functions from jwtManagement:', Object.keys(require('../utils/jwtManagement')));
    return res.writeHead(500, { 'Content-Type': 'application/json' })
      .end(JSON.stringify({ error: 'Server configuration error: Authentication service unavailable' }));
  }
  
  // Use Promise-based approach with better error handling
  const verificationPromise = verifyAccessToken(token);
  
  // Ensure we have a proper Promise
  if (!verificationPromise || typeof verificationPromise.then !== 'function') {
    console.error('verifyAccessToken did not return a Promise');
    return res.writeHead(403, { 'Content-Type': 'application/json' })
      .end(JSON.stringify({ error: 'Authentication error: Invalid token verification result' }));
  }
  
  // Handle the promise with proper error handling to avoid the .catch() error
  verificationPromise.then(
    // Success handler
    (user) => {
      console.log('Token verification successful, user:', user);
      req.user = user;

      // Update the last activity time for the session
      if (token) {
        // Decode the token to get the user ID
        const decoded = jwt.decode(token);
        if (decoded && decoded.id) {
          // Update the session activity for the user
          const { runQuery } = require('../utils/database');
          runQuery(`
            UPDATE sessions
            SET last_activity_at = CURRENT_TIMESTAMP
            WHERE user_id = ? AND expires_at > CURRENT_TIMESTAMP
          `, [decoded.id]).catch(err => {
            console.error('Error updating session activity:', err);
          });
        }
      }

      next();
    },
    // Error handler (this replaces .catch)
    (error) => {
      console.log('Token verification failed with error:', error.message);
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
    // This catch is a safeguard for any errors in the then() handlers
    console.error('Unexpected error in authentication:', error);
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
  
  console.log('DEBUG: Checking admin status for user:', user.email);
  console.log('DEBUG: ADMIN_EMAILS environment variable:', process.env.ADMIN_EMAILS);
  console.log('DEBUG: Parsed admin emails:', adminEmails);
  console.log('DEBUG: Does user email match?', adminEmails.includes(user.email.toLowerCase()));
  console.log('DEBUG: Does user have role?', user.role && user.role.toLowerCase() === 'admin');
  
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
  
  console.log('DEBUG ensureAdminRole: Checking user:', user.email);
  console.log('DEBUG ensureAdminRole: ADMIN_EMAILS environment variable:', process.env.ADMIN_EMAILS);
  console.log('DEBUG ensureAdminRole: Parsed admin emails:', adminEmails);
  console.log('DEBUG ensureAdminRole: Does user email match?', adminEmails.includes(user.email.toLowerCase()));
  console.log('DEBUG ensureAdminRole: Current user role:', user.role);
  
  if (adminEmails.includes(user.email.toLowerCase())) {
    // If user is in admin list but doesn't have role set, update their role
    if (!user.role || user.role.toLowerCase() !== 'admin') {
      console.log('DEBUG ensureAdminRole: Setting role to admin for user:', user.email);
      user.role = 'admin';
    } else {
      console.log('DEBUG ensureAdminRole: User already has admin role:', user.role);
    }
  } else {
    console.log('DEBUG ensureAdminRole: User email does not match admin emails');
  }
  
  return user;
}

// Middleware for logging requests
function requestLogger(req, res, next) {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
}

module.exports = {
  authenticateToken,
  jsonParser,
  requestLogger,
  isAdmin,
  ensureAdminRole
};