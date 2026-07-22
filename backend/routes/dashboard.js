// backend/routes/dashboard.js
const { getTaskStats } = require('../models/Task');
const { getEventStats } = require('../models/Event');
const { getTasksByUserId } = require('../models/Task');
const { getEventsByUserId } = require('../models/Event');

function dashboardRoutes(req, res, parsedUrl) {
  const path = parsedUrl.pathname;
  const method = req.method;

  if (method === 'GET' && path === '/api/dashboard/stats') {
    handleGetDashboardStats(req, res, req.user.id);
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Route not found' }));
  }
}

async function handleGetDashboardStats(req, res, userId) {
  try {
    // Fetch all dashboard data concurrently with optimized options
    const [
      taskStats,
      eventStats,
      tasksResponse,
      eventsResponse
    ] = await Promise.all([
      getTaskStats(userId),
      getEventStats(userId),
      getTasksByUserId(userId, { limit: 20, skipAttachmentCount: true }),
      getEventsByUserId(userId, { limit: 5, skipAttachments: true })
    ]);

    // Format the response to match what the frontend expects
    const dashboardData = {
      taskStats: {
        ...taskStats,
        recent_tasks: taskStats.recent_tasks || 0,
        tasks_today: taskStats.tasks_today || 0,
        tasks_this_month: taskStats.tasks_this_month || 0
      },
      eventStats: {
        ...eventStats,
        total_events: eventStats.total_events || 0,
        completed_events: eventStats.completed_events || 0,
        events_today: eventStats.events_today || 0,
        events_this_month: eventStats.events_this_month || 0
      },
      tasks: tasksResponse,
      events: eventsResponse
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(dashboardData));
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during dashboard stats retrieval' }));
  }
}

module.exports = dashboardRoutes;
