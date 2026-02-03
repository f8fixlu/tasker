// Error handling middleware
function errorHandler(err, req, res, next) {
  console.error(err.stack);
  
  // Default error
  let statusCode = 500;
  let message = 'Internal Server Error';
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = err.message;
  } else if (err.message.includes('Not allowed by CORS')) {
    statusCode = 403;
    message = 'CORS policy violation';
  } else if (err.code === 'SQLITE_CONSTRAINT') {
    statusCode = 400;
    message = 'Data constraint violation';
  }
  
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  }));
}

module.exports = {
  errorHandler
};