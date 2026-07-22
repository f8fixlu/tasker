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
    this.checkInterval = 120 * 1000; // Check every 2 minutes
  }

  start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.checkInactiveUsers();
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
  }

  async checkInactiveUsers() {
    try {
      const inactiveUsers = await getAll(`
        SELECT u.id, u.email, u.status, s.last_activity_at
        FROM users u
        LEFT JOIN (
          SELECT user_id, MAX(last_activity_at) as last_activity_at
          FROM sessions
          GROUP BY user_id
        ) s ON u.id = s.user_id
        WHERE u.status = 'online'
        AND s.last_activity_at IS NOT NULL
        AND s.last_activity_at <= datetime('now', '-5 minutes')
      `);

      if (inactiveUsers.length === 0) {
        return;
      }

      for (const user of inactiveUsers) {
        try {
          await updateUserStatus(user.id, 'offline', 'inactivity_timeout');
        } catch (error) {}
      }
    } catch (error) {}
  }

  isServiceRunning() {
    return this.isRunning;
  }
}

// Create a singleton instance
const inactivityDetectionService = new InactivityDetectionService();

module.exports = inactivityDetectionService;