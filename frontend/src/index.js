import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/index.css';
import App from './App';

// Handle ResizeObserver loop errors gracefully with more aggressive suppression
const resizeObserverLoopErrRe = /ResizeObserver loop limit exceeded|ResizeObserver loop completed with undelivered notifications/;

// Suppress via error event listener
if (window.addEventListener) {
  window.addEventListener('error', function (e) {
    if (resizeObserverLoopErrRe.test(e.message)) {
      e.stopImmediatePropagation();
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }, true);
}

// Suppress via unhandledrejection
window.addEventListener('unhandledrejection', function (e) {
  if (resizeObserverLoopErrRe.test(e.reason?.message || e.reason)) {
    e.preventDefault();
    return false;
  }
});

// Suppress via console.error patching (catches React dev-mode reporting)
const origConsoleError = console.error;
console.error = function (...args) {
  const msg = args.map(a => String(a)).join(' ');
  if (resizeObserverLoopErrRe.test(msg)) {
    return;
  }
  return origConsoleError.apply(this, args);
};

// Suppress via window.onerror fallback
window.onerror = function (msg) {
  if (resizeObserverLoopErrRe.test(msg)) {
    return true;
  }
};

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