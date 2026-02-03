// services/api.js
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
    
    // Request/response interceptors
    this.requestInterceptors = [];
    this.responseInterceptors = [];
  }

  // Add request interceptor
  addRequestInterceptor(interceptor) {
    this.requestInterceptors.push(interceptor);
  }

  // Add response interceptor
  addResponseInterceptor(interceptor) {
    this.responseInterceptors.push(interceptor);
  }

  // Apply request interceptors
  async applyRequestInterceptors(config) {
    let modifiedConfig = { ...config };
    
    for (const interceptor of this.requestInterceptors) {
      modifiedConfig = await interceptor(modifiedConfig);
    }
    
    return modifiedConfig;
  }

  // Apply response interceptors
  async applyResponseInterceptors(response) {
    let modifiedResponse = response; // Don't clone the Response object to preserve methods
    
    for (const interceptor of this.responseInterceptors) {
      modifiedResponse = await interceptor(modifiedResponse);
    }
    
    return modifiedResponse;
  }

  // Generic request method with interceptors
  async request(endpoint, options = {}) {
    let config = {
      headers: {
        ...this.defaultHeaders,
        ...options.headers,
      },
      ...options,
    };

    // Add auth token if available - check both localStorage and sessionStorage
    let token = localStorage.getItem('token');
    if (!token) {
      token = sessionStorage.getItem('token');
    }

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    // Apply request interceptors
    config = await this.applyRequestInterceptors(config);

    try {
      const url = `${this.baseURL}${endpoint}`;
      const response = await fetch(url, config);
      
      // Check if response is a valid Response object
      if (!response || typeof response.json !== 'function') {
        const error = new Error('Invalid response received from server');
        error.status = 0;
        error.type = 'NETWORK_ERROR';
        throw error;
      }
      
      // Apply response interceptors
      const processedResponse = await this.applyResponseInterceptors(response);
      
      return this.handleResponse(processedResponse);
    } catch (error) {
      console.error('API request error:', error);
      // Handle network errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        const networkError = new Error('Network error: Unable to connect to the server');
        networkError.status = 0;
        networkError.type = 'NETWORK_ERROR';
        throw networkError;
      }
      
      throw error;
    }
  }

  // Handle response based on status
  async handleResponse(response) {
    if (!response) {
      const error = new Error('No response received from server');
      error.status = 0;
      throw error;
    }

    if (response.status === 204) {
      // No content
      return null;
    }

    if (!response.headers || typeof response.headers.get !== 'function') {
      const error = new Error('Invalid response: headers.get method is missing');
      error.status = response.status || 0;
      throw error;
    }

    const contentType = response.headers.get('content-type');
    let data;

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      console.error('API response not ok:', {
        status: response.status,
        contentType,
        data
      });
      
      const error = new Error(data.message || 'API request failed');
      error.status = response.status;
      error.data = data;
      
      // Add specific error types based on status code
      switch (response.status) {
        case 400:
          error.type = 'VALIDATION_ERROR';
          break;
        case 401:
          error.type = 'AUTH_ERROR';
          break;
        case 403:
          error.type = 'FORBIDDEN_ERROR';
          break;
        case 404:
          error.type = 'NOT_FOUND_ERROR';
          break;
        case 409:
          error.type = 'CONFLICT_ERROR';
          break;
        case 422:
          error.type = 'UNPROCESSABLE_ENTITY_ERROR';
          break;
        case 500:
          error.type = 'SERVER_ERROR';
          break;
        default:
          error.type = 'UNKNOWN_ERROR';
          break;
      }
      
      throw error;
    }

    return data;
  }

  // GET request
  async get(endpoint, params = null) {
    let url = endpoint;
    if (params) {
      // Filter out undefined, null, and empty string values before creating URLSearchParams
      const filteredParams = {};
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== '') {
          filteredParams[key] = value;
        }
      }
      
      if (Object.keys(filteredParams).length > 0) {
        const searchParams = new URLSearchParams(filteredParams);
        url += `?${searchParams.toString()}`;
      }
    }
    
    return this.request(url, {
      method: 'GET',
    });
  }

  // POST request
  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // PUT request
  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // PATCH request
  async patch(endpoint, data) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // DELETE request
  async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE',
    });
  }
}

// Add logging interceptor for requests
const logRequest = async (config) => {
  if (process.env.REACT_APP_API_LOGGING === 'true') {
    console.group(`%cAPI Request: ${config.method || 'GET'} ${config.url}`, 'color: #008800; font-weight: bold');
    console.log('URL:', config.url);
    console.log('Method:', config.method || 'GET');
    console.log('Headers:', config.headers);
    console.log('Body:', config.body);
    console.groupEnd();
  }
  return config;
};

// Add logging interceptor for responses
const logResponse = async (response) => {
  if (process.env.REACT_APP_API_LOGGING === 'true') {
    console.group(`%cAPI Response: ${response.status} ${response.url}`, 'color: #000088; font-weight: bold');
    console.log('Status:', response.status);
    console.log('URL:', response.url);
    console.log('Headers:', response.headers);
    console.groupEnd();
  }
  return response;
};

const apiService = new ApiService();

// Add logging interceptors
apiService.addRequestInterceptor(logRequest);
apiService.addResponseInterceptor(logResponse);

// Add authentication interceptor
apiService.addRequestInterceptor(async (config) => {
  // Add auth token if available - check both localStorage and sessionStorage
  let token = localStorage.getItem('token');
  if (!token) {
    token = sessionStorage.getItem('token');
  }

  if (token && !config.headers['Authorization']) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  return config;
});

// Add response interceptor for handling 401 errors
apiService.addResponseInterceptor(async (response) => {
  if (response.status === 401) {
    // Remove stored auth data from both storage types
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');

    // Redirect to login page (if using React Router)
    // window.location.href = '/login';
  }

  return response;
});

export default apiService;