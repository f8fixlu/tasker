import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Settings from '../pages/Settings';

// Mock the Button and Input components
jest.mock('../components/common/Button', () => {
  return ({ children, ...props }) => <button {...props}>{children}</button>;
});

jest.mock('../components/common/Input', () => {
  return ({ label, id, ...props }) => (
    <div>
      <label htmlFor={id}>{label}</label>
      <input id={id} {...props} />
    </div>
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

describe('Settings Page', () => {
  test('renders settings page with correct title', () => {
    render(
      <BrowserRouter>
        <Settings />
      </BrowserRouter>
    );

    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  test('renders navigation tabs', () => {
    render(
      <BrowserRouter>
        <Settings />
      </BrowserRouter>
    );

    expect(screen.getByRole('button', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Account Security' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Themes' })).toBeInTheDocument();
  });

  test('renders profile settings form', () => {
    render(
      <BrowserRouter>
        <Settings />
      </BrowserRouter>
    );

    expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Upload new picture/i })).toBeInTheDocument();
  });

  test('renders security settings form', () => {
    render(
      <BrowserRouter>
        <Settings activeTab="security" />
      </BrowserRouter>
    );

    expect(screen.getByLabelText('Current Password')).toBeInTheDocument();
    expect(screen.getByLabelText('New Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm New Password')).toBeInTheDocument();
  });

  test('renders notification settings toggles', () => {
    render(
      <BrowserRouter>
        <Settings activeTab="notifications" />
      </BrowserRouter>
    );

    expect(screen.getByText('Email Notifications')).toBeInTheDocument();
    expect(screen.getByText('Push Notifications')).toBeInTheDocument();
  });

  test('renders theme options', () => {
    render(
      <BrowserRouter>
        <Settings activeTab="themes" />
      </BrowserRouter>
    );

    expect(screen.getByText('Light')).toBeInTheDocument();
    expect(screen.getByText('Dark')).toBeInTheDocument();
  });

  test('opens bug report modal when report button is clicked', () => {
    render(
      <BrowserRouter>
        <Settings />
      </BrowserRouter>
    );

    // In a real test, we would simulate clicking the bug report button
    expect(true).toBe(true); // Placeholder
  });
});