const { runQuery, getAll } = require('./database');

/**
 * Status Tracker Module
 * Tracks user status changes and integrates with the cleanup service
 */

class StatusTracker {
  /**
   * Initialize the status tracker by creating the necessary table
   */
  static async initialize() {
    try {
      // Create status_history table to track all status changes
      await runQuery(`
        CREATE TABLE IF NOT EXISTS status_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          previous_status TEXT,
          new_status TEXT NOT NULL,
          changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          reason TEXT,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      
      // Create an index for faster queries by user_id and changed_at
      await runQuery(`
        CREATE INDEX IF NOT EXISTS idx_status_history_user_time 
        ON status_history(user_id, changed_at)
      `);
      
      console.log('Status history table initialized successfully');
    } catch (error) {
      console.error('Error initializing status history table:', error);
      throw error;
    }
  }

  /**
   * Log a status change for a user
   */
  static async logStatusChange(userId, previousStatus, newStatus, reason = '') {
    try {
      const sql = `
        INSERT INTO status_history (user_id, previous_status, new_status, reason)
        VALUES (?, ?, ?, ?)
      `;
      const params = [userId, previousStatus, newStatus, reason];
      
      const result = await runQuery(sql, params);
      console.log(`Status change logged for user ${userId}: ${previousStatus} → ${newStatus} (${reason})`);
      return result;
    } catch (error) {
      console.error('Error logging status change:', error);
      throw error;
    }
  }

  /**
   * Get status history for a specific user
   */
  static async getStatusHistory(userId, limit = 50) {
    try {
      const sql = `
        SELECT sh.*, u.full_name, u.email
        FROM status_history sh
        JOIN users u ON sh.user_id = u.id
        WHERE sh.user_id = ?
        ORDER BY sh.changed_at DESC
        LIMIT ?
      `;
      const params = [userId, limit];
      
      const history = await getAll(sql, params);
      return history;
    } catch (error) {
      console.error('Error retrieving status history:', error);
      throw error;
    }
  }

  /**
   * Get recent status changes for all users
   */
  static async getRecentStatusChanges(limit = 100) {
    try {
      const sql = `
        SELECT sh.*, u.full_name, u.email
        FROM status_history sh
        JOIN users u ON sh.user_id = u.id
        ORDER BY sh.changed_at DESC
        LIMIT ?
      `;
      const params = [limit];
      
      const changes = await getAll(sql, params);
      return changes;
    } catch (error) {
      console.error('Error retrieving recent status changes:', error);
      throw error;
    }
  }

  /**
   * Get current online users count
   */
  static async getOnlineUsersCount() {
    try {
      const sql = `
        SELECT COUNT(*) as online_count
        FROM users
        WHERE status = 'online'
      `;
      
      const result = await getAll(sql);
      return result[0]?.online_count || 0;
    } catch (error) {
      console.error('Error retrieving online users count:', error);
      throw error;
    }
  }

  /**
   * Get status statistics
   */
  static async getStatusStatistics() {
    try {
      const sql = `
        SELECT 
          status,
          COUNT(*) as count
        FROM users
        GROUP BY status
      `;
      
      const stats = await getAll(sql);
      const result = {
        online: 0,
        offline: 0,
        pending_offline: 0,
        total: 0
      };
      
      stats.forEach(stat => {
        result[stat.status] = stat.count;
        result.total += stat.count;
      });
      
      return result;
    } catch (error) {
      console.error('Error retrieving status statistics:', error);
      throw error;
    }
  }
}

module.exports = StatusTracker;