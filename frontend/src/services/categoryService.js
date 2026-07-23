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

export const categoryService = {
  // Get all categories for the current user
  async getUserCategories(userId, params = {}) {
    const cacheKey = getCacheKey(`/users/${userId}/categories`, params);
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }

    // No cached data, fetch and cache
    return this._fetchAndCache(() => api.get(`/users/${userId}/categories`, params), cacheKey);
  },

  // Get all categories
  async getAllCategories(params = {}) {
    const cacheKey = getCacheKey('/tasks/categories', params);
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }

    // No cached data, fetch and cache
    return this._fetchAndCache(() => api.get('/tasks/categories', params), cacheKey);
  },

  // Get category by ID
  async getCategoryById(id) {
    const cacheKey = getCacheKey(`/tasks/categories/${id}`);
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }

    // No cached data, fetch and cache
    return this._fetchAndCache(() => api.get(`/tasks/categories/${id}`), cacheKey);
  },

  // Create a new category
  async createCategory(categoryData) {
    const response = await api.post('/tasks/categories', categoryData);

    // Invalidate all cache entries to ensure fresh data
    cache.clear();

    return response;
  },

  // Update a category
  async updateCategory(id, categoryData) {
    const response = await api.put(`/tasks/categories/${id}`, categoryData);

    // Invalidate all cache entries to ensure fresh data
    cache.clear();

    return response;
  },

  // Delete a category
  async deleteCategory(id) {
    const response = await api.delete(`/tasks/categories/${id}`);

    // Invalidate all cache entries to ensure fresh data
    cache.clear();

    return response;
  },

  // Get categories by user
  async getCategoriesByUser(userId) {
    const cacheKey = getCacheKey('/tasks/categories');
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }

    // No cached data, fetch and cache
    return this._fetchAndCache(() => api.get('/tasks/categories'), cacheKey);
  },

  // Private helper method to fetch data and cache it
  async _fetchAndCache(fetchFunction, cacheKey) {
    try {
      const data = await fetchFunction();
      
      // Cache the response for 60 seconds (categories don't change often)
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