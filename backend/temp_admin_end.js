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

            // User is active if they have recent activity in the last 10 minutes AND have active (non-expired) sessions
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