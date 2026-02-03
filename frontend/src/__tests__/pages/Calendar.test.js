import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Calendar from '../pages/Calendar';

// Mock the Button component
jest.mock('../components/common/Button', () => {
  return ({ children, ...props }) => <button {...props}>{children}</button>;
});

jest.mock('../components/common/Calendar', () => {
  return ({ events, onDayClick, onEventClick }) => (
    <div>
      <h2>Calendar Component</h2>
      <div>Month Navigation</div>
      <div>Calendar Grid</div>
      {events && events.map(event => (
        <div key={event.id} onClick={() => onEventClick && onEventClick(event)}>
          {event.title}
        </div>
      ))}
    </div>
  );
});

describe('Calendar Page', () => {
  test('renders calendar page with correct title', () => {
    render(
      <BrowserRouter>
        <Calendar />
      </BrowserRouter>
    );

    expect(screen.getByText('Calendar')).toBeInTheDocument();
  });

  test('renders navigation controls', () => {
    render(
      <BrowserRouter>
        <Calendar />
      </BrowserRouter>
    );

    expect(screen.getByRole('button', { name: /Previous/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Next/i })).toBeInTheDocument();
    expect(screen.getByText('Month')).toBeInTheDocument();
    expect(screen.getByText('Week')).toBeInTheDocument();
    expect(screen.getByText('Day')).toBeInTheDocument();
  });

  test('renders action buttons', () => {
    render(
      <BrowserRouter>
        <Calendar />
      </BrowserRouter>
    );

    expect(screen.getByRole('button', { name: /New Task/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /New Event/i })).toBeInTheDocument();
  });

  test('renders calendar component', () => {
    render(
      <BrowserRouter>
        <Calendar />
      </BrowserRouter>
    );

    expect(screen.getByText('Calendar Component')).toBeInTheDocument();
  });

  test('renders month selector', () => {
    render(
      <BrowserRouter>
        <Calendar />
      </BrowserRouter>
    );

    expect(screen.getByText('October 2023')).toBeInTheDocument();
  });
});