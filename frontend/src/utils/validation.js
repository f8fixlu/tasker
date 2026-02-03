// Client-side validation utilities

// Email validation
export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

// Required field validation
export function validateRequired(value) {
  return value !== undefined && value !== null && value !== '';
}

// String length validation
export function validateStringLength(value, minLength = 0, maxLength = Infinity) {
  if (typeof value !== 'string') return false;
  return value.length >= minLength && value.length <= maxLength;
}

// Password validation
export function validatePassword(password) {
  if (typeof password !== 'string') return false;
  // At least 6 characters, at least one uppercase, one lowercase, and one number
  const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
  return re.test(password) && password.length <= 128;
}

// Number validation
export function validateNumber(value, min = -Infinity, max = Infinity) {
  const num = Number(value);
  return !isNaN(num) && num >= min && num <= max;
}

// Date validation
export function validateDate(dateString) {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

// Task validation
export function validateTask(task) {
  const errors = {};

  if (!validateRequired(task.title)) {
    errors.title = 'Task title is required';
  } else if (!validateStringLength(task.title, 1, 255)) {
    errors.title = 'Task title must be between 1 and 255 characters';
  }

  if (task.description && !validateStringLength(task.description, 0, 1000)) {
    errors.description = 'Task description must be less than 1000 characters';
  }

  if (task.due_date && !validateDate(task.due_date)) {
    errors.due_date = 'Invalid due date format';
  }

  if (task.quantity && !validateNumber(task.quantity, 1, 1000)) {
    errors.quantity = 'Quantity must be a positive number between 1 and 1000';
  }

  if (task.priority && !['Low', 'Medium', 'High'].includes(task.priority)) {
    errors.priority = 'Priority must be Low, Medium, or High';
  }

  if (task.status && !['Pending', 'In Progress', 'Completed'].includes(task.status)) {
    errors.status = 'Status must be Pending, In Progress, or Completed';
  }

  if (task.category_id && !validateNumber(task.category_id, 1)) {
    errors.category_id = 'Category ID must be a positive number';
  }

  if (task.type_id && !validateNumber(task.type_id, 1)) {
    errors.type_id = 'Task type ID must be a positive number';
  }

  if (task.sub_type_id && !validateNumber(task.sub_type_id, 1)) {
    errors.sub_type_id = 'Sub type ID must be a positive number';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

// Event validation
export function validateEvent(event) {
  const errors = {};

  if (!validateRequired(event.title)) {
    errors.title = 'Event title is required';
  } else if (!validateStringLength(event.title, 1, 255)) {
    errors.title = 'Event title must be between 1 and 255 characters';
  }

  if (event.description && !validateStringLength(event.description, 0, 1000)) {
    errors.description = 'Event description must be less than 1000 characters';
  }

  if (!validateRequired(event.start_date)) {
    errors.start_date = 'Start date is required';
  } else if (!validateDate(event.start_date)) {
    errors.start_date = 'Invalid start date format';
  }

  if (!validateRequired(event.end_date)) {
    errors.end_date = 'End date is required';
  } else if (!validateDate(event.end_date)) {
    errors.end_date = 'Invalid end date format';
  }

  if (validateDate(event.start_date) && validateDate(event.end_date) && 
      new Date(event.start_date) > new Date(event.end_date)) {
    errors.end_date = 'End date must be after start date';
  }

  if (event.category_id && !validateNumber(event.category_id, 1)) {
    errors.category_id = 'Category ID must be a positive number';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

// User validation
export function validateUser(user) {
  const errors = {};

  if (!validateRequired(user.full_name)) {
    errors.full_name = 'Full name is required';
  } else if (!validateStringLength(user.full_name, 1, 255)) {
    errors.full_name = 'Full name must be between 1 and 255 characters';
  }

  if (!validateRequired(user.email)) {
    errors.email = 'Email is required';
  } else if (!validateEmail(user.email)) {
    errors.email = 'Invalid email format';
  } else if (!validateStringLength(user.email, 5, 255)) {
    errors.email = 'Email must be between 5 and 255 characters';
  }

  if (!validateRequired(user.password)) {
    errors.password = 'Password is required';
  } else if (!validatePassword(user.password)) {
    errors.password = 'Password must be at least 6 characters with at least one uppercase letter, one lowercase letter, and one number';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

export default {
  validateEmail,
  validateRequired,
  validateStringLength,
  validatePassword,
  validateNumber,
  validateDate,
  validateTask,
  validateEvent,
  validateUser
};