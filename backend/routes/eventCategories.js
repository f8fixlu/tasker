const url = require('url');
const { jsonParser, authenticateToken } = require('../middleware/auth');
const { validateCategory } = require('../middleware/validation');
const {
  createEventCategory,
  getEventCategoryById,
  getEventCategoriesByUserId,
  updateEventCategory,
  deleteEventCategory,
  getEventCategoryByName
} = require('../models/EventCategory');

// Handle event category routes
function eventCategoryRoutes(req, res, parsedUrl) {
  const path = parsedUrl.pathname;
  const method = req.method;
  
  // Extract category ID from URL if it exists
  const pathParts = path.split('/');
  const categoryId = pathParts.length > 4 ? parseInt(pathParts[4]) : null;
  
  // Parse the request body
  jsonParser(req, res, async () => {
    if (method === 'GET' && path === '/api/events/categories') {
      await handleGetCategories(req, res, req.user.id);
    } else if (method === 'POST' && path === '/api/events/categories') {
      await handleCreateCategory(req, res, req.user.id);
    } else if (method === 'GET' && path === `/api/events/categories/${categoryId}`) {
      await handleGetCategory(req, res, categoryId, req.user.id);
    } else if (method === 'PUT' && path === `/api/events/categories/${categoryId}`) {
      await handleUpdateCategory(req, res, categoryId, req.user.id);
    } else if (method === 'DELETE' && path === `/api/events/categories/${categoryId}`) {
      await handleDeleteCategory(req, res, categoryId, req.user.id);
    } else {
      // Route not found
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Route not found' }));
    }
  });
}

// Handle getting event categories
async function handleGetCategories(req, res, userId) {
  try {
    const categories = await getEventCategoriesByUserId(userId);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ categories, total: categories.length }));
  } catch (error) {
    console.error('Get event categories error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during event categories retrieval' }));
  }
}

// Handle creating an event category
async function handleCreateCategory(req, res, userId) {
  try {
    const { name, color } = req.body;

    // Validate required fields
    const categoryData = { name, color };
    const validationErrors = validateCategory(categoryData);
    if (validationErrors.length > 0) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: validationErrors.join(', ') }));
    }

    // Check if event category with same name already exists for this user
    const existingCategory = await getEventCategoryByName(name, userId);
    if (existingCategory) {
      res.writeHead(409, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Event category with this name already exists' }));
    }

    const category = {
      name,
      color: color || null,
      user_id: userId
    };

    const newCategory = await createEventCategory(category);

    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ category: newCategory }));
  } catch (error) {
    console.error('Create event category error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during event category creation' }));
  }
}

// Handle getting a single event category
async function handleGetCategory(req, res, categoryId, userId) {
  try {
    const category = await getEventCategoryById(categoryId);

    // Check if the category belongs to the authenticated user
    if (!category || category.user_id !== userId) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Category not found' }));
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ category }));
  } catch (error) {
    console.error('Get event category error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during event category retrieval' }));
  }
}

// Handle updating an event category
async function handleUpdateCategory(req, res, categoryId, userId) {
  try {
    const { name, color } = req.body;

    if (name !== undefined && name.trim().length === 0) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Category name is required' }));
    }

    // Check if another event category with the same name already exists for this user
    if (name !== undefined) {
      const existingCategory = await getEventCategoryByName(name, userId);
      if (existingCategory && existingCategory.id !== categoryId) {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Event category with this name already exists' }));
      }
    }

    const category = {
      name: name !== undefined ? name : undefined,
      color: color !== undefined ? color : undefined
    };

    const success = await updateEventCategory(categoryId, category);

    if (!success) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Category not found' }));
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Category updated successfully' }));
  } catch (error) {
    console.error('Update event category error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during event category update' }));
  }
}

// Handle deleting an event category
async function handleDeleteCategory(req, res, categoryId, userId) {
  try {
    const success = await deleteEventCategory(categoryId);

    if (!success) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Category not found' }));
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Category deleted successfully' }));
  } catch (error) {
    console.error('Delete event category error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during event category deletion' }));
  }
}

module.exports = eventCategoryRoutes;