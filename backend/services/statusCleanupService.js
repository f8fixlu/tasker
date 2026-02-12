const { getUsersWithPendingOffline, updateUserStatus } = require('../models/User');

class StatusCleanupService {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
    this.cleanupInterval = 10000; // Run every 10 seconds
  }

  start() {
    if (this.isRunning) {
      console.warn('Status cleanup service is already running - avoiding duplicate start');
      return;
    }

    console.log('Starting status cleanup service');
    this.isRunning = true;

    // Run immediately on start
    this.processPendingOfflineUsers();

    // Set up periodic cleanup
    this.intervalId = setInterval(() => {
      this.processPendingOfflineUsers();
    }, this.cleanupInterval);
    
    console.log('Status cleanup service started successfully with interval:', this.cleanupInterval, 'ms');
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    console.log(`[${new Date().toISOString()}] Status cleanup service stopped`);
  }

  async processPendingOfflineUsers() {
    try {
      console.log(`[${new Date().toISOString()}] Status cleanup service running - checking for users with pending offline status...`);

      const pendingUsers = await getUsersWithPendingOffline();

      if (pendingUsers.length === 0) {
        console.log(`[${new Date().toISOString()}] No users with pending offline status found`);
        return;
      }

      console.log(`[${new Date().toISOString()}] Found ${pendingUsers.length} users to mark as offline`);

      // Update each user's status to offline
      for (const user of pendingUsers) {
        try {
          const success = await updateUserStatus(user.id, 'offline', 'cleanup_service');
          if (success) {
            console.log(`[${new Date().toISOString()}] User ${user.id} (${user.email}) marked as offline by cleanup service`);
          } else {
            console.error(`[${new Date().toISOString()}] Failed to update status for user ${user.id}`);
          }
        } catch (error) {
          console.error(`[${new Date().toISOString()}] Error updating status for user ${user.id}:`, error);
        }
      }

      console.log(`[${new Date().toISOString()}] Pending offline status processing completed`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error in status cleanup service:`, error);
    }
  }

  isServiceRunning() {
    return this.isRunning;
  }
}

// Create a singleton instance
const statusCleanupService = new StatusCleanupService();

module.exports = statusCleanupService;