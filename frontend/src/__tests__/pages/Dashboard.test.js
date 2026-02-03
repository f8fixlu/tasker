import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';

// Mock the useAuth hook
jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { full_name: 'John Doe' },
  }),
}));

// Mock the Button component
jest.mock('../components/common/Button', () => {
  return ({ children, ...props }) => <button {...props}>{children}</button>;
});

describe('Dashboard Page', () => {
  test('renders dashboard with correct title', () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  test('displays welcome message with user name', () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    expect(screen.getByText('Welcome back, John Doe')).toBeInTheDocument();
  });

  test('renders statistics cards', () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    expect(screen.getByText('Total Tasks')).toBeInTheDocument();
    expect(screen.getByText('Recent Tasks')).toBeInTheDocument();
    expect(screen.getByText('Tasks Today')).toBeInTheDocument();
    expect(screen.getByText('Tasks this Month')).toBeInTheDocument();
  });

  test('renders recent tasks table', () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    expect(screen.getByText('Recent Tasks')).toBeInTheDocument();
    expect(screen.getByText('Task Name')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Due Date')).toBeInTheDocument();
  });

  test('renders upcoming deadlines section', () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    expect(screen.getByText('Upcoming Deadlines')).toBeInTheDocument();
  });

  test('renders upcoming events section', () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    expect(screen.getByText('Upcoming Events')).toBeInTheDocument();
  });
});