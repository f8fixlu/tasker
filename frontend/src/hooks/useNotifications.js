import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { notificationService } from '../services/notificationService';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [networkFailures, setNetworkFailures] = useState(0);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  // Track the timeout ID for debouncing
  const debounceTimeoutRef = useRef(null);

  useEffect(() => {
    if (user?.id && !loading) {
      fetchNotifications();
    }
  }, [user?.id]);

  // Periodically refresh notifications to keep badge updated
  useEffect(() => {
    if (user?.id) {
      // Refresh notifications every 60 seconds to reduce API load
      const interval = setInterval(() => {
        // Only refresh if it's been at least 30 seconds since the last fetch
        // This prevents conflicts with manual refreshes triggered by task updates
        const now = Date.now();
        if (now - lastFetchTime > 30000) {
          debouncedFetchNotifications();
        }
      }, 60000);

      return () => clearInterval(interval);
    }
  }, [user?.id, lastFetchTime]);

  // Cleanup function to clear debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Function to check if notifications are enabled for a specific type
  const areNotificationsEnabled = (type) => {
    try {
      const preferences = JSON.parse(localStorage.getItem('notificationPreferences') || '{}');
      // If no preferences are set, initialize with default settings and return true for all types
      if (Object.keys(preferences).length === 0) {
        // Set default preferences in localStorage to ensure consistent behavior
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
          // For any other type, check system setting
          return preferences.system !== false;
      }
    } catch (error) {
      console.error('Error checking notification preferences:', error);
      return true; // Default to true if there's an error
    }
  };

  const fetchNotifications = async () => {
    if (!user?.id) return;

    // Prevent multiple simultaneous requests
    if (loading) return;

    // Check if we just fetched notifications (within 500ms) to prevent loops
    const now = Date.now();
    if (now - lastFetchTime < 500) return;

    setLoading(true);
    try {
      // Fetch recent notifications and unread count separately
      const [notificationsResponse, countResponse] = await Promise.all([
        notificationService.getRecentNotifications(10),
        notificationService.getUnreadCount()
      ]);

      // Filter notifications based on user preferences
      const filteredNotifications = notificationsResponse.notifications?.filter(notification => {
        // Determine the notification type for filtering
        let type = 'system'; // default to system

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
      setNetworkFailures(0); // Reset failure counter on success
      setLastFetchTime(now); // Update the last fetch time
    } catch (err) {
      // Don't set error state for network errors to avoid persistent error messages
      // This prevents UI from showing error state continuously when network is unavailable
      if (err.message && !err.message.includes('Network error')) {
        setError(err.message);
      }

      // Track network failures to implement exponential backoff or avoid excessive logging
      if (err.type === 'NETWORK_ERROR') {
        setNetworkFailures(prev => prev + 1);

        // Only log after multiple consecutive failures to reduce console noise
        if ((networkFailures + 1) % 5 === 0) { // Log every 5th failure (after 4, 9, 14, etc.)
          console.warn(`Network error fetching notifications (failure #${networkFailures + 1}):`, err.message);
        }
      } else {
        console.error('Error fetching notifications:', err);
      }

      // Keep current notifications if there's a network error
      // Only clear notifications if there was an authentication error
      if (err.type === 'AUTH_ERROR') {
        setNotifications([]);
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Debounced version of fetchNotifications to prevent excessive API calls
  const debouncedFetchNotifications = async () => {
    // Clear any existing timeout to prevent multiple calls
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set a new timeout to delay the API call
    debounceTimeoutRef.current = setTimeout(() => {
      fetchNotifications();
    }, 500); // 500ms delay to allow multiple triggers to be consolidated
  };

  const addNotification = async (notificationData) => {
    // Check if notifications are enabled for this type before adding
    let type = 'system';
    if (notificationData.related_task_id) {
      type = 'task';
    } else if (notificationData.related_event_id) {
      type = 'event';
    } else if (notificationData.type) {
      type = notificationData.type;
    }

    if (!areNotificationsEnabled(type)) {
      // If the notification type is disabled, don't add it
      return null;
    }

    try {
      const response = await notificationService.createNotification(notificationData);
      const newNotification = response.notification;

      // Ensure the notification is marked as unread when added
      newNotification.is_read = newNotification.is_read || false;

      setNotifications(prev => [newNotification, ...prev]);
      return newNotification;
    } catch (err) {
      console.error('Error adding notification:', err);
      // Fallback to local state update if API fails
      const localNotification = {
        id: Date.now() + Math.random(),
        ...notificationData,
        read: false,
        is_read: false, // Ensure consistent field naming
        createdAt: new Date().toISOString(),
      };
      setNotifications(prev => [localNotification, ...prev]);
      return localNotification;
    }
  };

  const markAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === id ? { ...notification, read: true, is_read: true } : notification
        )
      );
      // Update the unread count since we just marked one as read
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev =>
        prev.map(notification => ({ ...notification, read: true, is_read: true }))
      );
      // Reset unread count since we marked all as read
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const deleteNotification = async (id) => {
    try {
      const notificationToDelete = notifications.find(n => n.id === id);
      await notificationService.deleteNotification(id);
      setNotifications(prev => prev.filter(notification => notification.id !== id));
      // If we deleted an unread notification, decrease unread count
      if (notificationToDelete && !(notificationToDelete.read || notificationToDelete.is_read)) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const deleteAllNotifications = async () => {
    try {
      await notificationService.deleteAllNotifications();
      setNotifications([]); // Clear notifications in the UI
      setUnreadCount(0); // Set unread count to 0 since all notifications are deleted
    } catch (err) {
      console.error('Error deleting all notifications:', err);
      // Fallback to marking all as read if deletion fails
      await markAllAsRead();
    }
  };

  // Fetch all notifications (not just recent ones)
  const fetchAllNotifications = async (params = {}) => {
    if (!user?.id) return { notifications: [], total: 0 };

    try {
      setLoading(true);
      const response = await notificationService.getAllNotifications(params);

      // Filter notifications based on user preferences (similar to fetchNotifications)
      const filteredNotifications = response.notifications?.filter(notification => {
        // Determine the notification type for filtering
        let type = 'system'; // default to system

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
  };

  // Fetch paginated notifications with filters
  const fetchPaginatedNotifications = async (page = 1, limit = 10, filters = {}) => {
    if (!user?.id) return { notifications: [], total: 0, hasMore: false, page, limit };

    try {
      setLoading(true);
      const response = await notificationService.getPaginatedNotifications(page, limit, filters);

      // Filter notifications based on user preferences
      const filteredNotifications = response.notifications?.filter(notification => {
        // Determine the notification type for filtering
        let type = 'system'; // default to system

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
  };

  // Listen for changes to notification preferences in localStorage
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'notificationPreferences' && e.newValue !== e.oldValue) {
        // Refresh notifications to apply new preferences
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
    lastFetchTime, // Expose the last fetch time so components can make decisions about when to refresh
  };
};