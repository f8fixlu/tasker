import React from 'react';
import PropTypes from 'prop-types';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const AdminRedirectRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-pulse text-text-secondary-light dark:text-text-secondary-dark text-sm">Loading...</div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If user is admin and is trying to access dashboard, tasks, calendar, or reports, redirect to system stats
  if (user?.role === 'admin' && ['/dashboard', '/tasks', '/calendar', '/reports', '/'].includes(location.pathname)) {
    return <Navigate to="/admin/stats" replace />;
  }

  return children;
};

AdminRedirectRoute.propTypes = {
  children: PropTypes.node.isRequired
};

export default AdminRedirectRoute;