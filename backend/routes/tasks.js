const url = require('url');
const { jsonParser, authenticateToken } = require('../middleware/auth');
const { validateTask } = require('../middleware/validation');
const {
  createTask,
  getTaskById,
  getTasksByUserId,
  updateTask,
  deleteTask,
  getTaskStats,
  updateOverdueTasks,
  forceUpdateOverdueTasks,
  getTasksCountByUserId
} = require('../models/Task');

// Import database utilities to run notification creation queries directly
const { runQuery } = require('../utils/database');

// Handle task routes
function taskRoutes(req, res, parsedUrl) {
  const path = parsedUrl.pathname;
  const method = req.method;
  
  // Extract task ID from URL if it exists
  const pathParts = path.split('/');
  const taskId = pathParts.length > 3 ? parseInt(pathParts[3]) : null;
  
  // Parse the request body
  jsonParser(req, res, async () => {
    if (method === 'GET' && path === '/api/tasks') {
      await handleGetTasks(req, res, req.user.id, parsedUrl.query);
    } else if (method === 'POST' && path === '/api/tasks') {
      await handleCreateTask(req, res, req.user.id);
    } else if (method === 'GET' && path === `/api/tasks/${taskId}`) {
      await handleGetTask(req, res, taskId, req.user.id);
    } else if (method === 'PUT' && path === `/api/tasks/${taskId}`) {
      await handleUpdateTask(req, res, taskId, req.user.id);
    } else if (method === 'DELETE' && path === `/api/tasks/${taskId}`) {
      await handleDeleteTask(req, res, taskId, req.user.id);
    } else if (method === 'GET' && path === '/api/tasks/stats') {
      await handleGetStats(req, res, req.user.id);
    } else if (method === 'PUT' && path === `/api/tasks/${taskId}/status`) {
      await handleUpdateTaskStatus(req, res, taskId, req.user.id);
    } else if (method === 'POST' && path === '/api/tasks/update-overdue') {
      await handleUpdateOverdueTasks(req, res);
    } else if (method === 'POST' && path === '/api/tasks/bulk-update') {
      await handleBulkUpdate(req, res, req.user.id);
    } else if (method === 'POST' && path === '/api/tasks/bulk-delete') {
      await handleBulkDelete(req, res, req.user.id);
    } else {
      // Route not found
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Route not found' }));
    }
  });
}

// Handle getting tasks
async function handleGetTasks(req, res, userId, query) {
  try {
    // Check if client wants all tasks (for client-side operations)
    const getAll = query.all === 'true' || query.all === true;
    
    // Parse query parameters for filtering and pagination
    let options = {
      status: query.status || null,
      priority: query.priority || null,
      category_id: query.category_id ? parseInt(query.category_id) : null,
      type_id: query.type_id ? parseInt(query.type_id) : null,
      sub_type_id: query.sub_type_id ? parseInt(query.sub_type_id) : null,
      due_date_from: query.due_date_from || null,
      due_date_to: query.due_date_to || null,
      search: query.search || null,
      sort: query.sort || null,
      order: query.order || null,
      // Use null for limit to get all tasks if requested, otherwise use provided limit or default to 10
      limit: getAll ? null : (query.limit !== undefined && parseInt(query.limit) > 0 ? parseInt(query.limit) : 10),
      offset: getAll ? 0 : (query.offset ? parseInt(query.offset) : 0)
    };
    
    // Handle date range filtering - the date strings from frontend are in YYYY-MM-DD format
    // We need to interpret them properly for UTC comparison with database timestamps
    if (query.created_date_from) {
      // Parse the date string and ensure it represents the date boundary in UTC
      // Use SQLite's date formatting to match what's stored in the DB
      const [year, month, day] = query.created_date_from.split('-').map(Number);
      // Create the ISO string for the start of the day in UTC
      options.created_date_from = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T00:00:00.000Z`;
    }
    
    if (query.created_date_to) {
      // Parse the date string and ensure it represents the end of the day in UTC (inclusive)
      const [year, month, day] = query.created_date_to.split('-').map(Number);
      // Create the ISO string for the end of the day in UTC (23:59:59.999)
      options.created_date_to = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T23:59:59.999Z`;
    }
    
    // Handle exclude_archived parameter - if true, don't show archived tasks
    if (query.exclude_archived === 'true' || query.exclude_archived === true) {
      options.show_archived = false;
    } else {
      options.show_archived = true; // show_archived true means we don't exclude archived
    }

    // Handle with_attachment parameter - if true, only show tasks with attachments
    if (query.with_attachment === 'true' || query.with_attachment === true) {
      options.with_attachment = true;
    } else {
      options.with_attachment = false; // with_attachment false means we don't filter by attachments
    }
    
    if (query.edited_date_from) {
      // Parse the date string and ensure it represents the date boundary in UTC
      // Use SQLite's date formatting to match what's stored in the DB
      const [year, month, day] = query.edited_date_from.split('-').map(Number);
      // Create the ISO string for the start of the day in UTC
      options.edited_date_from = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T00:00:00.000Z`;
    }
    
    if (query.edited_date_to) {
      // Parse the date string and ensure it represents the end of the day in UTC (inclusive)
      const [year, month, day] = query.edited_date_to.split('-').map(Number);
      // Create the ISO string for the end of the day in UTC (23:59:59.999)
      options.edited_date_to = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T23:59:59.999Z`;
    }

    if (query.task_date_from) {
      // Parse the date string for task date and ensure it represents the date boundary in UTC
      const [year, month, day] = query.task_date_from.split('-').map(Number);
      // Create the ISO string for the start of the day in UTC
      options.task_date_from = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T00:00:00.000Z`;
    }

    if (query.task_date_to) {
      // Parse the date string for task date and ensure it represents the end of the day in UTC (inclusive)
      const [year, month, day] = query.task_date_to.split('-').map(Number);
      // Create the ISO string for the end of the day in UTC (23:59:59.999)
      options.task_date_to = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T23:59:59.999Z`;
    }

    console.log('Get tasks request - userId:', userId, 'query:', query, 'options:', options);
    
    if (getAll) {
      // If getting all tasks, return them with total count
      const tasks = await getTasksByUserId(userId, options);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ tasks, total: tasks.length }));
    } else {
      // For paginated results, we need to get both the paged results and total count
      // Get the total count using the dedicated count function
      const countOptions = { ...options };
      countOptions.limit = null;
      countOptions.offset = 0;
      
      console.log('Getting task count with options:', countOptions);
      const totalCount = await getTasksCountByUserId(userId, countOptions);
      console.log('Task count result:', totalCount);
      
      // Now get the actual paged results
      const pagedOptions = { ...options };
      console.log('Getting paged tasks with options:', pagedOptions);
      const tasks = await getTasksByUserId(userId, pagedOptions);
      console.log('Paged tasks result:', tasks.length);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        tasks, 
        total: totalCount,
        limit: options.limit,
        offset: options.offset,
        page: Math.floor(options.offset / options.limit) + 1,
        totalPages: Math.ceil(totalCount / (options.limit || 10))
      }));
    }
  } catch (error) {
    console.error('Get tasks error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during tasks retrieval' }));
  }
}

// Handle creating a task
async function handleCreateTask(req, res, userId) {
  try {
    const {
      title,
      description,
      category_id,
      type_id,
      sub_type_id,
      quantity,
      priority,
      due_date,
      task_date  // Extract task_date from request body
    } = req.body;

    // Validate required fields
    const taskData = { title, description, category_id, type_id, sub_type_id, quantity, priority, due_date, task_date };
    const validationErrors = validateTask(taskData);
    if (validationErrors.length > 0) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: validationErrors.join(', ') }));
    }

    // Ensure user_id is set to the authenticated user
    const task = {
      title,
      description: description || null,
      category_id: category_id || null,
      type_id: type_id || null,
      sub_type_id: sub_type_id || null,
      quantity: quantity || 1,
      priority: priority || 'Medium',
      task_date: task_date || null,  // Include task_date in task object
      due_date: due_date || null,
      user_id: userId
    };

    const newTask = await createTask(task);

    // Create notification for new task
    try {
      // Check if an identical notification already exists to prevent duplicates
      const checkSql = `
        SELECT id FROM notifications
        WHERE user_id = ? AND related_task_id = ? AND title = ? AND message = ?
        ORDER BY created_at DESC LIMIT 1
      `;
      const checkParams = [userId, newTask.id, 'New Task Created', `Task "${title}" has been created successfully`];

      const existingNotification = await require('../utils/database').getRow(checkSql, checkParams);

      // Only create notification if it doesn't already exist
      if (!existingNotification) {
        const notificationSql = `
          INSERT INTO notifications (title, message, type, user_id, related_task_id)
          VALUES (?, ?, ?, ?, ?)
        `;
        const notificationParams = [
          'New Task Created',
          `Task "${title}" has been created successfully`,
          'info',
          userId,
          newTask.id
        ];

        await runQuery(notificationSql, notificationParams);
      }
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError);
      // Don't fail the whole request if notification creation fails
    }

    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ task: newTask }));
  } catch (error) {
    console.error('Create task error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during task creation' }));
  }
}

// Handle getting a single task
async function handleGetTask(req, res, taskId, userId) {
  try {
    const task = await getTaskById(taskId);
    
    // Check if the task belongs to the authenticated user
    if (!task || task.user_id !== userId) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Task not found' }));
    }
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ task }));
  } catch (error) {
    console.error('Get task error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during task retrieval' }));
  }
}

// Handle updating a task
async function handleUpdateTask(req, res, taskId, userId) {
  try {
    const {
      title,
      description,
      category_id,
      type_id,
      sub_type_id,
      quantity,
      priority,
      task_date,  // Add task_date
      due_date,
      status
    } = req.body;

    // Validate fields if provided
    const taskData = { title, description, category_id, type_id, sub_type_id, quantity, priority, task_date, due_date, status };
    const validationErrors = validateTask(taskData);
    if (validationErrors.some(error => error.includes('required'))) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: validationErrors.join(', ') }));
    }

    // Get the current task to check if it's archived
    const currentTask = await getTaskById(taskId);

    // Prevent changing status to 'Overdue' if the task is already 'Archived'
    if (currentTask && currentTask.status === 'Archived' && status === 'Overdue') {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Cannot change status of an archived task to overdue' }));
    }

    const task = {
      title: title !== undefined ? title : undefined,
      description: description !== undefined ? description : undefined,
      category_id: category_id !== undefined ? category_id : undefined,
      type_id: type_id !== undefined ? type_id : undefined,
      sub_type_id: sub_type_id !== undefined ? sub_type_id : undefined,
      quantity: quantity !== undefined ? quantity : undefined,
      priority: priority !== undefined ? priority : undefined,
      task_date: task_date !== undefined ? task_date : undefined,  // Include task_date in update object
      due_date: due_date !== undefined ? due_date : undefined,
      status: status !== undefined && ['Pending', 'In Progress', 'Completed', 'Overdue', 'Archived'].includes(status) ? status : undefined
    };

    const success = await updateTask(taskId, task, currentTask);

    if (!success) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Task not found' }));
    }

    // Create notification for task update if specific fields changed
    if (task.status) {
      try {
        let notificationTitle = '';
        let notificationMessage = '';
        let notificationType = 'info';

        if (task.status === 'Completed') {
          notificationTitle = 'Task Completed';
          notificationMessage = `Task "${task.title || 'untitled'}" has been marked as completed`;
          notificationType = 'success';
        } else if (task.status === 'In Progress') {
          notificationTitle = 'Task In Progress';
          notificationMessage = `Task "${task.title || 'untitled'}" is now in progress`;
          notificationType = 'info';
        } else if (task.status === 'Overdue') {
          notificationTitle = 'Task Overdue';
          notificationMessage = `Task "${task.title || 'untitled'}" is now overdue`;
          notificationType = 'warning';
        } else {
          notificationTitle = 'Task Updated';
          notificationMessage = `Task "${task.title || 'untitled'}" status changed to ${task.status}`;
          notificationType = 'info';
        }

        // Check if an identical notification already exists to prevent duplicates
        const checkSql = `
          SELECT id FROM notifications
          WHERE user_id = ? AND related_task_id = ? AND title = ? AND message = ?
          ORDER BY created_at DESC LIMIT 1
        `;
        const checkParams = [userId, taskId, notificationTitle, notificationMessage];

        const existingNotification = await require('../utils/database').getRow(checkSql, checkParams);

        // Only create notification if it doesn't already exist within the last minute
        if (!existingNotification) {
          const notificationSql = `
            INSERT INTO notifications (title, message, type, user_id, related_task_id)
            VALUES (?, ?, ?, ?, ?)
          `;
          const notificationParams = [
            notificationTitle,
            notificationMessage,
            notificationType,
            userId,
            taskId
          ];

          await runQuery(notificationSql, notificationParams);
        }
      } catch (notificationError) {
        console.error('Error creating notification:', notificationError);
        // Don't fail the whole request if notification creation fails
      }
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Task updated successfully' }));
  } catch (error) {
    console.error('Update task error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during task update' }));
  }
}

// Handle deleting a task
async function handleDeleteTask(req, res, taskId, userId) {
  try {
    // Get the task before deletion to use its title in the notification
    const task = await getTaskById(taskId);

    if (!task) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Task not found' }));
    }

    // Create notification for task deletion before actually deleting the task
    try {
      // Check if an identical notification already exists to prevent duplicates
      const checkSql = `
        SELECT id FROM notifications
        WHERE user_id = ? AND related_task_id = ? AND title = ? AND message = ?
        ORDER BY created_at DESC LIMIT 1
      `;
      const checkParams = [userId, taskId, 'Task Deleted', `Task "${task?.title || 'untitled'}" has been deleted`];

      const existingNotification = await require('../utils/database').getRow(checkSql, checkParams);

      // Only create notification if it doesn't already exist
      if (!existingNotification) {
        const notificationSql = `
          INSERT INTO notifications (title, message, type, user_id, related_task_id)
          VALUES (?, ?, ?, ?, ?)
        `;
        const notificationParams = [
          'Task Deleted',
          `Task "${task?.title || 'untitled'}" has been deleted`,
          'info',
          userId,
          taskId
        ];

        await runQuery(notificationSql, notificationParams);
      }
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError);
      // Don't fail the whole request if notification creation fails
    }

    // Now actually delete the task
    const success = await deleteTask(taskId);

    if (!success) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Task not found' }));
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Task deleted successfully' }));
  } catch (error) {
    console.error('Delete task error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during task deletion' }));
  }
}

// Handle getting task statistics
async function handleGetStats(req, res, userId) {
  try {
    const stats = await getTaskStats(userId);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ stats }));
  } catch (error) {
    console.error('Get stats error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during stats retrieval' }));
  }
}

// Handle updating task status
async function handleUpdateTaskStatus(req, res, taskId, userId) {
  try {
    const { status } = req.body;

    if (!status || !['Pending', 'In Progress', 'Completed', 'Overdue', 'Archived'].includes(status)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Valid status is required (Pending, In Progress, Completed, Overdue, Archived)' }));
    }

    // Get the current task to check if it's archived
    const currentTask = await getTaskById(taskId);

    // Prevent changing status to 'Overdue' if the task is already 'Archived'
    if (currentTask && currentTask.status === 'Archived' && status === 'Overdue') {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Cannot change status of an archived task to overdue' }));
    }

    const success = await updateTask(taskId, { status });

    if (!success) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Task not found' }));
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: `Task status updated to ${status}` }));
  } catch (error) {
    console.error('Update task status error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during task status update' }));
  }
}

// Handle updating overdue tasks
async function handleUpdateOverdueTasks(req, res) {
  try {
    // First, get the tasks that will be updated to overdue (to generate notifications)
    const getSql = `
      SELECT t.id, t.title, t.user_id
      FROM tasks t
      WHERE due_date IS NOT NULL AND due_date < datetime('now', 'localtime')
        AND status != 'Completed' AND status != 'Overdue' AND status != 'Archived'
    `;

    const { getAll } = require('../utils/database');
    const { forceUpdateOverdueTasks } = require('../models/Task');
    const tasksToOverdue = await getAll(getSql, []);

    const updatedCount = await forceUpdateOverdueTasks();

    // Create notifications for each overdue task
    for (const task of tasksToOverdue) {
      try {
        // Check if an identical notification already exists to prevent duplicates
        const checkSql = `
          SELECT id FROM notifications
          WHERE user_id = ? AND related_task_id = ? AND title = ? AND message = ?
          ORDER BY created_at DESC LIMIT 1
        `;
        const checkParams = [task.user_id, task.id, 'Task Overdue', `Task "${task.title}" is now overdue`];

        const existingNotification = await require('../utils/database').getRow(checkSql, checkParams);

        // Only create notification if it doesn't already exist
        if (!existingNotification) {
          const notificationSql = `
            INSERT INTO notifications (title, message, type, user_id, related_task_id)
            VALUES (?, ?, ?, ?, ?)
          `;
          const notificationParams = [
            'Task Overdue',
            `Task "${task.title}" is now overdue`,
            'warning',
            task.user_id,
            task.id
          ];

          await runQuery(notificationSql, notificationParams);
        }
      } catch (notificationError) {
        console.error(`Error creating notification for task ${task.id}:`, notificationError);
        // Continue with other tasks even if one notification fails
      }
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: `${updatedCount} tasks updated to Overdue status`, updatedCount }));
  } catch (error) {
    console.error('Update overdue tasks error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during overdue status update' }));
  }
}

// Handle bulk update tasks (batch SQL)
async function handleBulkUpdate(req, res, userId) {
  try {
    const { taskIds, updateData } = req.body;

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Valid task IDs array is required' }));
    }

    if (!updateData || Object.keys(updateData).length === 0) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Update data is required' }));
    }

    // Build dynamic SET clause from updateData
    const setClauses = [];
    const params = [];
    
    if (updateData.status !== undefined) {
      setClauses.push('status = ?');
      params.push(updateData.status);
    }
    if (updateData.priority !== undefined) {
      setClauses.push('priority = ?');
      params.push(updateData.priority);
    }
    // Add other fields as needed for bulk update

    if (setClauses.length === 0) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'No valid fields to update' }));
    }

    // Always update edited_date
    setClauses.push('edited_date = ?');
    params.push(new Date().toISOString());

    // Create placeholders for the IN clause
    const placeholders = taskIds.map(() => '?').join(',');

    // Batch update: update all matching tasks in one query
    // Exclude tasks that are Archived when trying to set status to Overdue
    let sql = `UPDATE tasks SET ${setClauses.join(', ')} WHERE id IN (${placeholders}) AND user_id = ?`;
    params.push(...taskIds, userId);

    // If status is Overdue, exclude Archived tasks
    if (updateData.status === 'Overdue') {
      sql += ` AND status != 'Archived'`;
    }

    const result = await runQuery(sql, params);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: `${result.changes} tasks updated successfully`, updatedCount: result.changes }));
  } catch (error) {
    console.error('Bulk update error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during bulk update' }));
  }
}

// Handle bulk delete tasks (batch SQL)
async function handleBulkDelete(req, res, userId) {
  try {
    const { taskIds } = req.body;

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Valid task IDs array is required' }));
    }

    // Step 1: Fetch all tasks belonging to this user in one query
    const placeholders = taskIds.map(() => '?').join(',');
    const { getAll: getAllRows } = require('../utils/database');
    const tasks = await getAllRows(
      `SELECT id, title FROM tasks WHERE id IN (${placeholders}) AND user_id = ?`,
      [...taskIds, userId]
    );

    if (tasks.length === 0) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ message: '0 tasks deleted successfully', deletedCount: 0 }));
    }

    const taskIdsToDelete = tasks.map(t => t.id);
    const deletePlaceholders = taskIdsToDelete.map(() => '?').join(',');

    // Step 2: Create notifications in batch (skip duplicates)
    try {
      const now = new Date().toISOString();
      const notificationValues = [];
      const notificationParams = [];
      
      for (const task of tasks) {
        const title = 'Task Deleted';
        const message = `Task "${task.title || 'untitled'}" has been deleted`;
        
        // Check for existing notification
        const { getRow } = require('../utils/database');
        const existing = await getRow(
          'SELECT id FROM notifications WHERE user_id = ? AND related_task_id = ? AND title = ? AND message = ? ORDER BY created_at DESC LIMIT 1',
          [userId, task.id, title, message]
        );
        
        if (!existing) {
          notificationValues.push('(?, ?, ?, ?, ?)');
          notificationParams.push(title, message, 'info', userId, task.id);
        }
      }
      
      if (notificationValues.length > 0) {
        const notifSql = `INSERT INTO notifications (title, message, type, user_id, related_task_id) VALUES ${notificationValues.join(', ')}`;
        await runQuery(notifSql, notificationParams);
      }
    } catch (notificationError) {
      console.error('Error creating notifications for bulk delete:', notificationError);
    }

    // Step 3: Delete attachments in batch (query + delete in bulk)
    try {
      const { deleteAttachment } = require('../models/Attachment');
      const attachments = await getAllRows(
        `SELECT id FROM attachments WHERE task_id IN (${deletePlaceholders})`,
        taskIdsToDelete
      );
      if (attachments.length > 0) {
        const attPlaceholders = attachments.map(() => '?').join(',');
        await runQuery(`DELETE FROM attachments WHERE id IN (${attPlaceholders})`, attachments.map(a => a.id));
      }
    } catch (attachmentError) {
      console.error('Error deleting attachments in bulk:', attachmentError);
    }

    // Step 4: Delete all tasks in one query
    const result = await runQuery(
      `DELETE FROM tasks WHERE id IN (${deletePlaceholders})`,
      taskIdsToDelete
    );

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: `${result.changes} tasks deleted successfully`, deletedCount: result.changes }));
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during bulk delete' }));
  }
}

module.exports = taskRoutes;