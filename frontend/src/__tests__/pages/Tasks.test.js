import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Tasks from '../pages/Tasks';

// Mock the Button and Input components
jest.mock('../components/common/Button', () => {
  return ({ children, ...props }) => <button {...props}>{children}</button>;
});

jest.mock('../components/common/Input', () => {
  return ({ placeholder, ...props }) => (
    <input placeholder={placeholder} {...props} />
  );
});

jest.mock('../components/common/DataTable', () => {
  return ({ columns, data }) => (
    <table>
      <thead>
        <tr>
          {columns.map((col, index) => (
            <th key={index}>{col.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {columns.map((col, colIndex) => (
              <td key={colIndex}>{row[col.key]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
});

describe('Tasks Page', () => {
  test('renders tasks page with correct title', () => {
    render(
      <BrowserRouter>
        <Tasks />
      </BrowserRouter>
    );

    expect(screen.getByText('Tasks')).toBeInTheDocument();
  });

  test('renders add task button', () => {
    render(
      <BrowserRouter>
        <Tasks />
      </BrowserRouter>
    );

    expect(screen.getByRole('button', { name: /Add Task/i })).toBeInTheDocument();
  });

  test('renders search input', () => {
    render(
      <BrowserRouter>
        <Tasks />
      </BrowserRouter>
    );

    expect(screen.getByPlaceholderText('Search tasks...')).toBeInTheDocument();
  });

  test('renders filter and sort buttons', () => {
    render(
      <BrowserRouter>
        <Tasks />
      </BrowserRouter>
    );

    expect(screen.getByRole('button', { name: /Filter/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sort/i })).toBeInTheDocument();
  });

  test('renders tasks table', () => {
    render(
      <BrowserRouter>
        <Tasks />
      </BrowserRouter>
    );

    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Task Type')).toBeInTheDocument();
    expect(screen.getByText('Sub Type')).toBeInTheDocument();
    expect(screen.getByText('Quantity')).toBeInTheDocument();
    expect(screen.getByText('Date Created')).toBeInTheDocument();
    expect(screen.getByText('Due Date')).toBeInTheDocument();
  });

  test('renders pagination controls', () => {
    render(
      <BrowserRouter>
        <Tasks />
      </BrowserRouter>
    );

    expect(screen.getByText('Rows per page:')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
  });
});