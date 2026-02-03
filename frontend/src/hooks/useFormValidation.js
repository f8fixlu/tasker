import { useState, useCallback } from 'react';
import { validateTask, validateEvent, validateUser } from './validation';

// Custom hook for form validation
export function useFormValidation(initialState = {}) {
  const [values, setValues] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Handle input changes
  const handleChange = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  }, [errors]);

  // Handle input blur (mark as touched)
  const handleBlur = useCallback((name) => {
    setTouched(prev => ({ ...prev, [name]: true }));
  }, []);

  // Validate the entire form
  const validateForm = useCallback((formData = values, formType = 'task') => {
    let validationResult;
    
    switch (formType) {
      case 'task':
        validationResult = validateTask(formData);
        break;
      case 'event':
        validationResult = validateEvent(formData);
        break;
      case 'user':
        validationResult = validateUser(formData);
        break;
      default:
        validationResult = { isValid: true, errors: {} };
    }
    
    setErrors(validationResult.errors);
    return validationResult.isValid;
  }, [values]);

  // Reset the form
  const resetForm = useCallback(() => {
    setValues(initialState);
    setErrors({});
    setTouched({});
  }, [initialState]);

  // Check if a field has an error
  const hasError = useCallback((name) => {
    return touched[name] && errors[name];
  }, [touched, errors]);

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateForm,
    resetForm,
    hasError,
    setErrors
  };
}