const url = require('url');
const { jsonParser, authenticateToken } = require('../middleware/auth');
const { 
  createCategory,
  getCategoryById,
  getCategoriesByUserId,
  updateCategory,
  deleteCategory,
  getCategoryByName
} = require('../models/Category');

// Handle category routes
function categoryRoutes(req, res, parsedUrl) {
  const path = parsedUrl.pathname;
  const method = req.method;
  
  // Extract category ID from URL if it exists
  const pathParts = path.split('/');
  const categoryId = pathParts.length > 4 ? parseInt(pathParts[4]) : null; // /api/tasks/categories/:id
  
  // Parse the request body
  jsonParser(req, res, async () => {
    if (method === 'GET' && path === '/api/tasks/categories') {
      await handleGetCategories(req, res, req.user.id);
    } else if (method === 'POST' && path === '/api/tasks/categories') {
      await handleCreateCategory(req, res, req.user.id);
    } else if (method === 'GET' && path === `/api/tasks/categories/${categoryId}`) {
      await handleGetCategory(req, res, categoryId, req.user.id);
    } else if (method === 'PUT' && path === `/api/tasks/categories/${categoryId}`) {
      await handleUpdateCategory(req, res, categoryId, req.user.id);
    } else if (method === 'DELETE' && path === `/api/tasks/categories/${categoryId}`) {
      await handleDeleteCategory(req, res, categoryId, req.user.id);
    } else {
      // Route not found
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Route not found' }));
    }
  });
}

// Handle getting categories
async function handleGetCategories(req, res, userId) {
  try {
    const categories = await getCategoriesByUserId(userId);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ categories }));
  } catch (error) {
    console.error('Get categories error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during categories retrieval' }));
  }
}

// Handle creating a category
async function handleCreateCategory(req, res, userId) {
  try {
    const { name, color } = req.body;
    
    if (!name) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Category name is required' }));
    }
    
    // Check if category with same name already exists for this user
    const existingCategory = await getCategoryByName(name, userId);
    if (existingCategory) {
      res.writeHead(409, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Category with this name already exists' }));
    }
    
    const category = {
      name,
      color: color || null,
      user_id: userId
    };
    
    const newCategory = await createCategory(category);
    
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ category: newCategory }));
  } catch (error) {
    console.error('Create category error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during category creation' }));
  }
}

// Handle getting a single category
async function handleGetCategory(req, res, categoryId, userId) {
  try {
    const category = await getCategoryById(categoryId);
    
    // Check if the category belongs to the authenticated user
    if (!category || category.user_id !== userId) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Category not found' }));
    }
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ category }));
  } catch (error) {
    console.error('Get category error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during category retrieval' }));
  }
}

// Handle updating a category
async function handleUpdateCategory(req, res, categoryId, userId) {
  try {
    const { name, color } = req.body;
    
    if (!name) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Category name is required' }));
    }
    
    // Check if another category with the same name already exists for this user
    const existingCategory = await getCategoryByName(name, userId);
    if (existingCategory && existingCategory.id !== categoryId) {
      res.writeHead(409, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Category with this name already exists' }));
    }
    
    const category = {
      name,
      color
    };
    
    const success = await updateCategory(categoryId, category);
    
    if (!success) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Category not found' }));
    }
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Category updated successfully' }));
  } catch (error) {
    console.error('Update category error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during category update' }));
  }
}

// Handle deleting a category
async function handleDeleteCategory(req, res, categoryId, userId) {
  try {
    const success = await deleteCategory(categoryId);
    
    if (!success) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Category not found' }));
    }
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Category deleted successfully' }));
  } catch (error) {
    console.error('Delete category error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during category deletion' }));
  }
}

module.exports = categoryRoutes;