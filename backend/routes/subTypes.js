const url = require('url');
const { jsonParser, authenticateToken } = require('../middleware/auth');
const {
  createSubType,
  getSubTypeById,
  getSubTypesByUserId,
  updateSubType,
  deleteSubType,
  getSubTypeByName,
  updateSubTypeDescription
} = require('../models/SubType');

// Handle sub type routes
function subTypeRoutes(req, res, parsedUrl) {
  const path = parsedUrl.pathname;
  const method = req.method;
  
  // Extract sub type ID from URL if it exists
  const pathParts = path.split('/');
  const subTypeId = pathParts.length > 4 ? parseInt(pathParts[4]) : null; // /api/tasks/subtypes/:id
  
  // Parse the request body
  jsonParser(req, res, async () => {
    if (method === 'GET' && path === '/api/tasks/subtypes') {
      await handleGetSubTypes(req, res, req.user.id, parsedUrl.query);
    } else if (method === 'POST' && path === '/api/tasks/subtypes') {
      await handleCreateSubType(req, res, req.user.id);
    } else if (method === 'GET' && path === `/api/tasks/subtypes/${subTypeId}`) {
      await handleGetSubType(req, res, subTypeId, req.user.id);
    } else if (method === 'PUT' && path === `/api/tasks/subtypes/${subTypeId}`) {
      await handleUpdateSubType(req, res, subTypeId, req.user.id);
    } else if (method === 'PUT' && path === `/api/tasks/subtypes/${subTypeId}/description`) {
      await handleUpdateSubTypeDescription(req, res, subTypeId, req.user.id);
    } else if (method === 'DELETE' && path === `/api/tasks/subtypes/${subTypeId}`) {
      await handleDeleteSubType(req, res, subTypeId, req.user.id);
    } else {
      // Route not found
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Route not found' }));
    }
  });
}

// Handle getting sub types
async function handleGetSubTypes(req, res, userId, query) {
  try {
    const options = {
      type_id: query.type_id ? parseInt(query.type_id) : null
    };
    
    const subTypes = await getSubTypesByUserId(userId, options);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ subTypes }));
  } catch (error) {
    console.error('Get sub types error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during sub types retrieval' }));
  }
}

// Handle creating a sub type
async function handleCreateSubType(req, res, userId) {
  try {
    const { name, type_id } = req.body;
    
    if (!name) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Sub type name is required' }));
    }
    
    if (!type_id) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Task type ID is required' }));
    }
    
    // Check if sub type with same name already exists for this user and type
    const existingSubType = await getSubTypeByName(name, userId, type_id);
    if (existingSubType) {
      res.writeHead(409, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Sub type with this name already exists for this task type' }));
    }
    
    const subType = {
      name,
      type_id,
      user_id: userId
    };
    
    const newSubType = await createSubType(subType);
    
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ subType: newSubType }));
  } catch (error) {
    console.error('Create sub type error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during sub type creation' }));
  }
}

// Handle getting a single sub type
async function handleGetSubType(req, res, subTypeId, userId) {
  try {
    const subType = await getSubTypeById(subTypeId);
    
    // Check if the sub type belongs to the authenticated user
    if (!subType || subType.user_id !== userId) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Sub type not found' }));
    }
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ subType }));
  } catch (error) {
    console.error('Get sub type error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during sub type retrieval' }));
  }
}

// Handle updating a sub type
async function handleUpdateSubType(req, res, subTypeId, userId) {
  try {
    const { name, type_id } = req.body;
    
    if (!name) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Sub type name is required' }));
    }
    
    if (!type_id) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Task type ID is required' }));
    }
    
    // Check if another sub type with the same name already exists for this user and type
    const existingSubType = await getSubTypeByName(name, userId, type_id);
    if (existingSubType && existingSubType.id !== subTypeId) {
      res.writeHead(409, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Sub type with this name already exists for this task type' }));
    }
    
    const subType = {
      name,
      type_id
    };
    
    const success = await updateSubType(subTypeId, subType);
    
    if (!success) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Sub type not found' }));
    }
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Sub type updated successfully' }));
  } catch (error) {
    console.error('Update sub type error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during sub type update' }));
  }
}

// Handle updating a sub type description
async function handleUpdateSubTypeDescription(req, res, subTypeId, userId) {
  try {
    const { description } = req.body;

    // Verify the sub type belongs to the authenticated user
    const subType = await getSubTypeById(subTypeId);

    if (!subType || subType.user_id !== userId) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Sub type not found' }));
    }

    const success = await updateSubTypeDescription(subTypeId, description);

    if (!success) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Sub type not found' }));
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Sub type description updated successfully' }));
  } catch (error) {
    console.error('Update sub type description error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during sub type description update' }));
  }
}

// Handle deleting a sub type
async function handleDeleteSubType(req, res, subTypeId, userId) {
  try {
    const success = await deleteSubType(subTypeId);

    if (!success) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Sub type not found' }));
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Sub type deleted successfully' }));
  } catch (error) {
    console.error('Delete sub type error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during sub type deletion' }));
  }
}

module.exports = subTypeRoutes;