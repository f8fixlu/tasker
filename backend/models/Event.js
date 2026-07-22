const { db } = require('../config/database');
const { runQuery, getRow, getAll } = require('../utils/database');

// Helper function to parse the formatted date string (e.g., "Oct 26, 2025, 08:40:00 PM") back to a date object
function parseFormattedDateString(dateString) {
  if (!dateString) return null;

  try {
    // Check if it's already an ISO string format
    if (dateString.includes('T') && dateString.includes('Z')) {
      return new Date(dateString);
    }

    // Check if it's the custom format "MMM DD, YYYY, HH:MM:SS AM/PM"
    const regex = /^(\w{3})\s(\d{1,2}),\s(\d{4}),\s(\d{1,2}):(\d{2}):(\d{2})\s(AM|PM)$/;
    const match = dateString.match(regex);

    if (match) {
      const [, monthStr, day, year, hour, minute, second, ampm] = match;

      // Convert month abbreviation to number
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = monthNames.indexOf(monthStr);

      if (month === -1) {
        console.error('Invalid month in formatted date string:', dateString);
        return null;
      }

      let hour24 = parseInt(hour);
      if (ampm === 'PM' && hour24 !== 12) {
        hour24 += 12;
      } else if (ampm === 'AM' && hour24 === 12) {
        hour24 = 0;
      }

      const date = new Date(parseInt(year), month, parseInt(day), hour24, parseInt(minute), parseInt(second));
      return date;
    } else {
      // If it's not the custom format, assume it's a standard date string that Date constructor can handle
      return new Date(dateString);
    }
  } catch (error) {
    console.error('Error parsing formatted date string:', error);
    return null;
  }
}

// Helper function to convert UTC date to local date format for display
function convertUTCToLocal(dateString) {
  if (!dateString) return null;

  try {
    // Parse the date string assuming it is in UTC format "YYYY-MM-DD HH:MM:SS"
    // Split the date and time parts
    const [datePart, timePart] = dateString.split(' ');
    if (!datePart || !timePart) {
      // If the format isn't as expected, try parsing as is
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return null;
      }
      // Use Manila timezone (UTC+8) to convert the time to local time
      const options = {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      };
      return date.toLocaleString('en-US', options);
    }

    // Parse as UTC by creating a Date object with UTC components
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes, seconds] = timePart.split(':').map(Number);

    // Create a Date object representing the UTC time
    const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));

    // Use Manila timezone (UTC+8) to convert the UTC time to local time
    const options = {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    };

    return utcDate.toLocaleString('en-US', options);
  } catch (error) {
    console.error('Error converting UTC to local date:', error);
    return null;
  }
}

// Event model

// Create a new event
async function createEvent(eventData) {
  const {
    title,
    description,
    start_date,
    end_date,
    is_whole_day,
    category,
    category_id,  // Use the category_id directly now
    event_type_id, // Add event_type_id field
    location,     // Add location field
    user_id,
    color_class,  // Add color_class field
    status        // Add status field
  } = eventData;

  // Convert dates to proper format for SQLite (UTC) if provided
  // SQLite stores dates as strings, so we'll use ISO format: YYYY-MM-DD HH:MM:SS
  let startDateUTC = null;
  let endDateUTC = null;

  if (start_date) {
    // Parse the date string, handling both ISO format and formatted display format
    const parsedDate = parseFormattedDateString(start_date);
    if (parsedDate && !isNaN(parsedDate.getTime())) {
      // Format to YYYY-MM-DD HH:MM:SS format for SQLite
      // toISOString() returns time in UTC, which is what we want
      startDateUTC = parsedDate.toISOString().slice(0, 19).replace('T', ' ');
    } else {
      console.error('Invalid start_date format:', start_date);
      throw new Error('Invalid start date format');
    }
  }

  if (end_date) {
    // Parse the date string, handling both ISO format and formatted display format
    const parsedDate = parseFormattedDateString(end_date);
    if (parsedDate && !isNaN(parsedDate.getTime())) {
      // Format to YYYY-MM-DD HH:MM:SS format for SQLite
      endDateUTC = parsedDate.toISOString().slice(0, 19).replace('T', ' ');
    } else {
      console.error('Invalid end_date format:', end_date);
      throw new Error('Invalid end date format');
    }
  }

  // Use the category_id if provided, otherwise it will be null
  const categoryIdValue = category_id || null;

  // Use event_type_id if provided, otherwise it will be null
  const eventTypeIdValue = event_type_id || null;

  // Use status if provided, otherwise default to 'Scheduled'
  const statusValue = status || 'Scheduled';

  // Use current UTC time for created_at
  const createdAtDate = new Date();
  const createdAt = createdAtDate.toISOString().slice(0, 19).replace('T', ' ');

  // More explicit parameter binding to ensure correctness
  const sql = `
    INSERT INTO events (
      title, description, start_date, end_date, is_whole_day, category_id, event_type_id, location, user_id, created_at, color_class, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [title, description, startDateUTC, endDateUTC, is_whole_day, categoryIdValue, eventTypeIdValue, location, user_id, createdAt, color_class, statusValue];

  console.log('Creating event with createdAt timestamp:', createdAt);
  console.log('Full parameters for event creation:', params);

  try {
    console.log('Executing create event query:', sql, params);
    const result = await runQuery(sql, params);
    console.log('Event created successfully with ID:', result.lastID);

    // Return the created event by fetching it to include properly formatted dates
    // and category name if applicable
    const createdEvent = await getEventById(result.lastID);
    console.log('Returning created event with full data:', createdEvent);
    return createdEvent;
  } catch (error) {
    console.error('Error creating event:', error);
    throw new Error(`Error creating event: ${error.message}`);
  }
}

// Get event by ID
async function getEventById(id) {
  const sql = `
    SELECT
      e.id, e.title, e.description, e.start_date, e.end_date,
      e.is_whole_day, e.category_id, e.event_type_id, e.location, e.user_id, e.created_at, e.updated_at, e.color_class, e.status,
      ec.name as category,
      et.name as event_type
    FROM events e
    LEFT JOIN event_categories ec ON e.category_id = ec.id
    LEFT JOIN event_types et ON e.event_type_id = et.id
    WHERE e.id = ?
  `;
  const params = [id];

  try {
    let event = await getRow(sql, params);
    if (event) {
      // Convert UTC dates to local time for display if event exists
      event.start_date = convertUTCToLocal(event.start_date);
      event.end_date = convertUTCToLocal(event.end_date);
      event.created_at = convertUTCToLocal(event.created_at);
      event.updated_at = convertUTCToLocal(event.updated_at);

      // Return category and event type names if they exist, otherwise null
      event.category = event.category || null;
      event.event_type = event.event_type || null;

      // Get attachments for this event
      const { getAttachmentsByEventId } = require('./Attachment');
      event.attachments = await getAttachmentsByEventId(id);
    }
    return event;
  } catch (error) {
    throw new Error(`Error fetching event: ${error.message}`);
  }
}

// Get events by user ID
async function getEventsByUserId(user_id, options = {}) {
  let sql = `
    SELECT
      e.id, e.title, e.description, e.start_date, e.end_date,
      e.is_whole_day, e.category_id, e.event_type_id, e.location, e.user_id, e.created_at, e.updated_at, e.color_class, e.status,
      ec.name as category,
      et.name as event_type
    FROM events e
    LEFT JOIN event_categories ec ON e.category_id = ec.id
    LEFT JOIN event_types et ON e.event_type_id = et.id
    WHERE e.user_id = ?
  `;

  const params = [user_id];

  // Add date range filter if provided
  if (options.start_date && options.end_date) {
    // Convert the start and end dates to ensure proper comparison
    // The dates are stored in the database in 'YYYY-MM-DD HH:MM:SS' format
    // Using SQLite datetime functions to handle timezone conversion consistently
    // Compare based on the date part after timezone conversion (as it appears to the user)
    sql += ` AND (DATE(e.start_date, 'localtime') >= DATE(?, 'localtime') AND DATE(e.start_date, 'localtime') <= DATE(?, 'localtime'))`;
    params.push(options.start_date, options.end_date);
  }

  // Handle category filters (dynamically fetch available categories)
  if (options.category_filters) {
    // Support both flat structure and nested structure {event: {...}}
    let selectedCategoryFilters;

    if (options.category_filters.event) {
      // Nested structure from reports: {event: {...}}
      selectedCategoryFilters = options.category_filters.event;
    } else {
      // Flat structure: {...}
      selectedCategoryFilters = options.category_filters;
    }

    const categoryIds = [];

    // Query for all available event categories from the database
    const categoryQuery = `SELECT id, name FROM event_categories`;
    const categoryResults = await getAll(categoryQuery, []);

    // Based on the boolean values in selectedCategoryFilters, include appropriate category IDs in the filter
    if (categoryResults && categoryResults.length > 0) {
      categoryResults.forEach(cat => {
        const catName = cat.name.toLowerCase();
        // Check if this category is enabled in the filters
        if (selectedCategoryFilters[catName]) {
          categoryIds.push(cat.id);
        }
      });

      // If we have matching categories, filter by them
      if (categoryIds.length > 0) {
        const placeholders = categoryIds.map(() => '?').join(',');
        sql += ` AND e.category_id IN (${placeholders})`;
        params.push(...categoryIds);
      } else {
        // Check if all available categories are explicitly set to false
        const allFalse = categoryResults.every(cat => !selectedCategoryFilters[cat.name.toLowerCase()]);
        if (allFalse) {
          // If all selected categories are false, we want no results
          sql += ` AND 1 = 0`; // This ensures no records match
        }
      }
    }
  }

  sql += ` ORDER BY e.start_date DESC`;

  // Add pagination
  if (options.limit) {
    sql += ` LIMIT ?`;
    params.push(options.limit);

    if (options.offset) {
      sql += ` OFFSET ?`;
      params.push(options.offset);
    }
  }

  try {
    let events = await getAll(sql, params);

    // Convert UTC dates to local time for all events
    events = events.map(event => ({
      ...event,
      start_date: convertUTCToLocal(event.start_date),
      end_date: convertUTCToLocal(event.end_date),
      created_at: convertUTCToLocal(event.created_at),
      updated_at: convertUTCToLocal(event.updated_at),
      category: event.category || null,
      event_type: event.event_type || null
    }));

    // Only fetch attachments if not skipped (dashboard doesn't need them)
    if (!options.skipAttachments) {
      const { getAttachmentsByEventId } = require('./Attachment');
      events = await Promise.all(events.map(async (event) => {
        const eventWithAttachments = { ...event };
        eventWithAttachments.attachments = await getAttachmentsByEventId(event.id);
        return eventWithAttachments;
      }));
    } else {
      // Add empty attachments array for consistency
      events = events.map(event => ({ ...event, attachments: [] }));
    }

    return events;
  } catch (error) {
    throw new Error(`Error fetching events: ${error.message}`);
  }
}

// Get events for calendar view (by date range)
async function getEventsForCalendar(user_id, start_date, end_date, options = {}) {
  const sql = `
    SELECT
      e.id, e.title, e.start_date, e.end_date, e.is_whole_day, e.description, e.status,
      e.category_id, e.event_type_id, e.location, e.color_class, ec.name as category, et.name as event_type
    FROM events e
    LEFT JOIN event_categories ec ON e.category_id = ec.id
    LEFT JOIN event_types et ON e.event_type_id = et.id
    WHERE e.user_id = ?
      AND (DATE(e.start_date, 'localtime') >= DATE(?, 'localtime') AND DATE(e.start_date, 'localtime') <= DATE(?, 'localtime'))
    ORDER BY e.start_date DESC
  `;

  const params = [
    user_id, start_date, end_date
  ];

  try {
    let events = await getAll(sql, params);

    if (options.skipAttachments) {
      events = events.map(event => ({
        ...event,
        start_date: convertUTCToLocal(event.start_date),
        end_date: convertUTCToLocal(event.end_date),
        category: event.category || null,
        event_type: event.event_type || null,
        attachments: []
      }));
      return events;
    }

    // Convert UTC dates to local time for all events and add attachments
    const { getAttachmentsByEventId } = require('./Attachment');

    events = await Promise.all(events.map(async (event) => {
      const eventWithDates = {
        ...event,
        start_date: convertUTCToLocal(event.start_date),
        end_date: convertUTCToLocal(event.end_date),
        category: event.category || null,
        event_type: event.event_type || null
      };

      // Add attachments for this event
      eventWithDates.attachments = await getAttachmentsByEventId(event.id);

      return eventWithDates;
    }));

    return events;
  } catch (error) {
    throw new Error(`Error fetching calendar events: ${error.message}`);
  }
}

// Update event
async function updateEvent(id, eventData) {
  const {
    title, description, start_date, end_date, is_whole_day, category, category_id, event_type_id, location, status
  } = eventData;

  // Convert dates to proper format for SQLite (UTC) if provided
  // SQLite stores dates as strings, so we'll use ISO format: YYYY-MM-DD HH:MM:SS
  let startDateUTC = undefined;
  let endDateUTC = undefined;

  if (start_date !== undefined) {
    if (start_date) {
      // Parse the date string, handling both ISO format and formatted display format
      const parsedDate = parseFormattedDateString(start_date);
      if (parsedDate && !isNaN(parsedDate.getTime())) {
        // Format to YYYY-MM-DD HH:MM:SS format for SQLite
        startDateUTC = parsedDate.toISOString().slice(0, 19).replace('T', ' ');
      } else {
        console.error('Invalid start_date format:', start_date);
        throw new Error('Invalid start date format');
      }
    } else {
      // If explicitly set to null, keep it as null
      startDateUTC = null;
    }
  }

  if (end_date !== undefined) {
    if (end_date) {
      // Parse the date string, handling both ISO format and formatted display format
      const parsedDate = parseFormattedDateString(end_date);
      if (parsedDate && !isNaN(parsedDate.getTime())) {
        // Format to YYYY-MM-DD HH:MM:SS format for SQLite
        endDateUTC = parsedDate.toISOString().slice(0, 19).replace('T', ' ');
      } else {
        console.error('Invalid end_date format:', end_date);
        throw new Error('Invalid end date format');
      }
    } else {
      // If explicitly set to null, keep it as null
      endDateUTC = null;
    }
  }

  // Determine which category_id value to use (now storing category_id directly)
  const categoryIdValue = category_id !== undefined ? category_id : null;

  // Determine which event_type_id value to use
  const eventTypeIdValue = event_type_id !== undefined ? event_type_id : null;

  // Determine which status value to use
  const statusValue = status !== undefined ? status : undefined;

  // Use current UTC time for updated_at
  const updatedAtDate = new Date();
  const updatedAt = updatedAtDate.toISOString().slice(0, 19).replace('T', ' ');

  // Use more specific parameter binding to ensure correctness
  let sql = `UPDATE events SET `;
  const params = [];

  // Build the SET clause and params array dynamically based on which fields are provided
  const setParts = [];
  if (title !== undefined) {
    setParts.push('title = ?');
    params.push(title);
  }
  if (description !== undefined) {
    setParts.push('description = ?');
    params.push(description);
  }
  if (start_date !== undefined) {
    setParts.push('start_date = ?');
    params.push(startDateUTC);
  }
  if (end_date !== undefined) {
    setParts.push('end_date = ?');
    params.push(endDateUTC);
  }
  if (is_whole_day !== undefined) {
    setParts.push('is_whole_day = ?');
    params.push(is_whole_day);
  }
  if (category_id !== undefined) {
    setParts.push('category_id = ?');
    params.push(categoryIdValue);
  }
  if (event_type_id !== undefined) {
    setParts.push('event_type_id = ?');
    params.push(eventTypeIdValue);
  }
  if (location !== undefined) {
    setParts.push('location = ?');
    params.push(location);
  }
  if (status !== undefined) {
    setParts.push('status = ?');
    params.push(statusValue);
  }

  // Always update updated_at
  setParts.push('updated_at = ?');
  params.push(updatedAt);

  sql += setParts.join(', ');
  sql += ` WHERE id = ?`;
  params.push(id);

  console.log('Updating event with updatedAt timestamp:', updatedAt);
  console.log('Full parameters for event update:', params);

  try {
    console.log('Executing update event query:', sql, params);
    const result = await runQuery(sql, params);
    console.log('Event updated successfully, changes:', result.changes);
    return result.changes > 0;
  } catch (error) {
    console.error('Error updating event:', error);
    throw new Error(`Error updating event: ${error.message}`);
  }
}

// Delete event
async function deleteEvent(id) {
  // First, get any attachments associated with this event to delete the files
  const { getAttachmentsByEventId, deleteAttachment } = require('./Attachment');
  
  try {
    const attachments = await getAttachmentsByEventId(id);
    
    // Delete each attachment file and record
    for (const attachment of attachments) {
      await deleteAttachment(attachment.id);
    }
  } catch (attachmentError) {
    console.error('Error deleting event attachments:', attachmentError);
    // Continue with event deletion even if attachment deletion fails
  }

  // Now delete the event
  const sql = 'DELETE FROM events WHERE id = ?';
  const params = [id];

  try {
    const result = await runQuery(sql, params);
    return result.changes > 0;
  } catch (error) {
    throw new Error(`Error deleting event: ${error.message}`);
  }
}

// Get event statistics for dashboard
async function getEventStats(user_id) {
  console.log('getEventStats called with user_id:', user_id);
  console.log('Type of user_id:', typeof user_id);
  
  try {
    // Validate user_id before proceeding
    if (!user_id) {
      throw new Error(`Invalid user_id: ${user_id}`);
    }
    
    // Check if user_id is a number
    if (isNaN(user_id) || parseInt(user_id) <= 0) {
      throw new Error(`Invalid user_id value: ${user_id}`);
    }
    
    console.log('Proceeding with valid user_id:', user_id);
    
    // Run all queries in parallel for better performance (was sequential before)
    const countSql = 'SELECT COUNT(*) as total_events FROM events WHERE user_id = ?';
    const completedCountSql = 'SELECT COUNT(*) as completed_events FROM events WHERE user_id = ? AND status = ?';
    
    // Use range comparisons instead of DATE() function to enable index usage
    const todaySql = `SELECT COUNT(*) as events_today FROM events 
                      WHERE user_id = ? 
                      AND start_date >= datetime('now', 'start of day', 'localtime')
                      AND start_date < datetime('now', '+1 day', 'start of day', 'localtime')`;
    
    // Use range comparisons instead of strftime() function to enable index usage
    const monthSql = `SELECT COUNT(*) as events_this_month FROM events 
                      WHERE user_id = ? 
                      AND start_date >= date('now', 'start of month', 'localtime')
                      AND start_date < date('now', '+1 month', 'start of month', 'localtime')`;
    
    // Execute all 4 queries in parallel
    const [countResult, completedCountResult, todayResult, monthResult] = await Promise.all([
      getRow(countSql, [user_id]),
      getRow(completedCountSql, [user_id, 'Completed']),
      getRow(todaySql, [user_id]),
      getRow(monthSql, [user_id])
    ]);
    
    console.log('Final event stats result:', {
      total_events: countResult.total_events || 0,
      completed_events: completedCountResult.completed_events || 0,
      events_today: todayResult.events_today || 0,
      events_this_month: monthResult.events_this_month || 0
    });
    
    return {
      total_events: countResult.total_events || 0,
      completed_events: completedCountResult.completed_events || 0,
      events_today: todayResult.events_today || 0,
      events_this_month: monthResult.events_this_month || 0
    };
  } catch (error) {
    console.error('Detailed error fetching event stats:', error);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    console.error('Error code:', error.code);
    console.error('Full error object:', error);
    // Let's log the specific error message that may contain SQLite error details
    if (error.errno) {
      console.error('SQLite error number:', error.errno);
    }
    throw new Error(`Error fetching event stats: ${error.message}`);
  }
}

module.exports = {
  createEvent,
  getEventById,
  getEventsByUserId,
  getEventsForCalendar,
  updateEvent,
  deleteEvent,
  getEventStats
};