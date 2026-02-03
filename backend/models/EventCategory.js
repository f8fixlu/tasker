const { db } = require('../config/database');
const { runQuery, getRow, getAll } = require('../utils/database');

// Event Category model

// Create a new event category
async function createEventCategory(categoryData) {
  const {
    name,
    color,
    user_id
  } = categoryData;
  
  const sql = `
    INSERT INTO event_categories (name, color, user_id)
    VALUES (?, ?, ?)
  `;
  
  const params = [name, color, user_id];
  
  try {
    const result = await runQuery(sql, params);
    return { id: result.lastID, name, color, user_id };
  } catch (error) {
    throw new Error(`Error creating event category: ${error.message}`);
  }
}

// Get event category by ID
async function getEventCategoryById(id) {
  const sql = `
    SELECT id, name, color, user_id, created_at
    FROM event_categories 
    WHERE id = ?
  `;
  const params = [id];
  
  try {
    const category = await getRow(sql, params);
    return category;
  } catch (error) {
    throw new Error(`Error fetching event category: ${error.message}`);
  }
}

// Get event categories by user ID
async function getEventCategoriesByUserId(user_id) {
  const sql = `
    SELECT id, name, color, user_id, created_at
    FROM event_categories 
    WHERE user_id = ?
    ORDER BY name ASC
  `;
  const params = [user_id];
  
  try {
    const categories = await getAll(sql, params);
    return categories;
  } catch (error) {
    throw new Error(`Error fetching event categories: ${error.message}`);
  }
}

// Update event category
async function updateEventCategory(id, categoryData) {
  const { name, color } = categoryData;
  
  // Build the SQL dynamically based on which fields are provided
  const updates = [];
  const params = [];
  
  if (name !== undefined) {
    updates.push('name = ?');
    params.push(name);
  }
  
  if (color !== undefined) {
    updates.push('color = ?');
    params.push(color);
  }
  
  if (updates.length === 0) {
    // Nothing to update
    return true;
  }
  
  params.push(id);
  
  const sql = `UPDATE event_categories SET ${updates.join(', ')} WHERE id = ?`;
  
  try {
    const result = await runQuery(sql, params);
    return result.changes > 0;
  } catch (error) {
    throw new Error(`Error updating event category: ${error.message}`);
  }
}

// Delete event category
async function deleteEventCategory(id) {
  const sql = 'DELETE FROM event_categories WHERE id = ?';
  const params = [id];

  try {
    const result = await runQuery(sql, params);
    return result.changes > 0;
  } catch (error) {
    throw new Error(`Error deleting event category: ${error.message}`);
  }
}

// Get event category by name for a user to check for duplicates
async function getEventCategoryByName(name, user_id) {
  const sql = `
    SELECT id, name, color, user_id, created_at
    FROM event_categories
    WHERE TRIM(LOWER(name)) = TRIM(LOWER(?)) AND user_id = ?
  `;
  const params = [name, user_id];

  try {
    const category = await getRow(sql, params);
    return category;
  } catch (error) {
    throw new Error(`Error fetching event category by name: ${error.message}`);
  }
}

module.exports = {
  createEventCategory,
  getEventCategoryById,
  getEventCategoriesByUserId,
  updateEventCategory,
  deleteEventCategory,
  getEventCategoryByName
};