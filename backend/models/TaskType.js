const { db } = require('../config/database');
const { runQuery, getRow, getAll } = require('../utils/database');

// Task Type model

// Create a new task type
async function createTaskType(typeData) {
  const { name, category_id, user_id } = typeData;
  
  const sql = `
    INSERT INTO task_types (name, category_id, user_id)
    VALUES (?, ?, ?)
  `;
  
  const params = [name.trim(), category_id, user_id];
  
  try {
    const result = await runQuery(sql, params);
    return { id: result.lastID, ...typeData };
  } catch (error) {
    throw new Error(`Error creating task type: ${error.message}`);
  }
}

// Get task type by ID
async function getTaskTypeById(id) {
  const sql = `
    SELECT id, name, category_id, user_id, created_at
    FROM task_types 
    WHERE id = ?
  `;
  const params = [id];
  
  try {
    const type = await getRow(sql, params);
    return type;
  } catch (error) {
    throw new Error(`Error fetching task type: ${error.message}`);
  }
}

// Get task types by user ID
async function getTaskTypesByUserId(user_id, options = {}) {
  let sql = `
    SELECT id, name, category_id, user_id, created_at
    FROM task_types 
    WHERE user_id = ?
  `;
  const params = [user_id];
  
  // Filter by category if provided
  if (options.category_id) {
    sql += ` AND category_id = ?`;
    params.push(options.category_id);
  }
  
  sql += ` ORDER BY name ASC`;
  
  try {
    const types = await getAll(sql, params);
    return types;
  } catch (error) {
    throw new Error(`Error fetching task types: ${error.message}`);
  }
}

// Update task type
async function updateTaskType(id, typeData) {
  const { name, category_id } = typeData;
  
  const sql = `
    UPDATE task_types 
    SET name = ?, category_id = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;
  
  const params = [name.trim(), category_id, id];
  
  try {
    const result = await runQuery(sql, params);
    return result.changes > 0;
  } catch (error) {
    throw new Error(`Error updating task type: ${error.message}`);
  }
}

// Delete task type
async function deleteTaskType(id) {
  const sql = 'DELETE FROM task_types WHERE id = ?';
  const params = [id];
  
  try {
    const result = await runQuery(sql, params);
    return result.changes > 0;
  } catch (error) {
    throw new Error(`Error deleting task type: ${error.message}`);
  }
}

// Get task type by name, user ID, and optionally category ID to check for duplicates
async function getTaskTypeByName(name, user_id, category_id = null) {
  let sql, params;

  if (category_id !== null && category_id !== undefined) {
    // Check for duplicates within the same category
    sql = `
      SELECT id, name, category_id, user_id, created_at
      FROM task_types
      WHERE TRIM(LOWER(name)) = TRIM(LOWER(?)) AND user_id = ? AND category_id = ?
    `;
    params = [name, user_id, category_id];
  } else {
    // Check for duplicates for the user (across all categories) - for backward compatibility
    sql = `
      SELECT id, name, category_id, user_id, created_at
      FROM task_types
      WHERE TRIM(LOWER(name)) = TRIM(LOWER(?)) AND user_id = ?
    `;
    params = [name, user_id];
  }

  try {
    const type = await getRow(sql, params);
    return type;
  } catch (error) {
    throw new Error(`Error fetching task type by name: ${error.message}`);
  }
}

module.exports = {
  createTaskType,
  getTaskTypeById,
  getTaskTypesByUserId,
  updateTaskType,
  deleteTaskType,
  getTaskTypeByName
};