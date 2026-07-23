const os = require('os');
const { db } = require('../config/database');
const { authenticateToken, isAdmin } = require('../middleware/auth');

function adminRoutes(req, res, parsedUrl) {
  const pathname = parsedUrl.pathname;
  const method = req.method;

  if (method === 'GET' && pathname === '/api/admin/stats') {
    authenticateToken(req, res, async () => {
      if (!isAdmin(req.user)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Access denied: Admin privileges required' }));
      }
      handleGetSystemStats(req, res);
    });
  } else if (method === 'GET' && pathname === '/api/admin/users') {
    authenticateToken(req, res, async () => {
      if (!isAdmin(req.user)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Access denied: Admin privileges required' }));
      }
      const queryParams = parsedUrl.query;
      if (queryParams.page || queryParams.limit || queryParams.search || queryParams.sortBy) {
        handleGetUsers(req, res, parsedUrl);
      } else {
        handleGetUserStats(req, res);
      }
    });
  } else if (method === 'GET' && pathname === '/api/admin/tasks') {
    authenticateToken(req, res, async () => {
      if (!isAdmin(req.user)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Access denied: Admin privileges required' }));
      }
      handleGetTaskStats(req, res);
    });
  } else if (method === 'DELETE' && pathname === '/api/admin/users/batch') {
    authenticateToken(req, res, async () => {
      if (!isAdmin(req.user)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Access denied: Admin privileges required' }));
      }
      handleBatchDeleteUsers(req, res);
    });
  } else if (method === 'DELETE' && pathname.startsWith('/api/admin/users/')) {
    const pathParts = pathname.split('/');
    const userId = parseInt(pathParts[pathParts.length - 1]);

    if (isNaN(userId)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Invalid user ID' }));
    }

    authenticateToken(req, res, async () => {
      if (!isAdmin(req.user)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Access denied: Admin privileges required' }));
      }
      handleDeleteUser(req, res, userId);
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Admin route not found' }));
  }
}

async function handleGetSystemStats(req, res) {
  try {
    const dbStatus = checkDatabaseConnection();

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

    const [userCount, taskCount, eventCount, attachmentCount, sessionCount, resolvedDbStatus] = await Promise.all([
      getCount('users'),
      getCount('tasks'),
      getCount('events'),
      getCount('attachments'),
      getActiveSessionCount(),
      dbStatus
    ]);

    const stats = {
      system: systemInfo,
      database: resolvedDbStatus,
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

async function handleGetUserStats(req, res) {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [totalUsers, recentUsers, activeUsers] = await Promise.all([
      getCount('users'),
      new Promise((resolve, reject) => {
        db.get(`SELECT COUNT(*) as count FROM users WHERE created_at >= ?`, [sevenDaysAgo], (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        });
      }),
      new Promise((resolve, reject) => {
        db.get(`SELECT COUNT(*) as count FROM users WHERE status = 'online'`, (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        });
      })
    ]);

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

async function handleGetUsers(req, res, parsedUrl) {
  try {
    const queryParams = parsedUrl.query;

    const page = parseInt(queryParams.page) || 1;
    const limit = parseInt(queryParams.limit) || 10;
    const offset = (page - 1) * limit;

    const sortBy = queryParams.sortBy || 'created_at';
    const sortOrder = (queryParams.sortOrder || 'desc').toUpperCase();

    const allowedSortColumns = ['id', 'email', 'full_name', 'created_at'];
    const sortColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const sortDirection = sortOrder === 'ASC' ? 'ASC' : 'DESC';

    const search = queryParams.search || '';

    let query = `
      SELECT u.id, u.email, u.full_name, u.profile_image_url, u.created_at,
             u.last_login_at as last_login
      FROM users u
    `;
    let countQuery = `SELECT COUNT(*) as count FROM users`;
    let params = [];

    if (search) {
      query += ` WHERE (u.email LIKE ? OR u.full_name LIKE ?)`;
      countQuery += ` WHERE (email LIKE ? OR full_name LIKE ?)`;
      const searchPattern = `%${search}%`;
      params = [searchPattern, searchPattern];
    }

    query += ` ORDER BY ${sortColumn} ${sortDirection}`;
    query += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [users, totalCountResult] = await Promise.all([
      new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      }),
      new Promise((resolve, reject) => {
        db.get(countQuery, search ? [`%${search}%`, `%${search}%`] : [], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      })
    ]);

    const totalCount = totalCountResult.count;
    const totalPages = Math.ceil(totalCount / limit);

    // Batch fetch statuses for all users on this page (fixes N+1)
    const userIds = users.map(u => u.id);
    let statusMap = {};
    if (userIds.length > 0) {
      const placeholders = userIds.map(() => '?').join(',');
      const statusRows = await new Promise((resolve, reject) => {
        db.all(`SELECT id, status FROM users WHERE id IN (${placeholders})`, userIds, (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });
      statusRows.forEach(row => {
        statusMap[row.id] = row.status || 'offline';
      });
    }

    const userData = users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.full_name || user.email,
      profile_image_url: user.profile_image_url,
      created_at: user.created_at,
      last_login: user.last_login,
      isActive: statusMap[user.id] === 'online'
    }));

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

async function handleGetTaskStats(req, res) {
  try {
    const [totalTasks, tasksByStatus, tasksByPriority, overdueTasks] = await Promise.all([
      getCount('tasks'),
      new Promise((resolve, reject) => {
        db.all(`SELECT status, COUNT(*) as count FROM tasks GROUP BY status`, (err, rows) => {
          if (err) reject(err);
          else {
            const result = {};
            rows.forEach(row => { result[row.status] = row.count; });
            resolve(result);
          }
        });
      }),
      new Promise((resolve, reject) => {
        db.all(`SELECT priority, COUNT(*) as count FROM tasks GROUP BY priority`, (err, rows) => {
          if (err) reject(err);
          else {
            const result = {};
            rows.forEach(row => { result[row.priority] = row.count; });
            resolve(result);
          }
        });
      }),
      new Promise((resolve, reject) => {
        db.get(`SELECT COUNT(*) as count FROM tasks WHERE status != 'Completed' AND due_date < datetime('now')`, (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        });
      })
    ]);

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

function checkDatabaseConnection() {
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

function getCount(table) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT COUNT(*) as count FROM ${table}`, (err, row) => {
      if (err) reject(err);
      else resolve(row.count);
    });
  });
}

function getActiveSessionCount() {
  return new Promise((resolve, reject) => {
    db.get(`
      SELECT COUNT(*) as count
      FROM sessions
      WHERE last_activity_at >= datetime('now', '-30 minutes')
    `, (err, row) => {
      if (err) reject(err);
      else resolve(row.count);
    });
  });
}

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

async function deleteUserCascade(userId) {
  await dbRun('DELETE FROM sessions WHERE user_id = ?', [userId]);
  await dbRun('DELETE FROM tasks WHERE user_id = ?', [userId]);
  await dbRun('DELETE FROM events WHERE user_id = ?', [userId]);
  await dbRun('DELETE FROM notifications WHERE user_id = ?', [userId]);
  await dbRun('DELETE FROM attachments WHERE user_id = ?', [userId]);
  await dbRun('DELETE FROM task_categories WHERE user_id = ?', [userId]);
  await dbRun('DELETE FROM task_types WHERE user_id = ?', [userId]);
  await dbRun('DELETE FROM task_sub_types WHERE user_id = ?', [userId]);
  await dbRun('DELETE FROM event_categories WHERE user_id = ?', [userId]);
  await dbRun('DELETE FROM event_types WHERE user_id = ?', [userId]);
  await dbRun('DELETE FROM users WHERE id = ?', [userId]);
}

async function handleDeleteUser(req, res, userId) {
  try {
    const existingUser = await new Promise((resolve, reject) => {
      db.get('SELECT id, email FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!existingUser) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'User not found' }));
    }

    if (existingUser.id === req.user.id) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Admin cannot delete their own account' }));
    }

    await new Promise((resolve, reject) => {
      db.run('BEGIN TRANSACTION', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    try {
      await deleteUserCascade(userId);
      await new Promise((resolve, reject) => {
        db.run('COMMIT', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'User deleted successfully', userId }));
    } catch (innerErr) {
      await new Promise(() => {
        db.run('ROLLBACK', () => {});
      });
      console.error('Error during user deletion cascade:', innerErr);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Error deleting user: ' + innerErr.message }));
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during user deletion' }));
  }
}

async function handleBatchDeleteUsers(req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', async () => {
    try {
      const { ids } = JSON.parse(body);

      if (!Array.isArray(ids) || ids.length === 0) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'ids array is required' }));
      }

      const selfId = req.user.id;
      const filteredIds = ids.filter(id => id !== selfId);

      if (filteredIds.length === 0) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Cannot delete your own account' }));
      }

      await new Promise((resolve, reject) => {
        db.run('BEGIN TRANSACTION', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      try {
        const placeholders = filteredIds.map(() => '?').join(',');

        await dbRun(`DELETE FROM sessions WHERE user_id IN (${placeholders})`, filteredIds);
        await dbRun(`DELETE FROM tasks WHERE user_id IN (${placeholders})`, filteredIds);
        await dbRun(`DELETE FROM events WHERE user_id IN (${placeholders})`, filteredIds);
        await dbRun(`DELETE FROM notifications WHERE user_id IN (${placeholders})`, filteredIds);
        await dbRun(`DELETE FROM attachments WHERE user_id IN (${placeholders})`, filteredIds);
        await dbRun(`DELETE FROM task_categories WHERE user_id IN (${placeholders})`, filteredIds);
        await dbRun(`DELETE FROM task_types WHERE user_id IN (${placeholders})`, filteredIds);
        await dbRun(`DELETE FROM task_sub_types WHERE user_id IN (${placeholders})`, filteredIds);
        await dbRun(`DELETE FROM event_categories WHERE user_id IN (${placeholders})`, filteredIds);
        await dbRun(`DELETE FROM event_types WHERE user_id IN (${placeholders})`, filteredIds);
        await dbRun(`DELETE FROM users WHERE id IN (${placeholders})`, filteredIds);

        await new Promise((resolve, reject) => {
          db.run('COMMIT', (err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: `${filteredIds.length} user(s) deleted successfully`, deletedIds: filteredIds }));
      } catch (innerErr) {
        await new Promise(() => {
          db.run('ROLLBACK', () => {});
        });
        console.error('Error during batch delete:', innerErr);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Batch delete failed: ' + innerErr.message }));
      }
    } catch (parseErr) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid request body' }));
    }
  });
}

module.exports = adminRoutes;
