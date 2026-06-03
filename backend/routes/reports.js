const url = require('url');
const { jsonParser, authenticateToken } = require('../middleware/auth');
const { getTaskStats } = require('../models/Task');
const { getEventsByUserId } = require('../models/Event');
const { getUnreadCount } = require('../models/Notification');
const { getAll } = require('../utils/database');

// Handle reporting routes
function reportingRoutes(req, res, parsedUrl) {
  const path = parsedUrl.pathname;
  const method = req.method;
  
  // Parse the request body
  jsonParser(req, res, () => {
    if (method === 'GET' && path === '/api/reports/stats') {
      handleGetDashboardStats(req, res, req.user.id, parsedUrl.query);
    } else if (method === 'GET' && path === '/api/reports/tasks-summary') {
      handleGetTasksSummary(req, res, req.user.id, parsedUrl.query);
    } else if (method === 'GET' && path === '/api/reports/events-summary') {
      handleGetEventsSummary(req, res, req.user.id, parsedUrl.query);
    } else if (method === 'GET' && path === '/api/reports/tasks-completion-trend') {
      handleGetTaskCompletionTrend(req, res, req.user.id, parsedUrl.query);
    } else if (method === 'GET' && path === '/api/reports/tasks') {
      handleGetTasksForReport(req, res, req.user.id, parsedUrl.query);
    } else if (method === 'GET' && path === '/api/reports/events') {
      handleGetEventsForReport(req, res, req.user.id, parsedUrl.query);
    } else if (method === 'GET' && path === '/api/reports/task-type-summary') {
      handleGetTaskTypeSummary(req, res, req.user.id, parsedUrl.query);
    } else if (method === 'GET' && path === '/api/reports/event-summary') {
      handleGetEventSummary(req, res, req.user.id, parsedUrl.query);
    } else {
      // Route not found
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Route not found' }));
    }
  });
}

// Handle getting dashboard statistics
async function handleGetDashboardStats(req, res, userId, query = {}) {
  try {
    const { start_date: startDate, end_date: endDate } = query;
    
    // Get task statistics with date range support
    const categoryFilters = query.category_filters ? 
      (typeof query.category_filters === 'string' ? 
        JSON.parse(query.category_filters) : 
        query.category_filters) : null;
    const taskStats = await getTaskStats(userId, startDate, endDate, categoryFilters);
    
    // Get upcoming events (next 7 days)
    const upcomingEvents = await getEventsByUserId(userId, {
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // Next 7 days
    });
    
    // Get unread notifications count
    const unreadCount = await getUnreadCount(userId);
    
    // Calculate due today count (this should remain based on due_date, not creation date)
    const { getAll } = require('../utils/database');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dueTodaySql = `
      SELECT COUNT(*) as count 
      FROM tasks 
      WHERE user_id = ? 
      AND due_date >= ? 
      AND due_date < ? 
      AND status != 'Completed'
    `;
    const dueTodayParams = [userId, today.toISOString(), tomorrow.toISOString()];
    const dueTodayResult = await getAll(dueTodaySql, dueTodayParams);
    const dueTodayCount = dueTodayResult[0]?.count || 0;
    
    // Calculate due this month count (this should remain based on due_date, not creation date)
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const dueThisMonthSql = `
      SELECT COUNT(*) as count 
      FROM tasks 
      WHERE user_id = ? 
      AND due_date >= ? 
      AND due_date < ? 
      AND status != 'Completed'
    `;
    const dueThisMonthParams = [userId, startOfMonth.toISOString(), endOfMonth.toISOString()];
    const dueThisMonthResult = await getAll(dueThisMonthSql, dueThisMonthParams);
    const dueThisMonthCount = dueThisMonthResult[0]?.count || 0;
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      taskStats,
      upcomingEvents: {
        count: upcomingEvents.length,
        events: upcomingEvents.slice(0, 5) // Return top 5 events
      },
      dueTodayCount,
      dueThisMonthCount,
      unreadNotificationsCount: unreadCount
    }));
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during stats retrieval' }));
  }
}

// Handle getting tasks summary
async function handleGetTasksSummary(req, res, userId, query) {
  try {
    // This could be extended to support date ranges or other filters
    const taskStats = await getTaskStats(userId);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ taskStats }));
  } catch (error) {
    console.error('Get tasks summary error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during tasks summary retrieval' }));
  }
}

// Handle getting events summary
async function handleGetEventsSummary(req, res, userId, query) {
  try {
    // Parse query parameters for filtering
    const options = {
      start_date: query.start_date || new Date().toISOString(), // From today by default
      end_date: query.end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Next 30 days by default
      limit: query.limit ? parseInt(query.limit) : 20,
      offset: query.offset ? parseInt(query.offset) : 0
    };
    
    const events = await getEventsByUserId(userId, options);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      events,
      total: events.length
    }));
  } catch (error) {
    console.error('Get events summary error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during events summary retrieval' }));
  }
}

// Handle getting task completion trend
async function handleGetTaskCompletionTrend(req, res, userId, query) {
  try {
    // Parse query parameters for date range
    const startDate = query.start_date ? new Date(query.start_date) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default to last 30 days
    const endDate = query.end_date ? new Date(query.end_date) : new Date();
    if (query.end_date) {
      endDate.setHours(23, 59, 59, 999);
    }
    
    // Get daily task completion counts within the date range
    const { getAll } = require('../utils/database');
    
    // Parse category filters
    const categoryFilters = query.category_filters ? 
      (typeof query.category_filters === 'string' ? 
        JSON.parse(query.category_filters) : 
        query.category_filters) : null;
    
    // Build base query with placeholders for category IDs if needed
    let completedTasksSql = `
      SELECT
        DATE(task_date, 'localtime') as date,
        COUNT(*) as count
      FROM tasks
      WHERE user_id = ?
        AND status = 'Completed'
        AND task_date >= ?
        AND task_date <= ?
    `;

    const completedTasksParams = [userId, startDate.toISOString(), endDate.toISOString()];
    
    // Add category filtering if provided
    if (categoryFilters) {
      const { work, personal } = categoryFilters;
      const categoryIds = [];
      
      // Get category IDs for Work and Personal categories
      const categoryQuery = `SELECT id, name FROM task_categories WHERE name IN ('Work', 'Personal')`;
      const categoryResults = await getAll(categoryQuery, []);
      
      // Based on the boolean values, include appropriate category IDs in the filter
      if (categoryResults && categoryResults.length > 0) {
        categoryResults.forEach(cat => {
          if ((cat.name === 'Work' && work) || (cat.name === 'Personal' && personal)) {
            categoryIds.push(cat.id);
          }
        });
        
        // If we have matching categories, filter by them
        if (categoryIds.length > 0) {
          const placeholders = categoryIds.map(() => '?').join(',');
          completedTasksSql += ` AND category_id IN (${placeholders})`;
          completedTasksParams.push(...categoryIds);
        } else if (work === false && personal === false) {
          // If both are false, we want no results
          completedTasksSql += ` AND 1 = 0`; // This ensures no records match
        }
      } else if (work === false && personal === false) {
        // If both are false and no categories exist, we want no results
        completedTasksSql += ` AND 1 = 0`;
      }
    }
    
    completedTasksSql += ` GROUP BY DATE(task_date, 'localtime') ORDER BY date`;
    
    const completedTasks = await getAll(completedTasksSql, completedTasksParams);
    
    // Generate the date range for the chart
    const dateRange = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      dateRange.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Map completed tasks to the date range, defaulting to 0 if no tasks were completed on a day
    const chartData = dateRange.map(date => {
      const dateString = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      const task = completedTasks.find(t => t.date === dateString);
      return {
        date: dateString,
        tasks: task ? task.count : 0
      };
    });
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      data: chartData,
      summary: {
        total: completedTasks.reduce((sum, task) => sum + task.count, 0),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    }));
  } catch (error) {
    console.error('Get task completion trend error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during task completion trend retrieval' }));
  }
}

// Handle getting tasks for report
async function handleGetTasksForReport(req, res, userId, query) {
  try {
    // Parse query parameters for filtering
    let startDate = query.start_date || null;
    let endDate = query.end_date || null;

    // Extend end date to include the full day to ensure tasks on that date are included
    if (endDate) {
      // Create a new date object for the end date and set it to the end of the day
      const endDateObj = new Date(endDate);
      endDateObj.setHours(23, 59, 59, 999); // Set to end of the day
      endDate = endDateObj.toISOString();
    }

    const options = {
      start_date: query.start_date || null,
      end_date: query.end_date || null,
      status: query.status || null,  // Filter by specific status if provided
      limit: query.limit ? parseInt(query.limit) : 20,  // Default to 20 tasks
      offset: query.offset ? parseInt(query.offset) : 0,
      // Use task date range for filtering tasks in report
      task_date_from: startDate,
      task_date_to: endDate,
      // Category filters - parse if it's a string
      category_filters: query.category_filters ?
        (typeof query.category_filters === 'string' ?
          JSON.parse(query.category_filters) :
          query.category_filters) : null
    };
    
    // Import the getTasksByUserId function
    const { getTasksByUserId } = require('../models/Task');
    
    // Get tasks by user ID with filtering options
    const tasks = await getTasksByUserId(userId, options);
    
    // Sort tasks by status priority: Completed, In Progress, Overdue, Pending
    const statusPriority = { 
      'Completed': 1, 
      'In Progress': 2, 
      'Overdue': 3, 
      'Pending': 4,
      'Archived': 5  // Archived tasks at the end
    };
    
    tasks.sort((a, b) => {
      const priorityA = statusPriority[a.status] || 99;
      const priorityB = statusPriority[b.status] || 99;
      return priorityA - priorityB;
    });
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      tasks,
      total: tasks.length
    }));
  } catch (error) {
    console.error('Get tasks for report error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during tasks retrieval for report' }));
  }
}

// Handle getting events for report
async function handleGetEventsForReport(req, res, userId, query) {
  try {
    // Parse query parameters for filtering
    let startDate = query.start_date || null;
    let endDate = query.end_date || null;

    // Extend dates to include the full day to ensure events on those dates are included
    // For start date: set to beginning of the day
    if (startDate) {
      const startDateObj = new Date(startDate);
      startDateObj.setHours(0, 0, 0, 0); // Set to beginning of the day
      startDate = startDateObj.toISOString();
    }

    // For end date: set to end of the day
    if (endDate) {
      const endDateObj = new Date(endDate);
      endDateObj.setHours(23, 59, 59, 999); // Set to end of the day
      endDate = endDateObj.toISOString();
    }

    const options = {
      start_date: startDate || null,
      end_date: endDate || null,
      status: query.status || null,  // Filter by specific status if provided
      limit: query.limit ? parseInt(query.limit) : 20,  // Default to 20 events
      offset: query.offset ? parseInt(query.offset) : 0,
      // Category filters - parse if it's a string
      category_filters: query.category_filters ?
        (typeof query.category_filters === 'string' ?
          JSON.parse(query.category_filters) :
          query.category_filters) : null
    };

    // Import the getEventsByUserId function
    const { getEventsByUserId } = require('../models/Event');

    // Get events by user ID with filtering options
    const events = await getEventsByUserId(userId, options);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      events,
      total: events.length
    }));
  } catch (error) {
    console.error('Get events for report error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during events retrieval for report' }));
  }
}

// Handle getting task type summary
async function handleGetTaskTypeSummary(req, res, userId, query) {
  try {
    // Parse query parameters for date filtering
    let startDate = query.start_date || null;
    let endDate = query.end_date || null;
    const grouping = query.grouping || 'type-subtype'; // Default to type-subtype grouping

    // Extend dates to include the full day to ensure tasks on those dates are included
    // For start date: set to beginning of the day
    if (startDate) {
      const startDateObj = new Date(startDate);
      startDateObj.setHours(0, 0, 0, 0); // Set to beginning of the day
      startDate = startDateObj.toISOString();
    }

    // For end date: set to end of the day
    if (endDate) {
      const endDateObj = new Date(endDate);
      endDateObj.setHours(23, 59, 59, 999); // Set to end of the day
      endDate = endDateObj.toISOString();
    }

    const { getAll } = require('../utils/database');

    // For the 'combined' grouping mode, group by task type with sub type breakdowns
    if (grouping === 'combined') {
      // Build common WHERE conditions shared by aggregate and detail queries
      let whereConditions = ['t.user_id = ?'];
      let params = [userId];

      // Add date range filtering
      if (startDate && endDate) {
        whereConditions.push('(t.task_date >= ? AND t.task_date <= ?)');
        params.push(startDate, endDate);
      } else if (startDate) {
        whereConditions.push('t.task_date >= ?');
        params.push(startDate);
      } else if (endDate) {
        whereConditions.push('t.task_date <= ?');
        params.push(endDate);
      }

      // Add category filtering
      const categoryFilters = query.category_filters ?
        (typeof query.category_filters === 'string' ?
          JSON.parse(query.category_filters) :
          query.category_filters) : null;

      if (categoryFilters) {
        // Support both flat structure and nested structure {task: {...}}
        let selectedCategoryFilters;

        if (categoryFilters.task) {
          // Nested structure from reports: {task: {...}}
          selectedCategoryFilters = categoryFilters.task;
        } else {
          // Flat structure: {...}
          selectedCategoryFilters = categoryFilters;
        }

        const categoryIds = [];

        // Get all available task categories for this user
        const categoryQuery = `SELECT id, name FROM task_categories WHERE user_id = ? OR user_id IS NULL`;
        const categoryResults = await getAll(categoryQuery, [userId]);

        // Based on the boolean values in selectedCategoryFilters, include appropriate category IDs in the filter
        if (categoryResults && categoryResults.length > 0) {
          categoryResults.forEach(cat => {
            const catName = cat.name.toLowerCase();
            // Check if this category is enabled in the filters
            if (selectedCategoryFilters[catName]) {
              categoryIds.push(cat.id);
            }
          });

          // If we have matching categories, filter by them
          if (categoryIds.length > 0) {
            const placeholders = categoryIds.map(() => '?').join(',');
            whereConditions.push(`t.category_id IN (${placeholders})`);
            params.push(...categoryIds);
          } else {
            // Check if all available categories are explicitly set to false
            const allFalse = categoryResults.every(cat => !selectedCategoryFilters[cat.name.toLowerCase()]);
            if (allFalse) {
              whereConditions.push('1 = 0'); // This ensures no records match
            }
          }
        }
      }

      const whereClause = whereConditions.join(' AND ');

      // Get task type and sub type breakdowns - sum the quantity field and count the records
      const aggregateSql = `
        SELECT
          tt.name as type_name,
          tst.name as sub_type_name,
          COALESCE(SUM(t.quantity), 0) as quantity,
          COUNT(*) as record_count
        FROM tasks t
        LEFT JOIN task_types tt ON t.type_id = tt.id
        LEFT JOIN task_sub_types tst ON t.sub_type_id = tst.id
        WHERE ${whereClause}
        GROUP BY COALESCE(tt.name, 'N/A'), COALESCE(tst.name, 'N/A')
        ORDER BY tt.name, tst.name
      `;
      const taskTypeSubtypeBreakdown = await getAll(aggregateSql, params);

      // Get individual task details for hover popup
      const detailsSql = `
        SELECT
          t.id,
          t.title,
          t.task_date,
          t.status,
          COALESCE(tt.name, 'N/A') as type_name,
          COALESCE(tst.name, 'N/A') as sub_type_name
        FROM tasks t
        LEFT JOIN task_types tt ON t.type_id = tt.id
        LEFT JOIN task_sub_types tst ON t.sub_type_id = tst.id
        WHERE ${whereClause}
        ORDER BY t.task_date DESC
      `;
      const taskDetails = await getAll(detailsSql, params);

      // Group task details by type|sub_type key
      const tasksByKey = {};
      taskDetails.forEach(task => {
        const key = `${task.type_name}|${task.sub_type_name}`;
        if (!tasksByKey[key]) tasksByKey[key] = [];
        tasksByKey[key].push({
          id: task.id,
          title: task.title,
          date: task.task_date,
          status: task.status
        });
      });

      // Attach tasks to summary items
      const summaryWithTasks = taskTypeSubtypeBreakdown.map(item => {
        const key = `${item.type_name || 'N/A'}|${item.sub_type_name || 'N/A'}`;
        return {
          ...item,
          tasks: tasksByKey[key] || []
        };
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        taskTypeSummary: summaryWithTasks
      }));
    } else if (grouping === 'type') {
      // Group only by task type (sum sub types)
      let sql = `
        SELECT
          tt.name as type_name,
          'All' as sub_type_name,
          COUNT(*) as quantity
        FROM tasks t
        LEFT JOIN task_types tt ON t.type_id = tt.id
        WHERE t.user_id = ?
      `;
      const params = [userId];

      // Add date range filtering
      if (startDate && endDate) {
        sql += ` AND (t.task_date >= ? AND t.task_date <= ?)`;
        params.push(startDate, endDate);
      } else if (startDate) {
        sql += ` AND t.task_date >= ?`;
        params.push(startDate);
      } else if (endDate) {
        sql += ` AND t.task_date <= ?`;
        params.push(endDate);
      }

      // Add category filtering
      const categoryFilters = query.category_filters ?
        (typeof query.category_filters === 'string' ?
          JSON.parse(query.category_filters) :
          query.category_filters) : null;

      if (categoryFilters) {
        // Support both flat structure and nested structure {task: {...}}
        let selectedCategoryFilters;

        if (categoryFilters.task) {
          // Nested structure from reports: {task: {...}}
          selectedCategoryFilters = categoryFilters.task;
        } else {
          // Flat structure: {...}
          selectedCategoryFilters = categoryFilters;
        }

        const categoryIds = [];

        // Get all available task categories for this user
        const categoryQuery = `SELECT id, name FROM task_categories WHERE user_id = ? OR user_id IS NULL`;
        const categoryResults = await getAll(categoryQuery, [userId]);

        // Based on the boolean values in selectedCategoryFilters, include appropriate category IDs in the filter
        if (categoryResults && categoryResults.length > 0) {
          categoryResults.forEach(cat => {
            const catName = cat.name.toLowerCase();
            // Check if this category is enabled in the filters
            if (selectedCategoryFilters[catName]) {
              categoryIds.push(cat.id);
            }
          });

          // If we have matching categories, filter by them
          if (categoryIds.length > 0) {
            const placeholders = categoryIds.map(() => '?').join(',');
            sql += ` AND t.category_id IN (${placeholders})`;
            params.push(...categoryIds);
          } else {
            // Check if all available categories are explicitly set to false
            const allFalse = categoryResults.every(cat => !selectedCategoryFilters[cat.name.toLowerCase()]);
            if (allFalse) {
              // If all selected categories are false, we want no results
              sql += ` AND 1 = 0`; // This ensures no records match
            }
          }
        }
      }

      sql += ` GROUP BY COALESCE(tt.name, 'N/A') ORDER BY tt.name`;

      const taskTypeSummary = await getAll(sql, params);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        taskTypeSummary: taskTypeSummary
      }));
    } else {
      // Group by both task type and sub type (default)
      let sql = `
        SELECT
          tt.name as type_name,
          tst.name as sub_type_name,
          COUNT(*) as quantity
        FROM tasks t
        LEFT JOIN task_types tt ON t.type_id = tt.id
        LEFT JOIN task_sub_types tst ON t.sub_type_id = tst.id
        WHERE t.user_id = ?
      `;
      const params = [userId];

      // Add date range filtering
      if (startDate && endDate) {
        sql += ` AND (t.task_date >= ? AND t.task_date <= ?)`;
        params.push(startDate, endDate);
      } else if (startDate) {
        sql += ` AND t.task_date >= ?`;
        params.push(startDate);
      } else if (endDate) {
        sql += ` AND t.task_date <= ?`;
        params.push(endDate);
      }

      // Add category filtering
      const categoryFilters = query.category_filters ?
        (typeof query.category_filters === 'string' ?
          JSON.parse(query.category_filters) :
          query.category_filters) : null;

      if (categoryFilters) {
        // Support both flat structure and nested structure {task: {...}}
        let selectedCategoryFilters;

        if (categoryFilters.task) {
          // Nested structure from reports: {task: {...}}
          selectedCategoryFilters = categoryFilters.task;
        } else {
          // Flat structure: {...}
          selectedCategoryFilters = categoryFilters;
        }

        const categoryIds = [];

        // Get all available task categories for this user
        const categoryQuery = `SELECT id, name FROM task_categories WHERE user_id = ? OR user_id IS NULL`;
        const categoryResults = await getAll(categoryQuery, [userId]);

        // Based on the boolean values in selectedCategoryFilters, include appropriate category IDs in the filter
        if (categoryResults && categoryResults.length > 0) {
          categoryResults.forEach(cat => {
            const catName = cat.name.toLowerCase();
            // Check if this category is enabled in the filters
            if (selectedCategoryFilters[catName]) {
              categoryIds.push(cat.id);
            }
          });

          // If we have matching categories, filter by them
          if (categoryIds.length > 0) {
            const placeholders = categoryIds.map(() => '?').join(',');
            sql += ` AND t.category_id IN (${placeholders})`;
            params.push(...categoryIds);
          } else {
            // Check if all available categories are explicitly set to false
            const allFalse = categoryResults.every(cat => !selectedCategoryFilters[cat.name.toLowerCase()]);
            if (allFalse) {
              // If all selected categories are false, we want no results
              sql += ` AND 1 = 0`; // This ensures no records match
            }
          }
        }
      }

      sql += ` GROUP BY COALESCE(tt.name, 'N/A'), COALESCE(tst.name, 'N/A') ORDER BY tt.name, tst.name`;

      const taskTypeSummary = await getAll(sql, params);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        taskTypeSummary: taskTypeSummary
      }));
    }
  } catch (error) {
    console.error('Get task type summary error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during task type summary retrieval' }));
  }
}

// Handle getting event summary for consolidated events
async function handleGetEventSummary(req, res, userId, query) {
  try {
    // Parse query parameters for date filtering
    let startDate = query.start_date || null;
    let endDate = query.end_date || null;

    // Extend end date to include the full day to ensure events on that date are included
    if (endDate) {
      // Create a new date object for the end date and set it to the end of the day
      const endDateObj = new Date(endDate);
      endDateObj.setHours(23, 59, 59, 999); // Set to end of the day
      endDate = endDateObj.toISOString();
    }

    const { getAll } = require('../utils/database');

    // Build WHERE conditions
    const whereConditions = ['e.user_id = ?'];
    const params = [userId];

    // Add date range filtering - only filter by start_date since that's what we use in the event model
    if (startDate && endDate) {
      whereConditions.push(`(DATE(e.start_date, 'localtime') >= DATE(?, 'localtime') AND DATE(e.start_date, 'localtime') <= DATE(?, 'localtime'))`);
      params.push(startDate, endDate);
    } else if (startDate) {
      whereConditions.push(`DATE(e.start_date, 'localtime') >= DATE(?, 'localtime')`);
      params.push(startDate);
    } else if (endDate) {
      whereConditions.push(`DATE(e.start_date, 'localtime') <= DATE(?, 'localtime')`);
      params.push(endDate);
    }

    // Add event category filtering (similar to task categories)
    const categoryFilters = query.category_filters ?
      (typeof query.category_filters === 'string' ?
        JSON.parse(query.category_filters) :
        query.category_filters) : null;

    if (categoryFilters) {
      // Support both flat structure and nested structure {event: {...}}
      let selectedCategoryFilters;

      if (categoryFilters.event) {
        // Nested structure from reports: {event: {...}}
        selectedCategoryFilters = categoryFilters.event;
      } else {
        // Flat structure: {...}
        selectedCategoryFilters = categoryFilters;
      }

      const categoryIds = [];

      // Get all available event categories for this user
      const categoryQuery = `SELECT id, name FROM event_categories WHERE user_id = ? OR user_id IS NULL`;
      const categoryResults = await getAll(categoryQuery, [userId]);

      // Based on the boolean values in selectedCategoryFilters, include appropriate category IDs in the filter
      if (categoryResults && categoryResults.length > 0) {
        categoryResults.forEach(cat => {
          const catName = cat.name.toLowerCase();
          // Check if this category is enabled in the filters
          if (selectedCategoryFilters[catName]) {
            categoryIds.push(cat.id);
          }
        });

        // If we have matching categories, filter by them
        if (categoryIds.length > 0) {
          const placeholders = categoryIds.map(() => '?').join(',');
          whereConditions.push(`e.category_id IN (${placeholders})`);
          params.push(...categoryIds);
        } else {
          // Check if all available categories are explicitly set to false
          const allFalse = categoryResults.every(cat => !selectedCategoryFilters[cat.name.toLowerCase()]);
          if (allFalse) {
            // If all selected categories are false, we want no results
            whereConditions.push('1 = 0'); // This ensures no records match
          }
        }
      }
    }

    const whereClause = whereConditions.join(' AND ');

    // Get event category and event type breakdowns - count the records
    const aggregateSql = `
      SELECT
        ec.name as category_name,
        et.name as type_name,
        COUNT(*) as quantity,
        COUNT(*) as record_count
      FROM events e
      LEFT JOIN event_categories ec ON e.category_id = ec.id
      LEFT JOIN event_types et ON e.event_type_id = et.id
      WHERE ${whereClause}
      GROUP BY COALESCE(ec.name, 'N/A'), COALESCE(et.name, 'N/A')
      ORDER BY ec.name, et.name
    `;
    const eventSummary = await getAll(aggregateSql, params);

    // Get individual event details for hover popup using the same filters
    const detailsSql = `
      SELECT
        e.id,
        e.title,
        e.description,
        e.start_date,
        e.end_date,
        e.status,
        e.color_class,
        e.location,
        COALESCE(ec.name, 'N/A') as category_name,
        COALESCE(et.name, 'N/A') as type_name
      FROM events e
      LEFT JOIN event_categories ec ON e.category_id = ec.id
      LEFT JOIN event_types et ON e.event_type_id = et.id
      WHERE ${whereClause}
      ORDER BY ec.name, et.name, e.start_date
    `;
    const eventDetails = await getAll(detailsSql, params);

    // Attach event details to each summary row
    const summaryMap = {};
    eventSummary.forEach(row => {
      const key = `${row.category_name}|${row.type_name}`;
      summaryMap[key] = row;
      row.events = [];
    });
    eventDetails.forEach(detail => {
      const key = `${detail.category_name}|${detail.type_name}`;
      if (summaryMap[key]) {
        summaryMap[key].events.push(detail);
      }
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      eventSummary: eventSummary
    }));
  } catch (error) {
    console.error('Get event summary error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during event summary retrieval' }));
  }
}

module.exports = reportingRoutes;