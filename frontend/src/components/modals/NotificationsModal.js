import React, { useEffect, useState, useRef } from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import { useNotificationUpdate } from '../../context/NotificationUpdateContext';
import { formatToLocalDateTime } from '../../utils/date';
import Modal from '../common/Modal';

const NotificationsModal = ({ isOpen, onClose }) => {
  const { fetchPaginatedNotifications, markAsRead, deleteNotification, notifications: currentNotifications } = useNotifications();
  const { triggerNotificationUpdate } = useNotificationUpdate();
  const [allNotifications, setAllNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const hasLoadedOnce = useRef(false); // Track if notifications have been loaded at least once
  const itemsPerPage = 10; // Number of notifications per page

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
      hasLoadedOnce.current = true; // Mark that we've loaded at least once
    } else {
      // Reset the flag when modal is closed
      hasLoadedOnce.current = false;
    }
  }, [isOpen, currentPage]); // Depend on both isOpen and currentPage

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const result = await fetchPaginatedNotifications(currentPage, itemsPerPage);
      setAllNotifications(result.notifications || []);
      setTotal(result.total || 0);
      setHasMore(result.hasMore || false);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };


  const markAsReadHandler = async (id) => {
    await markAsRead(id);
    // Update local state to reflect the change
    setAllNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, is_read: true } : notification
      )
    );

    // Trigger notification update to refresh the header
    triggerNotificationUpdate();
  };

  const deleteNotificationHandler = async (id) => {
    await deleteNotification(id);
    // Remove from local state
    const updatedNotifications = allNotifications.filter(notification => notification.id !== id);
    setAllNotifications(updatedNotifications);

    // Update total count
    setTotal(prev => Math.max(0, prev - 1));

    // If this page becomes empty and there are no more notifications on this page
    // but there are previous pages, go to the previous page
    if (updatedNotifications.length === 0 && total > (currentPage * itemsPerPage)) {
      // If we're not on the first page and there are still notifications,
      // go to previous page to see the remaining notifications
      if (currentPage > 1) {
        setCurrentPage(prev => prev - 1);
      }
    }

    // Trigger notification update to refresh the header
    triggerNotificationUpdate();
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="All Notifications"
      size="xl"
      showOverlaySpinner={loading} // Show overlay spinner when loading
    >
      <div className="max-h-[70vh] overflow-y-auto scrollbar-hide">
        {allNotifications.length === 0 && !loading ? (
          <div className="py-8 text-center text-text-light dark:text-text-dark">
            <p>No notifications found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {allNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-lg border ${
                  notification.is_read
                    ? 'bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark'
                    : 'bg-blue-50 dark:bg-blue-900/20 border-primary-200 dark:border-primary-800'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-medium ${
                      notification.is_read
                        ? 'text-text-light dark:text-text-dark'
                        : 'text-primary-600 dark:text-primary-400'
                    }`}>
                      {notification.title}
                    </h3>
                    <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-1">
                      {notification.message}
                    </p>
                    <p className="text-[0.6rem] text-text-secondary-light dark:text-text-secondary-dark mt-2">
                      {formatToLocalDateTime(notification.created_at || notification.createdAt)}
                    </p>
                  </div>
                  <div className="flex space-x-2 ml-2">
                    {!notification.is_read && (
                      <button
                        onClick={() => markAsReadHandler(notification.id)}
                        className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                      >
                        Mark as read
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotificationHandler(notification.id)}
                      className="text-xs text-danger-600 dark:text-danger-400 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="flex justify-between items-center mt-4 pt-4 border-t border-border-light dark:border-border-dark">
        <button
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={currentPage === 1 || loading}
          className={`px-3 py-1 rounded ${
            currentPage === 1 || loading
              ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
              : 'text-primary-600 dark:text-primary-400 hover:bg-background-light dark:hover:bg-background-dark'
          }`}
        >
          Previous
        </button>

        <span className="text-sm text-text-light dark:text-text-dark">
          {total > 0 ?
            `Showing ${Math.min((currentPage - 1) * itemsPerPage + 1, total)}-${Math.min(currentPage * itemsPerPage, total)} of ${total}`
            : 'No notifications'}
        </span>

        <button
          onClick={() => setCurrentPage(prev => prev + 1)}
          disabled={!hasMore || loading}
          className={`px-3 py-1 rounded ${
            !hasMore || loading
              ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
              : 'text-primary-600 dark:text-primary-400 hover:bg-background-light dark:hover:bg-background-dark'
          }`}
        >
          Next
        </button>
      </div>
    </Modal>
  );
};

export default NotificationsModal;