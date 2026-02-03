import React, { createContext, useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import cache from '../utils/cache';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Check if user is logged in on initial load
  useEffect(() => {
    // Check both localStorage and sessionStorage for tokens
    let token = localStorage.getItem('token');
    let cachedUser = localStorage.getItem('user');

    // If not found in localStorage, check sessionStorage
    if (!token || !cachedUser) {
      token = sessionStorage.getItem('token');
      cachedUser = sessionStorage.getItem('user');
    }

    if (token && cachedUser) {
      // If we have both token and cached user data, use it immediately
      const userData = JSON.parse(cachedUser);
      userData.token = token;
      setUser(userData);

      // Background validation - only update if token is still valid
      fetch(`${process.env.REACT_APP_API_URL || '/api'}/auth/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      .then(response => {
        if (response.ok) {
          // Server validation successful, update user data with fresh data
          return response.json();
        } else if (response.status === 401 || response.status === 403) {
          // Token is invalid, clear everything from both storage types
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
          setUser(null);
          // Don't navigate if we're already navigating somewhere else
          // This prevents issues when navigating from login to dashboard
          setTimeout(() => {
            if (!['/login', '/register'].includes(window.location.pathname)) {
              navigate('/login');
            }
          }, 0);
          return null; // Return null to indicate logout
        }
        // For other errors (network, server issues), keep the cached data
        console.error('Profile validation failed with status:', response.status);
        return null;
      })
      .then(data => {
        if (data && data.user && user) { // Only update if user still exists
          // Update with fresh data from server
          const freshUserData = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.full_name || data.user.name,
            full_name: data.user.full_name || data.user.name,
            profile_image_url: data.user.profile_image_url,
            token: token
          };
          setUser(freshUserData);

          // Update the appropriate storage with fresh data
          if (localStorage.getItem('token') === token) {
            // Token was from localStorage, update localStorage
            localStorage.setItem('user', JSON.stringify(freshUserData));
          } else {
            // Token was from sessionStorage, update sessionStorage
            sessionStorage.setItem('user', JSON.stringify(freshUserData));
          }
        }
      })
      .catch(error => {
        console.log('Background token validation failed, using cached data:', error.message);
        // Keep using cached data, don't log out on network errors
      });
    } else {
      // If no token or user data, ensure we're not authenticated
      setUser(null);
    }
    // Set loading to false after potentially setting the user from cache
    setLoading(false);
  }, [navigate]);

  const login = async (email, password, rememberMe = true) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, message: data.error || 'Login failed' };
      }

      const userData = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.full_name || data.user.name,
        full_name: data.user.full_name || data.user.name,
        profile_image_url: data.user.profile_image_url,
        token: data.accessToken
      };

      setUser(userData);

      // Store in localStorage based on rememberMe setting
      if (rememberMe) {
        localStorage.setItem('token', data.accessToken);
        localStorage.setItem('user', JSON.stringify(userData));
      } else {
        sessionStorage.setItem('token', data.accessToken);
        sessionStorage.setItem('user', JSON.stringify(userData));
      }

      // Clear cache to ensure fresh data after login
      cache.clear();

      // Navigate to dashboard after successful login
      // The welcome modal will be shown on the dashboard page if this is a new user
      navigate('/dashboard');
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message || 'Network error' };
    }
  };

  const logout = () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    fetch(`${process.env.REACT_APP_API_URL || '/api'}/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .finally(() => {
        setUser(null);
        // Clear tokens from both storage types
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        // Clear cache when logging out
        cache.clear();
        navigate('/login');
      });
  };

  const register = async (name, email, password) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: name, email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        // Check if the error is about existing email to set field-specific error
        if (data.error && data.error.includes('already exists')) {
          return { success: false, message: data.error, fieldErrors: { email: data.error } };
        }
        return { success: false, message: data.error || 'Registration failed' };
      }

      const userData = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.full_name || data.user.name,
        full_name: data.user.full_name || data.user.name,
        profile_image_url: data.user.profile_image_url,
        token: data.accessToken
      };

      setUser(userData);
      localStorage.setItem('token', data.accessToken);
      localStorage.setItem('user', JSON.stringify(userData));
      // Clear cache to ensure fresh data after registration
      cache.clear();
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message || 'Network error' };
    }
  };

  // Function to refresh the current user data
  const refreshUser = async () => {
    // Check both localStorage and sessionStorage for tokens
    let token = localStorage.getItem('token');
    let storageType = 'localStorage';

    if (!token) {
      token = sessionStorage.getItem('token');
      storageType = 'sessionStorage';
    }

    if (!token || !user) {
      return; // No token or user, nothing to refresh
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/auth/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          const freshUserData = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.full_name || data.user.name,
            full_name: data.user.full_name || data.user.name,
            profile_image_url: data.user.profile_image_url,
            token: token
          };
          setUser(freshUserData);
          // Update the appropriate storage with fresh data
          if (storageType === 'localStorage') {
            localStorage.setItem('user', JSON.stringify(freshUserData));
          } else {
            sessionStorage.setItem('user', JSON.stringify(freshUserData));
          }
          // Clear cache to ensure fresh data after refresh
          cache.clear();
        }
      } else if (response.status === 401 || response.status === 403) {
        // Token is invalid, clear everything from both storage types
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        setUser(null);
        navigate('/login');
      }
    } catch (error) {
      console.error('Error refreshing user data:', error.message);
      // Keep using cached data, don't log out on network errors
    }
  };

  const value = {
    user,
    login,
    logout,
    register,
    refreshUser,
    loading,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired
};