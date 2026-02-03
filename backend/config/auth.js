const crypto = require('crypto');

// Generate a random secret key for JWT
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || crypto.randomBytes(64).toString('hex');

console.log('JWT_SECRET loaded (first 20 chars):', typeof JWT_SECRET === 'string' ? JWT_SECRET.substring(0, 20) + '...' : 'NOT A STRING');

module.exports = {
  JWT_SECRET,
  JWT_REFRESH_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',        // 8 hours
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '1d'  // 1 day
};