import React from 'react';
import { render, screen } from '@testing-library/react';
import DataTable from '../components/common/DataTable';

describe('DataTable Component', () => {
  const mockColumns = [
    { header: 'Name', key: 'name' },
    { header: 'Email', key: 'email' },
    { header: 'Role', key: 'role' },
  ];

  const mockData = [
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'Manager' },
  ];

  test('renders table with correct headers', () => {
    render(<DataTable columns={mockColumns} data={mockData} />);
    
    mockColumns.forEach(column => {
      expect(screen.getByText(column.header)).toBeInTheDocument();
    });
  });

  test('renders table with correct data', () => {
    render(<DataTable columns={mockColumns} data={mockData} />);
    
    mockData.forEach(row => {
      expect(screen.getByText(row.name)).toBeInTheDocument();
      expect(screen.getByText(row.email)).toBeInTheDocument();
      expect(screen.getByText(row.role)).toBeInTheDocument();
    });
  });

  test('displays empty message when no data is provided', () => {
    render(<DataTable columns={mockColumns} data={[]} emptyMessage="No records found" />);
    expect(screen.getByText('No records found')).toBeInTheDocument();
  });

  test('renders checkboxes when showSelectAll is true', () => {
    render(<DataTable columns={mockColumns} data={mockData} showSelectAll={true} />);
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(mockData.length + 1); // +1 for select all checkbox
  });

  test('calls onRowClick when row is clicked', () => {
    const handleRowClick = jest.fn();
    render(<DataTable columns={mockColumns} data={mockData} onRowClick={handleRowClick} />);
    
    const firstRow = screen.getByText(mockData[0].name).closest('tr');
    firstRow.click();
    
    expect(handleRowClick).toHaveBeenCalledWith(mockData[0], 0);
  });

  test('shows loading state when isLoading is true', () => {
    render(<DataTable columns={mockColumns} data={mockData} isLoading={true} />);
    // Check that data is not rendered when loading
    expect(screen.queryByText(mockData[0].name)).not.toBeInTheDocument();
    // Just check that the skeleton elements are present by checking for the animate-pulse class
    const animatedElement = screen.container.querySelector('.animate-pulse');
    expect(animatedElement).toBeInTheDocument();
  });
});