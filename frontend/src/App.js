import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ModalProvider } from './context/ModalContext';
import { TaskUpdateProvider } from './context/TaskUpdateContext';
import { NotificationUpdateProvider } from './context/NotificationUpdateContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import Layout from './components/layout/Layout';
import './styles/index.css';

// Lazy load pages for code splitting with preloading
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Tasks = lazy(() => import('./pages/Tasks'));
const Calendar = lazy(() => import('./pages/Calendar'));
const Reports = lazy(() => import('./pages/Reports'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));

// Preload critical routes when user is authenticated
const preloadDashboard = () => import('./pages/Dashboard');
const preloadTasks = () => import('./pages/Tasks');

import ModalRenderer from './components/modals/ModalRenderer';

function App() {
  // Preload critical components for better performance
  useEffect(() => {
    // Preload commonly used components
    const preloadCommonComponents = async () => {
      // Preload common components that are likely to be used
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        // Preload dashboard and tasks if user is likely authenticated
        import('./pages/Dashboard');
        import('./pages/Tasks');
      }
    };

    preloadCommonComponents();
  }, []);

  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <TaskUpdateProvider>
            <NotificationUpdateProvider>
              <ModalProvider>
                <Routes>
                  <Route
                    path="/login"
                    element={
                      <Suspense fallback={
                        <div className="flex justify-center items-center h-screen">
                          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                        </div>
                      }>
                        <Login />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/register"
                    element={
                      <Suspense fallback={
                        <div className="flex justify-center items-center h-screen">
                          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                        </div>
                      }>
                        <Register />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <Suspense fallback={
                            <div className="flex justify-center items-center h-screen">
                              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                            </div>
                          }>
                            <Dashboard />
                          </Suspense>
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <Suspense fallback={
                            <div className="flex justify-center items-center h-screen">
                              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                            </div>
                          }>
                            <Dashboard />
                          </Suspense>
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/tasks"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <Suspense fallback={
                            <div className="flex justify-center items-center h-screen">
                              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                            </div>
                          }>
                            <Tasks />
                          </Suspense>
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/calendar"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <Suspense fallback={
                            <div className="flex justify-center items-center h-screen">
                              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                            </div>
                          }>
                            <Calendar />
                          </Suspense>
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/reports"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <Suspense fallback={
                            <div className="flex justify-center items-center h-screen">
                              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                            </div>
                          }>
                            <Reports />
                          </Suspense>
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/reset-password/:token"
                    element={
                      <Suspense fallback={
                        <div className="flex justify-center items-center h-screen">
                          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                        </div>
                      }>
                        <ResetPassword />
                      </Suspense>
                    }
                  />
                </Routes>
                <ModalRenderer />
              </ModalProvider>
            </NotificationUpdateProvider>
          </TaskUpdateProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;