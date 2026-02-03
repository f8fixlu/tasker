import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/common/Button';

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full text-center">
        <div className="mb-8">
          <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 dark:from-primary-600 dark:to-primary-700">
            <span className="text-5xl font-bold text-white">404</span>
          </div>
        </div>
        
        <h1 className="text-4xl font-extrabold text-text-light dark:text-text-dark sm:text-5xl mb-4">
          Page Not Found
        </h1>
        
        <p className="text-lg text-text-secondary-light dark:text-text-secondary-dark mb-8">
          Oops! The page you're looking for doesn't exist or has been moved.
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link to="/">
            <Button variant="primary" className="w-full sm:w-auto">
              Go to Dashboard
            </Button>
          </Link>
          
          <Link to="/tasks">
            <Button variant="secondary" className="w-full sm:w-auto">
              View Tasks
            </Button>
          </Link>
        </div>
        
        <div className="mt-10 text-sm text-text-secondary-light dark:text-text-secondary-dark">
          <p>Need help? Contact support or return to the homepage.</p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;