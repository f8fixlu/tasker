require('dotenv').config(); // Load environment variables from .env file

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

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

// Import session management utilities
const { startSessionCleanupJob } = require('./utils/sessionManagement');
// Import notification jobs
const { startNotificationJobs } = require('./utils/notificationJobs');

// Initialize the database
setupDatabase();

const PORT = process.env.PORT || 5000;

const server = http.createServer((req, res) => {
  // Log all requests
  requestLogger(req, res, () => {});
  
  console.log(`Raw URL: ${req.url}`);
  console.log(`Raw request URL: ${req.url}, method: ${req.method}`);
  
  let method = req.method;
  let parsedUrl;
  let pathname;

  // Set CORS headers for all requests
  const allowedOrigins = process.env.NODE_ENV === 'production'
    ? ['https://tasker.f8fixlu.biz', 'https://backend.f8fixlu.biz'] // Production domains
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

    // Allow if origin is tasker.f8fixlu.biz and host is backend.f8fixlu.biz (or vice versa)
    if ((originDomain === 'tasker.f8fixlu.biz' && hostDomain === 'backend.f8fixlu.biz') ||
        (originDomain === 'backend.f8fixlu.biz' && hostDomain === 'tasker.f8fixlu.biz')) {
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
    console.log(`Raw URL: ${req.url}, Parsed pathname: ${pathname}, method: ${method}`);
    console.log(`Headers:`, req.headers);

    // Debug: Check if pathname is valid
    if (!pathname) {
      console.error('ERROR: pathname is null or undefined!');
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Server error: pathname could not be parsed' }));
      return;
    }

    console.log(`pathname typeof: ${typeof pathname}, length: ${pathname.length}`);
    console.log(`First few characters of pathname: "${pathname.substring(0, 10)}"`);
  } catch (error) {
    console.error(`Error parsing URL: ${req.url}`, error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Error parsing request URL' }));
    return;
  }

  // Check if this is an API request
  console.log(`Checking if pathname starts with '/api/': ${pathname.startsWith('/api/')}`);
  console.log(`Full pathname: '${pathname}' (length: ${pathname.length})`);
  console.log(`First char code: ${pathname.charCodeAt(0)}, Second char code: ${pathname.charCodeAt(1)}`);

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
          if (pathname.startsWith('/api/reports')) {
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
          } else if (pathname.startsWith('/api/dashboard')) {
            dashboardRoutes(req, res, parsedUrl);
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
        // For images, use a long cache time (1 year) with immutable directive
        if (/\.(png|jpg|jpeg|gif|ico|svg)$/i.test(filePath)) {
          headers['Cache-Control'] = 'public, max-age=31536000, immutable'; // Cache images for 1 year
        } else if (/\.(css|js)$/i.test(filePath)) {
          headers['Cache-Control'] = 'public, max-age=31536000, immutable'; // Cache CSS/JS for 1 year
        } else if (/\.(woff|woff2|ttf|eot)$/i.test(filePath)) {
          headers['Cache-Control'] = 'public, max-age=31536000, immutable'; // Cache fonts for 1 year
        } else {
          headers['Cache-Control'] = 'public, max-age=31536000, immutable'; // Cache other assets for 1 year
        }
      } else if (pathname === '/' || extname === '.html') {
        headers['Cache-Control'] = 'no-cache'; // Don't cache HTML files
      }

      res.writeHead(200, headers);
      res.end(content, 'utf-8');
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
  startSessionCleanupJob(5, 15);

  // Start the notification jobs (check every 5 minutes for overdue tasks and upcoming events)
  startNotificationJobs(5);
});