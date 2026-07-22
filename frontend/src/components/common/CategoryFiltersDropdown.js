import React from 'react';

export const formatCategoryName = (name) => {
  if (!name) return '';
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
};

const CategoryFiltersDropdown = ({ filters, onChange, taskCategories, eventCategories }) => {
  const handleClearTaskCategories = () => {
    taskCategories.forEach(category => {
      onChange('task', category.name.toLowerCase(), false);
    });
  };

  const handleClearEventCategories = () => {
    eventCategories.forEach(category => {
      onChange('event', category.name.toLowerCase(), false);
    });
  };

  return (
    <div className="absolute left-0 mt-2 w-52 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 py-2 border border-gray-200 dark:border-gray-700">
      <div className="px-4 py-2 space-y-1">
        <div className="flex justify-between items-center mb-2">
          <div className="font-medium text-sm text-gray-500 dark:text-gray-400">Task</div>
          <button
            type="button"
            className="text-xs text-primary hover:text-primary-600 dark:hover:text-primary-400"
            onClick={handleClearTaskCategories}
          >
            Clear All
          </button>
        </div>
        {taskCategories.map((category) => (
          <div key={`task-${category.name.toLowerCase()}`} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.task[category.name.toLowerCase()] || false}
                onChange={(e) => onChange('task', category.name.toLowerCase(), e.target.checked)}
                className="rounded text-primary focus:ring-primary"
              />
              <span>{formatCategoryName(category.name)}</span>
            </label>
          </div>
        ))}

        <div className="flex justify-between items-center mb-2 mt-3">
          <div className="font-medium text-sm text-gray-500 dark:text-gray-400">Event</div>
          <button
            type="button"
            className="text-xs text-primary hover:text-primary-600 dark:hover:text-primary-400"
            onClick={handleClearEventCategories}
          >
            Clear All
          </button>
        </div>
        {eventCategories.map((category) => (
          <div key={`event-${category.name.toLowerCase()}`} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.event[category.name.toLowerCase()] || false}
                onChange={(e) => onChange('event', category.name.toLowerCase(), e.target.checked)}
                className="rounded text-primary focus:ring-primary"
              />
              <span>{formatCategoryName(category.name)}</span>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryFiltersDropdown;
