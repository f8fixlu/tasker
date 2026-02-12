import React, { useState, useEffect } from 'react';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register chart components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const AdminStatsPage = () => {
  const [stats, setStats] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [taskStats, setTaskStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const [statsResponse, userResponse, taskResponse] = await Promise.all([
        fetch(`${process.env.REACT_APP_API_URL || '/api'}/admin/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }),
        fetch(`${process.env.REACT_APP_API_URL || '/api'}/admin/users`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }),
        fetch(`${process.env.REACT_APP_API_URL || '/api'}/admin/tasks`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
      ]);

      if (!statsResponse.ok || !userResponse.ok || !taskResponse.ok) {
        throw new Error('Failed to fetch admin stats');
      }

      const [statsData, userData, taskData] = await Promise.all([
        statsResponse.json(),
        userResponse.json(),
        taskResponse.json()
      ]);

      setStats(statsData);
      setUserStats(userData);
      setTaskStats(taskData);
      setError(null);
    } catch (err) {
      console.error('Error fetching admin stats:', err);
      setError('Failed to load statistics. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
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

  if (!stats || !userStats || !taskStats) {
    return (
      <div className="layout-content-container">
        <div className="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-400 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">No Data! </strong>
          <span className="block sm:inline">Unable to load statistics.</span>
        </div>
      </div>
    );
  }

  // System info chart options
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'System Overview',
      },
    },
  };

  // Memory usage chart data
  const memoryData = {
    labels: ['RSS', 'Heap Total', 'Heap Used', 'External'],
    datasets: [
      {
        label: 'Memory Usage (bytes)',
        data: [
          stats.system.memory.rss,
          stats.system.memory.heapTotal,
          stats.system.memory.heapUsed,
          stats.system.memory.external
        ],
        backgroundColor: [
          'rgba(255, 99, 132, 0.5)',
          'rgba(54, 162, 235, 0.5)',
          'rgba(255, 205, 86, 0.5)',
          'rgba(75, 192, 192, 0.5)'
        ],
        borderColor: [
          'rgb(255, 99, 132)',
          'rgb(54, 162, 235)',
          'rgb(255, 205, 86)',
          'rgb(75, 192, 192)'
        ],
        borderWidth: 1,
      },
    ],
  };

  // Task status chart data
  const taskStatusData = {
    labels: Object.keys(taskStats.byStatus),
    datasets: [
      {
        label: 'Task Count by Status',
        data: Object.values(taskStats.byStatus),
        backgroundColor: [
          'rgba(255, 99, 132, 0.5)', // Pending
          'rgba(54, 162, 235, 0.5)', // In Progress
          'rgba(75, 192, 192, 0.5)', // Completed
          'rgba(255, 205, 86, 0.5)', // Overdue
          'rgba(153, 102, 255, 0.5)', // Archived
        ],
        borderColor: [
          'rgb(255, 99, 132)',
          'rgb(54, 162, 235)',
          'rgb(75, 192, 192)',
          'rgb(255, 205, 86)',
          'rgb(153, 102, 255)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // Task priority chart data
  const taskPriorityData = {
    labels: Object.keys(taskStats.byPriority),
    datasets: [
      {
        label: 'Task Count by Priority',
        data: Object.values(taskStats.byPriority),
        backgroundColor: [
          'rgba(75, 192, 192, 0.5)', // Low
          'rgba(255, 205, 86, 0.5)', // Medium
          'rgba(255, 99, 132, 0.5)', // High
        ],
        borderColor: [
          'rgb(75, 192, 192)',
          'rgb(255, 205, 86)',
          'rgb(255, 99, 132)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // Format uptime
  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    return `${days}d ${hours}h ${minutes}m ${secs}s`;
  };

  return (
    <div className="layout-content-container">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-8">System Administration Dashboard</h1>

      {/* System Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Database Status */}
        <div className={`p-6 rounded-lg shadow-md ${
          stats.database.connected 
            ? 'bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-700' 
            : 'bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700'
        }`}>
          <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">Database</h3>
          <p className={`text-2xl font-bold ${
            stats.database.connected 
              ? 'text-green-600 dark:text-green-400' 
              : 'text-red-600 dark:text-red-400'
          }`}>
            {stats.database.connected ? 'Connected' : 'Disconnected'}
          </p>
          <p className="text-sm mt-1 text-gray-600 dark:text-gray-300">Status: {stats.database.connected ? 'Operational' : 'Issues'}</p>
        </div>

        {/* Uptime */}
        <div className="p-6 bg-blue-100 dark:bg-blue-900/30 rounded-lg shadow-md border border-blue-400 dark:border-blue-700">
          <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">System Uptime</h3>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatUptime(stats.system.uptime)}</p>
          <p className="text-sm mt-1 text-gray-600 dark:text-gray-300">Time since last restart</p>
        </div>

        {/* Active Sessions */}
        <div className="p-6 bg-purple-100 dark:bg-purple-900/30 rounded-lg shadow-md border border-purple-400 dark:border-purple-700">
          <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">Active Sessions</h3>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.totals.activeSessions}</p>
          <p className="text-sm mt-1 text-gray-600 dark:text-gray-300">Last 30 minutes</p>
        </div>

        {/* Server Timestamp */}
        <div className="p-6 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-md border border-gray-400 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">Server Time</h3>
          <p className="text-xl font-bold text-gray-700 dark:text-gray-300">
            {new Date(stats.system.timestamp).toLocaleTimeString()}
          </p>
          <p className="text-sm mt-1 text-gray-600 dark:text-gray-300">{new Date(stats.system.timestamp).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Total Counts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div className="p-6 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg shadow-md border border-indigo-400 dark:border-indigo-700">
          <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">Total Users</h3>
          <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{stats.totals.users}</p>
        </div>
        <div className="p-6 bg-teal-100 dark:bg-teal-900/30 rounded-lg shadow-md border border-teal-400 dark:border-teal-700">
          <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">Total Tasks</h3>
          <p className="text-3xl font-bold text-teal-600 dark:text-teal-400">{stats.totals.tasks}</p>
        </div>
        <div className="p-6 bg-orange-100 dark:bg-orange-900/30 rounded-lg shadow-md border border-orange-400 dark:border-orange-700">
          <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">Total Events</h3>
          <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{stats.totals.events}</p>
        </div>
        <div className="p-6 bg-pink-100 dark:bg-pink-900/30 rounded-lg shadow-md border border-pink-400 dark:border-pink-700">
          <p className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">Total Attachments</p>
          <p className="text-3xl font-bold text-pink-600 dark:text-pink-400">{stats.totals.attachments}</p>
        </div>
        <div className="p-6 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg shadow-md border border-cyan-400 dark:border-cyan-700">
          <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">Recent Users</h3>
          <p className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">{userStats.recent}</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Memory Usage Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Memory Usage</h3>
          <Bar data={memoryData} options={chartOptions} />
        </div>

        {/* Task Status Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Tasks by Status</h3>
          <Doughnut data={taskStatusData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />
        </div>
      </div>

      {/* Additional Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Task Priority Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Tasks by Priority</h3>
          <Doughnut data={taskPriorityData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />
        </div>

        {/* System Info Card */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">System Information</h3>
          <div className="space-y-2">
            <p className="text-gray-700 dark:text-gray-300"><span className="font-medium">Platform:</span> {stats.system.os.platform}</p>
            <p className="text-gray-700 dark:text-gray-300"><span className="font-medium">CPU Cores:</span> {stats.system.cpu.count}</p>
            <p className="text-gray-700 dark:text-gray-300"><span className="font-medium">CPU Model:</span> {stats.system.cpu.model}</p>
            <p className="text-gray-700 dark:text-gray-300"><span className="font-medium">Total Memory:</span> {(stats.system.os.totalMemory / (1024**3)).toFixed(2)} GB</p>
            <p className="text-gray-700 dark:text-gray-300"><span className="font-medium">Free Memory:</span> {(stats.system.os.freeMemory / (1024**3)).toFixed(2)} GB</p>
            <p className="text-gray-700 dark:text-gray-300"><span className="font-medium">Active Users (24h):</span> {userStats.active}</p>
            <p className="text-gray-700 dark:text-gray-300"><span className="font-medium">Overdue Tasks:</span> <span className="text-red-600 dark:text-red-400 font-bold">{taskStats.overdue}</span></p>
          </div>
        </div>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-center">
        <button
          onClick={fetchStats}
          className="px-6 py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 focus:ring-offset-white"
        >
          Refresh Stats
        </button>
      </div>
    </div>
  );
};

export default AdminStatsPage;