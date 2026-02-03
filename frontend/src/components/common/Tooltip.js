import React, { useState, useEffect, useRef } from 'react';

const Tooltip = ({ children, content, position = 'top', delay = 300, className = '' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState(null);
  const wrapperRef = useRef(null);

  const showTooltip = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    setIsVisible(true);
  };

  const hideTooltip = () => {
    const id = setTimeout(() => {
      setIsVisible(false);
    }, delay);
    setTimeoutId(id);
  };

  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  // Calculate tooltip position based on the trigger element
  const calculatePosition = () => {
    if (!wrapperRef.current) return { top: 0, left: 0 };

    const triggerRect = wrapperRef.current.getBoundingClientRect();

    // Determine if content should be treated as 2 rows based on word count
    const isMultiRow = typeof content === 'string' && content.trim().split(/\s+/).length > 5;
    const tooltipHeight = isMultiRow ? 60 : 40; // Larger height for 2-row content
    const tooltipWidth = isMultiRow ?
      Math.min(320, Math.max(220, content?.length * 6 || 120)) : // Wider for 2-row content
      Math.min(300, Math.max(200, content?.length * 8 || 100)); // Estimate width based on content
    const viewportPadding = 10;

    let top, left;

    switch (position) {
      case 'top':
        top = triggerRect.top - tooltipHeight - viewportPadding;
        left = triggerRect.left + (triggerRect.width / 2) - (tooltipWidth / 2);
        break;
      case 'bottom':
        top = triggerRect.bottom + viewportPadding;
        left = triggerRect.left + (triggerRect.width / 2) - (tooltipWidth / 2);
        break;
      case 'left':
        top = triggerRect.top + (triggerRect.height / 2) - (tooltipHeight / 2);
        left = triggerRect.left - tooltipWidth - viewportPadding;
        break;
      case 'right':
        top = triggerRect.top + (triggerRect.height / 2) - (tooltipHeight / 2);
        left = triggerRect.right + viewportPadding;
        break;
      default:
        top = triggerRect.top - tooltipHeight - viewportPadding;
        left = triggerRect.left + (triggerRect.width / 2) - (tooltipWidth / 2);
    }

    // Ensure tooltip stays within viewport
    if (left < viewportPadding) left = viewportPadding;
    if (left + tooltipWidth > window.innerWidth - viewportPadding) {
      left = window.innerWidth - tooltipWidth - viewportPadding;
    }
    if (top < viewportPadding) top = viewportPadding;
    if (top + tooltipHeight > window.innerHeight) {
      top = triggerRect.top + triggerRect.height + viewportPadding;
    }

    return { top, left };
  };

  const positionStyle = isVisible ? calculatePosition() : { display: 'none' };

  return (
    <div
      ref={wrapperRef}
      className="relative inline-block"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
    >
      {children}
      {content && (
        <div
          className={`fixed z-50 px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-lg transition-opacity duration-300 ${
            isVisible ? 'opacity-100 visible' : 'opacity-0 invisible'
          } ${className}`}
          style={positionStyle}
        >
          {/* 2-row layout with flexbox, ensuring arrow is centered */}
          <div className="flex flex-col items-center">
            {/* Split content into two parts if it has more than 5 words, otherwise keep as single row */}
            {typeof content === 'string' ? (
              (() => {
                const words = content.trim().split(/\s+/);
                return words.length > 5 ? (
                  <>
                    <div className="text-center">{words.slice(0, 5).join(' ')}</div>
                    <div className="text-center mt-1">{words.slice(5).join(' ')}</div>
                  </>
                ) : (
                  <div className="text-center">{content}</div>
                );
              })()
            ) : (
              <div className="text-center">{content}</div>
            )}
          </div>
          <div className="absolute w-0 h-0 border-8 border-transparent -translate-x-1/2">
            {/* Tooltip arrow based on position */}
            {position === 'top' && (
              <div className="absolute top-full left-1/2 border-8 border-transparent border-t-gray-900 -translate-x-1/2"></div>
            )}
            {position === 'bottom' && (
              <div className="absolute bottom-full left-1/2 border-8 border-transparent border-b-gray-900 -translate-x-1/2"></div>
            )}
            {position === 'left' && (
              <div className="absolute left-full top-1/2 border-8 border-transparent border-l-gray-900 -translate-y-1/2"></div>
            )}
            {position === 'right' && (
              <div className="absolute right-full top-1/2 border-8 border-transparent border-r-gray-900 -translate-y-1/2"></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Tooltip;