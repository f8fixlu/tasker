import React from 'react';
import PropTypes from 'prop-types';

const Input = React.forwardRef(({ 
  label, 
  id, 
  type = 'text', 
  placeholder, 
  value, 
  onChange, 
  error, 
  required = false, 
  className = '',
  ...props 
}, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
          {label}
        </label>
      )}
      <input
        id={id}
        ref={ref}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
          (type === 'date' || type === 'time' || type === 'datetime-local')
            ? '[color-scheme:light] dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:text-white dark:[&::-webkit-calendar-picker-indicator]:text-white border-2 border-gray-300 dark:border-gray-600'
            : ''
        } ${
          error
            ? 'border-danger-500 focus:ring-danger-500 focus:border-danger-500 dark:bg-red-900/20 dark:text-white dark:border-danger-500 dark:focus:ring-danger-500 dark:focus:border-danger-500'
            : 'border-border-light dark:border-border-dark dark:bg-surface-dark dark:text-text-dark focus:border-primary-500 dark:focus:border-primary-400'
        } ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-danger-600">{error}</p>}
    </div>
  );
});

Input.propTypes = {
  label: PropTypes.string,
  id: PropTypes.string.isRequired,
  type: PropTypes.string,
  placeholder: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func,
  error: PropTypes.string,
  required: PropTypes.bool,
  className: PropTypes.string
};

Input.displayName = 'Input';

export default Input;