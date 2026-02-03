import React from 'react';

// Responsive layout testing component
const ResponsiveLayoutTester = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Responsive Layout Test</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Grid Layout Test</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
            <div key={item} className="bg-surface-light dark:bg-surface-dark p-4 rounded-lg shadow-card border border-border-light dark:border-border-dark">
              <h3 className="font-medium text-text-light dark:text-text-dark">Card {item}</h3>
              <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">This is a responsive card that changes layout based on screen size.</p>
            </div>
          ))}
        </div>
      </div>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Flex Layout Test</h2>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 bg-surface-light dark:bg-surface-dark p-4 rounded-lg shadow-card border border-border-light dark:border-border-dark">
            <h3 className="font-medium text-text-light dark:text-text-dark">Main Content</h3>
            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">This flex item takes up remaining space on larger screens.</p>
          </div>
          <div className="md:w-64 bg-surface-light dark:bg-surface-dark p-4 rounded-lg shadow-card border border-border-light dark:border-border-dark">
            <h3 className="font-medium text-text-light dark:text-text-dark">Sidebar</h3>
            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">This sidebar becomes full width on mobile.</p>
          </div>
        </div>
      </div>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Typography Test</h2>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-text-light dark:text-text-dark">Heading 1 (text-3xl)</h1>
          <h2 className="text-2xl font-bold text-text-light dark:text-text-dark">Heading 2 (text-2xl)</h2>
          <h3 className="text-xl font-bold text-text-light dark:text-text-dark">Heading 3 (text-xl)</h3>
          <p className="text-base text-text-light dark:text-text-dark">Paragraph text (text-base) - This is regular body text.</p>
          <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">Secondary text (text-sm) - This is smaller secondary text.</p>
        </div>
      </div>
      
      <div>
        <h2 className="text-xl font-semibold mb-4">Button Size Test</h2>
        <div className="flex flex-wrap gap-3">
          <button className="px-2.5 py-1.5 text-xs bg-primary-600 text-white rounded-md">Extra Small</button>
          <button className="px-3 py-2 text-sm bg-primary-600 text-white rounded-md">Small</button>
          <button className="px-4 py-2 text-sm bg-primary-600 text-white rounded-md">Medium</button>
          <button className="px-5 py-2.5 text-base bg-primary-600 text-white rounded-md">Large</button>
        </div>
      </div>
    </div>
  );
};

export default ResponsiveLayoutTester;