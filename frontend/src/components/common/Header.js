import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../hooks/useNotifications';
import { useTaskUpdate } from '../../context/TaskUpdateContext';
import { useNotificationUpdate } from '../../context/NotificationUpdateContext';
import { formatToLocalDateTime } from '../../utils/date';
import Button from './Button';
import Modal from './Modal';
import SettingsModal from './SettingsModal';
import NotificationsModal from '../modals/NotificationsModal';
import ThemeToggle from './ThemeToggle';
import MobileSidebar from './MobileSidebar';

const Header = () => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAllNotificationsModalOpen, setIsAllNotificationsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const profileRef = useRef(null);
  const notificationsRef = useRef(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const {
    notifications,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteAllNotifications,
    unreadCount,
    lastFetchTime
  } = useNotifications();
  const { updateTrigger } = useTaskUpdate();
  const { updateTrigger: notificationUpdateTrigger, triggerNotificationUpdate } = useNotificationUpdate();
  const location = useLocation();

  const toggleProfile = () => setIsProfileOpen(!isProfileOpen);

  // Toggle notifications dropdown without fetching - show cached data instantly
  const toggleNotifications = () => {
    setIsNotificationsOpen(!isNotificationsOpen);
  };

  // Refresh notifications when tasks or events are updated
  useEffect(() => {
    if (updateTrigger) {
      const now = Date.now();
      // Prevent fetching notifications too frequently (more than once per 1 second)
      if (now - lastFetchTime > 1000) {
        // Use a slight delay to prevent potential loops between task updates and notification updates
        const timer = setTimeout(() => {
          fetchNotifications();
        }, 300); // 300ms delay to allow any other state updates to settle

        // Clear the timeout if another update comes in before the delay completes
        return () => clearTimeout(timer);
      }
    }
  }, [updateTrigger, fetchNotifications, lastFetchTime]);

  // Refresh notifications when notification updates occur (e.g., when marked as read)
  // NOTE: This effect is kept for other notification update scenarios, but individual notification clicks
  // now update the state directly without triggering a full refresh
  useEffect(() => {
    if (notificationUpdateTrigger) {
      const now = Date.now();
      // Prevent fetching notifications too frequently (more than once per 1 second)
      if (now - lastFetchTime > 1000) {
        // Use a slight delay to prevent potential loops between task updates and notification updates
        const timer = setTimeout(() => {
          fetchNotifications();
        }, 300); // 300ms delay to allow any other state updates to settle

        // Clear the timeout if another update comes in before the delay completes
        return () => clearTimeout(timer);
      }
    }
  }, [notificationUpdateTrigger, fetchNotifications, lastFetchTime]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    logout();
    navigate('/login');
    setShowLogoutConfirm(false);
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  return (
    <header className="flex items-center justify-between whitespace-nowrap border-b border-border-light dark:border-border-dark px-4 sm:px-6 lg:px-8 py-2 bg-surface-light dark:bg-surface-dark fixed top-0 left-0 right-0 z-20">
      <div className="flex items-center gap-4 sm:gap-8">
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Hamburger menu for mobile */}
          <button
            className="md:hidden text-text-light dark:text-text-dark p-2 rounded-md"
            onClick={() => setIsMobileSidebarOpen(true)}
            aria-label="Open menu"
          >
            <span className="material-symbols-outlined text-xl">menu</span>
          </button>

          <img src={`${process.env.PUBLIC_URL}/logo/tasker_logo.png`} alt="Tasker Logo" className="size-6" />
          <h2 className="text-text-light dark:text-text-dark text-lg font-bold">Tasker</h2>
        </div>
        <div className="hidden md:flex items-center gap-6 lg:gap-9">
          {!(user?.role === 'admin') && (
            <Link
              className={`text-sm font-medium ${location.pathname === '/' || location.pathname === '/dashboard' ? 'text-primary-600 dark:text-primary-400' : 'text-text-light dark:text-text-dark'}`}
              to="/"
            >
              Dashboard
            </Link>
          )}
          {!(user?.role === 'admin') && (
            <Link
              className={`text-sm font-medium ${location.pathname === '/tasks' ? 'text-primary-600 dark:text-primary-400' : 'text-text-light dark:text-text-dark'}`}
              to="/tasks"
            >
              Tasks
            </Link>
          )}
          {!(user?.role === 'admin') && (
            <Link
              className={`text-sm font-medium ${location.pathname === '/calendar' ? 'text-primary-600 dark:text-primary-400' : 'text-text-light dark:text-text-dark'}`}
              to="/calendar"
            >
              Calendar
            </Link>
          )}
          {!(user?.role === 'admin') && (
            <Link
              className={`text-sm font-medium ${location.pathname === '/reports' ? 'text-primary-600 dark:text-primary-400' : 'text-text-light dark:text-text-dark'}`}
              to="/reports"
            >
              Reports
            </Link>
          )}
          {user?.role === 'admin' && (
            <>
              <Link
                className={`text-sm font-medium ${location.pathname === '/admin/stats' ? 'text-primary-600 dark:text-primary-400' : 'text-text-light dark:text-text-dark'}`}
                to="/admin/stats"
              >
                System Stats
              </Link>
              <Link
                className={`text-sm font-medium ${location.pathname === '/admin/user-management' ? 'text-primary-600 dark:text-primary-400' : 'text-text-light dark:text-text-dark'}`}
                to="/admin/user-management"
              >
                User Management
              </Link>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 sm:gap-4">
        <ThemeToggle />
        {!(user?.role === 'admin') && (
        <div className="relative" ref={notificationsRef}>
          <button
            className="p-2 rounded-full text-text-light dark:text-text-dark hover:bg-surface-light dark:hover:bg-surface-dark relative focus:outline-none"
            onClick={toggleNotifications}
          >
            <span className="material-symbols-outlined text-sm">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 min-w-5 px-1 flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-surface-light dark:bg-surface-dark rounded-lg shadow-card-lg border border-border-light dark:border-border-dark py-1 z-20">
              <div className="px-4 py-3 border-b border-border-light dark:border-border-dark flex justify-between items-center">
                <p className="text-sm font-semibold text-text-light dark:text-text-dark">Notifications</p>
                {notifications.length > 0 && (
                  <div className="flex space-x-2">
                    <button
                      className={`text-xs ${
                        unreadCount > 0
                          ? 'text-primary-600 dark:text-primary-400 hover:underline'
                          : 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                      }`}
                      onClick={async () => {
                        if (unreadCount > 0) {
                          await markAllAsRead();
                          triggerNotificationUpdate(); // Trigger update to refresh the header
                        }
                      }}
                      disabled={unreadCount === 0}
                    >
                      Mark all as read
                    </button>
                    <button
                      className="text-xs text-danger-600 dark:text-danger-400 hover:underline"
                      onClick={async () => {
                        await deleteAllNotifications();
                        triggerNotificationUpdate(); // Trigger update to refresh the header
                      }}
                    >
                      Delete all
                    </button>
                  </div>
                )}
              </div>
              <div className="divide-y divide-border-light dark:divide-border-dark max-h-96 overflow-y-auto scrollbar-hide">
                {/* Remove the loading spinner to prevent flickering */}
                {error && (
                  <div className="px-4 py-3 text-sm text-red-500">Error loading notifications</div>
                )}
                {/* Show notifications immediately from cache without loading state */}
                {(!notifications || notifications.length === 0) && (
                  <div className="px-4 py-6 text-center text-sm text-text-light dark:text-text-dark">
                    <p>No notifications yet</p>
                    <p className="text-xs mt-1 text-text-secondary-light dark:text-text-secondary-dark">
                      You'll see notifications for tasks and events here
                    </p>
                  </div>
                )}
                {notifications && notifications.slice(0, 5).map((notification) => (
                  <a
                    key={notification.id}
                    className={`block px-4 py-3 hover:bg-background-light dark:hover:bg-background-dark ${!notification.is_read ? 'cursor-pointer bg-blue-50 dark:bg-blue-900/20' : 'cursor-default'}`}
                    onClick={async (e) => {
                      // Only allow click if the notification is not already read
                      if (!notification.is_read) {
                        e.stopPropagation(); // Prevent event bubbling
                        await markAsRead(notification.id);
                        // Don't trigger a full refresh since the notification is already updated in local state
                      }
                    }}
                  >
                    <div className="flex justify-between">
                      <p className={`text-sm font-medium truncate ${!notification.is_read ? 'text-primary-600 dark:text-primary-400' : 'text-text-light dark:text-text-dark'}`}>
                        {notification.title}
                      </p>
                      {!notification.is_read && (
                        <span className="flex h-2 w-2 mt-1.5">
                          <span className="relative h-2 w-2 rounded-full bg-red-500"></span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1 truncate">
                      {notification.message}
                    </p>
                    <p className="text-[0.6rem] text-text-secondary-light dark:text-text-secondary-dark mt-1">
                      {formatToLocalDateTime(notification.created_at || notification.createdAt)}
                    </p>
                  </a>
                ))}
              </div>
              <div className="border-t border-border-light dark:border-border-dark py-1">
                <button
                  className={`block w-full px-4 py-2 text-sm text-center ${
                    notifications.length > 0
                      ? 'text-primary-600 dark:text-primary-400 hover:underline'
                      : 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  }`}
                  onClick={() => {
                    if (notifications.length > 0) {
                      setIsAllNotificationsModalOpen(true);
                      setIsNotificationsOpen(false); // Close the dropdown
                    }
                  }}
                  disabled={notifications.length === 0}
                >
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>
        )}
        {/* Show profile picture and dropdown only on desktop/tablet, hide on mobile */}
        <div className="relative hidden sm:hidden md:block lg:block xl:block" ref={profileRef}>
          {user?.profile_image_url ? (
            <button
              className="bg-center bg-no-repeat bg-cover bg-origin-padding rounded-full size-6 sm:size-7 flex items-center justify-center"
              style={{
                backgroundImage: `url("${user.profile_image_url}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
              onClick={toggleProfile}
              aria-label="User profile menu"
            ></button>
          ) : (
            <button
              className="flex items-center justify-center rounded-full size-6 sm:size-7 bg-primary-600 text-white font-medium text-sm"
              onClick={toggleProfile}
            >
              {user && (user.name || user.full_name)
                ? (() => {
                    const nameParts = (user.name || user.full_name).trim().split(' ');
                    if (nameParts.length === 1) {
                      // If only one name part, use its first two letters
                      return nameParts[0].substring(0, 2).toUpperCase();
                    } else {
                      // Use first letter of first name and first letter of last name
                      const firstInitial = nameParts[0][0];
                      const lastInitial = nameParts[nameParts.length - 1][0];
                      return (firstInitial + lastInitial).toUpperCase();
                    }
                  })()
                : 'U'}
            </button>
          )}
          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-surface-light dark:bg-surface-dark rounded-lg shadow-card-lg border border-border-light dark:border-border-dark py-1 z-20">
              <div className="px-4 py-3 border-b border-border-light dark:border-border-dark">
                <p className="text-sm font-semibold text-text-light dark:text-text-dark">{user?.name || user?.full_name || 'User'}</p>
                <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark truncate">{user?.email || 'email@example.com'}</p>
              </div>
              <button
                className="block px-4 py-2 text-sm text-text-light dark:text-text-dark hover:bg-background-light dark:hover:bg-background-dark w-full text-left"
                onClick={(e) => {
                  e.preventDefault();
                  setIsProfileOpen(false);
                  setIsSettingsOpen(true);
                }}
              >
                Settings
              </button>
              <button
                className="block w-full text-left px-4 py-2 text-sm text-danger-600 dark:text-danger-400 hover:bg-background-light dark:hover:bg-background-dark"
                onClick={handleLogout}
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Sidebar */}
      <MobileSidebar
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        onOpenSettings={() => {
          setIsSettingsOpen(true);
          setIsMobileSidebarOpen(false);
        }}
      />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        user={user}
      />

      {/* Logout Confirmation Modal */}
      <Modal
        isOpen={showLogoutConfirm}
        onClose={cancelLogout}
        title="Confirm Logout"
      >
        <div className="py-4">
          <p className="text-gray-700 dark:text-gray-300">
            Are you sure you want to log out? You will need to sign in again to access your account.
          </p>

          <div className="mt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={cancelLogout}>Cancel</Button>
            <Button variant="danger" onClick={confirmLogout}>
              Log Out
            </Button>
          </div>
        </div>
      </Modal>
      <NotificationsModal
        isOpen={isAllNotificationsModalOpen}
        onClose={() => setIsAllNotificationsModalOpen(false)}
      />
    </header>
  );
};

export default Header;