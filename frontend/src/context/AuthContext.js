import React, { createContext, useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import cache from '../utils/cache';
import heartbeatService from '../services/heartbeatService';

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
      
      // Ensure role is extracted from token if not present in cached user data
      if (!userData.role && token) {
        try {
          console.log('Decoding token for role extraction on initial load:', token);
          const tokenParts = token.split('.');
          if (tokenParts.length !== 3) {
            console.error('Invalid JWT token format');
          } else {
            const payload = JSON.parse(atob(tokenParts[1]));
            console.log('Decoded token payload:', payload);
            userData.role = payload.role;
            console.log('Extracted role from token:', payload.role);
          }
        } catch (error) {
          console.error('Error decoding token:', error);
        }
      }
      
      setUser(userData);

      // Start heartbeat service with activity tracking if user is authenticated
      heartbeatService.startWithActivityTracking();

      // Background validation - only update if token is still valid
      fetch(`${process.env.REACT_APP_API_URL || '/api'}/auth/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      .then(async response => {
        if (response.ok) {
          // Server validation successful, update user data with fresh data
          return response.json();
        } else if (response.status === 401 || response.status === 403) {
          // Token is invalid, try to refresh it
          const refreshSuccess = await refreshToken();
          if (refreshSuccess) {
            // Retry the profile fetch with the new token
            const newToken = localStorage.getItem('token') || sessionStorage.getItem('token');
            return fetch(`${process.env.REACT_APP_API_URL || '/api'}/auth/profile`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${newToken}`,
                'Content-Type': 'application/json'
              }
            }).then(retryResponse => {
              if (retryResponse.ok) {
                return retryResponse.json();
              } else {
                throw new Error(`Retry failed with status: ${retryResponse.status}`);
              }
            }).catch(retryError => {
              console.error('Retry after refresh failed:', retryError);
              // If retry also fails, proceed with logout
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              localStorage.removeItem('refreshToken');
              sessionStorage.removeItem('token');
              sessionStorage.removeItem('user');
              sessionStorage.removeItem('refreshToken');
              setUser(null);
              setTimeout(() => {
                if (!['/login', '/register'].includes(window.location.pathname)) {
                  navigate('/login');
                }
              }, 0);
              return null;
            });
          } else {
            // Refresh failed, clear everything from both storage types
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('refreshToken');
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('user');
            sessionStorage.removeItem('refreshToken');
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
        }
        // For other errors (network, server issues), keep the cached data
        console.error('Profile validation failed with status:', response.status);
        return null;
      })
      .then(data => {
        if (data && data.user && user) { // Only update if user still exists
          // Extract role from the token
          let userRole = null;
          if (token) {
            try {
              console.log('Decoding token for role extraction:', token);
              const tokenParts = token.split('.');
              if (tokenParts.length !== 3) {
                console.error('Invalid JWT token format');
              } else {
                const payload = JSON.parse(atob(tokenParts[1]));
                console.log('Decoded token payload:', payload);
                userRole = payload.role;
                console.log('Extracted role from token:', userRole);
              }
            } catch (error) {
              console.error('Error decoding token:', error);
            }
          }

          // Update with fresh data from server
          const freshUserData = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.full_name || data.user.name,
            full_name: data.user.full_name || data.user.name,
            profile_image_url: data.user.profile_image_url,
            role: userRole,
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

          // Start heartbeat service with activity tracking if user is authenticated
          heartbeatService.startWithActivityTracking();
        }
      })
      .catch(error => {
        console.log('Background token validation failed, using cached data:', error.message);
        // Keep using cached data, don't log out on network errors
      });
    } else {
      // If no token or user data, ensure we're not authenticated
      setUser(null);
      // Stop heartbeat service if not authenticated
      heartbeatService.stop();
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

      // Extract role from the token
      let userRole = null;
      if (data.accessToken) {
        try {
          console.log('Decoding token for role extraction:', data.accessToken);
          const tokenParts = data.accessToken.split('.');
          if (tokenParts.length !== 3) {
            console.error('Invalid JWT token format');
          } else {
            const payload = JSON.parse(atob(tokenParts[1]));
            console.log('Decoded token payload:', payload);
            userRole = payload.role;
            console.log('Extracted role from token:', userRole);
          }
        } catch (error) {
          console.error('Error decoding token:', error);
        }
      }

      const userData = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.full_name || data.user.name,
        full_name: data.user.full_name || data.user.name,
        profile_image_url: data.user.profile_image_url,
        role: userRole,
        token: data.accessToken
      };

      setUser(userData);

      // Store in localStorage based on rememberMe setting
      if (rememberMe) {
        localStorage.setItem('token', data.accessToken);
        localStorage.setItem('user', JSON.stringify(userData));
        // Store refresh token as well if provided
        if (data.refreshToken) {
          localStorage.setItem('refreshToken', data.refreshToken);
        }
      } else {
        sessionStorage.setItem('token', data.accessToken);
        sessionStorage.setItem('user', JSON.stringify(userData));
        // Store refresh token as well if provided
        if (data.refreshToken) {
          sessionStorage.setItem('refreshToken', data.refreshToken);
        }
      }

      // Clear cache to ensure fresh data after login
      cache.clear();

      // Start heartbeat service with activity tracking to maintain online status
      heartbeatService.startWithActivityTracking();

      // Navigate to dashboard after successful login
      // The welcome modal will be shown on the dashboard page if this is a new user
      navigate('/dashboard');
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message || 'Network error' };
    }
  };

  const logout = () => {
    // Stop heartbeat service immediately to prevent any further heartbeat requests
    heartbeatService.stop();
    
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
        localStorage.removeItem('refreshToken');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('refreshToken');
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

      // Extract role from the token
      let userRole = null;
      if (data.accessToken) {
        try {
          const tokenPayload = JSON.parse(atob(data.accessToken.split('.')[1]));
          userRole = tokenPayload.role;
        } catch (error) {
          console.error('Error decoding token:', error);
        }
      }

      const userData = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.full_name || data.user.name,
        full_name: data.user.full_name || data.user.name,
        profile_image_url: data.user.profile_image_url,
        role: userRole,
        token: data.accessToken
      };

      setUser(userData);
      localStorage.setItem('token', data.accessToken);
      localStorage.setItem('user', JSON.stringify(userData));
      // Store refresh token as well if provided
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }
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
          // Extract role from the token
          let userRole = null;
          if (token) {
            try {
              console.log('Decoding token for role extraction:', token);
              const tokenParts = token.split('.');
              if (tokenParts.length !== 3) {
                console.error('Invalid JWT token format');
              } else {
                const payload = JSON.parse(atob(tokenParts[1]));
                console.log('Decoded token payload:', payload);
                userRole = payload.role;
                console.log('Extracted role from token:', userRole);
              }
            } catch (error) {
              console.error('Error decoding token:', error);
            }
          }

          const freshUserData = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.full_name || data.user.name,
            full_name: data.user.full_name || data.user.name,
            profile_image_url: data.user.profile_image_url,
            role: userRole,
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
          // Restart heartbeat service with activity tracking to maintain online status
          heartbeatService.startWithActivityTracking();
        }
      } else if (response.status === 401 || response.status === 403) {
        // Token is invalid, try to refresh it
        refreshToken().then(refreshSuccess => {
          if (refreshSuccess) {
            // Retry the profile fetch with the new token
            refreshUser(); // Recursive call with new token
          } else {
            // Refresh failed, clear everything from both storage types
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('refreshToken');
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('user');
            sessionStorage.removeItem('refreshToken');
            setUser(null);
            // Stop heartbeat service when token becomes invalid
            heartbeatService.stop();
            navigate('/login');
          }
        });
      }
    } catch (error) {
      console.error('Error refreshing user data:', error.message);
      // Keep using cached data, don't log out on network errors
    }
  };

  // Function to refresh the authentication token
  const refreshToken = async () => {
    try {
      // Get the current access token to determine storage type
      const currentToken = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!currentToken) {
        console.warn('No access token available for refresh');
        return false;
      }

      // Try to get the refresh token from the same storage location
      // In the original design, refresh tokens might be stored with a different key
      const storageType = localStorage.getItem('token') === currentToken ? 'localStorage' : 'sessionStorage';
      const refreshTokenKey = storageType === 'localStorage' ? 'refreshToken' : 'refreshToken_session';
      const refreshTokenValue = localStorage.getItem(refreshTokenKey) || sessionStorage.getItem(refreshTokenKey);
      
      if (!refreshTokenValue) {
        console.warn('No refresh token available for refresh');
        return false;
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken: refreshTokenValue })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.accessToken) {
          // Update tokens in storage
          if (storageType === 'localStorage') {
            localStorage.setItem('token', data.accessToken);
            if (data.refreshToken) {
              localStorage.setItem('refreshToken', data.refreshToken);
            }
          } else {
            sessionStorage.setItem('token', data.accessToken);
            if (data.refreshToken) {
              sessionStorage.setItem('refreshToken', data.refreshToken);
            }
          }
          
          // Update user with new token
          const updatedUser = { ...user, token: data.accessToken };
          setUser(updatedUser);
          
          // Update user data in storage
          const userKey = storageType === 'localStorage' ? 'user' : 'user';
          const userData = JSON.parse(localStorage.getItem(userKey) || sessionStorage.getItem(userKey) || '{}');
          userData.token = data.accessToken;
          if (storageType === 'localStorage') {
            localStorage.setItem(userKey, JSON.stringify(userData));
          } else {
            sessionStorage.setItem(userKey, JSON.stringify(userData));
          }
          
          console.log('Token refreshed successfully');
          return true;
        }
      } else {
        console.error('Token refresh failed with status:', response.status);
        const errorData = await response.json().catch(() => ({}));
        console.error('Refresh error details:', errorData);
      }
    } catch (error) {
      console.error('Error during token refresh:', error);
    }
    return false;
  };

  // Effects to handle user activity and browser closing
  useEffect(() => {
    // Function to record user activity
    const recordUserActivity = () => {
      if (user && heartbeatService.isRunning()) {
        heartbeatService.recordActivity();
      }
    };

    const handleBeforeUnload = () => {
      // Stop heartbeat service when browser is closing
      if (user && heartbeatService.isRunning()) {
        heartbeatService.stop();
      }
    };

    // Add event listeners for user activity
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('mousemove', recordUserActivity, { passive: true });
    window.addEventListener('keydown', recordUserActivity, { passive: true });
    window.addEventListener('click', recordUserActivity, { passive: true });
    window.addEventListener('scroll', recordUserActivity, { passive: true });
    window.addEventListener('touchstart', recordUserActivity, { passive: true });
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('mousemove', recordUserActivity);
      window.removeEventListener('keydown', recordUserActivity);
      window.removeEventListener('click', recordUserActivity);
      window.removeEventListener('scroll', recordUserActivity);
      window.removeEventListener('touchstart', recordUserActivity);
    };
  }, [user]);

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