const express = require('express');
const path = require('path');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy settings for Cloudflare
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
      fontSrc: ["'self'", "fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://backend.f8fixlu.cc", "https://api.open-meteo.com", "https://random-word-api.herokuapp.com", "https://api.dictionaryapi.dev"],
      frameSrc: ["'self'", "blob:", "data:"], // Allow framing of blobs and data URLs
      childSrc: ["'self'", "blob:", "data:"], // Allow child frames with blobs and data URLs
      objectSrc: ["'self'", "blob:", "data:"] // Allow objects with blob and data URLs
    }
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Enable logging in production
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// Enable gzip compression
app.use(compression());

// Enable CORS for your backend API
app.use(cors({
  origin: process.env.BACKEND_URL || 'https://backend.f8fixlu.cc', // Backend URL
  credentials: true
}));

// Serve static files with advanced caching
app.use(express.static(path.join(__dirname, 'build'), {
  maxAge: '1y', // Cache static assets for 1 year
  etag: false,  // Disable ETags for better performance
  setHeaders: (res, filePath) => {
    // Set appropriate headers for different file types
    if (filePath.endsWith('.html')) {
      // Don't cache HTML files (they contain the app entry point)
      res.setHeader('Cache-Control', 'no-cache');
    } else if (filePath.match(/\.(js|css)$/)) {
      // Cache JS/CSS files for longer periods
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (filePath.match(/\.(png|jpg|jpeg|gif|svg|ico)$/)) {
      // Cache images for a long time
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (filePath.match(/\.(woff|woff2|ttf|eot)$/)) {
      // Cache fonts for a long time
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

// Preload key resources for the main page
app.get('/', (req, res) => {
  res.setHeader('Link', [
    '</static/js/main.chunk.js>; rel="preload"; as="script"',
    '</static/css/main.chunk.css>; rel="preload"; as="style"'
  ].join(', '));
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Handle client-side routing by serving index.html for all routes (SPA routing)
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.listen(PORT, () => {
  console.log(`Tasker Frontend Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Compression: Enabled`);
  console.log(`CORS: Enabled for ${process.env.BACKEND_URL || 'https://backend.f8fixlu.cc'}`);
});

module.exports = app;