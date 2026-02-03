import { useCallback } from 'react';
import { sanitizeString, sanitizeHTML, sanitizeURL, sanitizeInput, sanitizeFormData } from '../utils/sanitization';

// Custom hook for input sanitization
export function useSanitization() {
  // Sanitize string input
  const sanitizeText = useCallback((str) => {
    return sanitizeString(str);
  }, []);

  // Sanitize HTML content
  const sanitizeHtmlContent = useCallback((html) => {
    return sanitizeHTML(html);
  }, []);

  // Sanitize URL
  const sanitizeUrl = useCallback((url) => {
    return sanitizeURL(url);
  }, []);

  // Sanitize form data
  const sanitizeForm = useCallback((formData) => {
    return sanitizeFormData(formData);
  }, []);

  // Sanitize any input
  const sanitizeAny = useCallback((input) => {
    return sanitizeInput(input);
  }, []);

  return {
    sanitizeText,
    sanitizeHtmlContent,
    sanitizeUrl,
    sanitizeForm,
    sanitizeAny
  };
}