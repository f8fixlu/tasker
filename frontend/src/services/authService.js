import api from './api';

export const authService = {
  // Login user
  async login(credentials) {
    try {
      const response = await api.post('/auth/login', credentials);
      // Store token and user data
      if (response.token) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
      }
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Register user
  async register(userData) {
    try {
      const response = await api.post('/auth/register', userData);
      // Store token and user data
      if (response.token) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
      }
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Logout user
  async logout() {
    try {
      // Remove stored auth data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // In a real app, you might want to call an API to invalidate the token
      // await api.post('/auth/logout');
    } catch (error) {
      throw error;
    }
  },

  // Get current user profile
  async getProfile() {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');

      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/auth/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      throw error;
    }
  },

  // Update user profile
  async updateProfile(profileData) {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');

      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      // Update stored user data
      localStorage.setItem('user', JSON.stringify(result.user));
      return result;
    } catch (error) {
      throw error;
    }
  },

  // Change password
  async changePassword(passwordData) {
    try {
      const response = await api.post('/auth/change-password', passwordData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Forgot password
  async forgotPassword(email) {
    try {
      const response = await api.post('/auth/forgot-password', { email });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Validate reset token
  async validateResetToken(token) {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/auth/reset-password/${token}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid or expired reset token');
      }

      return data;
    } catch (error) {
      throw error;
    }
  },

  // Reset password with token
  async resetPasswordWithToken(token, newPassword) {
    try {
      const response = await api.post('/auth/reset-password/' + token, { newPassword });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Upload profile image
  async uploadProfileImage(imageFile) {
    try {
      const formData = new FormData();
      formData.append('file', imageFile);

      // Use direct fetch for multipart form data
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');

      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/auth/profile/upload-image`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`
          // Don't set Content-Type header for FormData, let browser set it automatically
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      // Update stored user data with new profile image
      if (result.user) {
        localStorage.setItem('user', JSON.stringify(result.user));
      }
      return result;
    } catch (error) {
      throw error;
    }
  },

  // Delete profile image
  async deleteProfileImage() {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');

      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/auth/profile/delete-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      // Update stored user data with the updated user from the response
      if (result.user) {
        localStorage.setItem('user', JSON.stringify(result.user));
      }

      return result;
    } catch (error) {
      throw error;
    }
  },

  // Mark welcome as shown
  async markWelcomeShown() {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');

      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/auth/mark-welcome-shown`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      throw error;
    }
  },

  // Check if user is authenticated
  isAuthenticated() {
    return !!localStorage.getItem('token');
  },

  // Get stored user data
  getStoredUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }
};