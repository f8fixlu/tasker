const { sanitizeInput } = require('./validation');

// Middleware to sanitize all incoming request data
function sanitizeMiddleware(req, res, next) {
  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeInput(req.query);
  }
  
  // Sanitize request body
  if (req.body) {
    req.body = sanitizeInput(req.body);
  }
  
  // Sanitize URL parameters
  if (req.params) {
    req.params = sanitizeInput(req.params);
  }
  
  next();
}

module.exports = sanitizeMiddleware;