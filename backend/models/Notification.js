const { db } = require('../config/database');
const { runQuery, getRow, getAll } = require('../utils/database');

// Helper function to convert UTC date to local date format for display
function convertUTCToLocal(dateString) {
  if (!dateString) return null;

  try {
    // Parse the date string assuming it is in UTC format "YYYY-MM-DD HH:MM:SS"
    // Split the date and time parts
    const [datePart, timePart] = dateString.split(' ');
    if (!datePart || !timePart) {
      // If the format isn't as expected, try parsing as is
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return null;
      }
      // Use Manila timezone (UTC+8) to convert the time to local time
      const options = {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      };
      return date.toLocaleString('en-US', options);
    }

    // Parse as UTC by creating a Date object with UTC components
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes, seconds] = timePart.split(':').map(Number);

    // Create a Date object representing the UTC time
    const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));

    // Use Manila timezone (UTC+8) to convert the UTC time to local time
    const options = {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    };

    return utcDate.toLocaleString('en-US', options);
  } catch (error) {
    console.error('Error converting UTC to local date:', error);
    return null;
  }
}

// Notification model

// Create a new notification
async function createNotification(notificationData) {
  const { title, message, type, user_id, related_task_id, related_event_id } = notificationData;
  
  const sql = `
    INSERT INTO notifications (title, message, type, user_id, related_task_id, related_event_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  
  const params = [title, message, type, user_id, related_task_id, related_event_id];
  
  try {
    const result = await runQuery(sql, params);
    return { id: result.lastID, ...notificationData };
  } catch (error) {
    throw new Error(`Error creating notification: ${error.message}`);
  }
}

// Get notification by ID
async function getNotificationById(id) {
  const sql = `
    SELECT
      id, title, message, type, is_read, user_id,
      related_task_id, related_event_id, created_at
    FROM notifications
    WHERE id = ?
  `;
  const params = [id];

  try {
    let notification = await getRow(sql, params);

    // Convert the created_at timestamp to local time for display
    if (notification && notification.created_at) {
      notification.created_at = convertUTCToLocal(notification.created_at);
    }

    return notification;
  } catch (error) {
    throw new Error(`Error fetching notification: ${error.message}`);
  }
}

// Get notifications by user ID with pagination
async function getNotificationsByUserId(user_id, options = {}) {
  let sql = `
    SELECT
      id, title, message, type, is_read, user_id,
      related_task_id, related_event_id, created_at
    FROM notifications
    WHERE user_id = ?
  `;
  const params = [user_id];

  // Filter by read status if provided
  if (options.is_read !== undefined) {
    sql += ` AND is_read = ?`;
    params.push(options.is_read ? 1 : 0);
  }

  sql += ` ORDER BY created_at DESC`;

  // Add pagination
  if (options.limit) {
    sql += ` LIMIT ?`;
    params.push(parseInt(options.limit));

    if (options.offset !== undefined) {
      sql += ` OFFSET ?`;
      params.push(parseInt(options.offset));
    }
  }

  try {
    let notifications = await getAll(sql, params);

    // Convert the created_at timestamp to local time for display
    notifications = notifications.map(notification => {
      if (notification.created_at) {
        notification.created_at = convertUTCToLocal(notification.created_at);
      }
      return notification;
    });

    return notifications;
  } catch (error) {
    throw new Error(`Error fetching notifications: ${error.message}`);
  }
}

// Get total count of notifications for a user with optional filters
async function getNotificationsCountByUserId(user_id, options = {}) {
  let sql = `SELECT COUNT(*) as count FROM notifications WHERE user_id = ?`;
  const params = [user_id];

  // Filter by read status if provided
  if (options.is_read !== undefined) {
    sql += ` AND is_read = ?`;
    params.push(options.is_read ? 1 : 0);
  }

  try {
    const result = await getRow(sql, params);
    return result.count;
  } catch (error) {
    throw new Error(`Error fetching notifications count: ${error.message}`);
  }
}

// Update notification (mark as read)
async function updateNotification(id, notificationData) {
  const { is_read } = notificationData;

  const sql = `
    UPDATE notifications
    SET is_read = ?
    WHERE id = ?
  `;

  const params = [is_read ? 1 : 0, id];

  try {
    const result = await runQuery(sql, params);
    return result.changes > 0;
  } catch (error) {
    throw new Error(`Error updating notification: ${error.message}`);
  }
}

// Delete notification
async function deleteNotification(id) {
  const sql = 'DELETE FROM notifications WHERE id = ?';
  const params = [id];
  
  try {
    const result = await runQuery(sql, params);
    return result.changes > 0;
  } catch (error) {
    throw new Error(`Error deleting notification: ${error.message}`);
  }
}

// Mark all notifications as read for a user
async function markAllAsRead(user_id) {
  const sql = 'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0';
  const params = [user_id];

  try {
    const result = await runQuery(sql, params);
    return result.changes;
  } catch (error) {
    throw new Error(`Error marking all notifications as read: ${error.message}`);
  }
}

// Delete all notifications for a user
async function deleteAllNotifications(user_id) {
  const sql = 'DELETE FROM notifications WHERE user_id = ?';
  const params = [user_id];

  try {
    const result = await runQuery(sql, params);
    return result.changes; // Return number of deleted notifications
  } catch (error) {
    throw new Error(`Error deleting all notifications: ${error.message}`);
  }
}

// Get unread notifications count for a user
async function getUnreadCount(user_id) {
  const sql = 'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0';
  const params = [user_id];

  try {
    const result = await getRow(sql, params);
    return result.count || 0;
  } catch (error) {
    throw new Error(`Error fetching unread notification count: ${error.message}`);
  }
}

module.exports = {
  createNotification,
  getNotificationById,
  getNotificationsByUserId,
  getNotificationsCountByUserId,
  updateNotification,
  deleteNotification,
  deleteAllNotifications,
  markAllAsRead,
  getUnreadCount
};