import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
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

  // Refs to break circular dependencies in useCallback
  const userRef = useRef(user);
  const navigateRef = useRef(navigate);
  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { navigateRef.current = navigate; }, [navigate]);

  const refreshToken = useCallback(async () => {
    try {
      const currentToken = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!currentToken) return false;

      const storageType = localStorage.getItem('token') === currentToken ? 'localStorage' : 'sessionStorage';
      const refreshTokenValue = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');

      if (!refreshTokenValue) return false;

      const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refreshTokenValue })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.accessToken) {
          if (storageType === 'localStorage') {
            localStorage.setItem('token', data.accessToken);
            if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
          } else {
            sessionStorage.setItem('token', data.accessToken);
            if (data.refreshToken) sessionStorage.setItem('refreshToken', data.refreshToken);
          }

          const updatedUser = { ...userRef.current, token: data.accessToken };
          setUser(updatedUser);

          const userKey = storageType === 'localStorage' ? 'user' : 'user';
          const userData = JSON.parse(localStorage.getItem(userKey) || sessionStorage.getItem(userKey) || '{}');
          userData.token = data.accessToken;
          if (storageType === 'localStorage') {
            localStorage.setItem(userKey, JSON.stringify(userData));
          } else {
            sessionStorage.setItem(userKey, JSON.stringify(userData));
          }

          return true;
        }
      }
    } catch (error) {
      console.error('Error during token refresh:', error);
    }
    return false;
  }, []);

  const refreshUser = useCallback(async () => {
    let token = localStorage.getItem('token');
    let storageType = 'localStorage';

    if (!token) {
      token = sessionStorage.getItem('token');
      storageType = 'sessionStorage';
    }

    if (!token || !userRef.current) return;

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/auth/profile`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          let userRole = null;
          if (token) {
            try {
              const payload = JSON.parse(atob(token.split('.')[1]));
              userRole = payload.role;
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
          if (storageType === 'localStorage') {
            localStorage.setItem('user', JSON.stringify(freshUserData));
          } else {
            sessionStorage.setItem('user', JSON.stringify(freshUserData));
          }
          cache.clear();
          heartbeatService.startWithActivityTracking();
        }
      } else if (response.status === 401 || response.status === 403) {
        const refreshSuccess = await refreshToken();
        if (refreshSuccess) {
          refreshUser();
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('refreshToken');
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
          sessionStorage.removeItem('refreshToken');
          setUser(null);
          heartbeatService.stop();
          navigateRef.current('/login');
        }
      }
    } catch (error) {
      console.error('Error refreshing user data:', error.message);
    }
  }, [refreshToken]);

  // Check if user is logged in on initial load
  useEffect(() => {
    let token = localStorage.getItem('token');
    let cachedUser = localStorage.getItem('user');

    if (!token || !cachedUser) {
      token = sessionStorage.getItem('token');
      cachedUser = sessionStorage.getItem('user');
    }

    if (token && cachedUser) {
      const userData = JSON.parse(cachedUser);
      userData.token = token;

      if (!userData.role && token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          userData.role = payload.role;
        } catch (error) {
          console.error('Error decoding token:', error);
        }
      }

      setUser(userData);
      heartbeatService.startWithActivityTracking();

      fetch(`${process.env.REACT_APP_API_URL || '/api'}/auth/profile`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      })
      .then(async response => {
        if (response.ok) {
          return response.json();
        } else if (response.status === 401 || response.status === 403) {
          const refreshSuccess = await refreshToken();
          if (refreshSuccess) {
            const newToken = localStorage.getItem('token') || sessionStorage.getItem('token');
            return fetch(`${process.env.REACT_APP_API_URL || '/api'}/auth/profile`, {
              method: 'GET',
              headers: { 'Authorization': `Bearer ${newToken}`, 'Content-Type': 'application/json' }
            }).then(retryResponse => {
              if (retryResponse.ok) return retryResponse.json();
              throw new Error(`Retry failed with status: ${retryResponse.status}`);
            }).catch(retryError => {
              console.error('Retry after refresh failed:', retryError);
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
          }
        }
        console.error('Profile validation failed with status:', response.status);
        return null;
      })
      .then(data => {
        if (data && data.user && userRef.current) {
          let userRole = null;
          if (token) {
            try {
              const payload = JSON.parse(atob(token.split('.')[1]));
              userRole = payload.role;
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

          if (localStorage.getItem('token') === token) {
            localStorage.setItem('user', JSON.stringify(freshUserData));
          } else {
            sessionStorage.setItem('user', JSON.stringify(freshUserData));
          }

          heartbeatService.startWithActivityTracking();
        }
      })
      .catch(error => {
        console.error('Background token validation failed, using cached data:', error.message);
      });
    } else {
      setUser(null);
      heartbeatService.stop();
    }
    setLoading(false);
  }, [navigate, refreshToken]);

  const login = useCallback(async (email, password, rememberMe = true) => {
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

      let userRole = null;
      if (data.accessToken) {
        try {
          const payload = JSON.parse(atob(data.accessToken.split('.')[1]));
          userRole = payload.role;
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

      if (rememberMe) {
        localStorage.setItem('token', data.accessToken);
        localStorage.setItem('user', JSON.stringify(userData));
        if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
      } else {
        sessionStorage.setItem('token', data.accessToken);
        sessionStorage.setItem('user', JSON.stringify(userData));
        if (data.refreshToken) sessionStorage.setItem('refreshToken', data.refreshToken);
      }

      cache.clear();
      heartbeatService.startWithActivityTracking();
      navigateRef.current('/dashboard');
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message || 'Network error' };
    }
  }, []);

  const logout = useCallback(() => {
    heartbeatService.stop();
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    fetch(`${process.env.REACT_APP_API_URL || '/api'}/auth/logout`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .finally(() => {
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('refreshToken');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('refreshToken');
        cache.clear();
        navigateRef.current('/login');
      });
  }, []);

  const register = useCallback(async (name, email, password) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: name, email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error && data.error.includes('already exists')) {
          return { success: false, message: data.error, fieldErrors: { email: data.error } };
        }
        return { success: false, message: data.error || 'Registration failed' };
      }

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
      if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
      cache.clear();
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message || 'Network error' };
    }
  }, []);

  // Effects to handle user activity and browser closing
  useEffect(() => {
    let lastActivityTime = 0;
    const THROTTLE_MS = 5000;

    const recordUserActivity = () => {
      const now = Date.now();
      if (now - lastActivityTime < THROTTLE_MS) return;
      lastActivityTime = now;
      if (heartbeatService.isRunning()) {
        heartbeatService.recordActivity();
      }
    };

    const handleBeforeUnload = () => {
      if (heartbeatService.isRunning()) {
        heartbeatService.stop();
      }
    };

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
  }, []);

  const value = useMemo(() => ({
    user,
    login,
    logout,
    register,
    refreshUser,
    loading,
    isAuthenticated: !!user
  }), [user, loading, login, logout, register, refreshUser]);

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired
};
