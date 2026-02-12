import React from 'react';
import { Navigate } from 'react-router-dom';

const AdminRoute = ({ children }) => {
  // Get token from localStorage or sessionStorage
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  
  // Simple check: if no token, redirect to login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Decode token to check if user is admin
  // The backend sets the role in the JWT token based on ADMIN_EMAILS environment variable
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const isAdmin = payload.role === 'admin';
    
    if (!isAdmin) {
      // Redirect to home if not admin
      return <Navigate to="/" replace />;
    }
    
    return children;
  } catch (error) {
    console.error('Error decoding token:', error);
    return <Navigate to="/login" replace />;
  }
};

export default AdminRoute;