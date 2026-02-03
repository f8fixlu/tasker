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

export const attachmentService = {
  // Get all attachments
  async getAllAttachments(params = {}) {
    const cacheKey = getCacheKey('/attachments', params);
    const cachedData = cache.get(cacheKey);
    
    try {
      const response = await api.get('/attachments', params);
      
      // Cache the response for 30 seconds
      cache.set(cacheKey, response, 30000); // 30 seconds TTL
      
      return response;
    } catch (error) {
      // If there's an error fetching, return cached data if available
      if (cachedData) {
        console.warn(`Using cached data for ${cacheKey} due to API error:`, error.message);
        return cachedData;
      }
      // If no cached data is available, throw the error
      throw error;
    }
  },

  // Get attachment by ID
  async getAttachmentById(id) {
    const cacheKey = getCacheKey(`/attachments/${id}`);
    const cachedData = cache.get(cacheKey);
    
    try {
      const response = await api.get(`/attachments/${id}`);
      
      // Cache the response for 30 seconds
      cache.set(cacheKey, response, 30000); // 30 seconds TTL
      
      return response;
    } catch (error) {
      // If there's an error fetching, return cached data if available
      if (cachedData) {
        console.warn(`Using cached data for ${cacheKey} due to API error:`, error.message);
        return cachedData;
      }
      // If no cached data is available, throw the error
      throw error;
    }
  },

  // Upload attachment - convert file to base64 and send as JSON
  async uploadAttachment(file, taskId, eventId) {
    try {
      // Convert file to base64
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]); // Get only the base64 part
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
      });

      // Prepare attachment data
      const attachmentData = {
        filename: file.name,
        content: base64, // Base64 encoded file content
        file_type: file.type,
        file_size: file.size,
        task_id: taskId || null,
        event_id: eventId || null,
        created_from_file: true // Flag to indicate this is a file upload
      };

      // Use the upload endpoint specifically for file uploads
      const response = await api.post('/attachments/upload', attachmentData);

      // Clear cache entries related to attachments to ensure fresh data
      cache.clear();

      return response;
    } catch (error) {
      throw error;
    }
  },

  // Create attachment record (if not done during upload)
  async createAttachment(attachmentData) {
    try {
      const response = await api.post('/attachments', attachmentData);

      // Clear cache entries related to attachments to ensure fresh data
      cache.clear();

      return response;
    } catch (error) {
      throw error;
    }
  },

  // Update an attachment
  async updateAttachment(id, attachmentData) {
    try {
      const response = await api.put(`/attachments/${id}`, attachmentData);

      // Clear cache entries related to attachments to ensure fresh data
      cache.clear();

      return response;
    } catch (error) {
      throw error;
    }
  },

  // Delete an attachment
  async deleteAttachment(id) {
    try {
      const response = await api.delete(`/attachments/${id}`);

      // Clear cache entries related to attachments to ensure fresh data
      cache.clear();

      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get attachments by entity (task, event, etc.)
  async getAttachmentsByEntity(entityId, entityType) {
    // Use the appropriate query parameter based on entity type
    const queryParams = entityType === 'task' ? { task_id: entityId } : { event_id: entityId };
    const cacheKey = getCacheKey('/attachments', queryParams);
    const cachedData = cache.get(cacheKey);
    
    try {
      const response = await api.get('/attachments', queryParams);
      
      // Cache the response for 30 seconds
      cache.set(cacheKey, response, 30000); // 30 seconds TTL
      
      return response;
    } catch (error) {
      // If there's an error fetching, return cached data if available
      if (cachedData) {
        console.warn(`Using cached data for ${cacheKey} due to API error:`, error.message);
        return cachedData;
      }
      // If no cached data is available, throw the error
      throw error;
    }
  },

  // Download attachment
  async downloadAttachment(id) {
    try {
      // Get token from storage (checking both localStorage and sessionStorage)
      let token = localStorage.getItem('token');
      if (!token) {
        token = sessionStorage.getItem('token');
      }

      if (!token) {
        throw new Error('Authentication token not found');
      }

      const url = `${api.baseURL}/attachments/${id}/download`;
      const fetchResponse = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!fetchResponse.ok) {
        const errorData = await fetchResponse.json().catch(() => ({}));
        const error = new Error(errorData.message || 'Download failed');
        error.status = fetchResponse.status;
        error.response = fetchResponse; // Include response for better error handling
        throw error;
      }

      return fetchResponse.blob();
    } catch (error) {
      throw error;
    }
  }
};