import api from './api';

export const userService = {
  // Get all users (for admin purposes)
  async getAllUsers(params = {}) {
    try {
      const response = await api.get('/users', params);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get user by ID
  async getUserById(id) {
    try {
      const response = await api.get(`/users/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Update user profile
  async updateUser(id, userData) {
    try {
      const response = await api.put(`/users/${id}`, userData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Update current user profile
  async updateCurrentUserProfile(profileData) {
    try {
      const response = await api.put('/users/profile', profileData);
      // Update stored user data
      localStorage.setItem('user', JSON.stringify(response.user));
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Delete user
  async deleteUser(id) {
    try {
      const response = await api.delete(`/users/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Change user password
  async changeUserPassword(passwordData) {
    try {
      const response = await api.post('/users/change-password', passwordData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get user settings
  async getUserSettings(userId) {
    try {
      const response = await api.get(`/users/${userId}/settings`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Update user settings
  async updateUserSettings(userId, settingsData) {
    try {
      const response = await api.put(`/users/${userId}/settings`, settingsData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get user statistics
  async getUserStats(userId) {
    try {
      const response = await api.get(`/users/${userId}/stats`);
      return response;
    } catch (error) {
      throw error;
    }
  }
};