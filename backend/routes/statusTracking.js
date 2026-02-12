const { authenticateToken } = require('../middleware/auth');
const StatusTracker = require('../utils/statusTracker');

/**
 * Status tracking routes
 */
function statusTrackingRoutes(req, res, parsedUrl) {
  const path = parsedUrl.pathname;
  const method = req.method;

  // Require authentication for all status tracking routes
  authenticateToken(req, res, async () => {
    if (method === 'GET' && path === '/api/status-tracking/history') {
      await handleGetStatusHistory(req, res, parsedUrl.query);
    } else if (method === 'GET' && path === '/api/status-tracking/recent-changes') {
      await handleGetRecentStatusChanges(req, res, parsedUrl.query);
    } else if (method === 'GET' && path === '/api/status-tracking/statistics') {
      await handleGetStatusStatistics(req, res);
    } else if (method === 'GET' && path.startsWith('/api/status-tracking/user/')) {
      // Extract user ID from URL like /api/status-tracking/user/123/history
      const pathParts = path.split('/');
      const userId = pathParts[pathParts.length - 2]; // Get the part before 'history'
      const action = pathParts[pathParts.length - 1]; // Get the last part (e.g., 'history')

      if (action === 'history' && userId) {
        await handleGetUserStatusHistory(req, res, userId);
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Route not found' }));
      }
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Route not found' }));
    }
  });
}

/**
 * Get status history for the authenticated user
 */
async function handleGetStatusHistory(req, res, query) {
  try {
    const userId = req.user.id;
    const limit = parseInt(query.limit) || 50;

    const history = await StatusTracker.getStatusHistory(userId, limit);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ history }));
  } catch (error) {
    console.error('Error getting status history:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}

/**
 * Get status history for a specific user (admin only)
 */
async function handleGetUserStatusHistory(req, res, userIdFromPath) {
  try {
    // Check if user has admin privileges
    if (req.user.role !== 'admin') {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Admin access required' }));
      return;
    }

    const userId = parseInt(userIdFromPath);
    if (isNaN(userId)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid user ID' }));
      return;
    }

    const history = await StatusTracker.getStatusHistory(userId, 50);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ history }));
  } catch (error) {
    console.error('Error getting user status history:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}

/**
 * Get recent status changes for all users
 */
async function handleGetRecentStatusChanges(req, res, query) {
  try {
    // Check if user has admin privileges
    if (req.user.role !== 'admin') {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Admin access required' }));
      return;
    }

    const limit = parseInt(query.limit) || 100;

    const changes = await StatusTracker.getRecentStatusChanges(limit);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ changes }));
  } catch (error) {
    console.error('Error getting recent status changes:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}

/**
 * Get status statistics
 */
async function handleGetStatusStatistics(req, res) {
  try {
    // Check if user has admin privileges
    if (req.user.role !== 'admin') {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Admin access required' }));
      return;
    }

    const stats = await StatusTracker.getStatusStatistics();

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ stats }));
  } catch (error) {
    console.error('Error getting status statistics:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}

module.exports = statusTrackingRoutes;