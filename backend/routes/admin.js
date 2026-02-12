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

    // Get active users based on their actual status in the database (users with online status)
    const activeUsers = await new Promise((resolve, reject) => {
      db.get(`
        SELECT COUNT(*) as count
        FROM users
        WHERE status = 'online'
      `, (err, row) => {
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
    
    // Prepare response data with status from the users table
    const userData = [];
    for (const user of users) {
      // Get the current status directly from the users table
      const userWithStatus = await new Promise((resolve, reject) => {
        const { db } = require('../config/database');
        db.get('SELECT status FROM users WHERE id = ?', [user.id], (err, row) => {
          if (err) reject(err);
          else resolve({ ...user, status: row?.status || 'offline' });
        });
      });
      
      userData.push({
        id: user.id,
        email: user.email,
        name: user.full_name || user.email,
        profile_image_url: user.profile_image_url,
        created_at: user.created_at,
        last_login: user.last_login,
        isActive: userWithStatus.status === 'online'  // isActive is kept for compatibility but based on actual status
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

// Helper function to check if a user has an active session (recent activity)
async function isUserCurrentlyActive(userId) {
  try {
    // Use the new user status logic from User model
    const { getUserOnlineStatus } = require('../models/User');
    const onlineStatus = await getUserOnlineStatus(userId);
    
    // Return true if user is online, false if offline
    return onlineStatus === 'online';
  } catch (error) {
    console.error('Error checking user online status:', error);
    // Fallback to old method if new method fails
    return new Promise((resolve, reject) => {
      // Check if user has a session with recent activity (last 10 minutes to be more forgiving)
      // Using database time functions for consistency
      console.log(`Fallback: Checking if user ${userId} is active, looking for activity in last 10 minutes`);

      // First, let's check all sessions for this user
      db.get(`
        SELECT COUNT(*) as total_sessions
        FROM sessions
        WHERE user_id = ?
      `, [userId], (err, totalRow) => {
        if (err) {
          console.error('Error checking total sessions for user:', userId, err);
          reject(err);
          return;
        }

        console.log(`User ${userId} total sessions:`, totalRow);

        // First check for recent activity in sessions - this is primary indicator
        db.get(`
          SELECT COUNT(*) as session_count
          FROM sessions
          WHERE user_id = ? AND last_activity_at > datetime('now', '-10 minutes')
        `, [userId], (err, sessionRow) => {
          if (err) {
            console.error('Error checking user session activity:', err);
            reject(err);
          } else {
            console.log(`User ${userId} session activity check result:`, sessionRow);

            // Also check for sessions that are not expired
            db.get(`
              SELECT COUNT(*) as active_sessions
              FROM sessions
              WHERE user_id = ? AND expires_at > CURRENT_TIMESTAMP
            `, [userId], (err, activeRow) => {
              if (err) {
                console.error('Error checking active sessions for user:', userId, err);
              } else {
                console.log(`User ${userId} active (non-expired) sessions:`, activeRow);
              }

              // User is active if they have recent activity in last 10 minutes AND have active (non-expired) sessions
              // This ensures that logged-out users appear offline even if they had recent activity before logout
              const hasRecentActivity = sessionRow.session_count > 0;
              const hasActiveSession = activeRow && activeRow.active_sessions > 0;
              const isActive = hasRecentActivity && hasActiveSession;

              resolve(isActive);
            });
          }
        });
      });
    });
  }
}


// Helper function to get active session count
async function getActiveSessionCount() {
  return new Promise((resolve, reject) => {
    // Sessions that have been active in the last 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    db.get(`
      SELECT COUNT(*) as count
      FROM sessions
      WHERE last_activity_at >= ?
    `, [thirtyMinutesAgo], (err, row) => {
      if (err) reject(err);
      else resolve(row.count);
    });
  });
}

// Handle deleting a user
async function handleDeleteUser(req, res, userId) {
  try {
    // First, verify the user exists
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

    // Check if the user is trying to delete themselves
    if (existingUser.id === req.user.id) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Admin cannot delete their own account' }));
    }

    // Perform the deletion in a transaction to ensure data integrity
    db.serialize(() => {
      // Begin transaction
      db.run('BEGIN TRANSACTION');

      // Delete user's related data first (due to foreign key constraints)
      db.run('DELETE FROM sessions WHERE user_id = ?', [userId], (err) => {
        if (err) {
          db.run('ROLLBACK');
          console.error('Error deleting user sessions:', err);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Error deleting user sessions' }));
          return;
        }

        // Delete user's tasks
        db.run('DELETE FROM tasks WHERE user_id = ?', [userId], (err) => {
          if (err) {
            db.run('ROLLBACK');
            console.error('Error deleting user tasks:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Error deleting user tasks' }));
            return;
          }

          // Delete user's events
          db.run('DELETE FROM events WHERE user_id = ?', [userId], (err) => {
            if (err) {
              db.run('ROLLBACK');
              console.error('Error deleting user events:', err);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify({ error: 'Error deleting user events' }));
              return;
            }

            // Delete user's notifications
            db.run('DELETE FROM notifications WHERE user_id = ?', [userId], (err) => {
              if (err) {
                db.run('ROLLBACK');
                console.error('Error deleting user notifications:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Error deleting user notifications' }));
                return;
              }

              // Delete user's attachments
              db.run('DELETE FROM attachments WHERE user_id = ?', [userId], (err) => {
                if (err) {
                  db.run('ROLLBACK');
                  console.error('Error deleting user attachments:', err);
                  res.writeHead(500, { 'Content-Type': 'application/json' });
                  return res.end(JSON.stringify({ error: 'Error deleting user attachments' }));
                  return;
                }

                // Delete user's task categories
                db.run('DELETE FROM task_categories WHERE user_id = ?', [userId], (err) => {
                  if (err) {
                    db.run('ROLLBACK');
                    console.error('Error deleting user task categories:', err);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'Error deleting user task categories' }));
                    return;
                  }

                  // Delete user's task types
                  db.run('DELETE FROM task_types WHERE user_id = ?', [userId], (err) => {
                    if (err) {
                      db.run('ROLLBACK');
                      console.error('Error deleting user task types:', err);
                      res.writeHead(500, { 'Content-Type': 'application/json' });
                      return res.end(JSON.stringify({ error: 'Error deleting user task types' }));
                      return;
                    }

                    // Delete user's task sub types
                    db.run('DELETE FROM task_sub_types WHERE user_id = ?', [userId], (err) => {
                      if (err) {
                        db.run('ROLLBACK');
                        console.error('Error deleting user task sub types:', err);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ error: 'Error deleting user task sub types' }));
                        return;
                      }

                      // Delete user's event categories
                      db.run('DELETE FROM event_categories WHERE user_id = ?', [userId], (err) => {
                        if (err) {
                          db.run('ROLLBACK');
                          console.error('Error deleting user event categories:', err);
                          res.writeHead(500, { 'Content-Type': 'application/json' });
                          return res.end(JSON.stringify({ error: 'Error deleting user event categories' }));
                          return;
                        }

                        // Delete user's event types
                        db.run('DELETE FROM event_types WHERE user_id = ?', [userId], (err) => {
                          if (err) {
                            db.run('ROLLBACK');
                            console.error('Error deleting user event types:', err);
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            return res.end(JSON.stringify({ error: 'Error deleting user event types' }));
                            return;
                          }

                          // Finally, delete the user
                          db.run('DELETE FROM users WHERE id = ?', [userId], (err) => {
                            if (err) {
                              db.run('ROLLBACK');
                              console.error('Error deleting user:', err);
                              res.writeHead(500, { 'Content-Type': 'application/json' });
                              return res.end(JSON.stringify({ error: 'Error deleting user' }));
                              return;
                            }

                            // Commit transaction
                            db.run('COMMIT', (err) => {
                              if (err) {
                                console.error('Error committing transaction:', err);
                                res.writeHead(500, { 'Content-Type': 'application/json' });
                                return res.end(JSON.stringify({ error: 'Error committing transaction' }));
                              } else {
                                console.log(`User ${existingUser.email} (ID: ${userId}) deleted successfully by admin ${req.user.email}`);
                                res.writeHead(200, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ message: 'User deleted successfully', userId }));
                              }
                            });
                          });
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during user deletion' }));
  }
}

module.exports = adminRoutes;