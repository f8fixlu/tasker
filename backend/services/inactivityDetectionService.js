/**
 * Inactivity Detection Service
 * Monitors user activity and updates status when heartbeat stops
 */

const { db } = require('../config/database');
const { getAll, runQuery } = require('../utils/database');
const { updateUserStatus } = require('../models/User');

class InactivityDetectionService {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
    this.inactivityThreshold = 5 * 60 * 1000; // 5 minutes of inactivity
    this.checkInterval = 30 * 1000; // Check every 30 seconds
  }

  start() {
    if (this.isRunning) {
      console.log('[Inactivity Detection Service] Service is already running');
      return;
    }

    console.log('[Inactivity Detection Service] Starting service with interval:', this.checkInterval, 'ms');
    this.isRunning = true;

    // Run immediately on start
    this.checkInactiveUsers();

    // Set up periodic checks
    this.intervalId = setInterval(() => {
      this.checkInactiveUsers();
    }, this.checkInterval);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    console.log('[Inactivity Detection Service] Service stopped');
  }

  async checkInactiveUsers() {
    try {
      console.log(`[${new Date().toISOString()}] [Inactivity Detection Service] Checking for inactive users...`);

      // Find users who are currently online but haven't had activity in the threshold time
      const inactiveUsers = await getAll(`
        SELECT u.id, u.email, u.status, u.status_updated_at, s.last_activity_at
        FROM users u
        LEFT JOIN (
          SELECT user_id, MAX(last_activity_at) as last_activity_at
          FROM sessions
          GROUP BY user_id
        ) s ON u.id = s.user_id
        WHERE u.status = 'online'
        AND s.last_activity_at IS NOT NULL
        AND datetime(s.last_activity_at) <= datetime('now', '-5 minutes')
      `);

      if (inactiveUsers.length === 0) {
        console.log(`[${new Date().toISOString()}] [Inactivity Detection Service] No inactive users found`);
        return;
      }

      console.log(`[${new Date().toISOString()}] [Inactivity Detection Service] Found ${inactiveUsers.length} inactive users to update`);

      // Update each inactive user's status to offline
      for (const user of inactiveUsers) {
        try {
          const success = await updateUserStatus(user.id, 'offline', 'inactivity_timeout');
          if (success) {
            console.log(`[${new Date().toISOString()}] [Inactivity Detection Service] User ${user.id} (${user.email}) marked as offline due to inactivity`);
          } else {
            console.error(`[${new Date().toISOString()}] [Inactivity Detection Service] Failed to update status for user ${user.id}`);
          }
        } catch (error) {
          console.error(`[${new Date().toISOString()}] [Inactivity Detection Service] Error updating status for user ${user.id}:`, error);
        }
      }

      console.log(`[${new Date().toISOString()}] [Inactivity Detection Service] Inactivity check completed`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [Inactivity Detection Service] Error in inactivity detection:`, error);
    }
  }

  isServiceRunning() {
    return this.isRunning;
  }
}

// Create a singleton instance
const inactivityDetectionService = new InactivityDetectionService();

module.exports = inactivityDetectionService;