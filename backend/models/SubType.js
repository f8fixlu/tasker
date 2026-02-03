const { db } = require('../config/database');
const { runQuery, getRow, getAll } = require('../utils/database');

// Task Sub Type model

// Create a new task sub type
async function createSubType(subTypeData) {
  const { name, type_id, user_id } = subTypeData;
  
  const sql = `
    INSERT INTO task_sub_types (name, type_id, user_id)
    VALUES (?, ?, ?)
  `;
  
  const params = [name.trim(), type_id, user_id];
  
  try {
    const result = await runQuery(sql, params);
    return { id: result.lastID, ...subTypeData };
  } catch (error) {
    throw new Error(`Error creating task sub type: ${error.message}`);
  }
}

// Get task sub type by ID
async function getSubTypeById(id) {
  const sql = `
    SELECT id, name, type_id, user_id, description, created_at
    FROM task_sub_types
    WHERE id = ?
  `;
  const params = [id];

  try {
    const subType = await getRow(sql, params);
    return subType;
  } catch (error) {
    throw new Error(`Error fetching task sub type: ${error.message}`);
  }
}

// Get task sub types by user ID
async function getSubTypesByUserId(user_id, options = {}) {
  let sql = `
    SELECT id, name, type_id, user_id, description, created_at
    FROM task_sub_types
    WHERE user_id = ?
  `;
  const params = [user_id];

  // Filter by task type if provided
  if (options.type_id) {
    sql += ` AND type_id = ?`;
    params.push(options.type_id);
  }

  sql += ` ORDER BY name ASC`;

  try {
    const subTypes = await getAll(sql, params);
    return subTypes;
  } catch (error) {
    throw new Error(`Error fetching task sub types: ${error.message}`);
  }
}

// Update task sub type
async function updateSubType(id, subTypeData) {
  const { name, type_id, description } = subTypeData;

  // Build the SQL and parameters dynamically based on what fields are provided
  let sql = 'UPDATE task_sub_types';
  const params = [];
  let hasUpdates = false;

  if (name !== undefined) {
    sql += hasUpdates ? ', name = ?' : ' SET name = ?';
    params.push(name.trim());
    hasUpdates = true;
  }

  if (type_id !== undefined) {
    sql += hasUpdates ? ', type_id = ?' : ' SET type_id = ?';
    params.push(type_id);
    hasUpdates = true;
  }

  if (description !== undefined) {
    sql += hasUpdates ? ', description = ?' : ' SET description = ?';
    params.push(description);
    hasUpdates = true;
  }

  if (!hasUpdates) {
    throw new Error('No fields to update');
  }

  sql += ' WHERE id = ?';
  params.push(id);

  try {
    const result = await runQuery(sql, params);
    return result.changes > 0;
  } catch (error) {
    throw new Error(`Error updating task sub type: ${error.message}`);
  }
}

// Delete task sub type
async function deleteSubType(id) {
  const sql = 'DELETE FROM task_sub_types WHERE id = ?';
  const params = [id];
  
  try {
    const result = await runQuery(sql, params);
    return result.changes > 0;
  } catch (error) {
    throw new Error(`Error deleting task sub type: ${error.message}`);
  }
}

// Get task sub type by name for a user and type
async function getSubTypeByName(name, user_id, type_id = null) {
  let sql = `
    SELECT id, name, type_id, user_id, description, created_at
    FROM task_sub_types
    WHERE TRIM(LOWER(name)) = TRIM(LOWER(?)) AND user_id = ?
  `;
  const params = [name, user_id];

  // If type_id is provided, check for duplicate within that specific task type
  // Otherwise, check across all task types for this user
  if (type_id) {
    sql += ` AND type_id = ?`;
    params.push(type_id);
  }

  try {
    const subType = await getRow(sql, params);
    return subType;
  } catch (error) {
    throw new Error(`Error fetching task sub type by name: ${error.message}`);
  }
}

// Update description for a specific sub type
async function updateSubTypeDescription(id, description) {
  const sql = `
    UPDATE task_sub_types
    SET description = ?
    WHERE id = ?
  `;
  const params = [description, id];

  try {
    const result = await runQuery(sql, params);
    return result.changes > 0; // Return true if row was updated
  } catch (error) {
    throw new Error(`Error updating sub type description: ${error.message}`);
  }
}

// Get description for a specific sub type
async function getSubTypeDescription(id) {
  const sql = `
    SELECT description
    FROM task_sub_types
    WHERE id = ?
  `;
  const params = [id];

  try {
    const result = await getRow(sql, params);
    return result ? result.description : null;
  } catch (error) {
    throw new Error(`Error fetching sub type description: ${error.message}`);
  }
}

module.exports = {
  createSubType,
  getSubTypeById,
  getSubTypesByUserId,
  updateSubType,
  deleteSubType,
  getSubTypeByName,
  updateSubTypeDescription,
  getSubTypeDescription
};