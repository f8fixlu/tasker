// CORS configuration for the backend
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? ['https://yourdomain.com']  // Add your production domain
  : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:8080'];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

module.exports = corsOptions;