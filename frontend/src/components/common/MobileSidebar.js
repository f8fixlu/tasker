import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Button from './Button';
import Modal from './Modal';
import { Icon } from './Icon';

const MobileSidebar = ({ isOpen, onClose, onOpenSettings }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    logout();
    navigate('/login');
    onClose();
    setShowLogoutConfirm(false);
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  const handleSettingsClick = (e) => {
    e.preventDefault();
    if (onOpenSettings) {
      onOpenSettings();
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden lg:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Sidebar panel */}
      <div className="absolute left-0 top-0 h-full w-64 max-w-sm bg-surface-light dark:bg-surface-dark shadow-xl transform transition-transform duration-300 ease-in-out">
        <div className="flex flex-col h-full">
          {/* Header with close button */}
          <div className="flex items-center justify-between p-4 border-b border-border-light dark:border-border-dark">
            <div className="flex items-center gap-2">
              <img src={`${process.env.PUBLIC_URL}/logo/tasker_logo.png`} alt="Tasker Logo" className="size-6" />
              <h2 className="text-text-light dark:text-text-dark text-lg font-bold">Tasker</h2>
            </div>
            <button
              onClick={onClose}
              className="text-text-light dark:text-text-dark hover:text-text-secondary-light dark:hover:text-text-secondary-dark"
            >
              <Icon name="close" className="" />
            </button>
          </div>

          {/* User profile section */}
          <div className="px-4 pt-4">
            <div className="flex items-center gap-3 mb-4">
              {user?.profile_image_url ? (
                <div
                  className="bg-center bg-no-repeat bg-cover bg-origin-padding rounded-full size-10 flex items-center justify-center"
                  style={{
                    backgroundImage: `url("${user.profile_image_url}")`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                />
              ) : (
                <div className="flex items-center justify-center rounded-full size-10 bg-primary-600 text-white font-medium text-sm">
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
                </div>
              )}
              <div>
                <p className="text-text-light dark:text-text-dark font-medium text-sm">
                  {user?.name || user?.full_name || 'User'}
                </p>
                <p className="text-text-secondary-light dark:text-text-secondary-dark text-xs truncate">
                  {user?.email || 'email@example.com'}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation links */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-2">
              {!(user?.role === 'admin') && (
                <li>
                  <Link
                    to="/"
                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-text-light dark:text-text-dark ${
                      location.pathname === '/' || location.pathname === '/dashboard'
                        ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400'
                        : 'hover:bg-background-light dark:hover:bg-background-dark'
                    }`}
                    onClick={onClose}
                  >
                    <Icon name="dashboard" className="text-base" />
                    <span>Dashboard</span>
                  </Link>
                </li>
              )}
              {!(user?.role === 'admin') && (
                <li>
                  <Link
                    to="/tasks"
                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-text-light dark:text-text-dark ${
                      location.pathname === '/tasks'
                        ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400'
                        : 'hover:bg-background-light dark:hover:bg-background-dark'
                    }`}
                    onClick={onClose}
                  >
                    <Icon name="task" className="text-base" />
                    <span>Tasks</span>
                  </Link>
                </li>
              )}
              {!(user?.role === 'admin') && (
                <li>
                  <Link
                    to="/calendar"
                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-text-light dark:text-text-dark ${
                      location.pathname === '/calendar'
                        ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400'
                        : 'hover:bg-background-light dark:hover:bg-background-dark'
                    }`}
                    onClick={onClose}
                  >
                    <Icon name="calendar_month" className="text-base" />
                    <span>Calendar</span>
                  </Link>
                </li>
              )}
              {!(user?.role === 'admin') && (
                <li>
                  <Link
                    to="/reports"
                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-text-light dark:text-text-dark ${
                      location.pathname === '/reports'
                        ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400'
                        : 'hover:bg-background-light dark:hover:bg-background-dark'
                    }`}
                    onClick={onClose}
                  >
                    <Icon name="analytics" className="text-base" />
                    <span>Reports</span>
                  </Link>
                </li>
              )}
              {user?.role === 'admin' && (
                <>
                  <li>
                    <Link
                      to="/admin/stats"
                      className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-text-light dark:text-text-dark ${
                        location.pathname === '/admin/stats'
                          ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400'
                          : 'hover:bg-background-light dark:hover:bg-background-dark'
                      }`}
                      onClick={onClose}
                    >
                      <Icon name="bar_chart" className="text-base" />
                      <span>System Stats</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/admin/user-management"
                      className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-text-light dark:text-text-dark ${
                        location.pathname === '/admin/user-management'
                          ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400'
                          : 'hover:bg-background-light dark:hover:bg-background-dark'
                      }`}
                      onClick={onClose}
                    >
                      <Icon name="people" className="text-base" />
                      <span>User Management</span>
                    </Link>
                  </li>
                </>
              )}
              <li>
                <button
                  className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-text-light dark:text-text-dark hover:bg-background-light dark:hover:bg-background-dark`}
                  onClick={handleSettingsClick}
                >
                  <Icon name="settings" className="text-base" />
                  <span>Settings</span>
                </button>
              </li>
            </ul>

            {/* Add logout button in the user profile section */}
            <div className="pt-4 border-t border-border-light dark:border-border-dark">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleLogout}
              >
                <Icon name="logout" className="text-base mr-2" />
                Sign Out
              </Button>
            </div>
          </nav>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <Modal
        isOpen={showLogoutConfirm}
        onClose={cancelLogout}
        title="Confirm Sign Out"
      >
        <div className="py-4">
          <p className="text-gray-700 dark:text-gray-300">
            Are you sure you want to sign out? You will need to sign in again to access your account.
          </p>

          <div className="mt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={cancelLogout}>Cancel</Button>
            <Button variant="danger" onClick={confirmLogout}>
              Sign Out
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MobileSidebar;