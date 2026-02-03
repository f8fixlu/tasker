import React from 'react';
import PropTypes from 'prop-types';

const Button = ({ 
  children, 
  onClick, 
  type = 'button', 
  variant = 'primary', 
  size = 'md', 
  className = '',
  disabled = false,
  ...props 
}) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantClasses = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500/50 dark:bg-primary-500 dark:hover:bg-primary-400',
    secondary: 'bg-secondary-600 text-white hover:bg-secondary-700 focus:ring-secondary-500/50 dark:bg-secondary-500 dark:hover:bg-secondary-400',
    success: 'bg-success-600 text-white hover:bg-success-700 focus:ring-success-500/50 dark:bg-success-500 dark:hover:bg-success-400',
    warning: 'bg-warning-600 text-white hover:bg-warning-700 focus:ring-warning-500/50 dark:bg-warning-500 dark:hover:bg-warning-400',
    danger: 'bg-danger-600 text-white hover:bg-danger-700 focus:ring-danger-500/50 dark:bg-danger-500 dark:hover:bg-danger-400',
    outline: 'border border-border-light bg-surface-light text-text-light hover:bg-background-light focus:ring-primary-500/50 dark:border-border-dark dark:bg-surface-dark dark:text-text-dark dark:hover:bg-background-dark',
    ghost: 'hover:bg-surface-light text-text-light hover:text-text-dark focus:ring-primary-500/50 dark:hover:bg-surface-dark dark:text-text-dark dark:hover:text-text-light',
    link: 'text-primary-600 underline-offset-4 hover:underline focus:ring-primary-500/50 dark:text-primary-400'
  };
  
  const sizeClasses = {
    sm: 'text-xs py-1.5 px-3',
    md: 'text-sm py-2 px-4',
    lg: 'text-base py-2.5 px-5',
    xl: 'text-lg py-3 px-6'
  };
  
  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className} ${
    disabled ? 'opacity-50 cursor-not-allowed' : ''
  }`;
  
  return (
    <button
      className={classes}
      onClick={onClick}
      type={type}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

Button.propTypes = {
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func,
  type: PropTypes.string,
  variant: PropTypes.oneOf(['primary', 'secondary', 'success', 'warning', 'danger', 'outline', 'ghost', 'link']),
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl']),
  className: PropTypes.string,
  disabled: PropTypes.bool
};

export default Button;