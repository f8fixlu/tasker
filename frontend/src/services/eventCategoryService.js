import api from './api';

export const eventCategoryService = {
  // Get all event categories
  async getAllEventCategories(params = {}) {
    try {
      const response = await api.get('/events/categories', params);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get event category by ID
  async getEventCategoryById(id) {
    try {
      const response = await api.get(`/events/categories/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Create a new event category
  async createEventCategory(categoryData) {
    try {
      const response = await api.post('/events/categories', categoryData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Update an event category
  async updateEventCategory(id, categoryData) {
    try {
      const response = await api.put(`/events/categories/${id}`, categoryData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Delete an event category
  async deleteEventCategory(id) {
    try {
      const response = await api.delete(`/events/categories/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  }
};