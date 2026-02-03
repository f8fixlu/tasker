import React from 'react';
import { render, screen } from '@testing-library/react';
import Modal from '../components/common/Modal';

describe('Modal Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    title: 'Test Modal',
    children: <div>Modal Content</div>
  };

  test('renders modal when isOpen is true', () => {
    render(<Modal {...defaultProps} />);
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal Content')).toBeInTheDocument();
  });

  test('does not render modal when isOpen is false', () => {
    render(<Modal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
  });

  test('renders close button', () => {
    render(<Modal {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  test('calls onClose when close button is clicked', () => {
    const onClose = jest.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);
    
    const closeButton = screen.getByRole('button', { name: 'Close' });
    closeButton.click();
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('supports different sizes', () => {
    const { rerender } = render(<Modal {...defaultProps} size="sm" />);
    const smallModal = screen.getByRole('dialog');
    expect(smallModal).toHaveClass('max-w-md');
    
    rerender(<Modal {...defaultProps} size="lg" />);
    const largeModal = screen.getByRole('dialog');
    expect(largeModal).toHaveClass('max-w-xl');
  });

  test('renders footer when provided', () => {
    const footerContent = <div>Footer Content</div>;
    render(<Modal {...defaultProps} footer={footerContent} />);
    expect(screen.getByText('Footer Content')).toBeInTheDocument();
  });
});