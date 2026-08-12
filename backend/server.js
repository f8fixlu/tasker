// Load environment variables from .env file - look in project root
const path = require('path');
const fs = require('fs');

// Try to load .env from the project root (parent directory)
const rootEnvPath = path.join(__dirname, '../.env');
if (fs.existsSync(rootEnvPath)) {
  require('dotenv').config({ path: rootEnvPath });
  console.log('Environment variables loaded from project root (.env)');
} else {
  // Fallback to current directory
  require('dotenv').config();
  console.log('Environment variables loaded from current directory (.env)');
}

const http = require('http');
const url = require('url');
const zlib = require('zlib');

// Gzip cache: store compressed buffers keyed by "filePath:mtime" to avoid recompressing
const gzipCache = new Map();
const GZIP_CACHE_MAX = 200; // max entries

// Import configuration and utilities
const { setupDatabase } = require('./config/database');
const { authenticateToken, requestLogger } = require('./middleware/auth');
const sanitizeMiddleware = require('./middleware/sanitize');

// Import route handlers
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const eventRoutes = require('./routes/events');
const userRoutes = require('./routes/users');
const categoryRoutes = require('./routes/categories');
const eventCategoryRoutes = require('./routes/eventCategories');
const taskTypeRoutes = require('./routes/taskTypes');
const subTypeRoutes = require('./routes/subTypes');
const attachmentRoutes = require('./routes/attachments');
const notificationRoutes = require('./routes/notifications');
const reportRoutes = require('./routes/reports');
const eventTypeRoutes = require('./routes/eventTypes');
const databaseRoutes = require('./routes/database');
const dashboardRoutes = require('./routes/dashboard');
const adminRoutes = require('./routes/admin');
const backupRoutes = require('./routes/backups');
const statusTrackingRoutes = require('./routes/statusTracking');
const holidayRoutes = require('./routes/holidays');

// Import session management utilities
const { startSessionCleanupJob } = require('./utils/sessionManagement');
// Import notification jobs
const { startNotificationJobs } = require('./utils/notificationJobs');
// Import status cleanup service
const statusCleanupService = require('./services/statusCleanupService');
// Import inactivity detection service
const inactivityDetectionService = require('./services/inactivityDetectionService');

// Initialize the database
setupDatabase((err) => {
  if (err) {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  }
});

const PORT = process.env.PORT || 5000;

const server = http.createServer((req, res) => {
  // Log all requests
  requestLogger(req, res, () => {});
  
  let method = req.method;
  let parsedUrl;
  let pathname;

  // Set CORS headers for all requests
  const frontendUrl = process.env.FRONTEND_URL || 'https://tasker.f8fixlu.biz';
  const backendUrl = process.env.BACKEND_URL || 'https://backend.f8fixlu.biz';
  const frontendDomain = frontendUrl.replace(/^https?:\/\//, '').split(':')[0];
  const backendDomain = backendUrl.replace(/^https?:\/\//, '').split(':')[0];
  const allowedOrigins = process.env.NODE_ENV === 'production'
    ? [frontendUrl, backendUrl] // Production domains from environment
    : ['http://localhost:3000']; // Development domain

  const origin = req.headers.origin;
  const host = req.headers.host;

  // Determine the appropriate origin to allow
  let corsOrigin = '*'; // Default fallback
  let allowCredentials = false;

  if (origin && allowedOrigins.includes(origin)) {
    // Exact match with allowed origins
    corsOrigin = origin;
    allowCredentials = true;
  } else if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
    // Allow localhost for development
    corsOrigin = origin;
    allowCredentials = true;
  } else if (origin && host) {
    // Cross-origin request - check if it's a legitimate combination
    // For example, requests from tasker.f8fixlu.biz to backend.f8fixlu.biz
    const originDomain = origin.replace(/^https?:\/\//, '').split(':')[0];
    const hostDomain = host.split(':')[0];

    // Allow if origin is the frontend domain and host is the backend domain (or vice versa)
    if ((originDomain === frontendDomain && hostDomain === backendDomain) ||
        (originDomain === backendDomain && hostDomain === frontendDomain)) {
      corsOrigin = origin;
      allowCredentials = true;
    } else if (originDomain.includes(hostDomain) || hostDomain.includes(originDomain)) {
      // Allow if one domain is contained in the other (subdomain cases)
      corsOrigin = origin;
      allowCredentials = true;
    }
  }

  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Credentials', allowCredentials ? 'true' : 'false');

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');

  // Handle preflight requests
  if (method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Credentials': allowCredentials ? 'true' : 'false',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin'
    });
    res.end();
    return;
  }

  try {
    parsedUrl = url.parse(req.url, true);
    pathname = parsedUrl.pathname;

    if (!pathname) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Server error: pathname could not be parsed' }));
      return;
    }
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Error parsing request URL' }));
    return;
  }

  if (pathname.startsWith('/api/')) {
    // For auth routes that don't require authentication, apply sanitization inside authRoutes
    if (pathname === '/api/auth/login' || pathname === '/api/auth/register' || pathname === '/api/auth/refresh' || pathname === '/api/auth/logout') {
      // Apply sanitization within the auth routes to ensure proper JSON parsing
      authRoutes(req, res, parsedUrl);
    } else if (pathname === '/api/auth/profile/upload-image') {
      // Profile image upload requires authentication but handles multipart differently
      // Don't apply sanitizeMiddleware here as it handles multipart data differently
      authenticateToken(req, res, () => {
        authRoutes(req, res, parsedUrl);
      });
    } else if (pathname === '/api/auth/profile/delete-image') {
      // Profile image deletion requires authentication but is a POST request
      authenticateToken(req, res, () => {
        authRoutes(req, res, parsedUrl);
      });
    } else if (pathname.startsWith('/api/auth/profile')) {
      // Other profile routes (profile get/put) - these are already handled by authRoutes which applies sanitization
      authenticateToken(req, res, () => {
        authRoutes(req, res, parsedUrl);
      });
    } else if (pathname === '/api/auth/mark-welcome-shown') {
      // Mark welcome as shown requires authentication
      authenticateToken(req, res, () => {
        authRoutes(req, res, parsedUrl);
      });
    } else if (pathname === '/api/auth/change-password') {
      // Authentication required for profile and password change routes
      authenticateToken(req, res, () => {
        authRoutes(req, res, parsedUrl);
      });
    } else if (pathname.startsWith('/api/auth')) {
      // Handle all other auth routes without auth (if any exist)
      // Apply sanitization within the auth routes to ensure proper JSON parsing
      authRoutes(req, res, parsedUrl);
    } else {
      // Apply sanitization to all other requests after authentication
      authenticateToken(req, res, () => {
        sanitizeMiddleware(req, res, () => {
          // API routes - ORDER MATTERS: more specific routes first
          if (pathname.startsWith('/api/dashboard')) {
            dashboardRoutes(req, res, parsedUrl);
          } else if (pathname.startsWith('/api/reports')) {
            reportRoutes(req, res, parsedUrl);
          } else if (pathname.startsWith('/api/tasks/categories')) {
            categoryRoutes(req, res, parsedUrl);
          } else if (pathname.startsWith('/api/tasks/types')) {
            taskTypeRoutes(req, res, parsedUrl);
          } else if (pathname.startsWith('/api/tasks/subtypes')) {
            subTypeRoutes(req, res, parsedUrl);
          } else if (pathname.startsWith('/api/tasks')) {
            taskRoutes(req, res, parsedUrl);
          } else if (pathname.startsWith('/api/events/categories')) {
            eventCategoryRoutes(req, res, parsedUrl);
          } else if (pathname.startsWith('/api/events/types')) {
            eventTypeRoutes(req, res, parsedUrl);
          } else if (pathname.startsWith('/api/events')) {
            eventRoutes(req, res, parsedUrl);
          } else if (pathname.startsWith('/api/users')) {
            userRoutes(req, res, parsedUrl);
          } else if (pathname.startsWith('/api/attachments')) {
            attachmentRoutes(req, res, parsedUrl);
          } else if (pathname.startsWith('/api/notifications')) {
            notificationRoutes(req, res, parsedUrl);
          } else if (pathname.startsWith('/api/database')) {
            databaseRoutes(req, res, parsedUrl);
          } else if (pathname.startsWith('/api/admin/backups')) {
            backupRoutes(req, res, parsedUrl);
          } else if (pathname.startsWith('/api/admin')) {
            adminRoutes(req, res, parsedUrl);
          } else if (pathname.startsWith('/api/status-tracking')) {
            statusTrackingRoutes(req, res, parsedUrl);
          } else if (pathname.startsWith('/api/holidays')) {
            holidayRoutes(req, res, parsedUrl);
          } else {
            // API route not found - return JSON error instead of static file
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'API endpoint not found' }));
          }
        });
      });
    }
  } else if (pathname.startsWith('/uploads/')) {
    // Handle upload routes for serving uploaded files like profile images
    handleStaticFile(req, res, pathname);
  } else {
    // Only handle API routes - return 404 for non-API routes
    // This allows Cloudflare to handle frontend routing
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Route not found. This server only handles API requests.' }));
  }
});

// Function to handle static files
function handleStaticFile(req, res, pathname) {
  let filePath;

  // Check if the path is for uploads
  if (pathname.startsWith('/uploads/')) {
    // Handle uploads directory
    filePath = path.join(process.cwd(), pathname);
  } else {
    // Default to public directory
    filePath = path.join(process.cwd(), 'public', pathname);

    // Default to index.html if root path is requested
    if (pathname === '/') {
      filePath = path.join(process.cwd(), 'public', 'index.html');
    }
  }

  // Security: Prevent directory traversal attacks
  const resolvedPath = path.resolve(filePath);
  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  const publicDir = path.resolve(process.cwd(), 'public');

  if (!resolvedPath.startsWith(uploadsDir) && !resolvedPath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end('403 Forbidden');
    return;
  }

  const extname = path.extname(filePath).toLowerCase();
  const contentType = getContentType(extname);

  // For better performance with React builds, we'll add caching headers
  const isStaticAsset = /\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/i.test(filePath);

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Check if this was originally an API request that got misrouted
        if (pathname.startsWith('/api/')) {
          // This is an API request that didn't find a handler
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'API endpoint not found' }));
        } else {
          // For frontend routes that don't correspond to actual files (SPA routing),
          // serve index.html so the frontend router can handle it
          // But only for routes that don't have file extensions
          if (!path.extname(pathname) && !pathname.startsWith('/api/')) {
            // This looks like a frontend route, serve index.html
            const indexPath = path.join(process.cwd(), 'public', 'index.html');
            fs.readFile(indexPath, (indexErr, indexContent) => {
              if (indexErr) {
                console.error('Error reading index.html:', indexErr);
                res.writeHead(500, { 'Content-Type': 'text/html' });
                res.end('<html><body><h1>500 Internal Server Error</h1></body></html>');
              } else {
                res.writeHead(200, {
                  'Content-Type': 'text/html',
                  'Cache-Control': 'no-cache'  // Don't cache HTML files
                });
                res.end(indexContent, 'utf-8');
              }
            });
          } else {
            // This is a request for a specific file that doesn't exist
            res.writeHead(404);
            res.end('404 Not Found');
          }
        }
      } else {
        // Server error
        if (pathname.startsWith('/api/')) {
          // This is an API request with a server error
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Internal server error' }));
        } else {
          // Regular static file server error
          res.writeHead(500);
          res.end('500 Internal Server Error');
        }
      }
    } else {
      // Success - file found
      const headers = { 'Content-Type': contentType };

      // Add caching headers for static assets
      if (isStaticAsset) {
        if (/\.(png|jpg|jpeg|gif|ico|svg)$/i.test(filePath)) {
          headers['Cache-Control'] = 'public, max-age=31536000, immutable';
        } else if (/\.(css|js)$/i.test(filePath)) {
          headers['Cache-Control'] = 'public, max-age=31536000, immutable';
        } else if (/\.(woff|woff2|ttf|eot)$/i.test(filePath)) {
          headers['Cache-Control'] = 'public, max-age=31536000, immutable';
        } else {
          headers['Cache-Control'] = 'public, max-age=31536000, immutable';
        }
      } else if (pathname === '/' || extname === '.html') {
        headers['Cache-Control'] = 'no-cache';
      }

      // Apply gzip compression for text-based responses with caching
      const acceptEncoding = req.headers['accept-encoding'] || '';
      if (isStaticAsset && acceptEncoding.includes('gzip') && /\.(js|css|html|svg|json|text)$/i.test(filePath)) {
        const cacheKey = filePath + ':' + (content.mtime || '');
        const cached = gzipCache.get(cacheKey);
        if (cached) {
          headers['Content-Encoding'] = 'gzip';
          headers['Content-Length'] = cached.length;
          res.writeHead(200, headers);
          res.end(cached);
        } else {
          zlib.gzip(content, (err, compressed) => {
            if (err) {
              res.writeHead(200, headers);
              res.end(content, 'utf-8');
            } else {
              // Evict oldest entry if cache is full
              if (gzipCache.size >= GZIP_CACHE_MAX) {
                const firstKey = gzipCache.keys().next().value;
                gzipCache.delete(firstKey);
              }
              gzipCache.set(cacheKey, compressed);
              headers['Content-Encoding'] = 'gzip';
              headers['Content-Length'] = compressed.length;
              res.writeHead(200, headers);
              res.end(compressed);
            }
          });
        }
      } else {
        res.writeHead(200, headers);
        res.end(content, 'utf-8');
      }
    }
  });
}

// Function to get content type based on file extension
function getContentType(extname) {
  switch (extname) {
    case '.js':
      return 'text/javascript';
    case '.css':
      return 'text/css';
    case '.json':
      return 'application/json';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpg';
    case '.gif':
      return 'image/gif';
    case '.svg':
      return 'image/svg+xml';
    case '.pdf':
      return 'application/pdf';
    case '.woff':
      return 'font/woff';
    case '.woff2':
      return 'font/woff2';
    case '.ttf':
      return 'font/ttf';
    case '.eot':
      return 'font/eot';
    case '.ico':
      return 'image/x-icon';
    default:
      return 'text/html';
  }
}

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Database initialized and ready`);

  // Start the session cleanup job (check every 5 minutes for sessions inactive for 15 minutes)
  startSessionCleanupJob(5, 60);

  // Start the notification jobs (check every 5 minutes for overdue tasks and upcoming events)
  startNotificationJobs(5);

  // Delay starting status cleanup service to ensure database is fully ready
  setTimeout(() => {
    // Start status cleanup service (process pending offline users every 10 seconds)
    statusCleanupService.start();
    
    // Start inactivity detection service (detect inactive users and update their status)
    inactivityDetectionService.start();
  }, 1000); // Wait 1 second to ensure database operations complete
});