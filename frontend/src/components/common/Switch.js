import React from 'react';
import PropTypes from 'prop-types';

const Switch = ({ 
  checked, 
  onChange, 
  label, 
  id,
  disabled = false,
  ...props 
}) => {
  return (
    <div className="flex items-center">
      <label htmlFor={id} className="flex items-center cursor-pointer">
        <div className="relative">
          <input
            type="checkbox"
            id={id}
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            className="sr-only"
            {...props}
          />
          <div className={`block w-10 h-6 rounded-full ${
            disabled 
              ? 'bg-border-light dark:bg-border-dark' 
              : checked 
                ? 'bg-primary-500 dark:bg-primary-400' 
                : 'bg-border-light dark:bg-border-dark'
          }`}></div>
          <div className={`absolute left-1 top-1 bg-white dark:bg-surface-dark w-4 h-4 rounded-full transition-transform ${
            checked ? 'transform translate-x-4' : ''
          }`}></div>
        </div>
        {label && (
          <div className={`ml-3 text-sm font-medium ${
            disabled 
              ? 'text-text-secondary-light dark:text-text-secondary-dark' 
              : 'text-text-light dark:text-text-dark'
          }`}>
            {label}
          </div>
        )}
      </label>
    </div>
  );
};

Switch.propTypes = {
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func,
  label: PropTypes.string,
  id: PropTypes.string.isRequired,
  disabled: PropTypes.bool
};

export default Switch;