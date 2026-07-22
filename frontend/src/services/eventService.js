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

// Helper function to transform event data from backend format to frontend format
function transformEventForFrontend(event) {
  if (!event) return null;
  
  // The backend returns dates already converted to local format by convertUTCToLocal
  // The format is like "Oct 26, 2025, 08:40:00 PM" which represents the local time
  // We need to properly parse this back to get date and time components
  return {
    ...event,
    
    // For UI components that need separate date/time parts
    // we need to ensure proper date/time extraction from the formatted strings
    startDate: event.start_date ? parseFormattedDate(event.start_date) : null,
    endDate: event.end_date ? parseFormattedDate(event.end_date) : null,
    startTime: event.start_date ? parseFormattedTime(event.start_date) : null,
    endTime: event.end_date ? parseFormattedTime(event.end_date) : null,
    
    // Keep the original formatted dates as returned by the backend
    start_date: event.start_date,
    end_date: event.end_date,
    created_at: event.created_at,
    updated_at: event.updated_at,
    
    // Include status field
    status: event.status || 'Scheduled',
    
    // Format for display
    display_start_date: event.start_date,
    display_end_date: event.end_date,
    wholeDay: event.is_whole_day || event.wholeDay || false,
    
    // Map category field appropriately
    category_id: event.category_id !== undefined ? event.category_id : null,
    category: event.category || null,

    // Map event type field appropriately
    event_type_id: event.event_type_id !== undefined ? event.event_type_id : null,
    event_type: event.event_type || null
  };
}

// Helper function to extract date part from formatted date string
function parseFormattedDate(formattedDateStr) {
  if (!formattedDateStr) return null;
  try {
    // The backend format is like "Oct 26, 2025, 08:40:00 PM"
    // Let's manually parse this format to extract the date
    // Format: "MMM DD, YYYY, HH:MM:SS AM/PM"
    const match = formattedDateStr.match(/(\w{3})\s+(\d{1,2}),\s+(\d{4})/);
    if (match) {
      const [, monthStr, day, year] = match;
      // Convert to YYYY-MM-DD format
      const monthIndex = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                         "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].indexOf(monthStr);
      if (monthIndex !== -1) {
        const month = (monthIndex + 1).toString().padStart(2, '0');
        const dayPadded = day.padStart(2, '0');
        return `${year}-${month}-${dayPadded}`;
      }
    }
    // Fallback: try to parse with Date constructor
    const date = new Date(formattedDateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    return null;
  } catch (e) {
    console.error('Error parsing formatted date:', e);
    return null;
  }
}

// Helper function to extract time part from formatted date string
function parseFormattedTime(formattedDateStr) {
  if (!formattedDateStr) return null;
  try {
    // The backend format is like "Oct 26, 2025, 08:40:00 PM"
    // Extract time part: HH:MM:SS AM/PM
    const timeMatch = formattedDateStr.match(/\d{1,2}:\d{2}:\d{2}\s*(?:AM|PM)/i);
    if (timeMatch) {
      // Convert 12-hour format to 24-hour format for processing
      let timeStr = timeMatch[0];
      const [time, modifier] = timeStr.split(' ');
      let [hours, minutes] = time.split(':');

      if (hours === '12') {
        hours = (modifier === 'AM') ? '00' : '12';
      } else {
        hours = (modifier === 'PM') ? (parseInt(hours, 10) + 12).toString() : hours;
        if (hours === '24') hours = '00'; // Handle midnight case
      }

      return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
    }
    // Fallback: try parsing with Date constructor
    const date = new Date(formattedDateStr);
    if (!isNaN(date.getTime())) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return null;
  } catch (e) {
    console.error('Error parsing formatted time:', e);
    return null;
  }
}

export const eventService = {
  // Get all events
  async getAllEvents(params = {}) {
    const cacheKey = getCacheKey('/events', params);
    const cachedData = cache.get(cacheKey);
    
    try {
      const response = await api.get('/events', params);
      // Transform backend field names to match frontend expectations and format dates
      const transformedEvents = Array.isArray(response.events) ? 
        response.events.map(event => transformEventForFrontend(event)) : 
        Array.isArray(response) ? 
        response.map(event => transformEventForFrontend(event)) : 
        response;
      
      const result = Array.isArray(response.events) ? { ...response, events: transformedEvents } : transformedEvents;
      
      // Cache the response for 30 seconds
      cache.set(cacheKey, result, 30000); // 30 seconds TTL
      
      return result;
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

  // Get event by ID
  async getEventById(id) {
    const cacheKey = getCacheKey(`/events/${id}`);
    const cachedData = cache.get(cacheKey);
    
    try {
      const response = await api.get(`/events/${id}`);
      // Transform backend field names to match frontend expectations and format dates
      const transformedEvent = transformEventForFrontend(response.event);
      const result = { ...response, event: transformedEvent };
      
      // Cache the response for 30 seconds
      cache.set(cacheKey, result, 30000); // 30 seconds TTL
      
      return result;
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

  // Create a new event
  async createEvent(eventData) {
    try {
      const response = await api.post('/events', eventData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Update an event
  async updateEvent(id, eventData) {
    try {
      const response = await api.put(`/events/${id}`, eventData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Delete an event
  async deleteEvent(id) {
    try {
      const response = await api.delete(`/events/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get events by date range
  async getEventsByDateRange(startDate, endDate) {
    const params = {
      start_date: startDate,
      end_date: endDate
    };
    const cacheKey = getCacheKey('/events', params);
    const cachedData = cache.get(cacheKey);
    
    try {
      const response = await api.get('/events', params);
      // Transform backend field names to match frontend expectations and format dates
      const transformedEvents = Array.isArray(response.events) ? 
        response.events.map(event => transformEventForFrontend(event)) : 
        Array.isArray(response) ? 
        response.map(event => transformEventForFrontend(event)) : 
        response;
      
      const result = Array.isArray(response.events) ? { ...response, events: transformedEvents } : transformedEvents;
      
      // Cache the response for 30 seconds
      cache.set(cacheKey, result, 30000); // 30 seconds TTL
      
      return result;
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

  // Get events for calendar view (optimized date-range query, no attachments)
  async getCalendarEvents(startDate, endDate) {
    const params = { start_date: startDate, end_date: endDate };
    const cacheKey = getCacheKey('/events/calendar', params);
    const cachedData = cache.get(cacheKey);

    try {
      const response = await api.get('/events/calendar', params);
      const transformedEvents = Array.isArray(response.events) ?
        response.events.map(event => transformEventForFrontend(event)) :
        Array.isArray(response) ?
        response.map(event => transformEventForFrontend(event)) :
        response;

      const result = Array.isArray(response.events) ? { events: transformedEvents } : { events: transformedEvents };

      cache.set(cacheKey, result, 30000);
      return result;
    } catch (error) {
      if (cachedData) {
        console.warn(`Using cached data for ${cacheKey} due to API error:`, error.message);
        return cachedData;
      }
      throw error;
    }
  },

  // Get events by category
  async getEventsByCategory(categoryId) {
    try {
      const response = await api.get('/events', { category_id: categoryId });
      // Transform backend field names to match frontend expectations and format dates
      const transformedEvents = Array.isArray(response.events) ? 
        response.events.map(event => transformEventForFrontend(event)) : 
        Array.isArray(response) ? 
        response.map(event => transformEventForFrontend(event)) : 
        response;
      
      return Array.isArray(response.events) ? { ...response, events: transformedEvents } : transformedEvents;
    } catch (error) {
      throw error;
    }
  },

  // Get upcoming events
  async getUpcomingEvents(limit = 5, categoryFilters = null) {
    let params = { limit };
    if (categoryFilters) {
      params.category_filters = JSON.stringify(categoryFilters);
    }
    const cacheKey = getCacheKey('/events/upcoming', params);
    const cachedData = cache.get(cacheKey);

    try {
      const requestParams = { limit };
      if (categoryFilters) {
        requestParams.category_filters = JSON.stringify(categoryFilters);
      }

      const response = await api.get('/events/upcoming', requestParams);
      // Transform backend field names to match frontend expectations and format dates
      const transformedEvents = Array.isArray(response.events) ?
        response.events.map(event => transformEventForFrontend(event)) :
        Array.isArray(response) ?
        response.map(event => transformEventForFrontend(event)) :
        response;

      const result = Array.isArray(response.events) ? { ...response, events: transformedEvents } : transformedEvents;

      // Cache the response for 30 seconds
      cache.set(cacheKey, result, 30000); // 30 seconds TTL

      return result;
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

  // Get event statistics for dashboard
  async getEventStats() {
    const cacheKey = getCacheKey('/events/stats');

    // Try to get from cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      // For stats, update in background more frequently
      setTimeout(() => {
        this._fetchAndCache(() => api.get('/events/stats'), cacheKey, 30000); // 30 sec TTL for stats
      }, 0);

      return cachedData;
    }

    try {
      const data = await api.get('/events/stats');
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

  // Cache invalidation helper
  invalidateEventCache() {
    // Clear all event-related cache entries
    for (const key of cache.cache.keys()) {
      if (key.startsWith('/events')) {
        cache.delete(key);
      }
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
  }
};