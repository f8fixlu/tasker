import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Icon } from '../../components/common/Icon';

const API_BASE = process.env.REACT_APP_API_URL || '/api';

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalUsers: 0,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const usersPerPage = 10;
  const statusUpdateInterval = useRef(null);
  const fetchControllerRef = useRef(null);
  const statusControllerRef = useRef(null);

  // Refs to avoid stale closures in interval
  const paginationRef = useRef(pagination);
  const sortConfigRef = useRef(sortConfig);
  const debouncedSearchRef = useRef(debouncedSearchTerm);

  useEffect(() => { paginationRef.current = pagination; }, [pagination]);
  useEffect(() => { sortConfigRef.current = sortConfig; }, [sortConfig]);
  useEffect(() => { debouncedSearchRef.current = debouncedSearchTerm; }, [debouncedSearchTerm]);

  const fetchUsers = useCallback(async (page = 1) => {
    // Abort any in-flight fetch
    if (fetchControllerRef.current) {
      fetchControllerRef.current.abort();
    }
    const controller = new AbortController();
    fetchControllerRef.current = controller;

    try {
      if (users.length > 0) {
        setLoadingUsers(true);
      } else {
        setLoading(true);
      }

      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const currentPage = page || paginationRef.current.currentPage;
      const params = new URLSearchParams({
        page: currentPage,
        limit: usersPerPage,
        sortBy: sortConfigRef.current.key,
        sortOrder: sortConfigRef.current.direction,
        search: debouncedSearchRef.current
      });

      const response = await fetch(`${API_BASE}/admin/users?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: controller.signal
      });

      if (!response.ok) throw new Error('Failed to fetch users');

      const data = await response.json();

      let usersData = [];
      let paginationData = null;

      if (data.users && Array.isArray(data.users)) {
        usersData = data.users;
        paginationData = data.pagination || {
          currentPage: 1, totalPages: 1, totalUsers: data.users.length, hasNextPage: false, hasPrevPage: false
        };
      } else if (Array.isArray(data)) {
        usersData = data;
        paginationData = { currentPage: 1, totalPages: 1, totalUsers: data.length, hasNextPage: false, hasPrevPage: false };
      } else {
        usersData = [];
        paginationData = { currentPage: 1, totalPages: 1, totalUsers: 0, hasNextPage: false, hasPrevPage: false };
      }

      const processedUsers = usersData.map(user => ({
        ...user,
        status: user.isActive ? 'online' : 'offline',
        lastSeen: user.last_login || 'Never',
        device: 'Unknown',
        ipAddress: 'Unknown',
        lastLogin: user.last_login || 'Never'
      }));

      setUsers(processedUsers);
      setPagination(paginationData);
      setError(null);
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('Error fetching users:', err);
      setError('Failed to load user data. Please try again later.');
    } finally {
      setLoading(false);
      setLoadingUsers(false);
    }
  }, [users.length]);

  useEffect(() => {
    fetchUsers(pagination.currentPage);
  }, [pagination.currentPage, sortConfig, debouncedSearchTerm, fetchUsers]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to first page when search term changes
  useEffect(() => {
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  }, [debouncedSearchTerm]);

  const updateStatuses = useCallback(async () => {
    if (statusControllerRef.current) {
      statusControllerRef.current.abort();
    }
    const controller = new AbortController();
    statusControllerRef.current = controller;

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) return;

      const params = new URLSearchParams({
        page: paginationRef.current.currentPage,
        limit: usersPerPage,
        sortBy: sortConfigRef.current.key,
        sortOrder: sortConfigRef.current.direction,
        search: debouncedSearchRef.current,
        t: Date.now()
      });

      const response = await fetch(`${API_BASE}/admin/users?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: controller.signal
      });

      if (!response.ok) throw new Error(`Failed to fetch updated user statuses: ${response.status}`);

      const data = await response.json();

      let usersData = [];
      if (data.users && Array.isArray(data.users)) {
        usersData = data.users;
      } else if (Array.isArray(data)) {
        usersData = data;
      }

      const updatedUsersMap = {};
      usersData.forEach(user => {
        updatedUsersMap[user.id] = {
          status: user.isActive ? 'online' : 'offline',
          lastSeen: user.last_login || 'Never',
          lastLogin: user.last_login || 'Never'
        };
      });

      setUsers(prevUsers => {
        let changed = false;
        const updatedUsers = prevUsers.map(user => {
          const updatedUserData = updatedUsersMap[user.id];
          if (updatedUserData && user.status !== updatedUserData.status) {
            changed = true;
            return { ...user, status: updatedUserData.status, lastSeen: updatedUserData.lastSeen, lastLogin: updatedUserData.lastLogin };
          }
          return user;
        });
        if (!changed) return prevUsers;
        return updatedUsers;
      });
    } catch (err) {
      if (err.name === 'AbortError') return;
      // Don't set error state for background status updates
    }
  }, []);

  // Auto-update user statuses every 30 seconds
  useEffect(() => {
    statusUpdateInterval.current = setInterval(() => {
      updateStatuses();
    }, 30000);
    return () => {
      if (statusUpdateInterval.current) {
        clearInterval(statusUpdateInterval.current);
        statusUpdateInterval.current = null;
      }
    };
  }, [updateStatuses]);

  // Cleanup all controllers on unmount
  useEffect(() => {
    return () => {
      if (fetchControllerRef.current) fetchControllerRef.current.abort();
      if (statusControllerRef.current) statusControllerRef.current.abort();
    };
  }, []);

  const handlePageChange = useCallback((newPage) => {
    if (newPage >= 1 && newPage <= paginationRef.current.totalPages) {
      setPagination(prev => ({ ...prev, currentPage: newPage }));
    }
  }, []);

  const handleSort = useCallback((key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  const handleSelectUser = useCallback((userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedUsers(prev =>
      prev.length === users.length ? [] : users.map(user => user.id)
    );
  }, [users]);

  const handleDeleteSelected = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  const confirmDelete = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      // Use batch delete endpoint
      const response = await fetch(`${API_BASE}/admin/users/batch`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids: selectedUsers })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete users');
      }

      await fetchUsers();
      setSelectedUsers([]);
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error('Error deleting users:', err);
      setError('Failed to delete users. Please try again.');
      setShowDeleteConfirm(false);
    }
  };

  const getStatusColor = useCallback((status) => {
    switch (status) {
      case 'online':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200';
      case 'offline':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
  }, []);

  const getSortIndicator = useCallback((columnName) => {
    if (sortConfig.key === columnName) {
      return sortConfig.direction === 'asc' ? '\u2191' : '\u2193';
    }
    return '';
  }, [sortConfig]);

  if (loading && users.length === 0) {
    return (
      <div className="layout-content-container flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 dark:border-blue-400"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="layout-content-container">
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error! </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="layout-content-container">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-8">User Management</h1>

      {/* Search and Action Bar */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="w-full md:w-auto relative">
          <input
            type="text"
            placeholder="Search users..."
            className="w-full md:w-80 px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <Icon name="close" className="text-base" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleDeleteSelected}
            disabled={selectedUsers.length === 0}
            className={`px-4 py-2 rounded-lg ${
              selectedUsers.length > 0
                ? 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800'
                : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            }`}
          >
            Delete Selected ({selectedUsers.length})
          </button>
        </div>
      </div>

      {/* User Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === users.length && users.length > 0}
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-blue-600 dark:text-blue-400 rounded"
                  />
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center">
                    User {getSortIndicator('name')}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center">
                    Status {getSortIndicator('status')}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('device')}
                >
                  <div className="flex items-center">
                    Device {getSortIndicator('device')}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('ipAddress')}
                >
                  <div className="flex items-center">
                    IP Address {getSortIndicator('ipAddress')}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('lastLogin')}
                >
                  <div className="flex items-center">
                    Last Login {getSortIndicator('lastLogin')}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('created_at')}
                >
                  <div className="flex items-center">
                    Joined {getSortIndicator('created_at')}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loadingUsers ? (
                [...Array(5)].map((_, i) => (
                  <tr key={`skeleton-${i}`} className="animate-pulse">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                        <div className="ml-4">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mt-1"></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-28"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => handleSelectUser(user.id)}
                        className="h-4 w-4 text-blue-600 dark:text-blue-400 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {user.profile_image_url ? (
                            <img className="h-10 w-10 rounded-full" src={user.profile_image_url} alt="" />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-blue-500 dark:bg-blue-600 flex items-center justify-center text-white font-medium">
                              {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name || user.email}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(user.status)}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {user.device || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {user.ipAddress || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {user.lastLogin !== 'Never'
                        ? (() => {
                            const date = new Date(user.lastLogin);
                            date.setHours(date.getHours() + 8);
                            return date.toLocaleString();
                          })()
                        : user.lastLogin}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete user ${user.name || user.email}?`)) {
                            setSelectedUsers([user.id]);
                            setShowDeleteConfirm(true);
                          }
                        }}
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-sm text-gray-700 dark:text-gray-300">
          Showing <span className="font-medium">{(pagination.currentPage - 1) * usersPerPage + 1}</span> to{' '}
          <span className="font-medium">
            {Math.min(pagination.currentPage * usersPerPage, pagination.totalUsers)}
          </span>{' '}
          of <span className="font-medium">{pagination.totalUsers}</span> users
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => handlePageChange(pagination.currentPage - 1)}
            disabled={!pagination.hasPrevPage}
            className={`px-3 py-1 rounded-md ${
              pagination.hasPrevPage
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
            }`}
          >
            Previous
          </button>

          <div className="flex items-center">
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              let pageNum;
              if (pagination.totalPages <= 5) {
                pageNum = i + 1;
              } else if (pagination.currentPage <= 3) {
                pageNum = i + 1;
              } else if (pagination.currentPage >= pagination.totalPages - 2) {
                pageNum = pagination.totalPages - 4 + i;
              } else {
                pageNum = pagination.currentPage - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`px-3 py-1 mx-0.5 rounded-md ${
                    pagination.currentPage === pageNum
                      ? 'bg-blue-600 dark:bg-blue-700 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => handlePageChange(pagination.currentPage + 1)}
            disabled={!pagination.hasNextPage}
            className={`px-3 py-1 rounded-md ${
              pagination.hasNextPage
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
            }`}
          >
            Next
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Confirm Deletion</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete {selectedUsers.length} user(s)? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-md hover:bg-red-700 dark:hover:bg-red-800"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;
