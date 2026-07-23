import React, { useState, useCallback, useEffect } from 'react';
import { attachmentService } from '../../services/attachmentService';
import { Icon } from './Icon';

const getFileIcon = (type) => {
  if (type.includes('image')) return 'image';
  if (type.includes('pdf')) return 'picture_as_pdf';
  if (type.includes('word')) return 'description';
  if (type.includes('excel') || type.includes('sheet')) return 'grid_on';
  if (type.includes('powerpoint') || type.includes('presentation')) return 'slideshow';
  if (type.includes('zip') || type.includes('compressed')) return 'archive';
  return 'description';
};

const AttachmentPreview = ({ attachment, onClose }) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev + 0.2, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev - 0.2, 0.5));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleDragStart = useCallback((e) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      const clientX = e.type === 'mousedown' ? e.clientX : e.touches[0].clientX;
      const clientY = e.type === 'mousedown' ? e.clientY : e.touches[0].clientY;
      setDragStart({
        x: clientX - position.x,
        y: clientY - position.y
      });
      e.preventDefault();
    }
  }, [zoomLevel, position.x, position.y]);

  const handleDragMove = useCallback((e) => {
    if (isDragging && zoomLevel > 1) {
      const clientX = e.type === 'mousemove' ? e.clientX : e.touches[0].clientX;
      const clientY = e.type === 'mousemove' ? e.clientY : e.touches[0].clientY;
      setPosition({
        x: clientX - dragStart.x,
        y: clientY - dragStart.y
      });
    }
  }, [isDragging, zoomLevel, dragStart.x, dragStart.y]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const zoomIntensity = 0.1;
    const newZoom = e.deltaY < 0 ? zoomLevel + zoomIntensity : zoomLevel - zoomIntensity;
    setZoomLevel(Math.min(Math.max(newZoom, 0.5), 3));
  }, [zoomLevel]);

  // Global mouse/touch event listeners for drag
  useEffect(() => {
    if (isDragging) {
      const handleMouseMove = (e) => handleDragMove(e);
      const handleMouseUp = () => handleDragEnd();
      const handleTouchMove = (e) => handleDragMove(e);
      const handleTouchEnd = () => handleDragEnd();

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (attachment && attachment.previewUrl) {
        window.URL.revokeObjectURL(attachment.previewUrl);
      }
    };
  }, [attachment]);

  const renderPreviewContent = () => {
    const { file_type: fileType } = attachment;

    if (fileType.includes('image')) {
      return (
        <div className="w-full h-full relative overflow-hidden">
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            <button onClick={handleZoomOut} className="p-2 bg-gray-700 text-white rounded hover:bg-gray-600" aria-label="Zoom out">
              <Icon name="zoom_out" className="" />
            </button>
            <button onClick={handleResetZoom} className="p-2 bg-gray-700 text-white rounded hover:bg-gray-600" aria-label="Reset zoom">
              <span className="text-sm">{Math.round(zoomLevel * 100)}%</span>
            </button>
            <button onClick={handleZoomIn} className="p-2 bg-gray-700 text-white rounded hover:bg-gray-600" aria-label="Zoom in">
              <Icon name="zoom_in" className="" />
            </button>
          </div>
          <div className="w-full h-full flex items-center justify-center cursor-move" onMouseDown={handleDragStart} onMouseUp={handleDragEnd}>
            <img
              src={attachment.previewUrl}
              alt={attachment.filename}
              className="max-w-none"
              style={{
                transform: `scale(${zoomLevel}) translate(${position.x}px, ${position.y}px)`,
                transition: isDragging ? 'none' : 'transform 0.1s ease',
                cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                maxWidth: '100%',
                maxHeight: '100%'
              }}
              onError={(e) => { e.target.src = '/placeholder-image.png'; }}
            />
          </div>
        </div>
      );
    } else if (fileType.includes('pdf')) {
      return (
        <div className="w-full h-full">
          <object data={attachment.previewUrl} type="application/pdf" className="w-full h-full" width="100%" height="100%">
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <p className="text-lg font-medium text-gray-800 dark:text-white mb-2">Unable to display PDF</p>
              <p className="text-gray-600 dark:text-gray-300 mb-4">This PDF cannot be displayed in your browser.</p>
              <a href={attachment.previewUrl} download={attachment.filename} className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark">Download PDF</a>
            </div>
          </object>
        </div>
      );
    } else if (fileType.includes('text/plain') || attachment.filename.toLowerCase().endsWith('.txt')) {
      return (
        <div className="w-full h-full bg-white dark:bg-gray-900 p-4 overflow-auto">
          <iframe
            src={attachment.previewUrl}
            className="w-full h-full border-0 text-gray-800 dark:text-gray-200"
            title="Text file preview"
            onLoad={(e) => {
              try {
                const iframeDoc = e.target.contentDocument || e.target.contentWindow.document;
                if (iframeDoc) {
                  iframeDoc.body.style.fontFamily = 'monospace, sans-serif';
                  iframeDoc.body.style.fontSize = '14px';
                  iframeDoc.body.style.whiteSpace = 'pre-wrap';
                  iframeDoc.body.style.wordWrap = 'break-word';
                }
              } catch (err) { /* cross-origin */ }
            }}
          />
        </div>
      );
    } else if (fileType.includes('audio/')) {
      return (
        <div className="w-full h-full flex flex-col">
          <div className="flex-1 flex items-center justify-center p-4">
            <audio src={attachment.previewUrl} controls className="w-full max-w-2xl h-16">
              Your browser does not support the audio element.
            </audio>
          </div>
        </div>
      );
    } else if (fileType.includes('video/')) {
      return (
        <div className="w-full h-full flex flex-col">
          <div className="flex-1 flex items-center justify-center p-4">
            <video src={attachment.previewUrl} controls className="max-h-full max-w-full"
              onError={(e) => {
                e.target.style.display = 'none';
                const fallbackDiv = document.createElement('div');
                fallbackDiv.className = 'flex flex-col items-center justify-center h-full p-8 text-center';
                fallbackDiv.innerHTML = `
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-6xl text-gray-400 mb-4"><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>
                  <p class="text-lg font-medium text-gray-800 dark:text-white mb-2">Unable to play video</p>
                  <p class="text-gray-600 dark:text-gray-300 mb-4">This video cannot be played in your browser.</p>
                `;
                e.target.parentNode.appendChild(fallbackDiv);
              }}
            >
              Your browser does not support the video element.
            </video>
          </div>
        </div>
      );
    } else {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <Icon name={getFileIcon(fileType)} className="text-6xl text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-800 dark:text-white mb-2">Preview not available</p>
          <p className="text-gray-600 dark:text-gray-300 mb-4">This file type cannot be previewed directly in the browser.</p>
          <button
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
            onClick={async () => {
              try {
                const blob = await attachmentService.downloadAttachment(attachment.id);
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = attachment.filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setTimeout(() => window.URL.revokeObjectURL(url), 1000);
              } catch (error) {
                alert('Failed to download attachment: ' + (error.message || 'Unknown error'));
              }
            }}
          >
            <Icon name="download" className="mr-1" />
            Download File
          </button>
        </div>
      );
    }
  };

  const handleDownload = async () => {
    try {
      const blob = await attachmentService.downloadAttachment(attachment.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (error) {
      alert('Failed to download attachment: ' + (error.message || 'Unknown error'));
    }
  };

  const handlePrint = () => {
    if (attachment.file_type.includes('image')) {
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <!DOCTYPE html>
        <html><head><title>Print Image</title>
        <style>body{margin:0;padding:20px;display:flex;justify-content:center;align-items:center;min-height:100vh;background:white}img{max-width:100%;max-height:100vh;object-fit:contain}</style>
        </head><body><img src="${attachment.previewUrl}" alt="Print Preview" /></body></html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    } else if (attachment.file_type.includes('text/plain') || attachment.filename.toLowerCase().endsWith('.txt')) {
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <!DOCTYPE html>
        <html><head><title>Print Text</title>
        <style>body{margin:20px;font-family:monospace;font-size:14px;white-space:pre-wrap;word-wrap:break-word;background:white;color:black}</style>
        </head><body><pre style="margin:0;">${attachment.previewUrl}</pre></body></html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    } else {
      alert('Printing is only available for image and text files');
    }
  };

  const showPrintButton = !attachment.file_type.includes('pdf') &&
    (attachment.file_type.includes('image') || attachment.file_type.includes('text/plain') || attachment.filename.toLowerCase().endsWith('.txt'));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-[99999] flex flex-col">
      <div className="flex justify-between items-center p-4 bg-gray-900 text-white">
        <p className="truncate max-w-xs">{attachment.filename}</p>
        <div className="flex items-center gap-2">
          <button onClick={handleDownload} className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 text-white" aria-label="Save">
            <Icon name="download" className="" />
          </button>
          {showPrintButton && (
            <button onClick={handlePrint} className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 text-white" aria-label="Print">
              <Icon name="print" className="" />
            </button>
          )}
          <button onClick={onClose} className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 text-white" aria-label="Close preview">
            <Icon name="close" className="" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-gray-800 text-white">
        {renderPreviewContent()}
      </div>
    </div>
  );
};

export default AttachmentPreview;
