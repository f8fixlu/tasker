const { jsonParser, authenticateToken } = require('../middleware/auth');
const {
  createEventType,
  getEventTypeById,
  getEventTypesByUserId,
  getEventTypesByCategoryId,
  updateEventType,
  deleteEventType,
  getEventTypeByNameAndUser
} = require('../models/EventType');

// Handle event type routes
function eventTypeRoutes(req, res, parsedUrl) {
  const path = parsedUrl.pathname;
  const method = req.method;

  console.log(`Event type route handler called - Method: ${method}, Path: ${path}, Full URL: ${req.url}`);

  // Extract event type ID from URL if it exists
  const pathParts = path.split('/');
  const eventTypeId = pathParts.length > 3 ? parseInt(pathParts[3]) : null;
  console.log(`Parsed eventTypeId: ${eventTypeId} from pathParts:`, pathParts);

  // Check if headers have already been sent (which would be an error condition)
  if (res.headersSent) {
    console.error('ERROR: Headers already sent before jsonParser!');
    return;
  }

  // Parse the request body
  try {
    jsonParser(req, res, async () => {
      console.log(`jsonParser completed, processing route matching - Method: ${method}, Path: ${path}`);

      // Double-check headers haven't been sent
      if (res.headersSent) {
        console.error('ERROR: Headers already sent before route matching!');
        return;
      }

      try {
        if (method === 'GET' && path === '/api/events/types') {
          console.log('Route matched: GET /api/events/types');
          await handleGetEventTypes(req, res, req.user.id, parsedUrl.query);
        } else if (method === 'POST' && path === '/api/events/types') {
          console.log('Route matched: POST /api/events/types');
          await handleCreateEventType(req, res, req.user.id);
        } else if (method === 'GET' && path === `/api/events/types/${eventTypeId}`) {
          console.log(`Route matched: GET /api/events/types/${eventTypeId}`);
          await handleGetEventType(req, res, eventTypeId, req.user.id);
        } else if (method === 'PUT' && path === `/api/events/types/${eventTypeId}`) {
          console.log(`Route matched: PUT /api/events/types/${eventTypeId}`);
          await handleUpdateEventType(req, res, eventTypeId, req.user.id);
        } else if (method === 'DELETE' && path === `/api/events/types/${eventTypeId}`) {
          console.log(`Route matched: DELETE /api/events/types/${eventTypeId}`);
          await handleDeleteEventType(req, res, eventTypeId, req.user.id);
        } else if (method === 'GET' && path === `/api/events/types/category/${eventTypeId}`) {
          console.log(`Route matched: GET /api/events/types/category/${eventTypeId}`);
          await handleGetEventTypesByCategory(req, res, eventTypeId, req.user.id);
        } else {
          console.log(`Route not found in event type routes. Method: ${method}, Path: ${path}, EventTypeId: ${eventTypeId}`);
          // Route not found
          if (!res.headersSent) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Route not found' }));
          }
        }
      } catch (error) {
        console.error(`Error in event type route handler for ${method} ${path}:`, error);
        console.error('Error stack:', error.stack);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Internal server error in event type route handler' }));
        }
      }
    });
  } catch (error) {
    console.error('Error in jsonParser middleware:', error);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Error parsing request' }));
    }
  }
}

// Handle getting event types
async function handleGetEventTypes(req, res, userId, query) {
  try {
    // Parse query parameters for filtering
    const category_id = query.category_id ? parseInt(query.category_id) : null;

    let eventTypes;
    if (category_id) {
      // Get event types by category
      eventTypes = await getEventTypesByCategoryId(category_id);
    } else {
      // Get all event types for user
      eventTypes = await getEventTypesByUserId(userId);
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ event_types: eventTypes }));
  } catch (error) {
    console.error('Get event types error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during event types retrieval' }));
  }
}

// Handle getting event types by category
async function handleGetEventTypesByCategory(req, res, categoryId, userId) {
  try {
    const eventTypes = await getEventTypesByCategoryId(categoryId);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ event_types: eventTypes }));
  } catch (error) {
    console.error('Get event types by category error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during event types retrieval by category' }));
  }
}

// Handle creating an event type
async function handleCreateEventType(req, res, userId) {
  try {
    const { name, category_id } = req.body;

    // Validate required fields
    if (!name || name.trim().length === 0) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Event type name is required' }));
    }

    // Check if event type with same name already exists for this user within the same category
    const existingType = await getEventTypeByNameAndUser(name.trim(), userId, category_id || null);
    if (existingType) {
      res.writeHead(409, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Event type with this name already exists in this category' }));
    }

    const eventType = {
      name: name.trim(),
      category_id: category_id || null,
      user_id: userId
    };

    const newEventType = await createEventType(eventType);

    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ event_type: newEventType }));
  } catch (error) {
    console.error('Create event type error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during event type creation' }));
  }
}

// Handle getting a single event type
async function handleGetEventType(req, res, eventTypeId, userId) {
  try {
    const eventType = await getEventTypeById(eventTypeId);

    // Check if the event type belongs to the authenticated user
    if (!eventType || eventType.user_id !== userId) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Event type not found' }));
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ event_type: eventType }));
  } catch (error) {
    console.error('Get event type error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during event type retrieval' }));
  }
}

// Handle updating an event type
async function handleUpdateEventType(req, res, eventTypeId, userId) {
  try {
    const { name, category_id } = req.body;

    // Validate fields if provided
    if (name !== undefined && name.trim().length === 0) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Event type name cannot be empty' }));
    }

    // Check if another event type with same name already exists for this user in the same category
    if (name !== undefined) {
      const categoryToCheck = category_id !== undefined ? category_id : null;
      const existingType = await getEventTypeByNameAndUser(name.trim(), userId, categoryToCheck);
      if (existingType && existingType.id !== eventTypeId) {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Event type with this name already exists in this category' }));
      }
    }

    const eventType = {
      name: name !== undefined ? name.trim() : undefined,
      category_id: category_id !== undefined ? category_id : undefined
    };

    const success = await updateEventType(eventTypeId, eventType);

    if (!success) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Event type not found' }));
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Event type updated successfully' }));
  } catch (error) {
    console.error('Update event type error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during event type update' }));
  }
}

// Handle deleting an event type
async function handleDeleteEventType(req, res, eventTypeId, userId) {
  try {
    // Check if the event type exists and belongs to the user
    const existingType = await getEventTypeById(eventTypeId);
    if (!existingType || existingType.user_id !== userId) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Event type not found' }));
    }

    const success = await deleteEventType(eventTypeId);

    if (!success) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Event type not found' }));
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Event type deleted successfully' }));
  } catch (error) {
    console.error('Delete event type error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during event type deletion' }));
  }
}

module.exports = eventTypeRoutes;