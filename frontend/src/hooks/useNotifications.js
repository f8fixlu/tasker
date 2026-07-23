import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { notificationService } from '../services/notificationService';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [networkFailures, setNetworkFailures] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  // Track the timeout ID for debouncing
  const debounceTimeoutRef = useRef(null);
  // Use refs for values that the interval needs but shouldn't cause re-creation
  const lastFetchTimeRef = useRef(0);
  const loadingRef = useRef(false);

  const areNotificationsEnabled = useCallback((type) => {
    try {
      const preferences = JSON.parse(localStorage.getItem('notificationPreferences') || '{}');
      if (Object.keys(preferences).length === 0) {
        const defaultPreferences = {
          email: true,
          push: true,
          taskRelated: true,
          eventRelated: true,
          system: true
        };
        localStorage.setItem('notificationPreferences', JSON.stringify(defaultPreferences));
        return true;
      }

      switch (type) {
        case 'task':
          return preferences.taskRelated !== false;
        case 'event':
          return preferences.eventRelated !== false;
        case 'system':
        case 'info':
        case 'warning':
        case 'success':
          return preferences.system !== false;
        default:
          return preferences.system !== false;
      }
    } catch (error) {
      console.error('Error checking notification preferences:', error);
      return true;
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;

    // Prevent multiple simultaneous requests using ref
    if (loadingRef.current) return;

    // Check if we just fetched notifications (within 500ms) to prevent loops
    const now = Date.now();
    if (now - lastFetchTimeRef.current < 500) return;

    loadingRef.current = true;
    setLoading(true);
    try {
      const [notificationsResponse, countResponse] = await Promise.all([
        notificationService.getRecentNotifications(10),
        notificationService.getUnreadCount()
      ]);

      const filteredNotifications = notificationsResponse.notifications?.filter(notification => {
        let type = 'system';
        if (notification.related_task_id) {
          type = 'task';
        } else if (notification.related_event_id) {
          type = 'event';
        } else if (notification.type) {
          type = notification.type;
        }
        return areNotificationsEnabled(type);
      }) || [];

      setNotifications(filteredNotifications);
      setUnreadCount(countResponse.count || 0);
      setError(null);
      setNetworkFailures(0);
      lastFetchTimeRef.current = now;
    } catch (err) {
      if (err.message && !err.message.includes('Network error')) {
        setError(err.message);
      }

      if (err.type === 'NETWORK_ERROR') {
        setNetworkFailures(prev => prev + 1);
      } else {
        console.error('Error fetching notifications:', err);
      }

      if (err.type === 'AUTH_ERROR') {
        setNotifications([]);
        setError(err.message);
      }
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [user?.id, areNotificationsEnabled]);

  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
    }
  }, [user?.id, fetchNotifications]);

  // Periodically refresh notifications - uses refs so interval doesn't recreate
  useEffect(() => {
    if (!user?.id) return;

    const interval = setInterval(() => {
      const now = Date.now();
      if (now - lastFetchTimeRef.current > 30000) {
        fetchNotifications();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [user?.id, fetchNotifications]);

  // Cleanup function to clear debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const debouncedFetchNotifications = useCallback(async () => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      fetchNotifications();
    }, 500);
  }, [fetchNotifications]);

  const addNotification = useCallback(async (notificationData) => {
    let type = 'system';
    if (notificationData.related_task_id) {
      type = 'task';
    } else if (notificationData.related_event_id) {
      type = 'event';
    } else if (notificationData.type) {
      type = notificationData.type;
    }

    if (!areNotificationsEnabled(type)) {
      return null;
    }

    try {
      const response = await notificationService.createNotification(notificationData);
      const newNotification = response.notification;

      newNotification.is_read = newNotification.is_read || false;

      setNotifications(prev => [newNotification, ...prev]);
      return newNotification;
    } catch (err) {
      console.error('Error adding notification:', err);
      const localNotification = {
        id: Date.now() + Math.random(),
        ...notificationData,
        read: false,
        is_read: false,
        createdAt: new Date().toISOString(),
      };
      setNotifications(prev => [localNotification, ...prev]);
      return localNotification;
    }
  }, [areNotificationsEnabled]);

  const markAsRead = useCallback(async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === id ? { ...notification, read: true, is_read: true } : notification
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev =>
        prev.map(notification => ({ ...notification, read: true, is_read: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  }, []);

  const deleteNotification = useCallback(async (id) => {
    try {
      const notificationToDelete = notifications.find(n => n.id === id);
      await notificationService.deleteNotification(id);
      setNotifications(prev => prev.filter(notification => notification.id !== id));
      if (notificationToDelete && !(notificationToDelete.read || notificationToDelete.is_read)) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  }, [notifications]);

  const deleteAllNotifications = useCallback(async () => {
    try {
      await notificationService.deleteAllNotifications();
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error('Error deleting all notifications:', err);
      await markAllAsRead();
    }
  }, [markAllAsRead]);

  const fetchAllNotifications = useCallback(async (params = {}) => {
    if (!user?.id) return { notifications: [], total: 0 };

    try {
      setLoading(true);
      const response = await notificationService.getAllNotifications(params);

      const filteredNotifications = response.notifications?.filter(notification => {
        let type = 'system';
        if (notification.related_task_id) {
          type = 'task';
        } else if (notification.related_event_id) {
          type = 'event';
        } else if (notification.type) {
          type = notification.type;
        }
        return areNotificationsEnabled(type);
      }) || [];

      setLoading(false);
      return { notifications: filteredNotifications, total: response.total || filteredNotifications.length };
    } catch (err) {
      setError(err.message);
      console.error('Error fetching all notifications:', err);
      setLoading(false);
      return { notifications: [], total: 0, error: err.message };
    }
  }, [user?.id, areNotificationsEnabled]);

  const fetchPaginatedNotifications = useCallback(async (page = 1, limit = 10, filters = {}) => {
    if (!user?.id) return { notifications: [], total: 0, hasMore: false, page, limit };

    try {
      setLoading(true);
      const response = await notificationService.getPaginatedNotifications(page, limit, filters);

      const filteredNotifications = response.notifications?.filter(notification => {
        let type = 'system';
        if (notification.related_task_id) {
          type = 'task';
        } else if (notification.related_event_id) {
          type = 'event';
        } else if (notification.type) {
          type = notification.type;
        }
        return areNotificationsEnabled(type);
      }) || [];

      setLoading(false);
      return {
        notifications: filteredNotifications,
        total: response.total || 0,
        hasMore: response.hasMore || false,
        page,
        limit,
        offset: response.offset
      };
    } catch (err) {
      setError(err.message);
      console.error('Error fetching paginated notifications:', err);
      setLoading(false);
      return { notifications: [], total: 0, hasMore: false, page, limit, error: err.message };
    }
  }, [user?.id, areNotificationsEnabled]);

  // Listen for changes to notification preferences in localStorage
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'notificationPreferences' && e.newValue !== e.oldValue) {
        fetchNotifications();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [fetchNotifications]);

  return {
    notifications,
    loading,
    error,
    fetchNotifications,
    fetchAllNotifications,
    fetchPaginatedNotifications,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    unreadCount,
    lastFetchTime: lastFetchTimeRef.current,
  };
};
