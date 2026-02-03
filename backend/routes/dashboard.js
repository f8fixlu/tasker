// backend/routes/dashboard.js
const { getTaskStats } = require('../models/Task');
const { getEventStats } = require('../models/Event');
const { getTasksByUserId } = require('../models/Task');
const { getEventsByUserId } = require('../models/Event');

function dashboardRoutes(req, res, parsedUrl) {
  const path = parsedUrl.pathname;
  const method = req.method;

  if (method === 'GET' && path === '/api/dashboard') {
    handleGetDashboard(req, res, req.user.id);
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Route not found' }));
  }
}

async function handleGetDashboard(req, res, userId) {
  try {
    // Fetch all dashboard data concurrently
    const [
      taskStats,
      eventStats,
      allTasks,
      upcomingEvents
    ] = await Promise.all([
      getTaskStats(userId),
      getEventStats(userId),
      getTasksByUserId(userId, { limit: 100 }),
      getEventsByUserId(userId, { limit: 5 })
    ]);

    // Calculate additional data from the fetched results
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Calculate tasks created in the last 7 days
    const tasksLast7Days = allTasks.filter(task => {
      if (!task.created_date) return false;
      const taskCreatedDate = new Date(task.created_date);
      taskCreatedDate.setHours(0, 0, 0, 0);
      return taskCreatedDate >= sevenDaysAgo && taskCreatedDate <= today;
    }).length;

    // Calculate tasks due for today
    const tasksToday = allTasks.filter(task => {
      if (!task.due_date) return false;
      const taskDate = new Date(task.due_date);
      taskDate.setHours(0, 0, 0, 0);
      return taskDate.getTime() === today.getTime();
    }).length;

    // Calculate tasks due for this month
    const tasksThisMonth = allTasks.filter(task => {
      if (!task.due_date) return false;
      const taskDate = new Date(task.due_date);
      return taskDate >= startOfMonth && taskDate <= nextMonth;
    }).length;

    // Calculate upcoming deadlines
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    let deadlineTasks = allTasks.filter(task => {
      if (!task.due_date || task.status === 'Completed') return false;
      const dueDate = new Date(task.due_date);
      return dueDate >= today && dueDate <= nextWeek;
    });

    deadlineTasks.sort((a, b) => {
      const dateA = new Date(a.due_date);
      const dateB = new Date(b.due_date);
      return dateA - dateB;
    });
    deadlineTasks = deadlineTasks.slice(0, 5);

    // Format the response
    const dashboardData = {
      taskStats: {
        ...taskStats,
        recentTasks: tasksLast7Days,
        tasksToday,
        tasksThisMonth
      },
      eventStats,
      allTasks, // Include all tasks for frontend processing
      allEvents, // Include all events for frontend processing
      recentTasks: allTasks.slice(0, 5).map(task => ({
        id: task.id,
        taskName: task.title,
        status: task.status,
        dueDate: task.due_date ? task.due_date : 'N/A',
        dashboardPriority: task.priority ? task.priority.toLowerCase() : 'medium',
        category: task.category_name,
        title: task.title,
        description: task.description || 'No description provided',
        due_date: task.due_date,
        task_date: task.task_date,
        created_date: task.created_date,
        edited_date: task.edited_date,
        category_name: task.category_name,
        type_name: task.type_name,
        sub_type_name: task.sub_type_name,
        quantity: task.quantity,
        priority: task.priority,
        category_id: task.category_id,
        type_id: task.type_id,
        sub_type_id: task.sub_type_id
      })),
      upcomingDeadlines: deadlineTasks.map(task => {
        const dueDate = new Date(task.due_date);
        const formattedDate = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const timeStr = dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return {
          id: task.id,
          title: task.title,
          description: task.description,
          date: formattedDate,
          time: timeStr,
          category_name: task.category_name || 'N/A',
          type_name: task.type_name || 'N/A',
          priority: task.priority || 'Medium',
          color_class: task.priority ?
            (task.priority.toLowerCase() === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200' :
             task.priority.toLowerCase() === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200' :
             'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200') :
            'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
        };
      }),
      upcomingEvents: upcomingEvents.map(event => {
        if (!event.start_date) return null;

        const dateStr = event.start_date || 'N/A';
        const eventDate = new Date(dateStr);
        const formattedDate = eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        let timeStr = 'N/A';
        if (event.start_date && event.end_date) {
          const startDate = new Date(event.start_date);
          const endDate = new Date(event.end_date);
          timeStr = `${startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${endDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
        } else if (event.start_date) {
          const startDate = new Date(event.start_date);
          timeStr = startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        }

        return {
          id: event.id,
          title: event.title,
          date: formattedDate,
          time: timeStr,
          location: event.location || 'N/A',
          category_name: event.category || 'N/A',
          color_class: event.color_class
        };
      }).filter(Boolean)
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(dashboardData));
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during dashboard data retrieval' }));
  }
}

module.exports = dashboardRoutes;