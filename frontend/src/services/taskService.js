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

export const taskService = {
  // Get all tasks
  async getAllTasks(params = {}) {
    const cacheKey = getCacheKey('/tasks', params);
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
      // Return cached data immediately
      const response = cachedData;

      // Update cache in background with longer TTL for frequently accessed data
      setTimeout(() => {
        this._fetchAndCache(() => api.get('/tasks', params), cacheKey, 120000); // 2 min TTL for this specific call
      }, 0);

      return response;
    }

    // No cached data, fetch and cache with appropriate TTL
    return this._fetchAndCache(() => api.get('/tasks', params), cacheKey, 60000); // 1 min TTL
  },

  // Get paginated tasks
  async getPaginatedTasks(page = 1, limit = 10, filters = {}, sort = {}) {
    try {
      // Calculate offset based on page and limit
      const offset = (page - 1) * limit;
      
      // Combine pagination, filter, and sort parameters
      const params = {
        limit,
        offset,
        ...filters
      };
      
      // Add sort parameters if provided
      if (sort.key && sort.direction) {
        params.sort = sort.key;
        params.order = sort.direction;
      }
      
      const cacheKey = getCacheKey('/tasks', params);
      const cachedData = cache.get(cacheKey);
      
      if (cachedData) {
        // Return cached data immediately
        const response = cachedData;
        
        // Update cache in background
        this._fetchAndCache(() => api.get('/tasks', params), cacheKey).catch(console.error);
        
        return response;
      }

      // No cached data, fetch and cache
      return this._fetchAndCache(() => api.get('/tasks', params), cacheKey);
    } catch (error) {
      console.error('Error fetching paginated tasks:', error);
      throw error;
    }
  },

  // Get task by ID
  async getTaskById(id) {
    const cacheKey = getCacheKey(`/tasks/${id}`);
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      // Return cached data immediately
      const response = cachedData;
      
      // Update cache in background
      this._fetchAndCache(() => api.get(`/tasks/${id}`), cacheKey).catch(console.error);
      
      return response;
    }

    // No cached data, fetch and cache
    return this._fetchAndCache(() => api.get(`/tasks/${id}`), cacheKey);
  },

  // Create a new task
  async createTask(taskData) {
    const response = await api.post('/tasks', taskData);

    // Invalidate all task-related cache entries
    this.invalidateTaskCache();

    return response;
  },

  // Update a task
  async updateTask(id, taskData) {
    const response = await api.put(`/tasks/${id}`, taskData);

    // Invalidate all task-related cache entries
    this.invalidateTaskCache();
    // Also invalidate the specific task
    cache.delete(`/tasks/${id}`);

    return response;
  },

  // Delete a task
  async deleteTask(id) {
    const response = await api.delete(`/tasks/${id}`);

    // Invalidate all task-related cache entries
    this.invalidateTaskCache();
    // Also invalidate the specific task
    cache.delete(`/tasks/${id}`);

    return response;
  },

  // Cache invalidation helper
  invalidateTaskCache() {
    // Clear all task-related cache entries
    for (const key of cache.cache.keys()) {
      if (key.startsWith('/tasks')) {
        cache.delete(key);
      }
    }
  },

  // Update task status
  async updateTaskStatus(id, status) {
    const response = await api.patch(`/tasks/${id}/status`, { status });
    
    // Invalidate related cache entries
    cache.delete(`/tasks/${id}`);
    cache.delete('/tasks');
    cache.delete('/tasks?limit=10&offset=0');
    
    return response;
  },

  // Bulk operations
  async bulkUpdateTasks(taskIds, updates) {
    const response = await api.post('/tasks/bulk-update', {
      taskIds,
      updateData: updates
    });
    
    // Invalidate all task cache entries
    cache.clear();
    
    return response;
  },

  async bulkDeleteTasks(taskIds) {
    const response = await api.post('/tasks/bulk-delete', {
      taskIds
    });
    
    // Invalidate all task cache entries
    cache.clear();
    
    return response;
  },

  // Get user's tasks by category
  async getTasksByCategory(categoryId) {
    const params = { category_id: categoryId };
    const cacheKey = getCacheKey('/tasks', params);
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      // Return cached data immediately
      const response = cachedData;
      
      // Update cache in background
      this._fetchAndCache(() => api.get('/tasks', params), cacheKey).catch(console.error);
      
      return response;
    }

    // No cached data, fetch and cache
    return this._fetchAndCache(() => api.get('/tasks', params), cacheKey);
  },

  // Get tasks by type
  async getTasksByType(typeId) {
    const params = { type_id: typeId };
    const cacheKey = getCacheKey('/tasks', params);
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      // Return cached data immediately
      const response = cachedData;
      
      // Update cache in background
      this._fetchAndCache(() => api.get('/tasks', params), cacheKey).catch(console.error);
      
      return response;
    }

    // No cached data, fetch and cache
    return this._fetchAndCache(() => api.get('/tasks', params), cacheKey);
  },

  // Get task statistics for dashboard
  async getTaskStats() {
    const cacheKey = getCacheKey('/tasks/stats');

    // Try to get from cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      // For stats, update in background more frequently
      setTimeout(() => {
        this._fetchAndCache(() => api.get('/tasks/stats'), cacheKey, 30000); // 30 sec TTL for stats
      }, 0);

      return cachedData;
    }

    try {
      const data = await api.get('/tasks/stats');
      // Cache stats with shorter TTL since they change more frequently
      cache.set(cacheKey, data, 30000); // 30 seconds for stats
      return data;
    } catch (error) {
      if (cachedData) {
        console.warn(`Using stale cached data for ${cacheKey} due to API error:`, error.message);
        return cachedData;
      }
      throw error;
    }
  },

  // Private helper method to fetch data and cache it
  async _fetchAndCache(fetchFunction, cacheKey, ttl = 60000) {
    const cachedData = cache.get(cacheKey);

    try {
      const data = await fetchFunction();

      // Cache the response with specified TTL
      cache.set(cacheKey, data, ttl);

      return data;
    } catch (error) {
      if (cachedData) {
        console.warn(`Using cached data for ${cacheKey} due to API error:`, error.message);
        return cachedData;
      }
      throw error;
    }
  },

  // Get all dropdown data (categories, types, subtypes) in a single request
  async getDropdownData(typeId = null) {
    const params = {};
    if (typeId) params.type_id = typeId;
    const cacheKey = getCacheKey('/tasks/dropdown-data', params);
    const cachedData = cache.get(cacheKey);
    if (cachedData) return cachedData;
    return this._fetchAndCache(() => api.get('/tasks/dropdown-data', params), cacheKey, 60000);
  }
};