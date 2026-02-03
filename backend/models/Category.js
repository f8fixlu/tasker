const { db } = require('../config/database');
const { runQuery, getRow, getAll } = require('../utils/database');

// Category model

// Create a new category
async function createCategory(categoryData) {
  const { name, color, user_id } = categoryData;
  
  const sql = `
    INSERT INTO task_categories (name, color, user_id)
    VALUES (?, ?, ?)
  `;
  
  const params = [name.trim(), color, user_id];
  
  try {
    const result = await runQuery(sql, params);
    return { id: result.lastID, ...categoryData };
  } catch (error) {
    throw new Error(`Error creating category: ${error.message}`);
  }
}

// Get category by ID
async function getCategoryById(id) {
  const sql = `
    SELECT id, name, color, user_id, created_at
    FROM task_categories 
    WHERE id = ?
  `;
  const params = [id];
  
  try {
    const category = await getRow(sql, params);
    return category;
  } catch (error) {
    throw new Error(`Error fetching category: ${error.message}`);
  }
}

// Get categories by user ID
async function getCategoriesByUserId(user_id) {
  const sql = `
    SELECT id, name, color, user_id, created_at
    FROM task_categories 
    WHERE user_id = ?
    ORDER BY name ASC
  `;
  const params = [user_id];
  
  try {
    const categories = await getAll(sql, params);
    return categories;
  } catch (error) {
    throw new Error(`Error fetching categories: ${error.message}`);
  }
}

// Update category
async function updateCategory(id, categoryData) {
  const { name, color } = categoryData;
  
  const sql = `
    UPDATE task_categories 
    SET name = ?, color = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;
  
  const params = [name.trim(), color, id];
  
  try {
    const result = await runQuery(sql, params);
    return result.changes > 0;
  } catch (error) {
    throw new Error(`Error updating category: ${error.message}`);
  }
}

// Delete category
async function deleteCategory(id) {
  const sql = 'DELETE FROM task_categories WHERE id = ?';
  const params = [id];
  
  try {
    const result = await runQuery(sql, params);
    return result.changes > 0;
  } catch (error) {
    throw new Error(`Error deleting category: ${error.message}`);
  }
}

// Get category by name for a user
async function getCategoryByName(name, user_id) {
  const sql = `
    SELECT id, name, color, user_id, created_at
    FROM task_categories 
    WHERE TRIM(LOWER(name)) = TRIM(LOWER(?)) AND user_id = ?
  `;
  const params = [name, user_id];
  
  try {
    const category = await getRow(sql, params);
    return category;
  } catch (error) {
    throw new Error(`Error fetching category by name: ${error.message}`);
  }
}

module.exports = {
  createCategory,
  getCategoryById,
  getCategoriesByUserId,
  updateCategory,
  deleteCategory,
  getCategoryByName
};