const url = require('url');
const { jsonParser, authenticateToken } = require('../middleware/auth');
const { 
  createTaskType,
  getTaskTypeById,
  getTaskTypesByUserId,
  updateTaskType,
  deleteTaskType,
  getTaskTypeByName
} = require('../models/TaskType');

// Handle task type routes
function taskTypeRoutes(req, res, parsedUrl) {
  const path = parsedUrl.pathname;
  const method = req.method;
  
  // Extract task type ID from URL if it exists
  const pathParts = path.split('/');
  const taskTypeId = pathParts.length > 4 ? parseInt(pathParts[4]) : null; // /api/tasks/types/:id
  
  // Parse the request body
  jsonParser(req, res, async () => {
    if (method === 'GET' && path === '/api/tasks/types') {
      await handleGetTaskTypes(req, res, req.user.id, parsedUrl.query);
    } else if (method === 'POST' && path === '/api/tasks/types') {
      await handleCreateTaskType(req, res, req.user.id);
    } else if (method === 'GET' && path === `/api/tasks/types/${taskTypeId}`) {
      await handleGetTaskType(req, res, taskTypeId, req.user.id);
    } else if (method === 'PUT' && path === `/api/tasks/types/${taskTypeId}`) {
      await handleUpdateTaskType(req, res, taskTypeId, req.user.id);
    } else if (method === 'DELETE' && path === `/api/tasks/types/${taskTypeId}`) {
      await handleDeleteTaskType(req, res, taskTypeId, req.user.id);
    } else {
      // Route not found
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Route not found' }));
    }
  });
}

// Handle getting task types
async function handleGetTaskTypes(req, res, userId, query) {
  try {
    const options = {
      category_id: query.category_id ? parseInt(query.category_id) : null
    };
    
    const types = await getTaskTypesByUserId(userId, options);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ types }));
  } catch (error) {
    console.error('Get task types error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during task types retrieval' }));
  }
}

// Handle creating a task type
async function handleCreateTaskType(req, res, userId) {
  try {
    const { name, category_id } = req.body;
    
    if (!name) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Task type name is required' }));
    }
    
    // Check if task type with same name already exists for this user within the same category
    const existingType = await getTaskTypeByName(name, userId, category_id || null);
    if (existingType) {
      res.writeHead(409, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Task type with this name already exists in this category' }));
    }
    
    const type = {
      name,
      category_id: category_id || null,
      user_id: userId
    };
    
    const newType = await createTaskType(type);
    
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ type: newType }));
  } catch (error) {
    console.error('Create task type error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during task type creation' }));
  }
}

// Handle getting a single task type
async function handleGetTaskType(req, res, taskTypeId, userId) {
  try {
    const type = await getTaskTypeById(taskTypeId);
    
    // Check if the task type belongs to the authenticated user
    if (!type || type.user_id !== userId) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Task type not found' }));
    }
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ type }));
  } catch (error) {
    console.error('Get task type error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during task type retrieval' }));
  }
}

// Handle updating a task type
async function handleUpdateTaskType(req, res, taskTypeId, userId) {
  try {
    const { name, category_id } = req.body;
    
    if (!name) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Task type name is required' }));
    }
    
    // Check if another task type with the same name already exists for this user in the same category
    const categoryToCheck = category_id !== undefined ? category_id : null;
    const existingType = await getTaskTypeByName(name, userId, categoryToCheck);
    if (existingType && existingType.id !== taskTypeId) {
      res.writeHead(409, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Task type with this name already exists in this category' }));
    }
    
    const type = {
      name,
      category_id
    };
    
    const success = await updateTaskType(taskTypeId, type);
    
    if (!success) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Task type not found' }));
    }
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Task type updated successfully' }));
  } catch (error) {
    console.error('Update task type error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during task type update' }));
  }
}

// Handle deleting a task type
async function handleDeleteTaskType(req, res, taskTypeId, userId) {
  try {
    const success = await deleteTaskType(taskTypeId);
    
    if (!success) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Task type not found' }));
    }
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Task type deleted successfully' }));
  } catch (error) {
    console.error('Delete task type error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during task type deletion' }));
  }
}

module.exports = taskTypeRoutes;