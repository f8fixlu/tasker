import React from 'react';
import { render, screen } from '@testing-library/react';
import Input from '../components/common/Input';

describe('Input Component', () => {
  test('renders input with label', () => {
    render(<Input label="Test Label" id="test-input" />);
    expect(screen.getByLabelText('Test Label')).toBeInTheDocument();
  });

  test('renders input with placeholder', () => {
    render(<Input placeholder="Enter text" id="test-input" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  test('displays error message when provided', () => {
    render(<Input error="This field is required" id="test-input" />);
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  test('applies correct styling when error is present', () => {
    render(<Input error="This field is required" id="test-input" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('border-red-500');
  });

  test('calls onChange handler when value changes', () => {
    const handleChange = jest.fn();
    render(<Input onChange={handleChange} id="test-input" />);
    const input = screen.getByRole('textbox');
    input.value = 'test value';
    input.dispatchEvent(new Event('change', { bubbles: true }));
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  test('renders as required when required prop is true', () => {
    render(<Input required label="Required Field" id="test-input" />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });
});