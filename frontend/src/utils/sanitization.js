// Client-side input sanitization utilities

// Sanitize string input to prevent XSS attacks
export function sanitizeString(str) {
  if (typeof str !== 'string') {
    return str;
  }
  
  // Remove any script tags and other potentially dangerous content
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/on\w+="[^"]*"/gi, '') // Remove event handlers like onclick, onload, etc.
    .replace(/on\w+='[^']*'/gi, '') // Remove event handlers with single quotes
    .replace(/on\w+=\w+/gi, '') // Remove event handlers without quotes
    .trim();
}

// Sanitize HTML content (more permissive than sanitizeString)
export function sanitizeHTML(html) {
  if (typeof html !== 'string') {
    return html;
  }
  
  // Allow only safe HTML tags
  const allowedTags = /<(?!\/?(b|strong|i|em|u|s|p|br|div|span|ul|ol|li|h[1-6]|blockquote|code|pre)(\s[^>]*)?>)[^>]*>/gi;
  return html
    .replace(allowedTags, '')
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/on\w+="[^"]*"/gi, '') // Remove event handlers
    .replace(/on\w+='[^']*'/gi, '') // Remove event handlers with single quotes
    .replace(/on\w+=\w+/gi, ''); // Remove event handlers without quotes
}

// Sanitize URL
export function sanitizeURL(url) {
  if (typeof url !== 'string') {
    return url;
  }
  
  try {
    // Use URL constructor to validate and normalize the URL
    const parsedUrl = new URL(url);
    
    // Only allow http and https protocols
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return '';
    }
    
    return parsedUrl.toString();
  } catch (error) {
    // If URL parsing fails, return empty string
    return '';
  }
}

// Deep sanitize an object or array
export function sanitizeInput(input) {
  if (typeof input === 'string') {
    return sanitizeString(input);
  } else if (Array.isArray(input)) {
    return input.map(item => sanitizeInput(item));
  } else if (input !== null && typeof input === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(input)) {
      // Skip __proto__ and constructor properties to prevent prototype pollution
      if (key === '__proto__' || key === 'constructor') {
        continue;
      }
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  return input;
}

// Sanitize form data before submission
export function sanitizeFormData(formData) {
  const sanitizedData = {};
  
  for (const [key, value] of Object.entries(formData)) {
    // Skip __proto__ and constructor properties to prevent prototype pollution
    if (key === '__proto__' || key === 'constructor') {
      continue;
    }
    
    if (typeof value === 'string') {
      sanitizedData[key] = sanitizeString(value);
    } else if (Array.isArray(value)) {
      sanitizedData[key] = value.map(item => sanitizeInput(item));
    } else if (value !== null && typeof value === 'object') {
      sanitizedData[key] = sanitizeInput(value);
    } else {
      sanitizedData[key] = value;
    }
  }
  
  return sanitizedData;
}

export default {
  sanitizeString,
  sanitizeHTML,
  sanitizeURL,
  sanitizeInput,
  sanitizeFormData
};