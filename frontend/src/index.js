import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/index.css';
import App from './App';

// Handle ResizeObserver loop errors gracefully with more aggressive suppression
const resizeObserverLoopErrRe = /ResizeObserver loop limit exceeded|ResizeObserver loop completed with undelivered notifications/;
if (window.addEventListener) {
  window.addEventListener('error', function (e) {
    if (resizeObserverLoopErrRe.test(e.message)) {
      // More aggressive error suppression
      e.stopImmediatePropagation();
      e.preventDefault();
      e.stopPropagation();
      // Completely suppress these errors to prevent them from being reported
      return false; // Return false to indicate the error was handled
    }
  }, true);
}

// Also handle unhandledrejection for promise-based errors
window.addEventListener('unhandledrejection', function (e) {
  if (resizeObserverLoopErrRe.test(e.reason?.message || e.reason)) {
    // More aggressive error suppression
    e.preventDefault();
    // Completely suppress these errors to prevent them from being reported
    return false; // Return false to indicate the error was handled
  }
});

// Add a cleanup function to handle ResizeObserver when elements are removed
window.addEventListener('beforeunload', function() {
  if (window.__resizeObserverErrors) {
    delete window.__resizeObserverErrors;
  }
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker for offline icon caching
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registered with scope:', registration.scope);
      })
      .catch((error) => {
        console.log('Service Worker registration failed:', error);
      });
  });
}