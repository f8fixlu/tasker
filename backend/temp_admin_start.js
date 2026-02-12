const os = require('os');
const { db } = require('../config/database');

// Admin routes for system stats and monitoring
function adminRoutes(req, res, parsedUrl) {
  const pathname = parsedUrl.pathname;
  const method = req.method;

  console.log(`Admin route handler called - Method: ${method}, Path: ${pathname}`);

  if (method === 'GET' && pathname === '/api/admin/stats') {
    // Apply admin authentication middleware
    const { authenticateToken, isAdmin } = require('../middleware/auth');

    authenticateToken(req, res, async () => {
      if (!isAdmin(req.user)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Access denied: Admin privileges required' }));
      }
      
      handleGetSystemStats(req, res);
    });
  } else if (method === 'GET' && pathname === '/api/admin/users') {
    // Apply admin authentication middleware
    const { authenticateToken, isAdmin } = require('../middleware/auth');

    authenticateToken(req, res, async () => {
      if (!isAdmin(req.user)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Access denied: Admin privileges required' }));
      }

      // Check if we're requesting user data or user stats
      const queryParams = parsedUrl.query;
      if (queryParams.page || queryParams.limit || queryParams.search || queryParams.sortBy) {
        // Requesting paginated user data
        handleGetUsers(req, res, parsedUrl);
      } else {
        // Requesting user stats (backward compatibility)
        handleGetUserStats(req, res);
      }
    });
  } else if (method === 'GET' && pathname === '/api/admin/tasks') {
    // Apply admin authentication middleware
    const { authenticateToken, isAdmin } = require('../middleware/auth');

    authenticateToken(req, res, async () => {
      if (!isAdmin(req.user)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Access denied: Admin privileges required' }));
      }

      handleGetTaskStats(req, res);
    });
  } else if (method === 'DELETE' && pathname.startsWith('/api/admin/users/')) {
    // Extract user ID from the URL
    const pathParts = pathname.split('/');
    const userId = parseInt(pathParts[pathParts.length - 1]);

    if (isNaN(userId)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Invalid user ID' }));
    }

    // Apply admin authentication middleware
    const { authenticateToken, isAdmin } = require('../middleware/auth');

    authenticateToken(req, res, async () => {
      if (!isAdmin(req.user)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Access denied: Admin privileges required' }));
      }

      handleDeleteUser(req, res, userId);
    });
  } else {
    // Route not found
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Admin route not found' }));
  }
}

// Get system-wide statistics
async function handleGetSystemStats(req, res) {
  try {
    // Get database status
    const dbStatus = await checkDatabaseConnection();
    
    // Get system info
    const systemInfo = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: {
        count: os.cpus().length,
        model: os.cpus()[0].model,
        speed: os.cpus()[0].speed
      },
      os: {
        platform: os.platform(),
        release: os.release(),
        totalMemory: os.totalmem(),
        freeMemory: os.freemem()
      },
      timestamp: new Date().toISOString()
    };

    // Get basic counts
    const userCount = await getCount('users');
    const taskCount = await getCount('tasks');
    const eventCount = await getCount('events');
    const attachmentCount = await getCount('attachments');
    const sessionCount = await getActiveSessionCount();

    const stats = {
      system: systemInfo,
      database: dbStatus,
      totals: {
        users: userCount,
        tasks: taskCount,
        events: eventCount,
        attachments: attachmentCount,
        activeSessions: sessionCount
      }
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(stats));
  } catch (error) {
    console.error('Error getting system stats:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to retrieve system stats: ' + error.message }));
  }
}

// Get user statistics
async function handleGetUserStats(req, res) {
  try {
    // Get user counts by various criteria
    const totalUsers = await getCount('users');

    // Get recent users (registered in the last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const recentUsers = await new Promise((resolve, reject) => {
      db.get(`
        SELECT COUNT(*) as count
        FROM users
        WHERE created_at >= ?
      `, [sevenDaysAgo], (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    // Get active users (logged in within last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const activeUsers = await new Promise((resolve, reject) => {
      db.get(`
        SELECT COUNT(DISTINCT s.user_id) as count
        FROM sessions s
        WHERE s.last_activity_at >= ?
      `, [twentyFourHoursAgo], (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    const userStats = {
      total: totalUsers,
      recent: recentUsers,
      active: activeUsers,
      timestamp: new Date().toISOString()
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(userStats));
  } catch (error) {
    console.error('Error getting user stats:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to retrieve user stats: ' + error.message }));
  }
}

// Get paginated user data
async function handleGetUsers(req, res, parsedUrl) {
  try {
    const queryParams = parsedUrl.query;
    
    // Parse pagination parameters
    const page = parseInt(queryParams.page) || 1;
    const limit = parseInt(queryParams.limit) || 10;
    const offset = (page - 1) * limit;
    
    // Parse sorting parameters
    const sortBy = queryParams.sortBy || 'created_at';
    const sortOrder = (queryParams.sortOrder || 'desc').toUpperCase();
    
    // Validate sort parameters
    const allowedSortColumns = ['id', 'email', 'full_name', 'created_at'];
    const sortColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const sortDirection = sortOrder === 'ASC' ? 'ASC' : 'DESC';
    
    // Parse search parameter
    const search = queryParams.search || '';
    
    // Build the query
    let query = `
      SELECT u.id, u.email, u.full_name, u.profile_image_url, u.created_at,
             s.last_activity_at as last_login
      FROM users u
      LEFT JOIN (
        SELECT user_id, MAX(last_activity_at) as last_activity_at
        FROM sessions
        GROUP BY user_id
      ) s ON u.id = s.user_id
    `;
    let countQuery = `SELECT COUNT(*) as count FROM users`;
    let params = [];
    
    // Add search condition if provided
    if (search) {
      // Support searching in multiple fields with wildcards (similar to task search)
      query += ` WHERE (u.email LIKE ? OR u.full_name LIKE ?)`;
      countQuery += ` WHERE (email LIKE ? OR full_name LIKE ?)`;
      const searchPattern = `%${search}%`;
      params = [searchPattern, searchPattern]; // Just for the main query
    }
    
    // Add ordering
    query += ` ORDER BY ${sortColumn} ${sortDirection}`;
    
    // Add pagination
    query += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    // Execute queries
    const users = await new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    const totalCountResult = await new Promise((resolve, reject) => {
      db.get(countQuery, search ? [`%${search}%`, `%${search}%`] : [], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    const totalCount = totalCountResult.count;
    const totalPages = Math.ceil(totalCount / limit);
    
    // Prepare response data with active status based on recent session activity
    const userData = [];
    for (const user of users) {
      const isActive = await isUserCurrentlyActive(user.id);
      userData.push({
        id: user.id,
        email: user.email,
        name: user.full_name || user.email,
        profile_image_url: user.profile_image_url,
        created_at: user.created_at,
        last_login: user.last_login,
        isActive: isActive
      });
    }
    
    const response = {
      users: userData,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalUsers: totalCount,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response));
  } catch (error) {
    console.error('Error getting users:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to retrieve users: ' + error.message }));
  }
}

// Get task statistics
async function handleGetTaskStats(req, res) {
  try {
    const totalTasks = await getCount('tasks');
    
    // Get tasks by status
    const tasksByStatus = await new Promise((resolve, reject) => {
      db.all(`
        SELECT status, COUNT(*) as count 
        FROM tasks 
        GROUP BY status
      `, (err, rows) => {
        if (err) reject(err);
        else {
          const result = {};
          rows.forEach(row => {
            result[row.status] = row.count;
          });
          resolve(result);
        }
      });
    });

    // Get tasks by priority
    const tasksByPriority = await new Promise((resolve, reject) => {
      db.all(`
        SELECT priority, COUNT(*) as count 
        FROM tasks 
        GROUP BY priority
      `, (err, rows) => {
        if (err) reject(err);
        else {
          const result = {};
          rows.forEach(row => {
            result[row.priority] = row.count;
          });
          resolve(result);
        }
      });
    });

    // Get overdue tasks
    const overdueTasks = await new Promise((resolve, reject) => {
      db.get(`
        SELECT COUNT(*) as count 
        FROM tasks 
        WHERE status != 'Completed' AND due_date < datetime('now')
      `, (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    const taskStats = {
      total: totalTasks,
      byStatus: tasksByStatus,
      byPriority: tasksByPriority,
      overdue: overdueTasks,
      timestamp: new Date().toISOString()
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(taskStats));
  } catch (error) {
    console.error('Error getting task stats:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to retrieve task stats: ' + error.message }));
  }
}

// Helper function to check database connection
async function checkDatabaseConnection() {
  return new Promise((resolve) => {
    db.get('SELECT 1 + 1 AS result', (err) => {
      if (err) {
        resolve({ connected: false, error: err.message });
      } else {
        resolve({ connected: true, timestamp: new Date().toISOString() });
      }
    });
  });
}

// Helper function to get count of records in a table
async function getCount(table) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT COUNT(*) as count FROM ${table}`, (err, row) => {
      if (err) reject(err);
      else resolve(row.count);
    });
  });
}

