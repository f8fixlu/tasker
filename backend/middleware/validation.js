const { db } = require('../config/database');
const validator = require('validator'); // This will need to be installed

// Sanitization utilities
function sanitizeString(str) {
  if (typeof str !== 'string') {
    return str;
  }
  // Remove any script tags and other potentially dangerous content
  return validator.escape(validator.stripTags(str.trim()));
}

function sanitizeInput(input) {
  if (typeof input === 'string') {
    return sanitizeString(input);
  } else if (Array.isArray(input)) {
    return input.map(item => sanitizeInput(item));
  } else if (input !== null && typeof input === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  return input;
}

// Validation utilities
function validateEmail(email) {
  if (typeof email !== 'string') return false;
  return validator.isEmail(email.trim());
}

function validateRequiredFields(data, requiredFields) {
  const errors = [];
  
  for (const field of requiredFields) {
    if (!data[field] || data[field].toString().trim() === '') {
      errors.push(`${field} is required`);
    }
  }
  
  return errors;
}

// Task validation
function validateTask(task) {
  const errors = [];
  
  if (!task.title || task.title.trim().length === 0) {
    errors.push('Task title is required');
  } else if (task.title.length > 255) {
    errors.push('Task title must be less than 255 characters');
  } else if (!validator.isLength(task.title.trim(), { min: 1, max: 255 })) {
    errors.push('Task title length is invalid');
  }
  
  if (task.description && task.description.length > 1000) {
    errors.push('Task description must be less than 1000 characters');
  }
  
  if (task.task_date && isNaN(Date.parse(task.task_date))) {
    errors.push('Invalid task date format');
  }

  if (task.due_date && isNaN(Date.parse(task.due_date))) {
    errors.push('Invalid due date format');
  }

  if (task.quantity && (isNaN(task.quantity) || task.quantity < 1 || task.quantity > 1000)) {
    errors.push('Quantity must be a positive number between 1 and 1000');
  }
  
  if (task.priority && !['Low', 'Medium', 'High'].includes(task.priority)) {
    errors.push('Priority must be Low, Medium, or High');
  }
  
  if (task.status && !['Pending', 'In Progress', 'Completed', 'Overdue', 'Archived'].includes(task.status)) {
    errors.push('Status must be Pending, In Progress, Completed, Overdue, or Archived');
  }
  
  // Validate numeric IDs
  if (task.category_id && (isNaN(task.category_id) || task.category_id <= 0)) {
    errors.push('Category ID must be a positive number');
  }
  
  if (task.type_id && (isNaN(task.type_id) || task.type_id <= 0)) {
    errors.push('Task type ID must be a positive number');
  }
  
  if (task.sub_type_id && (isNaN(task.sub_type_id) || task.sub_type_id <= 0)) {
    errors.push('Sub type ID must be a positive number');
  }
  
  return errors;
}

// Event validation
function validateEvent(event) {
  const errors = [];
  
  if (!event.title || event.title.trim().length === 0) {
    errors.push('Event title is required');
  } else if (event.title.length > 255) {
    errors.push('Event title must be less than 255 characters');
  } else if (!validator.isLength(event.title.trim(), { min: 1, max: 255 })) {
    errors.push('Event title length is invalid');
  }
  
  if (event.description && event.description.length > 1000) {
    errors.push('Event description must be less than 1000 characters');
  }
  
  if (!event.start_date || isNaN(Date.parse(event.start_date))) {
    errors.push('Valid start date is required');
  }
  
  if (!event.end_date || isNaN(Date.parse(event.end_date))) {
    errors.push('Valid end date is required');
  }
  
  if (event.start_date && event.end_date && new Date(event.start_date) > new Date(event.end_date)) {
    errors.push('End date must be after start date');
  }
  
  // Validate numeric IDs
  if (event.category_id && (isNaN(event.category_id) || event.category_id <= 0)) {
    errors.push('Category ID must be a positive number');
  }
  
  return errors;
}

// Category validation
function validateCategory(category) {
  const errors = [];

  if (!category.name || category.name.trim().length === 0) {
    errors.push('Category name is required');
  } else if (category.name.length > 100) {
    errors.push('Category name must be less than 100 characters');
  } else if (!validator.isLength(category.name.trim(), { min: 1, max: 100 })) {
    errors.push('Category name length is invalid');
  }

  if (category.color && !validator.isHexColor(category.color)) {
    errors.push('Category color must be a valid hex color code');
  }

  return errors;
}

// User validation
function validateUser(user) {
  const errors = [];
  
  if (!user.full_name || user.full_name.trim().length === 0) {
    errors.push('Full name is required');
  } else if (user.full_name.length > 255) {
    errors.push('Full name must be less than 255 characters');
  } else if (!validator.isLength(user.full_name.trim(), { min: 1, max: 255 })) {
    errors.push('Full name length is invalid');
  }
  
  if (!user.email || !validateEmail(user.email)) {
    errors.push('Valid email is required');
  } else if (!validator.isLength(user.email.trim(), { min: 5, max: 255 })) {
    errors.push('Email length is invalid');
  }
  
  if (!user.password || user.password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  } else if (user.password.length > 128) {
    errors.push('Password must be less than 128 characters');
  } else if (!validator.isStrongPassword(user.password, {
    minLength: 6,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 0,
    returnScore: false
  })) {
    errors.push('Password must contain at least one uppercase letter, one lowercase letter, and one number');
  }
  
  return errors;
}

module.exports = {
  validateEmail,
  validateRequiredFields,
  validateTask,
  validateEvent,
  validateCategory,
  validateUser,
  sanitizeInput,
  sanitizeString
};