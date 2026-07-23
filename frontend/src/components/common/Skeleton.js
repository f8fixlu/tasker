// Enhanced skeleton components for dashboard sections
import React from 'react';

// Enhanced skeleton with more specific types
const Skeleton = ({ type = 'text', className = '', width, height, circle }) => {
  const baseClasses = 'animate-pulse bg-gray-200 dark:bg-gray-700';
  
  let specificClasses = '';
  
  switch(type) {
    case 'card':
      specificClasses = 'rounded-xl h-40';
      break;
    case 'table':
      specificClasses = 'h-64';
      break;
    case 'stat':
      specificClasses = 'rounded-lg h-20';
      break;
    case 'avatar':
      specificClasses = 'rounded-full';
      break;
    case 'button':
      specificClasses = 'rounded-md';
      break;
    case 'text':
    default:
      specificClasses = 'rounded';
  }
  
  const style = {};
  if (width) style.width = width;
  if (height) style.height = height;
  if (circle) style.borderRadius = '50%';
  
  return (
    <div 
      className={`${baseClasses} ${specificClasses} ${className}`}
      style={style}
    />
  );
};

// Specific skeleton components for dashboard sections
export const TaskStatsSkeleton = () => (
  <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-card p-4 sm:p-6">
    <h2 className="text-text-light dark:text-text-dark text-xl sm:text-[22px] font-bold pb-3 mb-4">My Tasks</h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-lg p-3 bg-blue-100 dark:bg-blue-900/30">
          <div className="flex items-center justify-between">
            <Skeleton type="text" className="w-20 h-4 text-sm" />
            <Skeleton type="button" className="w-5 h-5 rounded-full" />
          </div>
          <Skeleton type="text" className="w-12 h-6 text-xl font-bold" />
        </div>
      ))}
    </div>
  </div>
);

export const EventStatsSkeleton = () => (
  <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-card p-4 sm:p-6">
    <h2 className="text-text-light dark:text-text-dark text-xl sm:text-[22px] font-bold pb-3 mb-4">My Events</h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-lg p-3 bg-indigo-100 dark:bg-indigo-900/30">
          <div className="flex items-center justify-between">
            <Skeleton type="text" className="w-20 h-4 text-sm" />
            <Skeleton type="button" className="w-5 h-5 rounded-full" />
          </div>
          <Skeleton type="text" className="w-12 h-6 text-xl font-bold" />
        </div>
      ))}
    </div>
  </div>
);

export const RecentTasksSkeleton = () => (
  <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-card p-4 sm:p-6">
    <div className="flex justify-between items-center pb-3 mb-4">
      <h2 className="text-text-light dark:text-text-dark text-xl sm:text-[22px] font-bold">Recent Tasks</h2>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border-light dark:border-border-dark">
            <th className="py-2 px-3 sm:px-4 font-medium text-text-secondary-light dark:text-text-secondary-dark">
              <Skeleton type="text" className="w-20" />
            </th>
            <th className="py-2 px-3 sm:px-4 font-medium text-text-secondary-light dark:text-text-secondary-dark">
              <Skeleton type="text" className="w-16" />
            </th>
            <th className="py-2 px-3 sm:px-4 font-medium text-text-secondary-light dark:text-text-secondary-dark">
              <Skeleton type="text" className="w-16" />
            </th>
            <th className="py-2 px-3 sm:px-4 font-medium text-text-secondary-light dark:text-text-secondary-dark">
              <Skeleton type="text" className="w-20" />
            </th>
            <th className="py-2 px-3 sm:px-4 font-medium text-text-secondary-light dark:text-text-secondary-dark">
              <Skeleton type="text" className="w-8" />
            </th>
          </tr>
        </thead>
        <tbody>
          {[...Array(5)].map((_, i) => (
            <tr key={i} className="border-b border-border-light dark:border-border-dark">
              <td className="py-3 px-3 sm:px-4">
                <Skeleton type="text" className="w-32 h-4" />
              </td>
              <td className="py-3 px-3 sm:px-4">
                <Skeleton type="text" className="w-20 h-4" />
              </td>
              <td className="py-3 px-3 sm:px-4">
                <Skeleton type="text" className="w-16 h-4" />
              </td>
              <td className="py-3 px-3 sm:px-4">
                <Skeleton type="text" className="w-24 h-4" />
              </td>
              <td className="py-3 px-3 sm:px-4">
                <Skeleton type="button" className="w-6 h-6 rounded" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export const TaskOverviewSkeleton = () => (
  <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-card p-4 sm:p-6">
    <div className="flex justify-between items-center pb-3 mb-4">
      <h2 className="text-text-light dark:text-text-dark text-xl sm:text-[22px] font-bold">Task Status Overview</h2>
    </div>
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex justify-between items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
          <Skeleton type="text" className="w-24 h-4" />
          <Skeleton type="text" className="w-8 h-4" />
        </div>
      ))}
    </div>
  </div>
);

export const PageSkeleton = () => (
  <div className="p-4 sm:p-6 space-y-4">
    <div className="flex justify-between items-center">
      <Skeleton type="text" className="w-48 h-8" />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} type="stat" />
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2">
        <Skeleton type="table" className="h-64" />
      </div>
      <Skeleton type="card" className="h-64" />
    </div>
  </div>
);

export default Skeleton;