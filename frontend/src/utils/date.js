/**
 * Utility functions for date formatting with proper timezone handling
 */

// Format date as a user-friendly string in local timezone with explicit timezone info
export const formatDate = (dateString, timezone = null) => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true // Use 12-hour format for better readability
    };
    
    // Add timezone option if specified
    if (timezone) {
      options.timeZone = timezone;
    }
    
    return date.toLocaleString([], options);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

// Format date as date only (no time) in local timezone
export const formatDateOnly = (dateString, timezone = null) => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    };
    
    // Add timezone option if specified
    if (timezone) {
      options.timeZone = timezone;
    }
    
    return date.toLocaleDateString([], options);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

// Format date as time only in local timezone
export const formatTimeOnly = (dateString, timezone = null) => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    const options = {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    };
    
    // Add timezone option if specified
    if (timezone) {
      options.timeZone = timezone;
    }
    
    return date.toLocaleTimeString([], options);
  } catch (error) {
    console.error('Error formatting time:', error);
    return 'Invalid Date';
  }
};

// Specific formatting for Manila timezone (UTC+8)
export const formatDateManila = (dateString) => {
  return formatDate(dateString, 'Asia/Manila');
};

export const formatDateOnlyManila = (dateString) => {
  return formatDateOnly(dateString, 'Asia/Manila');
};

// Format date in the specific format: "Oct 26, 2025, 08:40:00 PM"
export const formatToLocalDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    // Get the components in local time
    const month = date.toLocaleString('default', { month: 'short' });
    const day = date.getDate();
    const year = date.getFullYear();
    let hour = date.getHours();
    const minute = date.getMinutes().toString().padStart(2, '0');
    const second = date.getSeconds().toString().padStart(2, '0');
    
    // Convert to 12-hour format
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    hour = hour ? hour : 12; // 0 should be 12
    
    return `${month} ${day}, ${year}, ${hour.toString().padStart(2, '0')}:${minute}:${second} ${ampm}`;
  } catch (error) {
    console.error('Error formatting local date:', error);
    return 'Invalid Date';
  }
};

// Parse the display format "Oct 27, 2025, 10:12:00 PM" back to ISO format for datetime-local input
export const parseFormattedDateTime = (displayDate) => {
  if (!displayDate) return '';
  
  // Parse the display format: "Oct 27, 2025, 10:12:00 PM"
  // Create a date object from this string
  const date = new Date(displayDate);
  
  // Check if the date is valid
  if (isNaN(date.getTime())) {
    console.error('Invalid date string:', displayDate);
    return '';
  }
  
  // Format to YYYY-MM-DDTHH:mm (format expected by datetime-local input)
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// Format creation date to show exact local time with explicit timezone info
export const formatCreationDateTime = (dateString, timezone = null) => {
  if (!dateString) return 'N/A';

  try {
    const date = new Date(dateString);
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }

    const options = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZoneName: 'short' // Include timezone abbreviation
    };

    // Add timezone option if specified
    if (timezone) {
      options.timeZone = timezone;
    }

    return date.toLocaleString([], options);
  } catch (error) {
    console.error('Error formatting creation date:', error);
    return 'Invalid Date';
  }
};

// Format date as "Month DD, YYYY, DayOfWeek" (e.g., "February 02, 2026, Monday")
export const formatFullDateWithDay = (dateString) => {
  if (!dateString) return 'N/A';

  try {
    const date = new Date(dateString);
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }

    // Get the full month name
    const month = date.toLocaleString('en-US', { month: 'long' });
    // Get the day with leading zero if needed
    const day = date.getDate().toString().padStart(2, '0');
    // Get the full year
    const year = date.getFullYear();
    // Get the day of the week
    const dayOfWeek = date.toLocaleString('en-US', { weekday: 'long' });

    return `${month} ${day}, ${year}, ${dayOfWeek}`;
  } catch (error) {
    console.error('Error formatting full date with day:', error);
    return 'Invalid Date';
  }
};