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

export const reportsService = {
  // Get overall dashboard statistics
  async getDashboardStats(params = {}) {
    const cacheKey = getCacheKey('/reports/stats', params);
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      // Return cached data immediately
      const response = cachedData;
      
      // Update cache in background
      this._fetchAndCache(() => api.get('/reports/stats', params), cacheKey).catch(console.error);
      
      return response;
    }

    // No cached data, fetch and cache
    return this._fetchAndCache(() => api.get('/reports/stats', params), cacheKey);
  },

  // Get task summary statistics
  async getTaskSummary(params = {}) {
    const cacheKey = getCacheKey('/reports/tasks-summary', params);
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      // Return cached data immediately
      const response = cachedData;
      
      // Update cache in background
      this._fetchAndCache(() => api.get('/reports/tasks-summary', params), cacheKey).catch(console.error);
      
      return response;
    }

    // No cached data, fetch and cache
    return this._fetchAndCache(() => api.get('/reports/tasks-summary', params), cacheKey);
  },

  // Get event summary statistics
  async getEventSummary(params = {}) {
    const cacheKey = getCacheKey('/reports/events-summary', params);
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
      // Return cached data immediately
      const response = cachedData;

      // Update cache in background
      this._fetchAndCache(() => api.get('/reports/events-summary', params), cacheKey).catch(console.error);

      return response;
    }

    // No cached data, fetch and cache
    return this._fetchAndCache(() => api.get('/reports/events-summary', params), cacheKey);
  },

  // Get consolidated event summary
  async getConsolidatedEventSummary(params = {}) {
    const cacheKey = getCacheKey('/reports/event-summary', params);
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
      // Return cached data immediately
      const response = cachedData;

      // Update cache in background
      this._fetchAndCache(() => api.get('/reports/event-summary', params), cacheKey).catch(console.error);

      return response;
    }

    // No cached data, fetch and cache
    return this._fetchAndCache(() => api.get('/reports/event-summary', params), cacheKey);
  },

  // Get time-based task completion data
  async getTaskCompletionTrend(params = {}) {
    const cacheKey = getCacheKey('/reports/tasks-completion-trend', params);
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      // Return cached data immediately
      const response = cachedData;
      
      // Update cache in background
      this._fetchAndCache(() => api.get('/reports/tasks-completion-trend', params), cacheKey).catch(console.error);
      
      return response;
    }

    // No cached data, fetch and cache
    return this._fetchAndCache(() => api.get('/reports/tasks-completion-trend', params), cacheKey);
  },

  // Get task list for report
  async getTaskListForReport(params = {}) {
    const cacheKey = getCacheKey('/reports/tasks', params);
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
      // Return cached data immediately
      const response = cachedData;

      // Update cache in background
      this._fetchAndCache(() => api.get('/reports/tasks', params), cacheKey).catch(console.error);

      return response;
    }

    // No cached data, fetch and cache
    return this._fetchAndCache(() => api.get('/reports/tasks', params), cacheKey);
  },

  // Get event list for report
  async getEventListForReport(params = {}) {
    const cacheKey = getCacheKey('/reports/events', params);
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
      // Return cached data immediately
      const response = cachedData;

      // Update cache in background
      this._fetchAndCache(() => api.get('/reports/events', params), cacheKey).catch(console.error);

      return response;
    }

    // No cached data, fetch and cache
    return this._fetchAndCache(() => api.get('/reports/events', params), cacheKey);
  },

  // Get task type summary
  async getTaskTypeSummary(params = {}) {
    const cacheKey = getCacheKey('/reports/task-type-summary', params);
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
      // Return cached data immediately
      const response = cachedData;

      // Update cache in background
      this._fetchAndCache(() => api.get('/reports/task-type-summary', params), cacheKey).catch(console.error);

      return response;
    }

    // No cached data, fetch and cache
    return this._fetchAndCache(() => api.get('/reports/task-type-summary', params), cacheKey);
  },
  
  // Internal method to fetch and cache data
  async _fetchAndCache(fetchFunction, cacheKey) {
    try {
      const data = await fetchFunction();
      
      // Cache the response for 30 seconds
      cache.set(cacheKey, data, 30000); // 30 seconds TTL
      
      return data;
    } catch (error) {
      // If there's an error fetching, return cached data if available
      const cachedData = cache.get(cacheKey);
      if (cachedData) {
        console.warn(`Using cached data for ${cacheKey} due to API error:`, error.message);
        return cachedData;
      }
      // If no cached data is available, throw the error
      throw error;
    }
  }
};