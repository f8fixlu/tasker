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

export const subTypeService = {
  // Get all sub types
  async getAllSubTypes(params = {}) {
    const cacheKey = getCacheKey('/tasks/subtypes', params);
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
      // Return cached data immediately
      const response = cachedData;

      // Update cache in background
      this._fetchAndCache(() => api.get('/tasks/subtypes', params), cacheKey).catch(console.error);

      return response;
    }

    // No cached data, fetch and cache
    return this._fetchAndCache(() => api.get('/tasks/subtypes', params), cacheKey);
  },

  // Get sub type by ID
  async getSubTypeById(id) {
    const cacheKey = getCacheKey(`/tasks/subtypes/${id}`);
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      // Return cached data immediately
      const response = cachedData;
      
      // Update cache in background
      this._fetchAndCache(() => api.get(`/tasks/subtypes/${id}`), cacheKey).catch(console.error);
      
      return response;
    }

    // No cached data, fetch and cache
    return this._fetchAndCache(() => api.get(`/tasks/subtypes/${id}`), cacheKey);
  },

  // Create a new sub type
  async createSubType(typeData) {
    const response = await api.post('/tasks/subtypes', typeData);

    // Invalidate all subtype-related cache entries to ensure fresh data
    cache.clear();

    return response;
  },

  // Update a sub type
  async updateSubType(id, typeData) {
    const response = await api.put(`/tasks/subtypes/${id}`, typeData);
    
    // Invalidate related cache entries
    cache.delete(`/tasks/subtypes/${id}`);
    cache.delete('/tasks/subtypes');
    
    return response;
  },

  // Get sub types by type
  async getSubTypesByTypeId(typeId) {
    const params = { type_id: typeId };
    const cacheKey = getCacheKey('/tasks/subtypes', params);
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      // Return cached data immediately
      const response = cachedData;
      
      // Update cache in background
      this._fetchAndCache(() => api.get('/tasks/subtypes', params), cacheKey).catch(console.error);
      
      return response;
    }

    // No cached data, fetch and cache
    return this._fetchAndCache(() => api.get('/tasks/subtypes', params), cacheKey);
  },

  // Update sub type description
  async updateSubTypeDescription(id, description) {
    const response = await api.put(`/tasks/subtypes/${id}/description`, { description });

    // Invalidate all cache entries to ensure fresh data
    cache.clear();

    return response;
  },

  // Delete a sub type
  async deleteSubType(id) {
    const response = await api.delete(`/tasks/subtypes/${id}`);

    // Invalidate related cache entries
    cache.delete(`/tasks/subtypes/${id}`);
    cache.delete('/tasks/subtypes');

    return response;
  },

  // Private helper method to fetch data and cache it
  async _fetchAndCache(fetchFunction, cacheKey) {
    try {
      const data = await fetchFunction();

      // Cache the response for 60 seconds (sub types don't change often)
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