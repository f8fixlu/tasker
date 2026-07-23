import api from './api';
import cache from '../utils/cache';

// Create a unique cache key based on URL and params
const getCacheKey = (url, params = {}) => {
  const paramString = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  return `${url}?${paramString}`;
};

export const taskTypeService = {
  // Get all task types
  async getAllTaskTypes(params = {}) {
    const cacheKey = getCacheKey('/tasks/types', params);
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }

    // No cached data, fetch and cache
    return this._fetchAndCache(() => api.get('/tasks/types', params), cacheKey);
  },

  // Get task type by ID
  async getTaskTypeById(id) {
    const cacheKey = getCacheKey(`/tasks/types/${id}`);
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }

    // No cached data, fetch and cache
    return this._fetchAndCache(() => api.get(`/tasks/types/${id}`), cacheKey);
  },

  // Create a new task type
  async createTaskType(typeData) {
    const response = await api.post('/tasks/types', typeData);

    // Invalidate all task-type-related cache entries to ensure fresh data
    cache.clear();

    return response;
  },

  // Update a task type
  async updateTaskType(id, typeData) {
    const response = await api.put(`/tasks/types/${id}`, typeData);
    
    // Invalidate related cache entries
    cache.delete(`/tasks/types/${id}`);
    cache.delete('/tasks/types');
    
    return response;
  },

  // Get task types by category
  async getTaskTypesByCategoryId(categoryId) {
    const params = { category_id: categoryId };
    const cacheKey = getCacheKey('/tasks/types', params);
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }

    // No cached data, fetch and cache
    return this._fetchAndCache(() => api.get('/tasks/types', params), cacheKey);
  },

  // Delete a task type
  async deleteTaskType(id) {
    const response = await api.delete(`/tasks/types/${id}`);
    
    // Invalidate related cache entries
    cache.delete(`/tasks/types/${id}`);
    cache.delete('/tasks/types');
    
    return response;
  },

  // Private helper method to fetch data and cache it
  async _fetchAndCache(fetchFunction, cacheKey) {
    try {
      const data = await fetchFunction();
      
      // Cache the response for 60 seconds (task types don't change often)
      cache.set(cacheKey, data, 60000); // 60 seconds TTL
      
      return data;
    } catch (error) {
      // If there's an error fetching, but we have cached data, return cached data
      const cachedData = cache.get(cacheKey);
      if (cachedData) {
        return cachedData;
      }
      throw error;
    }
  }
};