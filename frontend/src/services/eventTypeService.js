import api from './api';

export const eventTypeService = {
  // Get all event types
  async getAllEventTypes(params = {}) {
    try {
      const response = await api.get('/events/types', params);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get event types by category ID
  async getEventTypesByCategoryId(categoryId) {
    try {
      const response = await api.get(`/events/types`, { category_id: categoryId });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get event type by ID
  async getEventTypeById(id) {
    try {
      const response = await api.get(`/events/types/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Create a new event type
  async createEventType(typeData) {
    try {
      const response = await api.post('/events/types', typeData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Update an event type
  async updateEventType(id, typeData) {
    try {
      const response = await api.put(`/events/types/${id}`, typeData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Delete an event type
  async deleteEventType(id) {
    try {
      const response = await api.delete(`/events/types/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  }
};