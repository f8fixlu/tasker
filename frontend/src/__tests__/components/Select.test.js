import React from 'react';
import { render, screen } from '@testing-library/react';
import Select from '../components/common/Select';

describe('Select Component', () => {
  const mockOptions = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
  ];

  test('renders select with label', () => {
    render(<Select label="Test Label" id="test-select" options={mockOptions} />);
    expect(screen.getByLabelText('Test Label')).toBeInTheDocument();
  });

  test('renders options correctly', () => {
    render(<Select id="test-select" options={mockOptions} />);
    const select = screen.getByRole('combobox');
    expect(select.children).toHaveLength(mockOptions.length + 1); // +1 for placeholder
  });

  test('displays error message when provided', () => {
    render(<Select error="This field is required" id="test-select" options={mockOptions} />);
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  test('applies correct styling when error is present', () => {
    render(<Select error="This field is required" id="test-select" options={mockOptions} />);
    const select = screen.getByRole('combobox');
    expect(select).toHaveClass('border-red-500');
  });

  test('calls onChange handler when value changes', () => {
    const handleChange = jest.fn();
    render(<Select onChange={handleChange} id="test-select" options={mockOptions} />);
    const select = screen.getByRole('combobox');
    select.value = 'option1';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  test('renders as required when required prop is true', () => {
    render(<Select required label="Required Field" id="test-select" options={mockOptions} />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });
});