const url = require('url');
const { jsonParser, authenticateToken } = require('../middleware/auth');
const { validateEvent } = require('../middleware/validation');
const {
  createEvent,
  getEventById,
  getEventsByUserId,
  getEventsForCalendar,
  updateEvent,
  deleteEvent,
  getEventStats
} = require('../models/Event');

// Import database utilities to run notification creation queries directly
const { runQuery } = require('../utils/database');

// Handle event routes
function eventRoutes(req, res, parsedUrl) {
  const path = parsedUrl.pathname;
  const method = req.method;
  
  console.log(`Event route handler called - Method: ${method}, Path: ${path}, Full URL: ${req.url}`);
  
  // Extract event ID from URL if it exists
  const pathParts = path.split('/');
  const eventId = pathParts.length > 3 ? parseInt(pathParts[3]) : null;
  console.log(`Parsed eventId: ${eventId} from pathParts:`, pathParts);
  
  console.log(`About to call jsonParser for path: ${path}`);
  
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
        if (method === 'GET' && path === '/api/events') {
          console.log('Route matched: GET /api/events');
          await handleGetEvents(req, res, req.user.id, parsedUrl.query);
        } else if (method === 'POST' && path === '/api/events') {
          console.log('Route matched: POST /api/events');
          await handleCreateEvent(req, res, req.user.id);
        } else if (method === 'GET' && path === `/api/events/${eventId}`) {
          console.log(`Route matched: GET /api/events/${eventId}`);
          await handleGetEvent(req, res, eventId, req.user.id);
        } else if (method === 'PUT' && path === `/api/events/${eventId}`) {
          console.log(`Route matched: PUT /api/events/${eventId}`);
          await handleUpdateEvent(req, res, eventId, req.user.id);
        } else if (method === 'DELETE' && path === `/api/events/${eventId}`) {
          console.log(`Route matched: DELETE /api/events/${eventId}`);
          await handleDeleteEvent(req, res, eventId, req.user.id);
        } else if (method === 'GET' && path === '/api/events/calendar') {
          console.log('Route matched: GET /api/events/calendar');
          await handleGetCalendarEvents(req, res, req.user.id, parsedUrl.query);
        } else if (method === 'GET' && path === '/api/events/stats') {
          console.log('Route matched: GET /api/events/stats');
          await handleGetEventStats(req, res, req.user.id);
        } else if (method === 'GET' && path === '/api/events/upcoming') {
          console.log('Route matched: GET /api/events/upcoming');
          await handleGetUpcomingEvents(req, res, req.user.id, parsedUrl.query);
        } else {
          console.log(`Route not found in event routes. Method: ${method}, Path: ${path}, EventId: ${eventId}`);
          // Route not found
          if (!res.headersSent) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Route not found' }));
          }
        }
      } catch (error) {
        console.error(`Error in event route handler for ${method} ${path}:`, error);
        console.error('Error stack:', error.stack);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Internal server error in event route handler' }));
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
  console.log(`Event route handler setup completed for: ${method} ${path}`);
}

// Handle getting events
async function handleGetEvents(req, res, userId, query) {
  try {
    // Parse query parameters for filtering and pagination
    const options = {
      start_date: query.start_date || null,
      end_date: query.end_date || null,
      limit: query.limit ? parseInt(query.limit) : null, // Changed from 10 to null to get all events
      offset: query.offset ? parseInt(query.offset) : 0
    };
    
    const events = await getEventsByUserId(userId, options);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ events, total: events.length })); // In a real app, you'd return actual total count
  } catch (error) {
    console.error('Get events error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during events retrieval' }));
  }
}

// Handle getting calendar events
async function handleGetCalendarEvents(req, res, userId, query) {
  try {
    const { start_date, end_date } = query;
    
    if (!start_date || !end_date) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'start_date and end_date are required for calendar view' }));
    }
    
    const events = await getEventsForCalendar(userId, start_date, end_date);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ events }));
  } catch (error) {
    console.error('Get calendar events error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during calendar events retrieval' }));
  }
}

// Handle creating an event
async function handleCreateEvent(req, res, userId) {
  try {
    const {
      title,
      description,
      start_date,
      end_date,
      is_whole_day,
      category,
      category_id,  // Include category_id
      event_type_id, // Include event_type_id
      location,     // Include location
      color_class,  // Include color_class for randomized background colors
      status        // Include status
    } = req.body;

    // Validate required fields
    const eventData = { title, description, start_date, end_date, is_whole_day, category, category_id, event_type_id, location, status };
    const validationErrors = validateEvent(eventData);
    if (validationErrors.length > 0) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: validationErrors.join(', ') }));
    }

    // Ensure user_id is set to the authenticated user
    const event = {
      title,
      description: description || null,
      start_date,
      end_date,
      is_whole_day: is_whole_day ? 1 : 0, // Convert to integer for SQLite
      category: category || null,
      category_id: category_id || null,  // Include category_id
      event_type_id: event_type_id || null, // Include event_type_id
      location: location || null,       // Include location
      color_class: color_class || null, // Include color_class for randomized background colors
      status: status || null,           // Include status
      user_id: userId
    };

    const newEvent = await createEvent(event);

    // Create notification for new event
    try {
      const notificationSql = `
        INSERT INTO notifications (title, message, type, user_id, related_event_id)
        VALUES (?, ?, ?, ?, ?)
      `;
      const notificationParams = [
        'New Event Created',
        `Event "${title}" has been created successfully`,
        'info',
        userId,
        newEvent.id
      ];

      await runQuery(notificationSql, notificationParams);
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError);
      // Don't fail the whole request if notification creation fails
    }

    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ event: newEvent }));
  } catch (error) {
    console.error('Create event error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during event creation' }));
  }
}

// Handle getting a single event
async function handleGetEvent(req, res, eventId, userId) {
  try {
    const event = await getEventById(eventId);
    
    // Check if the event belongs to the authenticated user
    if (!event || event.user_id !== userId) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Event not found' }));
    }
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ event }));
  } catch (error) {
    console.error('Get event error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during event retrieval' }));
  }
}

// Handle updating an event
async function handleUpdateEvent(req, res, eventId, userId) {
  try {
    const {
      title,
      description,
      start_date,
      end_date,
      is_whole_day,
      category,
      category_id,  // Include category_id
      event_type_id, // Include event_type_id
      location,     // Include location
      status        // Include status
    } = req.body;

    // Validate fields if provided
    const eventData = { title, description, start_date, end_date, is_whole_day, category, category_id, event_type_id, location, status };
    const validationErrors = validateEvent(eventData);
    if (validationErrors.some(error => error.includes('required'))) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: validationErrors.join(', ') }));
    }

    const event = {
      title: title !== undefined ? title : undefined,
      description: description !== undefined ? description : undefined,
      start_date: start_date !== undefined ? start_date : undefined,
      end_date: end_date !== undefined ? end_date : undefined,
      is_whole_day: is_whole_day !== undefined ? (is_whole_day ? 1 : 0) : undefined,
      category: category !== undefined ? category : undefined,
      category_id: category_id !== undefined ? category_id : undefined,
      event_type_id: event_type_id !== undefined ? event_type_id : undefined,
      location: location !== undefined ? location : undefined,
      status: status !== undefined ? status : undefined
    };

    // Get the event before update to use its title in the notification
    const oldEvent = await getEventById(eventId);

    const success = await updateEvent(eventId, event);

    if (!success) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Event not found' }));
    }

    // Create notification for event update
    try {
      const notificationSql = `
        INSERT INTO notifications (title, message, type, user_id, related_event_id)
        VALUES (?, ?, ?, ?, ?)
      `;
      const notificationParams = [
        'Event Updated',
        `Event "${oldEvent?.title || 'untitled'}" has been updated`,
        'info',
        userId,
        eventId
      ];

      await runQuery(notificationSql, notificationParams);
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError);
      // Don't fail the whole request if notification creation fails
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Event updated successfully' }));
  } catch (error) {
    console.error('Update event error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during event update' }));
  }
}

// Handle deleting an event
async function handleDeleteEvent(req, res, eventId, userId) {
  try {
    // Get the event before deletion to use its title in the notification
    const event = await getEventById(eventId);

    const success = await deleteEvent(eventId);

    if (!success) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Event not found' }));
    }

    // Create notification for event deletion
    try {
      const notificationSql = `
        INSERT INTO notifications (title, message, type, user_id, related_event_id)
        VALUES (?, ?, ?, ?, ?)
      `;
      const notificationParams = [
        'Event Deleted',
        `Event "${event?.title || 'untitled'}" has been deleted`,
        'info',
        userId,
        eventId
      ];

      await runQuery(notificationSql, notificationParams);
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError);
      // Don't fail the whole request if notification creation fails
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Event deleted successfully' }));
  } catch (error) {
    console.error('Delete event error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during event deletion' }));
  }
}

// Handle getting event statistics
async function handleGetEventStats(req, res, userId) {
  console.log('handleGetEventStats called with userId:', userId);
  
  // Validate userId
  if (!userId) {
    console.error('Invalid userId for event stats:', userId);
    res.writeHead(401, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Unauthorized: Invalid user session' }));
  }
  
  try {
    const stats = await getEventStats(userId);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ stats }));
  } catch (error) {
    console.error('Get event stats error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during event stats retrieval' }));
  }
}

// Handle getting upcoming events
async function handleGetUpcomingEvents(req, res, userId, query) {
  try {
    // Parse query parameters for filtering
    const options = {
      start_date: query.start_date || new Date().toISOString(), // From today by default
      end_date: query.end_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Next 7 days by default
      limit: query.limit ? parseInt(query.limit) : 5, // Default to 5 events
      offset: query.offset ? parseInt(query.offset) : 0
    };
    
    const events = await getEventsByUserId(userId, options);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      events: events.slice(0, options.limit), // Limit the results to the requested limit
      total: events.length
    }));
  } catch (error) {
    console.error('Get upcoming events error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error during upcoming events retrieval' }));
  }
}

module.exports = eventRoutes;