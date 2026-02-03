const { db } = require('../config/database');
const { runQuery, getRow, getAll } = require('../utils/database');

// Event Type model

// Create a new event type
async function createEventType(typeData) {
  const { name, category_id, user_id } = typeData;

  const sql = 'INSERT INTO event_types (name, category_id, user_id) VALUES (?, ?, ?)';
  const params = [name, category_id, user_id];

  try {
    const result = await runQuery(sql, params);
    return await getEventTypeById(result.lastID);
  } catch (error) {
    throw new Error(`Error creating event type: ${error.message}`);
  }
}

// Get event type by ID
async function getEventTypeById(id) {
  const sql = 'SELECT * FROM event_types WHERE id = ?';
  const params = [id];

  try {
    return await getRow(sql, params);
  } catch (error) {
    throw new Error(`Error fetching event type: ${error.message}`);
  }
}

// Get event types by user ID
async function getEventTypesByUserId(user_id) {
  const sql = 'SELECT * FROM event_types WHERE user_id = ? ORDER BY name ASC';
  const params = [user_id];

  try {
    return await getAll(sql, params);
  } catch (error) {
    throw new Error(`Error fetching event types: ${error.message}`);
  }
}

// Get event types by category ID
async function getEventTypesByCategoryId(category_id) {
  const sql = 'SELECT * FROM event_types WHERE category_id = ? ORDER BY name ASC';
  const params = [category_id];

  try {
    return await getAll(sql, params);
  } catch (error) {
    throw new Error(`Error fetching event types by category: ${error.message}`);
  }
}

// Update event type
async function updateEventType(id, typeData) {
  const { name, category_id } = typeData;

  // Build the SQL dynamically based on which fields are provided
  const updates = [];
  const params = [];

  if (name !== undefined) {
    updates.push('name = ?');
    params.push(name);
  }
  if (category_id !== undefined) {
    updates.push('category_id = ?');
    params.push(category_id);
  }

  if (updates.length === 0) {
    throw new Error('No fields to update');
  }

  const sql = `UPDATE event_types SET ${updates.join(', ')} WHERE id = ?`;
  params.push(id);

  try {
    const result = await runQuery(sql, params);
    return result.changes > 0;
  } catch (error) {
    throw new Error(`Error updating event type: ${error.message}`);
  }
}

// Delete event type
async function deleteEventType(id) {
  const sql = 'DELETE FROM event_types WHERE id = ?';
  const params = [id];

  try {
    const result = await runQuery(sql, params);
    return result.changes > 0;
  } catch (error) {
    throw new Error(`Error deleting event type: ${error.message}`);
  }
}

// Get event type by name, user ID, and optionally category ID to check for duplicates
async function getEventTypeByNameAndUser(name, user_id, category_id = null) {
  let sql, params;

  if (category_id !== null && category_id !== undefined) {
    // Check for duplicates within the same category
    sql = 'SELECT * FROM event_types WHERE name = ? AND user_id = ? AND category_id = ?';
    params = [name, user_id, category_id];
  } else {
    // Check for duplicates for the user (across all categories) - for backward compatibility
    sql = 'SELECT * FROM event_types WHERE name = ? AND user_id = ?';
    params = [name, user_id];
  }

  try {
    return await getRow(sql, params);
  } catch (error) {
    throw new Error(`Error fetching event type by name: ${error.message}`);
  }
}

module.exports = {
  createEventType,
  getEventTypeById,
  getEventTypesByUserId,
  getEventTypesByCategoryId,
  updateEventType,
  deleteEventType,
  getEventTypeByNameAndUser
};