import api from './api';

export const notificationService = {
  // Get all notifications for the current user
  async getUserNotifications(params = {}) {
    try {
      // Use the authenticated user's ID automatically via JWT token
      // Convert params to query string to ensure proper authentication header handling
      const searchParams = new URLSearchParams(params);
      const queryString = searchParams.toString();
      const url = queryString ? `/notifications?${queryString}` : '/notifications';

      const response = await api.get(url);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get notification by ID
  async getNotificationById(id) {
    try {
      const response = await api.get(`/notifications/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Create a new notification
  async createNotification(notificationData) {
    try {
      const response = await api.post('/notifications', notificationData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Update a notification
  async updateNotification(id, notificationData) {
    try {
      const response = await api.put(`/notifications/${id}`, notificationData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Delete a notification
  async deleteNotification(id) {
    try {
      const response = await api.delete(`/notifications/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Mark notification as read
  async markAsRead(id) {
    try {
      const response = await api.patch(`/notifications/${id}/read`, { read: true });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Mark notification as unread
  async markAsUnread(id) {
    try {
      const response = await api.patch(`/notifications/${id}/read`, { read: false });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Mark all notifications as read for a user
  async markAllAsRead(userId) {
    try {
      // Use the authenticated user's ID automatically via JWT token
      const response = await api.patch('/notifications/mark-all-read', { read: true });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get unread notifications count
  async getUnreadCount() {
    try {
      // Use the authenticated user's ID automatically via JWT token
      const response = await api.get('/notifications/unread-count');
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Delete all notifications for the current user
  async deleteAllNotifications() {
    try {
      const response = await api.delete('/notifications/all');
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get recent notifications
  async getRecentNotifications(limit = 5) {
    try {
      // Get notifications for the authenticated user
      // The backend filters by the authenticated user's ID automatically
      const response = await api.get(`/notifications?limit=${limit}&sort=-created_at`);
      return response;
    } catch (error) {
      console.error('Error in getRecentNotifications:', error);
      // If the basic request fails, throw the error
      throw error;
    }
  },

  // Get all notifications with pagination
  async getAllNotifications(params = {}) {
    try {
      // Use the authenticated user's ID automatically via JWT token
      // Convert params to query string to ensure proper authentication header handling
      const searchParams = new URLSearchParams(params);
      const queryString = searchParams.toString();
      const url = queryString ? `/notifications?${queryString}` : '/notifications';

      const response = await api.get(url);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get paginated notifications
  async getPaginatedNotifications(page = 1, limit = 10, filters = {}) {
    try {
      const offset = (page - 1) * limit;
      const params = {
        ...filters,
        limit,
        offset
      };

      // Convert params to query string
      const searchParams = new URLSearchParams(params);
      const queryString = searchParams.toString();
      const url = `/notifications${queryString ? '?' + queryString : ''}`;

      const response = await api.get(url);
      return response;
    } catch (error) {
      throw error;
    }
  }
};