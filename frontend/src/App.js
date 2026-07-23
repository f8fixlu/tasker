import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ModalProvider } from './context/ModalContext';
import { TaskUpdateProvider } from './context/TaskUpdateContext';
import { NotificationUpdateProvider } from './context/NotificationUpdateContext';
import AdminRoute from './components/admin/AdminRoute';
import AdminRedirectRoute from './components/common/AdminRedirectRoute';
import Layout from './components/layout/Layout';
import { PageSkeleton } from './components/common/Skeleton';
import Dashboard from './pages/Dashboard';

// Lazy load pages for code splitting
const Tasks = lazy(() => import('./pages/Tasks'));
const Calendar = lazy(() => import('./pages/Calendar'));
const Reports = lazy(() => import('./pages/Reports'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const NotFound = lazy(() => import('./pages/NotFound'));
const AdminStatsPage = lazy(() => import('./pages/admin/AdminStatsPage'));
const UserManagementPage = lazy(() => import('./pages/admin/UserManagementPage'));
const BackupStatusPage = lazy(() => import('./pages/admin/BackupStatusPage'));

// Lazy load ModalRenderer to avoid bundling all modals in main chunk
const ModalRenderer = lazy(() => import('./components/modals/ModalRenderer'));

const skeletonFallback = (
  <div className="flex justify-center items-center h-screen">
    <div className="animate-pulse text-text-secondary-light dark:text-text-secondary-dark text-sm">Loading...</div>
  </div>
);

function App() {
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
                      <Suspense fallback={skeletonFallback}>
                        <Login />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/register"
                    element={
                      <Suspense fallback={skeletonFallback}>
                        <Register />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/"
                    element={
                      <AdminRedirectRoute>
                        <Layout>
                          <Dashboard />
                        </Layout>
                      </AdminRedirectRoute>
                    }
                  />
                  <Route
                    path="/dashboard"
                    element={
                      <AdminRedirectRoute>
                        <Layout>
                          <Dashboard />
                        </Layout>
                      </AdminRedirectRoute>
                    }
                  />
                  <Route
                    path="/tasks"
                    element={
                      <AdminRedirectRoute>
                        <Layout>
                          <Suspense fallback={<PageSkeleton />}>
                            <Tasks />
                          </Suspense>
                        </Layout>
                      </AdminRedirectRoute>
                    }
                  />
                  <Route
                    path="/calendar"
                    element={
                      <AdminRedirectRoute>
                        <Layout>
                          <Suspense fallback={<PageSkeleton />}>
                            <Calendar />
                          </Suspense>
                        </Layout>
                      </AdminRedirectRoute>
                    }
                  />
                  <Route
                    path="/reports"
                    element={
                      <AdminRedirectRoute>
                        <Layout>
                          <Suspense fallback={<PageSkeleton />}>
                            <Reports />
                          </Suspense>
                        </Layout>
                      </AdminRedirectRoute>
                    }
                  />
                  <Route
                    path="/reset-password/:token"
                    element={
                      <Suspense fallback={skeletonFallback}>
                        <ResetPassword />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/admin/stats"
                    element={
                      <AdminRoute>
                        <Layout>
                          <Suspense fallback={<PageSkeleton />}>
                            <AdminStatsPage />
                          </Suspense>
                        </Layout>
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/user-management"
                    element={
                      <AdminRoute>
                        <Layout>
                          <Suspense fallback={<PageSkeleton />}>
                            <UserManagementPage />
                          </Suspense>
                        </Layout>
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/backups"
                    element={
                      <AdminRoute>
                        <Layout>
                          <Suspense fallback={<PageSkeleton />}>
                            <BackupStatusPage />
                          </Suspense>
                        </Layout>
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="*"
                    element={
                      <Suspense fallback={skeletonFallback}>
                        <NotFound />
                      </Suspense>
                    }
                  />
                </Routes>
                <Suspense fallback={null}>
                  <ModalRenderer />
                </Suspense>
              </ModalProvider>
            </NotificationUpdateProvider>
          </TaskUpdateProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;