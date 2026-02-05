const { db } = require('../config/database');
const { runQuery, getRow, getAll } = require('../utils/database');

// Task model

// Helper function to convert UTC date to local date format for display
function convertUTCToLocal(dateString) {
  if (!dateString) return null;

  try {
    // Parse the date string assuming it is in UTC format "YYYY-MM-DD HH:MM:SS"
    // Split the date and time parts
    const [datePart, timePart] = dateString.split(' ');
    if (!datePart || !timePart) {
      // If the format isn't as expected, try parsing as is
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return null;
      }
      // Use Manila timezone (UTC+8) to convert the time to local time
      const options = {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      };
      return date.toLocaleString('en-US', options);
    }

    // Parse as UTC by creating a Date object with UTC components
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes, seconds] = timePart.split(':').map(Number);

    // Create a Date object representing the UTC time
    const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));

    // Use Manila timezone (UTC+8) to convert the UTC time to local time
    const options = {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    };

    return utcDate.toLocaleString('en-US', options);
  } catch (error) {
    console.error('Error converting UTC to local date:', error);
    return null;
  }
}

// Create a new task
async function createTask(taskData) {
  const {
    title,
    description,
    category_id,
    type_id,
    sub_type_id,
    quantity,
    priority,
    due_date,
    task_date,  // Get the new task_date
    user_id,
    status  // Include status from taskData if provided
  } = taskData;

  // Validate that due_date is not before task_date if both are provided
  if (due_date && task_date) {
    const dueDateObj = new Date(due_date);
    const taskDateObj = new Date(task_date);

    if (dueDateObj < taskDateObj) {
      throw new Error('Due date cannot be before task date');
    }
  }

  // Ensure dates are in proper UTC format before storing
  const utcDueDate = due_date ? new Date(due_date).toISOString() : null;
  const utcTaskDate = task_date ? new Date(task_date).toISOString() : null;
  const utcCreatedDate = new Date().toISOString(); // Use current UTC time

  const sql = `
    INSERT INTO tasks (
      title, description, category_id, type_id, sub_type_id,
      quantity, priority, due_date, task_date, user_id, created_date, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    title, description, category_id, type_id, sub_type_id,
    quantity, priority, utcDueDate, utcTaskDate, user_id, utcCreatedDate, (status !== undefined) ? status : 'Pending'
  ];

  try {
    const result = await runQuery(sql, params);
    return { id: result.lastID, ...taskData };
  } catch (error) {
    throw new Error(`Error creating task: ${error.message}`);
  }
}

// Get task by ID
async function getTaskById(id) {
  const sql = `
    SELECT
      t.id, t.title, t.description, t.quantity, t.priority, t.due_date, t.task_date,
      t.created_date, t.status, t.user_id, t.edited_date,
      tc.name as category_name, tt.name as type_name, tst.name as sub_type_name,
      (SELECT COUNT(*) FROM attachments a WHERE a.task_id = t.id) as attachment_count
    FROM tasks t
    LEFT JOIN task_categories tc ON t.category_id = tc.id
    LEFT JOIN task_types tt ON t.type_id = tt.id
    LEFT JOIN task_sub_types tst ON t.sub_type_id = tst.id
    WHERE t.id = ?
  `;
  const params = [id];

  try {
    let task = await getRow(sql, params);

    // Convert UTC dates to local time for display if task exists
    if (task) {
      task.due_date = convertUTCToLocal(task.due_date);
      task.task_date = convertUTCToLocal(task.task_date);
      task.created_date = convertUTCToLocal(task.created_date);
      task.edited_date = convertUTCToLocal(task.edited_date);
    }

    return task;
  } catch (error) {
    throw new Error(`Error fetching task: ${error.message}`);
  }
}

// Get tasks count by user ID with filters (for pagination)
async function getTasksCountByUserId(user_id, options = {}) {
  let sql = `
    SELECT COUNT(*) as count
    FROM tasks t
    LEFT JOIN task_categories tc ON t.category_id = tc.id
    LEFT JOIN task_types tt ON t.type_id = tt.id
    LEFT JOIN task_sub_types tst ON t.sub_type_id = tst.id
    WHERE t.user_id = ?
  `;
  
  const params = [user_id];
  
  console.log('getTasksCountByUserId - SQL:', sql, 'params:', params);

  // Add search functionality
  if (options.search) {
    sql += ` AND (t.title LIKE ? OR COALESCE(tc.name, '') LIKE ? OR COALESCE(tt.name, '') LIKE ? OR COALESCE(tst.name, '') LIKE ?)`;
    const searchTerm = `%${options.search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  // Add filters based on options
  if (options.status) {
    sql += ` AND t.status = ?`;
    params.push(options.status);
  } else if (!options.show_archived) {
    // Exclude archived tasks by default unless explicitly requested
    sql += ` AND t.status != 'Archived'`;
  }

  if (options.priority) {
    sql += ` AND t.priority = ?`;
    params.push(options.priority);
  }

  if (options.category_id) {
    sql += ` AND t.category_id = ?`;
    params.push(options.category_id);
  }

  // Handle category filters (dynamically fetch available categories)
  if (options.category_filters) {
    // Support both flat structure and nested structure {task: {...}}
    let selectedCategoryFilters;

    if (options.category_filters.task) {
      // Nested structure from reports: {task: {...}}
      selectedCategoryFilters = options.category_filters.task;
    } else {
      // Flat structure: {...}
      selectedCategoryFilters = options.category_filters;
    }

    const categoryIds = [];

    // Query for all available task categories from the database
    const categoryQuery = `SELECT id, name FROM task_categories`;
    const categoryResults = await getAll(categoryQuery, []);

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

  if (options.type_id) {
    sql += ` AND t.type_id = ?`;
    params.push(options.type_id);
  }

  if (options.sub_type_id) {
    sql += ` AND t.sub_type_id = ?`;
    params.push(options.sub_type_id);
  }

  if (options.due_date_from) {
    sql += ` AND t.due_date >= ?`;
    params.push(options.due_date_from);
  }
  
  if (options.due_date_to) {
    sql += ` AND t.due_date <= ?`;
    params.push(options.due_date_to);
  }
  
  // Add filters for task, created, edited, and due dates (search for tasks where any selected date field is within the range)
  if (options.task_date_from || options.task_date_to ||
      options.created_date_from || options.created_date_to ||
      options.edited_date_from || options.edited_date_to ||
      options.due_date_from || options.due_date_to) {
    sql += ` AND (`;
    let dateConditions = [];

    if (options.task_date_from && options.task_date_to) {
      // Compare the datetime ranges directly since they are now in proper UTC format
      // The boundaries are created in routes.js to cover the full UTC range for each local date
      dateConditions.push(`(t.task_date >= ? AND t.task_date <= ?)`);
      params.push(options.task_date_from, options.task_date_to);
    } else if (options.task_date_from) {
      dateConditions.push(`(t.task_date >= ?)`);
      params.push(options.task_date_from);
    } else if (options.task_date_to) {
      dateConditions.push(`(t.task_date <= ?)`);
      params.push(options.task_date_to);
    }

    if (options.created_date_from && options.created_date_to) {
      // Compare the datetime ranges directly since they are now in proper UTC format
      // The boundaries are created in routes.js to cover the full UTC range for each local date
      dateConditions.push(`(t.created_date >= ? AND t.created_date <= ?)`);
      params.push(options.created_date_from, options.created_date_to);
    } else if (options.created_date_from) {
      dateConditions.push(`(t.created_date >= ?)`);
      params.push(options.created_date_from);
    } else if (options.created_date_to) {
      dateConditions.push(`(t.created_date <= ?)`);
      params.push(options.created_date_to);
    }

    if (options.edited_date_from && options.edited_date_to) {
      // Compare the datetime ranges directly since they are now in proper UTC format
      // The boundaries are created in routes.js to cover the full UTC range for each local date
      dateConditions.push(`(t.edited_date >= ? AND t.edited_date <= ?)`);
      params.push(options.edited_date_from, options.edited_date_to);
    } else if (options.edited_date_from) {
      dateConditions.push(`(t.edited_date >= ?)`);
      params.push(options.edited_date_from);
    } else if (options.edited_date_to) {
      dateConditions.push(`(t.edited_date <= ?)`);
      params.push(options.edited_date_to);
    }

    if (options.due_date_from && options.due_date_to) {
      // Compare the datetime ranges directly since they are now in proper UTC format
      // The boundaries are created in routes.js to cover the full UTC range for each local date
      dateConditions.push(`(t.due_date >= ? AND t.due_date <= ?)`);
      params.push(options.due_date_from, options.due_date_to);
    } else if (options.due_date_from) {
      dateConditions.push(`(t.due_date >= ?)`);
      params.push(options.due_date_from);
    } else if (options.due_date_to) {
      dateConditions.push(`(t.due_date <= ?)`);
      params.push(options.due_date_to);
    }

    sql += dateConditions.join(' OR ');
    sql += `)`;
  }

  // Add filter for tasks with attachments
  if (options.with_attachment) {
    sql += ` AND (SELECT COUNT(*) FROM attachments a WHERE a.task_id = t.id) > 0`;
  }
  
  try {
    console.log('Executing count query:', sql, 'with params:', params);
    const result = await getRow(sql, params);
    console.log('Count query result:', result);
    return result ? result.count : 0;
  } catch (error) {
    console.error('Error in getTasksCountByUserId:', error);
    throw new Error(`Error fetching tasks count: ${error.message}`);
  }
}

// Get tasks by user ID
async function getTasksByUserId(user_id, options = {}) {
  let sql = `
    SELECT
      t.id, t.title, t.description, t.category_id, t.type_id, t.sub_type_id, t.quantity, t.priority, t.due_date, t.task_date,
      t.created_date, t.status, t.user_id, t.edited_date,
      tc.name as category_name, tt.name as type_name, tst.name as sub_type_name,
      (SELECT COUNT(*) FROM attachments a WHERE a.task_id = t.id) as attachment_count
    FROM tasks t
    LEFT JOIN task_categories tc ON t.category_id = tc.id
    LEFT JOIN task_types tt ON t.type_id = tt.id
    LEFT JOIN task_sub_types tst ON t.sub_type_id = tst.id
    WHERE t.user_id = ?
  `;

  const params = [user_id];
  
  console.log('getTasksByUserId - SQL:', sql, 'params:', params);
  
  // Add search functionality
  if (options.search) {
    sql += ` AND (t.title LIKE ? OR COALESCE(tc.name, '') LIKE ? OR COALESCE(tt.name, '') LIKE ? OR COALESCE(tst.name, '') LIKE ?)`;
    const searchTerm = `%${options.search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }
  
  // Add filters based on options
  if (options.status) {
    sql += ` AND t.status = ?`;
    params.push(options.status);
  } else if (!options.show_archived) {
    // Exclude archived tasks by default unless explicitly requested
    sql += ` AND t.status != 'Archived'`;
  }

  if (options.priority) {
    sql += ` AND t.priority = ?`;
    params.push(options.priority);
  }

  if (options.category_id) {
    sql += ` AND t.category_id = ?`;
    params.push(options.category_id);
  }

  // Handle category filters (dynamically fetch available categories)
  if (options.category_filters) {
    // Support both flat structure and nested structure {task: {...}}
    let selectedCategoryFilters;

    if (options.category_filters.task) {
      // Nested structure from reports: {task: {...}}
      selectedCategoryFilters = options.category_filters.task;
    } else {
      // Flat structure: {...}
      selectedCategoryFilters = options.category_filters;
    }

    const categoryIds = [];

    // Query for all available task categories from the database
    const categoryQuery = `SELECT id, name FROM task_categories`;
    const categoryResults = await getAll(categoryQuery, []);

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
  
  if (options.type_id) {
    sql += ` AND t.type_id = ?`;
    params.push(options.type_id);
  }
  
  if (options.sub_type_id) {
    sql += ` AND t.sub_type_id = ?`;
    params.push(options.sub_type_id);
  }
  
  if (options.due_date_from) {
    sql += ` AND t.due_date >= ?`;
    params.push(options.due_date_from);
  }
  
  if (options.due_date_to) {
    sql += ` AND t.due_date <= ?`;
    params.push(options.due_date_to);
  }
  
  // Add filters for task, created, edited, and due dates (search for tasks where any selected date field is within the range)
  if (options.task_date_from || options.task_date_to ||
      options.created_date_from || options.created_date_to ||
      options.edited_date_from || options.edited_date_to ||
      options.due_date_from || options.due_date_to) {
    sql += ` AND (`;
    let dateConditions = [];

    if (options.task_date_from && options.task_date_to) {
      // Compare the datetime ranges directly since they are now in proper UTC format
      // The boundaries are created in routes.js to cover the full UTC range for each local date
      dateConditions.push(`(t.task_date >= ? AND t.task_date <= ?)`);
      params.push(options.task_date_from, options.task_date_to);
    } else if (options.task_date_from) {
      dateConditions.push(`(t.task_date >= ?)`);
      params.push(options.task_date_from);
    } else if (options.task_date_to) {
      dateConditions.push(`(t.task_date <= ?)`);
      params.push(options.task_date_to);
    }

    if (options.created_date_from && options.created_date_to) {
      // Compare the datetime ranges directly since they are now in proper UTC format
      // The boundaries are created in routes.js to cover the full UTC range for each local date
      dateConditions.push(`(t.created_date >= ? AND t.created_date <= ?)`);
      params.push(options.created_date_from, options.created_date_to);
    } else if (options.created_date_from) {
      dateConditions.push(`(t.created_date >= ?)`);
      params.push(options.created_date_from);
    } else if (options.created_date_to) {
      dateConditions.push(`(t.created_date <= ?)`);
      params.push(options.created_date_to);
    }

    if (options.edited_date_from && options.edited_date_to) {
      // Compare the datetime ranges directly since they are now in proper UTC format
      // The boundaries are created in routes.js to cover the full UTC range for each local date
      dateConditions.push(`(t.edited_date >= ? AND t.edited_date <= ?)`);
      params.push(options.edited_date_from, options.edited_date_to);
    } else if (options.edited_date_from) {
      dateConditions.push(`(t.edited_date >= ?)`);
      params.push(options.edited_date_from);
    } else if (options.edited_date_to) {
      dateConditions.push(`(t.edited_date <= ?)`);
      params.push(options.edited_date_to);
    }

    if (options.due_date_from && options.due_date_to) {
      // Compare the datetime ranges directly since they are now in proper UTC format
      // The boundaries are created in routes.js to cover the full UTC range for each local date
      dateConditions.push(`(t.due_date >= ? AND t.due_date <= ?)`);
      params.push(options.due_date_from, options.due_date_to);
    } else if (options.due_date_from) {
      dateConditions.push(`(t.due_date >= ?)`);
      params.push(options.due_date_from);
    } else if (options.due_date_to) {
      dateConditions.push(`(t.due_date <= ?)`);
      params.push(options.due_date_to);
    }

    sql += dateConditions.join(' OR ');
    sql += `)`;
  }

  // Add filter for tasks with attachments
  if (options.with_attachment) {
    sql += ` AND (SELECT COUNT(*) FROM attachments a WHERE a.task_id = t.id) > 0`;
  }
  
  // Add ordering - support dynamic sorting
  let orderBy = 't.task_date';
  if (options.sort) {
    // Map frontend column names to database column names
    switch(options.sort) {
      case 'title':
        orderBy = 't.title';
        break;
      case 'category_name':
        orderBy = 'tc.name';
        break;
      case 'type_name':
        orderBy = 'tt.name';
        break;
      case 'sub_type_name':
        orderBy = 'tst.name';
        break;
      case 'quantity':
        orderBy = 't.quantity';
        break;
      case 'status':
        orderBy = 't.status';
        break;
      case 'task_date':
        orderBy = 't.task_date';
        break;
      case 'created_date':
        orderBy = 't.created_date';
        break;
      case 'due_date':
        orderBy = 't.due_date';
        break;
      default:
        orderBy = 't.task_date'; // fallback to task_date for consistency
    }
  }

  const orderDirection = options.order && (options.order.toLowerCase() === 'desc' || options.order.toLowerCase() === 'asc')
    ? options.order.toUpperCase()
    : 'DESC'; // Use DESC by default

  sql += ` ORDER BY ${orderBy} ${orderDirection}`;
  
  // Add pagination
  if (options.limit) {
    sql += ` LIMIT ?`;
    params.push(options.limit);
    
    if (options.offset) {
      sql += ` OFFSET ?`;
      params.push(options.offset);
    }
  }
  
  console.log('Executing tasks query:', sql, 'with params:', params);
  
  try {
    let tasks = await getAll(sql, params);
    console.log('Tasks query result:', tasks.length);
    
    // Convert UTC dates to local time for all tasks
    tasks = tasks.map(task => ({
      ...task,
      due_date: convertUTCToLocal(task.due_date),
      task_date: convertUTCToLocal(task.task_date),
      created_date: convertUTCToLocal(task.created_date),
      edited_date: convertUTCToLocal(task.edited_date)
    }));

    return tasks;
  } catch (error) {
    console.error('Error in getTasksByUserId:', error);
    throw new Error(`Error fetching tasks: ${error.message}`);
  }
}

// Update task
async function updateTask(id, taskData) {
  // Get the current task to compare dates if needed
  const currentTask = await getTaskById(id);

  // Prevent changing status to 'Overdue' if the task is already 'Archived'
  if (currentTask && currentTask.status === 'Archived' && taskData.status === 'Overdue') {
    throw new Error('Cannot change status of an archived task to overdue');
  }

  // Build dynamic update query based on provided fields
  const updates = [];
  const params = [];

  // Only add fields to update if they are explicitly provided in taskData
  if (taskData.title !== undefined) {
    updates.push('title = ?');
    params.push(taskData.title);
  }
  if (taskData.description !== undefined) {
    updates.push('description = ?');
    params.push(taskData.description);
  }
  if (taskData.category_id !== undefined) {
    updates.push('category_id = ?');
    params.push(taskData.category_id);
  }
  if (taskData.type_id !== undefined) {
    updates.push('type_id = ?');
    params.push(taskData.type_id);
  }
  if (taskData.sub_type_id !== undefined) {
    updates.push('sub_type_id = ?');
    params.push(taskData.sub_type_id);
  }
  if (taskData.quantity !== undefined) {
    updates.push('quantity = ?');
    params.push(taskData.quantity);
  }
  if (taskData.priority !== undefined) {
    updates.push('priority = ?');
    params.push(taskData.priority);
  }
  if (taskData.task_date !== undefined) {
    // Validate that due_date is not before task_date if both are provided
    const newTaskDate = taskData.task_date ? new Date(taskData.task_date) : null;
    const newDueDate = taskData.due_date ? new Date(taskData.due_date) : (currentTask ? new Date(currentTask.due_date) : null);

    if (newDueDate && newTaskDate && newDueDate < newTaskDate) {
      throw new Error('Due date cannot be before task date');
    }

    // Ensure date is in proper UTC format before storing
    const utcTaskDate = taskData.task_date ? new Date(taskData.task_date).toISOString() : null;
    updates.push('task_date = ?');
    params.push(utcTaskDate);
  }
  if (taskData.due_date !== undefined) {
    // Validate that due_date is not before task_date if both are provided
    const newDueDate = new Date(taskData.due_date);
    const newTaskDate = taskData.task_date ? new Date(taskData.task_date) : (currentTask ? new Date(currentTask.task_date) : null);

    if (newDueDate && newTaskDate && newDueDate < newTaskDate) {
      throw new Error('Due date cannot be before task date');
    }

    // Ensure date is in proper UTC format before storing
    const utcDueDate = taskData.due_date ? new Date(taskData.due_date).toISOString() : null;
    updates.push('due_date = ?');
    params.push(utcDueDate);
  }
  if (taskData.status !== undefined) {
    updates.push('status = ?');
    params.push(taskData.status);
  }

  // Always update the edited date
  updates.push('edited_date = ?');
  params.push(new Date().toISOString());

  // Add the id for the WHERE clause
  params.push(id);

  if (updates.length <= 1) { // Only edited_date, which should always be there
    throw new Error('No valid fields to update');
  }

  const sql = `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`;

  try {
    const result = await runQuery(sql, params);
    return result.changes > 0;
  } catch (error) {
    throw new Error(`Error updating task: ${error.message}`);
  }
}

// Delete task
async function deleteTask(id) {
  const sql = 'DELETE FROM tasks WHERE id = ?';
  const params = [id];
  
  try {
    const result = await runQuery(sql, params);
    return result.changes > 0;
  } catch (error) {
    throw new Error(`Error deleting task: ${error.message}`);
  }
}

// Track last update time to avoid running too frequently
let lastOverdueUpdate = 0;
const OVERDUE_UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

// Update overdue tasks status
async function updateOverdueTasks() {
  const now = Date.now();

  // Only update if enough time has passed since the last update
  if (now - lastOverdueUpdate < OVERDUE_UPDATE_INTERVAL) {
    return 0; // No update needed
  }

  const sql = `
    UPDATE tasks
    SET status = 'Overdue', edited_date = ?
    WHERE due_date IS NOT NULL AND due_date < datetime('now', 'localtime') AND status != 'Completed' AND status != 'Overdue' AND status != 'Archived'
  `;

  const params = [new Date().toISOString()];

  try {
    const result = await runQuery(sql, params);
    lastOverdueUpdate = now;
    return result.changes; // Return number of tasks updated
  } catch (error) {
    throw new Error(`Error updating overdue tasks: ${error.message}`);
  }
}

// Force update of overdue tasks (bypasses the time check)
async function forceUpdateOverdueTasks() {
  const sql = `
    UPDATE tasks
    SET status = 'Overdue', edited_date = ?
    WHERE due_date IS NOT NULL AND due_date < datetime('now', 'localtime') AND status != 'Completed' AND status != 'Overdue' AND status != 'Archived'
  `;

  const params = [new Date().toISOString()];

  try {
    const result = await runQuery(sql, params);
    lastOverdueUpdate = Date.now();
    return result.changes; // Return number of tasks updated
  } catch (error) {
    throw new Error(`Error updating overdue tasks: ${error.message}`);
  }
}

// Get task statistics for dashboard
async function getTaskStats(user_id, startDate = null, endDate = null, categoryFilters = null) {
  // Main stats query
  let mainSql = `
    SELECT
      COUNT(*) as total_tasks,
      SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed_tasks,
      SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress_tasks,
      SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending_tasks,
      SUM(CASE WHEN status = 'Overdue' OR (due_date IS NOT NULL AND due_date < datetime('now', 'localtime') AND status != 'Completed' AND status != 'Archived') THEN 1 ELSE 0 END) as overdue_tasks,
      SUM(CASE WHEN status = 'Archived' THEN 1 ELSE 0 END) as archived_tasks
    FROM tasks
    WHERE user_id = ?
  `;
  let mainParams = [user_id];

  // Recent tasks query (tasks from the last 7 days) - using task_date instead of created_date
  let recentSql = `
    SELECT COUNT(*) as recent_tasks
    FROM tasks
    WHERE user_id = ?
    AND task_date >= datetime('now', '-7 days', 'localtime')
  `;
  let recentParams = [user_id];

  // Tasks today query - using task_date instead of created_date
  let todaySql = `
    SELECT COUNT(*) as tasks_today
    FROM tasks
    WHERE user_id = ?
    AND DATE(task_date) = DATE('now', 'localtime')
  `;
  let todayParams = [user_id];

  // Tasks this month query - using task_date instead of created_date
  let monthSql = `
    SELECT COUNT(*) as tasks_this_month
    FROM tasks
    WHERE user_id = ?
    AND strftime('%Y-%m', task_date) = strftime('%Y-%m', 'now', 'localtime')
  `;
  let monthParams = [user_id];

  // Apply date range filtering if provided
  if (startDate && endDate) {
    // Format dates for SQLite comparison, ensuring proper comparison
    // The frontend sends dates in YYYY-MM-DD format, we want to include the entire end day
    // Using task_date instead of created_date for consistency with report filtering
    // Create datetime boundaries for the date range to include full start and end days
    const startDateBoundary = new Date(startDate);
    startDateBoundary.setHours(0, 0, 0, 0); // Beginning of the start date

    const endDateBoundary = new Date(endDate);
    endDateBoundary.setHours(23, 59, 59, 999); // End of the end date

    const dateCondition = `(task_date >= ? AND task_date <= ?)`;
    mainSql += ` AND ${dateCondition}`;
    mainParams.push(startDateBoundary.toISOString().slice(0, 19).replace('T', ' '),
                   endDateBoundary.toISOString().slice(0, 19).replace('T', ' '));

    // Also apply date range to today, month, and recent queries if needed
    // For today/month/recent queries, we'll use the date range as a filter
    todaySql += ` AND (created_date >= ? AND created_date <= ?)`;
    todayParams.push(startDateBoundary.toISOString().slice(0, 19).replace('T', ' '),
                     endDateBoundary.toISOString().slice(0, 19).replace('T', ' '));

    monthSql += ` AND (created_date >= ? AND created_date <= ?)`;
    monthParams.push(startDateBoundary.toISOString().slice(0, 19).replace('T', ' '),
                     endDateBoundary.toISOString().slice(0, 19).replace('T', ' '));

    recentSql += ` AND (created_date >= ? AND created_date <= ?)`;
    recentParams.push(startDateBoundary.toISOString().slice(0, 19).replace('T', ' '),
                      endDateBoundary.toISOString().slice(0, 19).replace('T', ' '));
  }

  // Add category filtering to main query
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

    // Query for all available task categories from the database
    const categoryQuery = `SELECT id, name FROM task_categories`;
    const categoryResults = await getAll(categoryQuery, []);

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
        mainSql += ` AND category_id IS NOT NULL AND category_id IN (${placeholders})`;
        mainParams.push(...categoryIds);

        // Apply same category filter to other queries
        todaySql += ` AND category_id IS NOT NULL AND category_id IN (${placeholders})`;
        todayParams.push(...categoryIds);

        monthSql += ` AND category_id IS NOT NULL AND category_id IN (${placeholders})`;
        monthParams.push(...categoryIds);

        recentSql += ` AND category_id IS NOT NULL AND category_id IN (${placeholders})`;
        recentParams.push(...categoryIds);
      } else {
        // Check if all available categories are explicitly set to false
        const allFalse = categoryResults.every(cat => !selectedCategoryFilters[cat.name.toLowerCase()]);
        if (allFalse) {
          // If all selected categories are false, we want no results
          mainSql += ` AND 1 = 0`; // This ensures no records match
          todaySql += ` AND 1 = 0`;
          monthSql += ` AND 1 = 0`;
          recentSql += ` AND 1 = 0`;
        }
      }
    }
  }

  try {
    // Execute all queries in parallel for better performance
    const [mainStats, todayStats, monthStats, recentStats] = await Promise.all([
      getRow(mainSql, mainParams),
      getRow(todaySql, todayParams),
      getRow(monthSql, monthParams),
      getRow(recentSql, recentParams)
    ]);

    // Combine all stats into a single object
    const combinedStats = {
      ...mainStats,
      tasks_today: todayStats.tasks_today || 0,
      tasks_this_month: monthStats.tasks_this_month || 0,
      recent_tasks: recentStats.recent_tasks || 0
    };

    return combinedStats;
  } catch (error) {
    console.error('Error in getTaskStats:', error);
    throw new Error(`Error fetching task stats: ${error.message}`);
  }
}

module.exports = {
  createTask,
  getTaskById,
  getTasksByUserId,
  getTasksCountByUserId,
  updateTask,
  deleteTask,
  getTaskStats,
  updateOverdueTasks,
  forceUpdateOverdueTasks
};