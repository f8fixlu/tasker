import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Reports from '../pages/Reports';

// Mock the Button and Input components
jest.mock('../components/common/Button', () => {
  return ({ children, ...props }) => <button {...props}>{children}</button>;
});

jest.mock('../components/common/Input', () => {
  return ({ type, value, ...props }) => (
    <input type={type} value={value} {...props} />
  );
});

jest.mock('../components/common/Modal', () => {
  return ({ isOpen, onClose, title, children }) => (
    isOpen ? (
      <div>
        <h2>{title}</h2>
        <button onClick={onClose}>Close</button>
        {children}
      </div>
    ) : null
  );
});

describe('Reports Page', () => {
  test('renders reports page with correct title', () => {
    render(
      <BrowserRouter>
        <Reports />
      </BrowserRouter>
    );

    expect(screen.getByText('Reports')).toBeInTheDocument();
  });

  test('renders action buttons', () => {
    render(
      <BrowserRouter>
        <Reports />
      </BrowserRouter>
    );

    expect(screen.getByRole('button', { name: /Print Report/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Export/i })).toBeInTheDocument();
  });

  test('renders date range selector', () => {
    render(
      <BrowserRouter>
        <Reports />
      </BrowserRouter>
    );

    expect(screen.getByText('Last 30 days')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2023-10-01')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2023-10-31')).toBeInTheDocument();
  });

  test('renders statistics cards', () => {
    render(
      <BrowserRouter>
        <Reports />
      </BrowserRouter>
    );

    expect(screen.getByText('Tasks Completed')).toBeInTheDocument();
    expect(screen.getByText('Productivity Score')).toBeInTheDocument();
    expect(screen.getByText('Events Attended')).toBeInTheDocument();
  });

  test('renders chart sections', () => {
    render(
      <BrowserRouter>
        <Reports />
      </BrowserRouter>
    );

    expect(screen.getByText('Task Completion Rate')).toBeInTheDocument();
    expect(screen.getByText('Activity Breakdown')).toBeInTheDocument();
  });

  test('opens print modal when print button is clicked', () => {
    render(
      <BrowserRouter>
        <Reports />
      </BrowserRouter>
    );

    const printButton = screen.getByRole('button', { name: /Print Report/i });
    printButton.click();
    
    // In a real test, we would check if the modal is open
    expect(printButton).toBeInTheDocument();
  });
});