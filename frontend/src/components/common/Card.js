import React from 'react';

const Card = ({ 
  children, 
  className = '',
  variant = 'default',
  ...props 
}) => {
  const baseClasses = 'rounded-xl border shadow-sm';
  
  const variantClasses = {
    default: 'bg-surface-light border-border-light dark:bg-surface-dark dark:border-border-dark',
    elevated: 'bg-surface-light border-border-light dark:bg-surface-dark dark:border-border-dark shadow-card',
    outline: 'bg-transparent border-border-light dark:border-border-dark',
  };
  
  const classes = `${baseClasses} ${variantClasses[variant]} ${className}`;
  
  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};

const CardHeader = ({ children, className = '', ...props }) => (
  <div className={`p-6 ${className}`} {...props}>
    {children}
  </div>
);

const CardTitle = ({ children, className = '', ...props }) => (
  <h3 className={`text-lg font-semibold text-text-light dark:text-text-dark ${className}`} {...props}>
    {children}
  </h3>
);

const CardDescription = ({ children, className = '', ...props }) => (
  <p className={`text-sm text-text-secondary-light dark:text-text-secondary-dark mt-1 ${className}`} {...props}>
    {children}
  </p>
);

const CardContent = ({ children, className = '', ...props }) => (
  <div className={`p-6 pt-0 ${className}`} {...props}>
    {children}
  </div>
);

const CardFooter = ({ children, className = '', ...props }) => (
  <div className={`p-6 pt-0 flex items-center ${className}`} {...props}>
    {children}
  </div>
);

Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Description = CardDescription;
Card.Content = CardContent;
Card.Footer = CardFooter;

export default Card;