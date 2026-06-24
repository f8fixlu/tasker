import React, { useEffect, useState, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';

const Modal = ({ isOpen, onClose, title, children, size = 'md', showOverlaySpinner = false, overlay = true, transparent = false, zIndex = 'z-50', draggable = false }) => {
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-xl',
    xl: 'max-w-2xl',
    '2xl': 'max-w-3xl',
  };

  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragState = useRef({ isDragging: false, startX: 0, startY: 0, offsetX: 0, offsetY: 0 });
  const contentRef = useRef(null);

  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select')) return;
    const rect = contentRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragState.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: dragOffset.x,
      offsetY: dragOffset.y,
    };
    document.body.style.userSelect = 'none';
    if (contentRef.current) contentRef.current.style.transition = 'none';
  }, [dragOffset]);

  const handleMouseMove = useCallback((e) => {
    const s = dragState.current;
    if (!s.isDragging) return;
    const dx = s.offsetX + (e.clientX - s.startX);
    const dy = s.offsetY + (e.clientY - s.startY);
    setDragOffset({ x: dx, y: dy });
    if (contentRef.current) {
      contentRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    dragState.current.isDragging = false;
    document.body.style.userSelect = '';
    if (contentRef.current) contentRef.current.style.transition = '';
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setDragOffset({ x: 0, y: 0 });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!draggable || !isOpen) return;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggable, isOpen, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const bgClass = transparent
    ? 'bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm'
    : 'bg-white dark:bg-gray-800';

  return ReactDOM.createPortal(
    <div className={`fixed inset-0 ${zIndex} overflow-y-auto`}>
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {overlay && (
          <div
            className="fixed inset-0 transition-opacity"
            onClick={onClose}
          >
            <div className="absolute inset-0 bg-gray-500 opacity-75 dark:bg-gray-900 dark:opacity-80"></div>
          </div>
        )}

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen"></span>&#8203;

        <div
          ref={contentRef}
          className={`inline-block align-bottom ${bgClass} rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:w-full ${sizes[size]} dark:text-white`}
          style={draggable ? { transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)`, transition: 'none' } : undefined}
        >
          <div
            className={`px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
            onMouseDown={draggable ? handleMouseDown : undefined}
          >
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {title}
            </h3>
            <button
              type="button"
              className="text-gray-400 hover:text-gray-500 focus:outline-none"
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="px-4 py-5 sm:p-6 relative">
            {children}
            {showOverlaySpinner && (
              <div className="absolute inset-0 bg-white/70 dark:bg-gray-800/70 flex items-center justify-center rounded-lg z-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;
