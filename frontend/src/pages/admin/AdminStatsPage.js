import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const Doughnut = React.lazy(() => import('react-chartjs-2').then(mod => ({ default: mod.Doughnut })));

const AdminStatsPage = () => {
  const [stats, setStats] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [taskStats, setTaskStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const [statsRes, userRes, taskRes] = await Promise.all([
        fetch(`${process.env.REACT_APP_API_URL || '/api'}/admin/stats`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`${process.env.REACT_APP_API_URL || '/api'}/admin/users`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`${process.env.REACT_APP_API_URL || '/api'}/admin/tasks`, {
          headers: { 'Authorization': `Bearer ${token}` },
        })
      ]);

      if (!statsRes.ok || !userRes.ok || !taskRes.ok) {
        throw new Error('Failed to fetch admin stats');
      }

      const [statsData, userData, taskData] = await Promise.all([
        statsRes.json(),
        userRes.json(),
        taskRes.json()
      ]);

      setStats(statsData);
      setUserStats(userData);
      setTaskStats(taskData);
      setError(null);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching admin stats:', err);
      setError('Failed to load statistics. Please try again later.');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const formatUptime = useCallback((seconds) => {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  }, []);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { padding: 12, usePointStyle: true, pointStyle: 'circle' } },
    },
    animation: false,
    cutout: '60%',
  }), []);

  const taskStatusData = useMemo(() => {
    if (!taskStats) return null;
    return {
      labels: Object.keys(taskStats.byStatus),
      datasets: [{
        data: Object.values(taskStats.byStatus),
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(255, 205, 86, 0.7)',
          'rgba(153, 102, 255, 0.7)',
        ],
        borderWidth: 0,
      }],
    };
  }, [taskStats]);

  const taskPriorityData = useMemo(() => {
    if (!taskStats) return null;
    return {
      labels: Object.keys(taskStats.byPriority),
      datasets: [{
        data: Object.values(taskStats.byPriority),
        backgroundColor: [
          'rgba(75, 192, 192, 0.7)',
          'rgba(255, 205, 86, 0.7)',
          'rgba(255, 99, 132, 0.7)',
        ],
        borderWidth: 0,
      }],
    };
  }, [taskStats]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded">
          <strong className="font-bold">Error! </strong>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!stats || !userStats || !taskStats) {
    return (
      <div className="p-4">
        <div className="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-400 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300 px-4 py-3 rounded">
          <strong className="font-bold">No Data! </strong>
          <span>Unable to load statistics.</span>
        </div>
      </div>
    );
  }

  const memoryUsed = stats.system.memory.heapUsed;
  const memoryTotal = stats.system.memory.heapTotal;
  const memoryPercent = memoryTotal > 0 ? Math.round((memoryUsed / memoryTotal) * 100) : 0;

  return (
    <div className="space-y-4">

      {/* Section 1: Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Users</p>
          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{stats.totals.users}</p>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tasks</p>
          <p className="text-2xl font-bold text-teal-600 dark:text-teal-400 mt-1">{stats.totals.tasks}</p>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Events</p>
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">{stats.totals.events}</p>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Active Sessions</p>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">{stats.totals.activeSessions}</p>
        </div>
        <div className={`p-4 bg-white dark:bg-gray-800 rounded-lg border ${taskStats.overdue > 0 ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10' : 'border-gray-200 dark:border-gray-700'}`}>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Overdue Tasks</p>
          <p className={`text-2xl font-bold mt-1 ${taskStats.overdue > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}`}>{taskStats.overdue}</p>
        </div>
      </div>

      {/* Section 2: System Health */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Database</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`w-2 h-2 rounded-full ${stats.database.connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className={`text-lg font-semibold ${stats.database.connected ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {stats.database.connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Uptime</p>
          <p className="text-lg font-semibold text-blue-600 dark:text-blue-400 mt-1">{formatUptime(stats.system.uptime)}</p>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Memory (Heap)</p>
          <p className="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-1">
            {Math.round(memoryUsed / 1024 / 1024)} / {Math.round(memoryTotal / 1024 / 1024)} MB
          </p>
          <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${memoryPercent > 80 ? 'bg-red-500' : memoryPercent > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
              style={{ width: `${memoryPercent}%` }}
            ></div>
          </div>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Server Time</p>
          <p className="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-1">
            {new Date(stats.system.timestamp).toLocaleTimeString()}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {new Date(stats.system.timestamp).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Section 3: User Activity */}
      <div className="flex items-center gap-6 px-2">
        <span className="text-sm text-gray-600 dark:text-gray-300">
          Online Now: <span className="font-semibold text-gray-800 dark:text-white">{userStats.active}</span>
        </span>
        <span className="text-gray-300 dark:text-gray-600">|</span>
        <span className="text-sm text-gray-600 dark:text-gray-300">
          Registered (7d): <span className="font-semibold text-gray-800 dark:text-white">{userStats.recent}</span>
        </span>
        <span className="text-gray-300 dark:text-gray-600">|</span>
        <span className="text-sm text-gray-600 dark:text-gray-300">
          Attachments: <span className="font-semibold text-gray-800 dark:text-white">{stats.totals.attachments}</span>
        </span>
      </div>

      {/* Section 4: Task Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Tasks by Status</h3>
          <div className="h-52">
            <React.Suspense fallback={null}>
              {taskStatusData && <Doughnut data={taskStatusData} options={chartOptions} />}
            </React.Suspense>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Tasks by Priority</h3>
          <div className="h-52">
            <React.Suspense fallback={null}>
              {taskPriorityData && <Doughnut data={taskPriorityData} options={chartOptions} />}
            </React.Suspense>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminStatsPage;
