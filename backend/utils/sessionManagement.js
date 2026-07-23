// Utility for managing session cleanup based on activity

const { deleteExpiredSessions } = require('../models/Session');

// Cleanup function to remove sessions that have been inactive for more than the specified time
async function deleteInactiveSessions(maxInactiveMinutes = 60) {
  const sql = `
    DELETE FROM sessions 
    WHERE last_activity_at < datetime('now', '-${maxInactiveMinutes} minutes')
  `;

  try {
    const { runQuery } = require('../utils/database');
    const result = await runQuery(sql);
    return result.changes; // Return number of deleted sessions
  } catch (error) {
    throw new Error(`Error deleting inactive sessions: ${error.message}`);
  }
}

// Background job to periodically clean up inactive sessions
function startSessionCleanupJob(intervalMinutes = 5, maxInactiveMinutes = 15) {
  console.log(`Starting session cleanup job, checking every ${intervalMinutes} minutes for sessions inactive for ${maxInactiveMinutes} minutes`);
  
  // Run immediately after a short delay
  setTimeout(async () => {
    try {
      await deleteInactiveSessions(maxInactiveMinutes);
    } catch (error) {
      console.error('Error during initial session cleanup:', error.message);
    }
  }, 10000); // 10 second delay for initial run

  // Run periodically after the initial run
  setInterval(async () => {
    try {
      const deletedCount = await deleteInactiveSessions(maxInactiveMinutes);
      if (deletedCount > 0) {
        console.log(`Cleaned up ${deletedCount} inactive sessions`);
      }
    } catch (error) {
      console.error('Error during scheduled session cleanup:', error.message);
    }
  }, intervalMinutes * 60 * 1000); // Convert minutes to milliseconds
}

// Function to check if a specific session has timed out due to inactivity
async function isSessionInactive(token, maxInactiveMinutes = 15) {
  const { getRow } = require('../utils/database');

  const sql = `
    SELECT last_activity_at
    FROM sessions
    WHERE token = ?
    AND last_activity_at < datetime('now', '-${maxInactiveMinutes} minutes')
  `;

  try {
    const session = await getRow(sql, [token]);
    return !!session; // Return true if session found (meaning it's inactive beyond the allowed period)
  } catch (error) {
    throw new Error(`Error checking session activity: ${error.message}`);
  }
}

module.exports = {
  deleteInactiveSessions,
  startSessionCleanupJob,
  isSessionInactive
};