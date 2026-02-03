const { getAll, runQuery } = require('../utils/database');
const { forceUpdateOverdueTasks } = require('../models/Task');

// Job to check for overdue tasks and upcoming events
async function runNotificationJobs() {
  console.log(`Running notification jobs at ${new Date().toISOString()}`);
  
  try {
    // Check for overdue tasks
    await checkOverdueTasks();
    
    // Check for upcoming events (e.g., events happening in the next hour)
    await checkUpcomingEvents();
    
  } catch (error) {
    console.error('Error running notification jobs:', error);
  }
}

// Check for tasks that should be marked as overdue and create notifications
async function checkOverdueTasks() {
  try {
    // First get the tasks that will be updated to overdue
    const getSql = `
      SELECT t.id, t.title, t.user_id
      FROM tasks t
      WHERE due_date IS NOT NULL 
        AND due_date < datetime('now', 'localtime') 
        AND status != 'Completed' 
        AND status != 'Overdue'
    `;

    const tasksToOverdue = await getAll(getSql, []);

    // Update overdue tasks in the database
    const updatedCount = await forceUpdateOverdueTasks();

    // Create notifications for each overdue task
    for (const task of tasksToOverdue) {
      try {
        // Check if an identical notification already exists to prevent duplicates
        const checkSql = `
          SELECT id FROM notifications
          WHERE user_id = ? AND related_task_id = ? AND title = ? AND message = ?
          ORDER BY created_at DESC LIMIT 1
        `;
        const checkParams = [task.user_id, task.id, 'Task Overdue', `Task "${task.title}" is now overdue`];

        const existingNotification = await require('../utils/database').getRow(checkSql, checkParams);

        // Only create notification if it doesn't already exist
        if (!existingNotification) {
          const notificationSql = `
            INSERT INTO notifications (title, message, type, user_id, related_task_id)
            VALUES (?, ?, ?, ?, ?)
          `;
          const notificationParams = [
            'Task Overdue',
            `Task "${task.title}" is now overdue`,
            'warning',
            task.user_id,
            task.id
          ];

          await runQuery(notificationSql, notificationParams);
        }
      } catch (notificationError) {
        console.error(`Error creating notification for task ${task.id}:`, notificationError);
      }
    }
    
    if (updatedCount > 0) {
      console.log(`Updated ${updatedCount} tasks to overdue status`);
    }
  } catch (error) {
    console.error('Error checking overdue tasks:', error);
  }
}

// Check for upcoming events and create notifications
async function checkUpcomingEvents() {
  try {
    // Get events happening in the next 30 minutes that don't have a recent notification
    const getSql = `
      SELECT e.id, e.title, e.start_date, e.user_id
      FROM events e
      WHERE start_date BETWEEN datetime('now', 'localtime') AND datetime('now', '+30 minutes', 'localtime')
    `;

    const upcomingEvents = await getAll(getSql, []);

    // Create notifications for each upcoming event
    for (const event of upcomingEvents) {
      try {
        // Check if a notification for this upcoming event was already created recently
        const recentNotificationSql = `
          SELECT id FROM notifications
          WHERE related_event_id = ? AND title = 'Event Starting Soon'
          AND created_at > datetime('now', '-1 hour')
        `;
        const recentNotification = await require('../utils/database').getRow(recentNotificationSql, [event.id]);

        // Only create notification if one wasn't sent recently
        if (!recentNotification) {
          const notificationSql = `
            INSERT INTO notifications (title, message, type, user_id, related_event_id)
            VALUES (?, ?, ?, ?, ?)
          `;
          const notificationParams = [
            'Event Starting Soon',
            `Event "${event.title}" is starting soon at ${event.start_date}`,
            'info',
            event.user_id,
            event.id
          ];

          await runQuery(notificationSql, notificationParams);
        }
      } catch (notificationError) {
        console.error(`Error creating notification for event ${event.id}:`, notificationError);
      }
    }

    if (upcomingEvents.length > 0) {
      console.log(`Processed ${upcomingEvents.length} upcoming events for notifications`);
    }
  } catch (error) {
    console.error('Error checking upcoming events:', error);
  }
}

// Start the notification jobs
function startNotificationJobs(intervalMinutes = 5) {
  console.log(`Starting notification jobs to run every ${intervalMinutes} minutes`);
  
  // Run immediately when started
  runNotificationJobs();
  
  // Then run on the specified interval
  const interval = setInterval(runNotificationJobs, intervalMinutes * 60 * 1000);
  
  return interval;
}

module.exports = {
  startNotificationJobs,
  runNotificationJobs,
  checkOverdueTasks,
  checkUpcomingEvents
};