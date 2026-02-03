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
        updateLastActivity(token).catch(err => {
          console.error('Error updating session activity:', err);
        });
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

// Middleware for logging requests
function requestLogger(req, res, next) {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
}

module.exports = {
  authenticateToken,
  jsonParser,
  requestLogger
};