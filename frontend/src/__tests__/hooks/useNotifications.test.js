import { renderHook, act } from '@testing-library/react';
import useNotifications from '../hooks/useNotifications';

// Mock the useEffect to prevent automatic data fetching
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useEffect: jest.fn((callback) => callback()),
}));

describe('useNotifications Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should initialize with empty notifications', () => {
    const { result } = renderHook(() => useNotifications());
    
    expect(result.current.notifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
    expect(result.current.loading).toBe(false);
  });

  test('should mark a notification as read', () => {
    const { result } = renderHook(() => useNotifications());
    
    // Add a notification
    const notification = {
      id: 1,
      title: 'Test Notification',
      message: 'This is a test notification',
      type: 'task',
      is_read: false,
      created_at: '2023-10-26T10:00:00Z'
    };
    
    act(() => {
      result.current.addNotification(notification);
    });
    
    expect(result.current.unreadCount).toBe(1);
    
    // Mark as read
    act(() => {
      result.current.markAsRead(1);
    });
    
    expect(result.current.unreadCount).toBe(0);
    expect(result.current.notifications[0].is_read).toBe(true);
  });

  test('should mark all notifications as read', () => {
    const { result } = renderHook(() => useNotifications());
    
    // Add notifications
    act(() => {
      result.current.addNotification({ id: 1, title: 'Notification 1', is_read: false });
      result.current.addNotification({ id: 2, title: 'Notification 2', is_read: false });
      result.current.addNotification({ id: 3, title: 'Notification 3', is_read: true });
    });
    
    expect(result.current.unreadCount).toBe(2);
    
    // Mark all as read
    act(() => {
      result.current.markAllAsRead();
    });
    
    expect(result.current.unreadCount).toBe(0);
    expect(result.current.notifications.every(n => n.is_read)).toBe(true);
  });

  test('should delete a notification', () => {
    const { result } = renderHook(() => useNotifications());
    
    // Add notifications
    act(() => {
      result.current.addNotification({ id: 1, title: 'Notification 1', is_read: false });
      result.current.addNotification({ id: 2, title: 'Notification 2', is_read: true });
    });
    
    expect(result.current.notifications).toHaveLength(2);
    expect(result.current.unreadCount).toBe(1);
    
    // Delete a notification
    act(() => {
      result.current.deleteNotification(1);
    });
    
    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].id).toBe(2);
    expect(result.current.unreadCount).toBe(0);
  });

  test('should add a new notification', () => {
    const { result } = renderHook(() => useNotifications());
    
    const notification = {
      id: 1,
      title: 'New Notification',
      message: 'This is a new notification',
      type: 'task',
      is_read: false,
      created_at: '2023-10-26T10:00:00Z'
    };
    
    act(() => {
      result.current.addNotification(notification);
    });
    
    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0]).toMatchObject(notification);
    expect(result.current.unreadCount).toBe(1);
  });

  test('should update unread count correctly when adding notifications', () => {
    const { result } = renderHook(() => useNotifications());
    
    // Add a read notification
    act(() => {
      result.current.addNotification({ id: 1, title: 'Read Notification', is_read: true });
    });
    
    expect(result.current.unreadCount).toBe(0);
    
    // Add an unread notification
    act(() => {
      result.current.addNotification({ id: 2, title: 'Unread Notification', is_read: false });
    });
    
    expect(result.current.unreadCount).toBe(1);
  });
});