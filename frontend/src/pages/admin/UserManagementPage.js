import React, { useState, useEffect, useMemo, useRef } from 'react';

const UserManagementPage = () => {
  console.log('UserManagementPage component rendered'); // Debugging line
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false); // Separate loading state for users list
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
  const statusUpdateInterval = useRef(null); // Ref to store interval ID

  useEffect(() => {
    console.log('Initial fetchUsers effect running'); // Debugging line
    fetchUsers();
  }, [pagination.currentPage, sortConfig, debouncedSearchTerm]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to first page when search term changes
  useEffect(() => {
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  }, [debouncedSearchTerm]);

  // Auto-update user statuses every 30 seconds
  useEffect(() => {
    console.log('Setting up status update interval'); // Debugging line
    
    // Start the status update interval when component mounts
    statusUpdateInterval.current = setInterval(async () => {
      console.log('Executing status update...'); // Debugging line
      await updateStatuses();
    }, 30000); // 30 seconds

    // Clean up interval when component unmounts
    return () => {
      console.log('Cleaning up status update interval'); // Debugging line
      if (statusUpdateInterval.current) {
        clearInterval(statusUpdateInterval.current);
        statusUpdateInterval.current = null;
      }
    };
  }, []); // Empty dependency array to run only once on mount

  // Effect to trigger initial status update after component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      updateStatuses(); // Initial status update after component is fully mounted
    }, 5000); // Run after 5 seconds to ensure component is fully loaded

    return () => clearTimeout(timer);
  }, []);

  // Function to update only user statuses without refreshing the entire list
  const updateStatuses = async () => {
    console.log('Attempting to update statuses for', users.length, 'users');
    
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');

      if (!token) {
        console.error('No authentication token found for status update');
        return;
      }

      console.log('Updating user statuses...'); // Debugging line

      // Fetch updated user data for the current page only
      const params = new URLSearchParams({
        page: pagination.currentPage,
        limit: usersPerPage,
        sortBy: sortConfig.key,
        sortOrder: sortConfig.direction,
        search: debouncedSearchTerm,
        t: Date.now() // Add timestamp to prevent caching
      });

      const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/admin/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch updated user statuses: ${response.status}`);
      }

      const data = await response.json();
      console.log('Updated user data received:', data); // Debugging line

      // Process user data to get updated statuses
      let usersData = [];
      if (data.users && Array.isArray(data.users)) {
        usersData = data.users;
      } else if (Array.isArray(data)) {
        usersData = data;
      } else {
        usersData = [];
        console.log('No users data received in status update');
      }

      console.log('Processing', usersData.length, 'users for status update'); // Debugging line

      // Create a map of user IDs to their updated status information
      const updatedUsersMap = {};
      usersData.forEach(user => {
        updatedUsersMap[user.id] = {
          status: user.isActive ? 'online' : 'offline',
          lastSeen: user.last_login || 'Never',
          lastLogin: user.last_login || 'Never'
        };
      });

      // Update the users state with new status information
      setUsers(prevUsers => {
        console.log('Updating statuses for', prevUsers.length, 'previous users'); // Debugging line
        
        const updatedUsers = prevUsers.map(user => {
          const updatedUserData = updatedUsersMap[user.id];
          if (updatedUserData) {
            // Only update if status has changed to avoid unnecessary re-renders
            if (user.status !== updatedUserData.status) {
              console.log(`User ${user.id} status changed from ${user.status} to ${updatedUserData.status}`); // Debugging line
            }
            return {
              ...user,
              status: updatedUserData.status,
              lastSeen: updatedUserData.lastSeen,
              lastLogin: updatedUserData.lastLogin
            };
          } else {
            // If user is not in the updated list, keep the existing status
            // This could happen if the user is no longer in the filtered results
            return user;
          }
        });
        
        // Create a new array reference to ensure React detects the change
        return [...updatedUsers];
      });
    } catch (err) {
      console.error('Error updating user statuses:', err);
      // Don't set error state for status updates to avoid disrupting the UI
    }
  };

  const fetchUsers = async (page = 1) => {
    try {
      // Only show loading spinner for users list, not the whole page after initial load
      if (users.length > 0) {
        setLoadingUsers(true);
      } else {
        setLoading(true);
      }
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');

      if (!token) {
        throw new Error('No authentication token found');
      }

      // Build query parameters
      const params = new URLSearchParams({
        page: page || pagination.currentPage,
        limit: usersPerPage,
        sortBy: sortConfig.key,
        sortOrder: sortConfig.direction,
        search: debouncedSearchTerm
      });

      // Use the admin users endpoint for fetching user data with pagination
      const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/admin/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      console.log('API Response:', data); // Debugging line
      
      // Process user data to include status information
      // The backend now properly returns users with pagination when query parameters are provided
      let usersData = [];
      let paginationData = null;
      
      if (data.users && Array.isArray(data.users)) {
        // The API now returns users with pagination metadata when query parameters are provided
        console.log('Received users in data.users:', data.users.length);
        usersData = data.users;
        paginationData = data.pagination || { 
          currentPage: 1, 
          totalPages: 1, 
          totalUsers: data.users.length, 
          hasNextPage: false, 
          hasPrevPage: false 
        };
      } else if (Array.isArray(data)) {
        // If the API returns just an array of users (fallback)
        console.log('Received array of users:', data.length);
        usersData = data;
        paginationData = { currentPage: 1, totalPages: 1, totalUsers: data.length, hasNextPage: false, hasPrevPage: false };
      } else {
        // If the API returns an object with different structure or no users
        console.log('Unexpected data structure:', data);
        usersData = [];
        paginationData = { 
          currentPage: 1, 
          totalPages: 1, 
          totalUsers: 0, 
          hasNextPage: false, 
          hasPrevPage: false 
        };
      }
      
      const processedUsers = usersData.map(user => ({
        ...user,
        status: user.isActive ? 'online' : 'offline', // isActive is now provided by backend
        lastSeen: user.last_login || 'Never',
        device: 'Unknown', // Device info not available in current schema
        ipAddress: 'Unknown', // IP address not available in current schema
        lastLogin: user.last_login || 'Never'
      }));
      
      console.log('Processed users:', processedUsers.length);
      setUsers(processedUsers);
      setPagination(paginationData);
      setError(null);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load user data. Please try again later.');
    } finally {
      setLoading(false);
      setLoadingUsers(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchUsers(newPage);
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };


  const handleSelectUser = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(user => user.id));
    }
  };

  const handleDeleteSelected = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');

      if (!token) {
        throw new Error('No authentication token found');
      }

      // Delete selected users
      for (const userId of selectedUsers) {
        const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/admin/users/${userId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to delete user with ID: ${userId}`);
        }
      }

      // Refresh the user list
      await fetchUsers();
      setSelectedUsers([]);
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error('Error deleting users:', err);
      setError('Failed to delete users. Please try again.');
      setShowDeleteConfirm(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200';
      case 'offline':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
  };

  const getSortIndicator = (columnName) => {
    if (sortConfig.key === columnName) {
      return sortConfig.direction === 'asc' ? '↑' : '↓';
    }
    return '';
  };

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
              <span className="material-symbols-outlined text-base">close</span>
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
                // Skeleton loading rows
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