import React from 'react';
import PropTypes from 'prop-types';

const Badge = ({ 
  children, 
  variant = 'default', 
  size = 'md', 
  className = '',
  ...props 
}) => {
  const baseClasses = 'inline-flex items-center rounded-full font-medium';
  
  const variantClasses = {
    default: 'bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-200',
    secondary: 'bg-secondary-100 text-secondary-800 dark:bg-secondary-900/30 dark:text-secondary-200',
    success: 'bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-200',
    warning: 'bg-warning-100 text-warning-800 dark:bg-warning-900/30 dark:text-warning-200',
    danger: 'bg-danger-100 text-danger-800 dark:bg-danger-900/30 dark:text-danger-200',
    outline: 'border border-border-light text-text-light dark:border-border-dark dark:text-text-dark',
  };
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1',
  };
  
  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;
  
  return (
    <span className={classes} {...props}>
      {children}
    </span>
  );
};

Badge.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['default', 'secondary', 'success', 'warning', 'danger', 'outline']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  className: PropTypes.string
};

export default Badge;