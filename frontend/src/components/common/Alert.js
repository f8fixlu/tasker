import React from 'react';

const Alert = ({ 
  children, 
  variant = 'default', 
  className = '',
  icon = true,
  ...props 
}) => {
  const baseClasses = 'relative px-4 py-3 rounded-lg border flex items-start';
  
  const variantClasses = {
    default: 'bg-background-light border-border-light text-text-light dark:bg-background-dark dark:border-border-dark dark:text-text-dark',
    info: 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-200',
    success: 'bg-success-50 border-success-200 text-success-700 dark:bg-success-900/30 dark:border-success-800 dark:text-success-200',
    warning: 'bg-warning-50 border-warning-200 text-warning-700 dark:bg-warning-900/30 dark:border-warning-800 dark:text-warning-200',
    danger: 'bg-danger-50 border-danger-200 text-danger-700 dark:bg-danger-900/30 dark:border-danger-800 dark:text-danger-200',
  };
  
  const iconClasses = {
    default: '',
    info: 'text-blue-500 dark:text-blue-400',
    success: 'text-success-500 dark:text-success-400',
    warning: 'text-warning-500 dark:text-warning-400',
    danger: 'text-danger-500 dark:text-danger-400',
  };
  
  const icons = {
    info: (
      <svg className={`w-5 h-5 ${iconClasses.info} flex-shrink-0`} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    ),
    success: (
      <svg className={`w-5 h-5 ${iconClasses.success} flex-shrink-0`} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
    warning: (
      <svg className={`w-5 h-5 ${iconClasses.warning} flex-shrink-0`} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
    danger: (
      <svg className={`w-5 h-5 ${iconClasses.danger} flex-shrink-0`} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    ),
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${className}`;
  
  return (
    <div className={classes} {...props}>
      {icon && icons[variant] && (
        <div className="mr-3 pt-0.5">
          {icons[variant]}
        </div>
      )}
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
};

export default Alert;