import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const BackupStatusPage = () => {
  const navigate = useNavigate();
  const [backupStatus, setBackupStatus] = useState({
    webapp: { status: 'UNKNOWN', last_run: null, duration_seconds: null },
    database: { status: 'UNKNOWN', last_run: null }
  });
  const [servicesStatus, setServicesStatus] = useState({
    webapp: { active: false, status: 'unknown' },
    database: { active: false, status: 'unknown' }
  });
  const [webappLogs, setWebappLogs] = useState([]);
  const [databaseLogs, setDatabaseLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('status'); // 'status' or 'logs'
  const [activeLogType, setActiveLogType] = useState('webapp'); // 'webapp' or 'database'
  const [actionInProgress, setActionInProgress] = useState(null);

  const webappLogsRef = useRef(null);
  const databaseLogsRef = useRef(null);

  // Format duration from seconds
  const formatDuration = (seconds) => {
    if (seconds === null || seconds === undefined) return 'N/A';
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Format date to local datetime string
  const formatDateTime = (dateString) => {
    if (!dateString) return 'Never';
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (e) {
      return dateString;
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    if (!status) return 'bg-gray-500';
    const s = status.toUpperCase();
    if (s === 'SUCCESS' || s === 'DB_SUCCESS') return 'bg-green-500';
    if (s === 'FAILED' || s === 'DB_CORRUPTED' || s === 'DB_BACKUP_FAILED' || s === 'DB_UPLOAD_FAILED') return 'bg-red-500';
    if (s === 'RUNNING' || s === 'IN_PROGRESS') return 'bg-blue-500';
    return 'bg-gray-500';
  };

  // Get status badge color
  const getStatusBadgeColor = (status) => {
    if (!status) return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    const s = status.toUpperCase();
    if (s === 'SUCCESS' || s === 'DB_SUCCESS') return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    if (s === 'FAILED' || s === 'DB_CORRUPTED' || s === 'DB_BACKUP_FAILED' || s === 'DB_UPLOAD_FAILED') return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    if (s === 'RUNNING' || s === 'IN_PROGRESS') return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  // Fetch backup status
  const fetchBackupStatus = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }

      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const [statusResponse, servicesResponse] = await Promise.all([
        fetch(`${process.env.REACT_APP_API_URL || '/api'}/admin/backups/status`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`${process.env.REACT_APP_API_URL || '/api'}/admin/backups/services/status`, {
          headers: { 'Authorization': `Bearer ${token}` },
        })
      ]);

      if (!statusResponse.ok) {
        throw new Error('Failed to fetch backup status');
      }
      if (!servicesResponse.ok) {
        throw new Error('Failed to fetch services status');
      }

      const statusData = await statusResponse.json();
      const servicesData = await servicesResponse.json();

      setBackupStatus(statusData);
      setServicesStatus(servicesData);
      setError(null);
    } catch (err) {
      console.error('Error fetching backup status:', err);
      setError('Failed to load backup status. Please try again later.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Fetch logs
  const fetchLogs = async (type, lines = 50) => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) return;

      const response = await fetch(
        `${process.env.REACT_APP_API_URL || '/api'}/admin/backups/logs/${type}?lines=${lines}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (!response.ok) return;

      const data = await response.json();
      if (type === 'webapp') {
        setWebappLogs(data.logs || []);
      } else {
        setDatabaseLogs(data.logs || []);
      }
    } catch (err) {
      console.error(`Error fetching ${type} logs:`, err);
    }
  };

  // Handle service start/stop
  const handleServiceAction = async (service, action) => {
    setActionInProgress(`${service}-${action}`);
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) throw new Error('No token');

      const response = await fetch(
        `${process.env.REACT_APP_API_URL || '/api'}/admin/backups/services/${service}/${action}`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Action failed');
      }

      // Refresh status after action
      await fetchBackupStatus(false);
    } catch (err) {
      console.error(`Error ${action} ${service} service:`, err);
      alert(`Failed to ${action} ${service} backup service: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  // Handle manual backup trigger
  const handleTriggerBackup = async (type) => {
    setActionInProgress(`trigger-${type}`);
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) throw new Error('No token');

      const response = await fetch(
        `${process.env.REACT_APP_API_URL || '/api'}/admin/backups/${type}/trigger`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Backup trigger failed');
      }

      // Show success message
      alert(`${type === 'webapp' ? 'Webapp' : 'Database'} backup triggered successfully!`);
      
      // Refresh status after a delay to allow backup to complete
      setTimeout(() => fetchBackupStatus(false), 3000);
    } catch (err) {
      console.error(`Error triggering ${type} backup:`, err);
      alert(`Failed to trigger ${type} backup: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  useEffect(() => {
    fetchBackupStatus(true);
    // Refresh status every 30 seconds
    const interval = setInterval(() => fetchBackupStatus(false), 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch logs when switching to logs tab
  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs(activeLogType);
    }
  }, [activeTab, activeLogType]);

  if (loading) {
    return (
      <div className="layout-content-container flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 dark:border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="layout-content-container">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Backup Management</h1>
        <button
          onClick={() => fetchBackupStatus(false)}
          disabled={isRefreshing}
          className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg relative mb-6" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'status'
              ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
          onClick={() => setActiveTab('status')}
        >
          Status
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'logs'
              ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
          onClick={() => setActiveTab('logs')}
        >
          Logs
        </button>
      </div>

      {activeTab === 'status' && (
        <>
          {/* Backup Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Webapp Backup Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Webapp Backup</h2>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(backupStatus.webapp.status)}`}>
                  {backupStatus.webapp.status || 'UNKNOWN'}
                </span>
              </div>
              
              <div className="space-y-3 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400 text-sm">Status:</span>
                  <div className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${getStatusColor(backupStatus.webapp.status)}`}></span>
                    <span className="text-gray-800 dark:text-gray-200 text-sm">{backupStatus.webapp.status || 'Unknown'}</span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400 text-sm">Last Run:</span>
                  <span className="text-gray-800 dark:text-gray-200 text-sm">{formatDateTime(backupStatus.webapp.last_run)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400 text-sm">Duration:</span>
                  <span className="text-gray-800 dark:text-gray-200 text-sm">{formatDuration(backupStatus.webapp.duration_seconds)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400 text-sm">Service:</span>
                  <span className={`text-sm ${servicesStatus.webapp.active ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    {servicesStatus.webapp.active ? 'Running' : 'Stopped'}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                {servicesStatus.webapp.active ? (
                  <button
                    onClick={() => handleServiceAction('webapp', 'stop')}
                    disabled={actionInProgress === 'webapp-stop'}
                    className="flex-1 px-3 py-2 bg-red-600 dark:bg-red-700 text-white text-sm rounded hover:bg-red-700 dark:hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionInProgress === 'webapp-stop' ? 'Stopping...' : 'Stop Service'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleServiceAction('webapp', 'start')}
                    disabled={actionInProgress === 'webapp-start'}
                    className="flex-1 px-3 py-2 bg-green-600 dark:bg-green-700 text-white text-sm rounded hover:bg-green-700 dark:hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionInProgress === 'webapp-start' ? 'Starting...' : 'Start Service'}
                  </button>
                )}
                <button
                  onClick={() => handleTriggerBackup('webapp')}
                  disabled={actionInProgress === 'trigger-webapp'}
                  className="flex-1 px-3 py-2 bg-blue-600 dark:bg-blue-700 text-white text-sm rounded hover:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionInProgress === 'trigger-webapp' ? 'Running...' : 'Run Backup Now'}
                </button>
              </div>
            </div>

            {/* Database Backup Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Database Backup</h2>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(backupStatus.database.status)}`}>
                  {backupStatus.database.status || 'UNKNOWN'}
                </span>
              </div>
              
              <div className="space-y-3 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400 text-sm">Status:</span>
                  <div className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${getStatusColor(backupStatus.database.status)}`}></span>
                    <span className="text-gray-800 dark:text-gray-200 text-sm">{backupStatus.database.status || 'Unknown'}</span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400 text-sm">Last Run:</span>
                  <span className="text-gray-800 dark:text-gray-200 text-sm">{formatDateTime(backupStatus.database.last_run)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400 text-sm">Mode:</span>
                  <span className="text-gray-800 dark:text-gray-200 text-sm">Real-time Watch</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400 text-sm">Service:</span>
                  <span className={`text-sm ${servicesStatus.database.active ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    {servicesStatus.database.active ? 'Running' : 'Stopped'}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                {servicesStatus.database.active ? (
                  <button
                    onClick={() => handleServiceAction('database', 'stop')}
                    disabled={actionInProgress === 'database-stop'}
                    className="flex-1 px-3 py-2 bg-red-600 dark:bg-red-700 text-white text-sm rounded hover:bg-red-700 dark:hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionInProgress === 'database-stop' ? 'Stopping...' : 'Stop Service'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleServiceAction('database', 'start')}
                    disabled={actionInProgress === 'database-start'}
                    className="flex-1 px-3 py-2 bg-green-600 dark:bg-green-700 text-white text-sm rounded hover:bg-green-700 dark:hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionInProgress === 'database-start' ? 'Starting...' : 'Start Service'}
                  </button>
                )}
                <button
                  onClick={() => handleTriggerBackup('database')}
                  disabled={actionInProgress === 'trigger-database'}
                  className="flex-1 px-3 py-2 bg-blue-600 dark:bg-blue-700 text-white text-sm rounded hover:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionInProgress === 'trigger-database' ? 'Running...' : 'Run Backup Now'}
                </button>
              </div>
            </div>
          </div>

          {/* Status Legend */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Status Legend</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-green-500"></span>
                <span className="text-gray-600 dark:text-gray-400">SUCCESS / DB_SUCCESS</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-500"></span>
                <span className="text-gray-600 dark:text-gray-400">FAILED / DB_CORRUPTED / DB_UPLOAD_FAILED</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-blue-500"></span>
                <span className="text-gray-600 dark:text-gray-400">RUNNING / IN_PROGRESS</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-gray-500"></span>
                <span className="text-gray-600 dark:text-gray-400">UNKNOWN</span>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'logs' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
          {/* Log Type Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              className={`px-4 py-2 text-sm font-medium rounded ${
                activeLogType === 'webapp'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
              onClick={() => setActiveLogType('webapp')}
            >
              Webapp Backup Logs
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium rounded ${
                activeLogType === 'database'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
              onClick={() => setActiveLogType('database')}
            >
              Database Backup Logs
            </button>
          </div>

          {/* Log Viewer */}
          <div className="bg-gray-900 rounded-lg p-4">
            <div
              ref={activeLogType === 'webapp' ? webappLogsRef : databaseLogsRef}
              className="h-96 overflow-y-auto font-mono text-xs text-gray-300"
            >
              {(activeLogType === 'webapp' ? webappLogs : databaseLogs).length === 0 ? (
                <p className="text-gray-500">No logs available</p>
              ) : (
                (activeLogType === 'webapp' ? webappLogs : databaseLogs).map((line, index) => (
                  <div key={index} className="whitespace-pre-wrap border-b border-gray-800 py-1">
                    {line}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 flex justify-between items-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Showing last 50 lines. Logs are stored at: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">./scripts/logs/</code>
            </p>
            <button
              onClick={() => fetchLogs(activeLogType, 200)}
              className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Load More (200 lines)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackupStatusPage;
