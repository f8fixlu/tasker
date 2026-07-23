const { getUsersWithPendingOffline, updateUserStatus } = require('../models/User');

class StatusCleanupService {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
    this.cleanupInterval = 60000; // Run every 60 seconds
  }

  start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.processPendingOfflineUsers();
    this.intervalId = setInterval(() => {
      this.processPendingOfflineUsers();
    }, this.cleanupInterval);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }

  async processPendingOfflineUsers() {
    try {
      const pendingUsers = await getUsersWithPendingOffline();

      if (pendingUsers.length === 0) {
        return;
      }

      for (const user of pendingUsers) {
        try {
          await updateUserStatus(user.id, 'offline', 'cleanup_service');
        } catch (error) {}
      }
    } catch (error) {}
  }

  isServiceRunning() {
    return this.isRunning;
  }
}

// Create a singleton instance
const statusCleanupService = new StatusCleanupService();

module.exports = statusCleanupService;