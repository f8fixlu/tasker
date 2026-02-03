const url = require('url');
const { jsonParser, authenticateToken } = require('../middleware/auth');
const {
  createNotification,
  getNotificationById,
  getNotificationsByUserId,
  getNotificationsCountByUserId,
  updateNotification,
  deleteNotification,
  deleteAllNotifications,
  markAllAsRead,
  getUnreadCount
} = require('../models/Notification');

// Handle notification routes
function notificationRoutes(req, res, parsedUrl) {
  const path = parsedUrl.pathname;
  const method = req.method;
  
  // Extract notification ID from URL if it exists
  const pathParts = path.split('/');
  const notificationId = pathParts.length > 3 ? parseInt(pathParts[3]) : null;
  
  // Parse the request body
  jsonParser(req, res, async () => {
    if (method === 'GET' && path === '/api/notifications') {
      await handleGetNotifications(req, res, req.user.id, parsedUrl.query);
    } else if (method === 'POST' && path === '/api/notifications') {
      await handleCreateNotification(req, res, req.user.id);
    } else if (method === 'GET' && path === `/api/notifications/${notificationId}`) {
      await handleGetNotification(req, res, notificationId, req.user.id);
    } else if (method === 'PUT' && path === `/api/notifications/${notificationId}`) {
      await handleUpdateNotification(req, res, notificationId, req.user.id);
    } else if (method === 'PATCH' && path === `/api/notifications/${notificationId}/read`) {
      await handleUpdateNotificationReadStatus(req, res, notificationId, req.user.id);
    } else if (method === 'DELETE' && path === `/api/notifications/${notificationId}`) {
      await handleDeleteNotification(req, res, notificationId, req.user.id);
    } else if (method === 'PATCH' && path === '/api/notifications/mark-all-read') {
      await handleMarkAllAsRead(req, res, req.user.id);
    } else if (method === 'DELETE' && path === '/api/notifications/all') {
      await handleDeleteAllNotifications(req, res, req.user.id);
    } else if (method === 'GET' && path === '/api/notifications/unread-count') {
      await handleGetUnreadCount(req, res, req.user.id);
    } else {
      // Route not found
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Route not found' }));
    }
  });
}

// Handle getting notifications
async function handleGetNotifications(req, res, userId, query) {
  try {
    const options = {
      is_read: query.is_read !== undefined ? query.is_read === 'true' : undefined,
      limit: query.limit ? parseInt(query.limit) : 10,
      offset: query.offset ? parseInt(query.offset) : 0
    };

    // Get notifications and total count for pagination
    const notifications = await getNotificationsByUserId(userId, options);
    const totalCount = await getNotificationsCountByUserId(userId, options);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      notifications,
      total: totalCount,
      limit: options.limit,
      offset: options.offset,
      hasMore: (options.offset + options.limit) < totalCount
    }));
  } catch (error) {
    console.error('Get notifications error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during notifications retrieval' }));
  }
}

// Handle creating a notification (typically used by system, but could be for testing)
async function handleCreateNotification(req, res, userId) {
  try {
    const { title, message, type, related_task_id, related_event_id } = req.body;
    
    if (!title || !message) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Title and message are required' }));
    }
    
    const notification = {
      title,
      message,
      type: type || null,
      user_id: userId,
      related_task_id: related_task_id || null,
      related_event_id: related_event_id || null
    };
    
    const newNotification = await createNotification(notification);
    
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ notification: newNotification }));
  } catch (error) {
    console.error('Create notification error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during notification creation' }));
  }
}

// Handle getting a single notification
async function handleGetNotification(req, res, notificationId, userId) {
  try {
    const notification = await getNotificationById(notificationId);
    
    // Check if the notification belongs to the authenticated user
    if (!notification || notification.user_id !== userId) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Notification not found' }));
    }
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ notification }));
  } catch (error) {
    console.error('Get notification error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during notification retrieval' }));
  }
}

// Handle updating a notification (typically marking as read)
async function handleUpdateNotification(req, res, notificationId, userId) {
  try {
    const { is_read } = req.body;
    
    if (is_read === undefined) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'is_read field is required' }));
    }
    
    const notification = {
      is_read
    };
    
    const success = await updateNotification(notificationId, notification);
    
    if (!success) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Notification not found' }));
    }
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Notification updated successfully' }));
  } catch (error) {
    console.error('Update notification error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during notification update' }));
  }
}

// Handle deleting a notification
async function handleDeleteNotification(req, res, notificationId, userId) {
  try {
    const notification = await getNotificationById(notificationId);
    
    // Check if the notification belongs to the authenticated user
    if (!notification || notification.user_id !== userId) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Notification not found' }));
    }
    
    const success = await deleteNotification(notificationId);
    
    if (!success) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Notification not found' }));
    }
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Notification deleted successfully' }));
  } catch (error) {
    console.error('Delete notification error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during notification deletion' }));
  }
}

// Handle updating notification read status
async function handleUpdateNotificationReadStatus(req, res, notificationId, userId) {
  try {
    const { read } = req.body;

    if (read === undefined) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'read field is required' }));
    }

    // Verify that the notification belongs to the authenticated user
    const notification = await getNotificationById(notificationId);
    if (!notification || notification.user_id !== userId) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Notification not found' }));
    }

    // Update the notification's read status
    const notificationData = {
      is_read: read
    };

    const success = await updateNotification(notificationId, notificationData);

    if (!success) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Notification not found' }));
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Notification read status updated successfully' }));
  } catch (error) {
    console.error('Update notification read status error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during notification read status update' }));
  }
}

// Handle marking all notifications as read
async function handleMarkAllAsRead(req, res, userId) {
  try {
    const count = await markAllAsRead(userId);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: `${count} notifications marked as read` }));
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during mark all as read operation' }));
  }
}

// Handle deleting all notifications
async function handleDeleteAllNotifications(req, res, userId) {
  try {
    const count = await deleteAllNotifications(userId);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: `${count} notifications deleted successfully` }));
  } catch (error) {
    console.error('Delete all notifications error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during delete all notifications operation' }));
  }
}

// Handle getting unread count
async function handleGetUnreadCount(req, res, userId) {
  try {
    const count = await getUnreadCount(userId);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ count }));
  } catch (error) {
    console.error('Get unread count error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during unread count retrieval' }));
  }
}

module.exports = notificationRoutes;