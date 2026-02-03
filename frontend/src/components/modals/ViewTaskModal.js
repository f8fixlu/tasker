import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { attachmentService } from '../../services/attachmentService';

const ViewTaskModal = ({ isOpen, onClose, task, onEdit, onTaskUpdate }) => {
  const [attachments, setAttachments] = useState([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  
  // Load attachments when the modal opens and task data is available
  useEffect(() => {
    const loadAttachments = async () => {
      if (isOpen && task && task.id) {
        try {
          setLoadingAttachments(true);
          const response = await attachmentService.getAttachmentsByEntity(task.id, 'task');
          setAttachments(response.attachments || []);
        } catch (error) {
          console.error('Error fetching attachments:', error);
          // If there's an error, set to empty array instead of showing mock data
          setAttachments([]);
        } finally {
          setLoadingAttachments(false);
        }
      } else if (isOpen) {
        // If task is not provided, set empty attachments
        setAttachments([]);
      }
    };
    
    loadAttachments();
  }, [isOpen, task]);

  // Use the actual task data if provided, otherwise show empty state
  const taskData = task || {};

  const [previewAttachment, setPreviewAttachment] = useState(null);
  const portalRoot = useRef(document.body);

  const getFileIcon = (type) => {
    if (type.includes('image')) return 'image';
    if (type.includes('pdf')) return 'picture_as_pdf';
    if (type.includes('word')) return 'description';
    if (type.includes('excel') || type.includes('sheet')) return 'grid_on';
    if (type.includes('powerpoint') || type.includes('presentation')) return 'slideshow';
    if (type.includes('zip') || type.includes('compressed')) return 'archive';
    return 'description';
  };

  const handlePreview = async (attachment) => {
    try {
      // Download the attachment to create a preview
      const blob = await attachmentService.downloadAttachment(attachment.id);

      // Create a temporary URL for the file for preview
      const url = window.URL.createObjectURL(blob);

      // Set the attachment and URL for preview
      setPreviewAttachment({
        ...attachment,
        previewUrl: url
      });
    } catch (error) {
      console.error('Error downloading attachment for preview:', error);
      // Check if the error is a 403 Forbidden error
      if (error.response && error.response.status === 403) {
        alert('Access denied: You do not have permission to view this attachment. Please contact your administrator.');
      } else {
        alert('Failed to preview attachment: ' + (error.message || 'Unknown error'));
      }
    }
  };

  const closePreview = () => {
    // Revoke the preview URL to free memory
    if (previewAttachment && previewAttachment.previewUrl) {
      window.URL.revokeObjectURL(previewAttachment.previewUrl);
    }
    setPreviewAttachment(null);
  };

  const downloadAttachment = (attachment) => {
    // Create a temporary link to trigger download
    const link = document.createElement('a');
    link.href = attachment.previewUrl;
    link.download = attachment.filename; // Use the original filename
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
  };

  // State for image zoom and drag functionality
  const [zoomLevel, setZoomLevel] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Function to handle zoom in
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.2, 3)); // Max zoom level 3x
  };

  // Function to handle zoom out
  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.2, 0.5)); // Min zoom level 0.5x
  };

  // Function to reset zoom
  const handleResetZoom = () => {
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });
  };

  // Function to handle drag start
  const handleDragStart = (e) => {
    if (zoomLevel > 1) { // Only allow dragging when zoomed in
      setIsDragging(true);
      const clientX = e.type === 'mousedown' ? e.clientX : e.touches[0].clientX;
      const clientY = e.type === 'mousedown' ? e.clientY : e.touches[0].clientY;
      setDragStart({
        x: clientX - position.x,
        y: clientY - position.y
      });
      e.preventDefault();
    }
  };

  // Function to handle drag move
  const handleDragMove = (e) => {
    if (isDragging && zoomLevel > 1) {
      const clientX = e.type === 'mousemove' ? e.clientX : e.touches[0].clientX;
      const clientY = e.type === 'mousemove' ? e.clientY : e.touches[0].clientY;
      setPosition({
        x: clientX - dragStart.x,
        y: clientY - dragStart.y
      });
    }
  };

  // Function to handle drag end
  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Function to handle wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomIntensity = 0.1;
    const newZoom = e.deltaY < 0 ? zoomLevel + zoomIntensity : zoomLevel - zoomIntensity;
    setZoomLevel(Math.min(Math.max(newZoom, 0.5), 3)); // Clamp between 0.5 and 3
  };

  // Function to render the preview content based on file type (without header/buttons)
  const renderPreviewContent = (attachment) => {
    const { file_type: fileType } = attachment;
    
    if (fileType.includes('image')) {
      // Render zoomable image
      return (
        <div 
          className="w-full h-full relative overflow-hidden"
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
          onWheel={handleWheel}
        >
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            <button 
              onClick={handleZoomOut}
              className="p-2 bg-gray-700 text-white rounded hover:bg-gray-600"
              aria-label="Zoom out"
            >
              <span className="material-symbols-outlined">zoom_out</span>
            </button>
            <button 
              onClick={handleResetZoom}
              className="p-2 bg-gray-700 text-white rounded hover:bg-gray-600"
              aria-label="Reset zoom"
            >
              <span className="text-sm">{Math.round(zoomLevel * 100)}%</span>
            </button>
            <button 
              onClick={handleZoomIn}
              className="p-2 bg-gray-700 text-white rounded hover:bg-gray-600"
              aria-label="Zoom in"
            >
              <span className="material-symbols-outlined">zoom_in</span>
            </button>
          </div>
          
          <div 
            className="w-full h-full flex items-center justify-center cursor-move"
            onMouseDown={handleDragStart}
            onMouseUp={handleDragEnd}
          >
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
              onError={(e) => {
                console.error('Error loading image preview');
                e.target.src = '/placeholder-image.png'; // fallback image
              }}
            />
          </div>
        </div>
      );
    } else if (fileType.includes('pdf')) {
      // Render PDF using object tag
      return (
        <div className="w-full h-full">
          <object 
            data={attachment.previewUrl} 
            type="application/pdf" 
            className="w-full h-full"
            width="100%" 
            height="100%"
          >
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <p className="text-lg font-medium text-gray-800 dark:text-white mb-2">Unable to display PDF</p>
              <p className="text-gray-600 dark:text-gray-300 mb-4">This PDF cannot be displayed in your browser.</p>
              <a 
                href={attachment.previewUrl} 
                download={attachment.filename}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
              >
                Download PDF
              </a>
            </div>
          </object>
        </div>
      );
    } else if (fileType.includes('text/plain') || attachment.filename.toLowerCase().endsWith('.txt')) {
      // For text files, render content using iframe to prevent XSS
      return (
        <div className="w-full h-full bg-white dark:bg-gray-900 p-4 overflow-auto">
          <iframe 
            src={attachment.previewUrl}
            className="w-full h-full border-0 text-gray-800 dark:text-gray-200"
            title="Text file preview"
            onLoad={(e) => {
              // Style the text content inside iframe
              try {
                const iframeDoc = e.target.contentDocument || e.target.contentWindow.document;
                if (iframeDoc) {
                  iframeDoc.body.style.fontFamily = 'monospace, sans-serif';
                  iframeDoc.body.style.fontSize = '14px';
                  iframeDoc.body.style.whiteSpace = 'pre-wrap';
                  iframeDoc.body.style.wordWrap = 'break-word';
                }
              } catch (err) {
                // If there's an error accessing iframe content (due to security policies),
                // the text might be in a different format, so use a fallback
              }
            }}
          />
        </div>
      );
    } else if (fileType.includes('audio/')) {
      // For audio files, render audio player
      return (
        <div className="w-full h-full flex flex-col">
          <div className="flex-1 flex items-center justify-center p-4">
            <audio 
              src={attachment.previewUrl} 
              controls 
              className="w-full max-w-2xl h-16"
              onLoadedMetadata={(e) => {
                e.target.style.display = 'block';
              }}
            >
              Your browser does not support the audio element.
            </audio>
          </div>
        </div>
      );
    } else if (fileType.includes('video/')) {
      // For video files, render video player
      return (
        <div className="w-full h-full flex flex-col">
          <div className="flex-1 flex items-center justify-center p-4">
            <video 
              src={attachment.previewUrl} 
              controls 
              className="max-h-full max-w-full"
              onError={(e) => {
                console.error('Error loading video preview');
                // Fallback to providing download option
                e.target.style.display = 'none';
                const fallbackDiv = document.createElement('div');
                fallbackDiv.className = 'flex flex-col items-center justify-center h-full p-8 text-center';
                fallbackDiv.innerHTML = `
                  <span class="material-symbols-outlined text-6xl text-gray-400 mb-4">movie</span>
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
      // For other file types, provide download button
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <span className="material-symbols-outlined text-6xl text-gray-400 mb-4">
            {getFileIcon(fileType)}
          </span>
          <p className="text-lg font-medium text-gray-800 dark:text-white mb-2">Preview not available</p>
          <p className="text-gray-600 dark:text-gray-300 mb-4">This file type cannot be previewed directly in the browser.</p>
          <Button variant="primary" onClick={() => downloadAttachment(attachment)}>
            <span className="material-symbols-outlined mr-1">download</span>
            Download File
          </Button>
        </div>
      );
    }
  };

  const getFileSizeDisplay = (size) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={taskData.title || "Task Details"} size="lg">
      <div className="p-4">
        
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm mb-6">
          <div>
            <label className="block text-gray-500 dark:text-gray-400 font-medium">Task Date</label>
            <p className="text-gray-800 dark:text-white mt-1">{taskData.taskDate}</p>
          </div>
          <div>
            <label className="block text-gray-500 dark:text-gray-400 font-medium">Due Date</label>
            <p className="text-gray-800 dark:text-white mt-1">{taskData.dueDate}</p>
          </div>
          <div>
            <label className="block text-gray-500 dark:text-gray-400 font-medium">Created Date</label>
            <p className="text-gray-800 dark:text-white mt-1">{taskData.createdDate}</p>
          </div>
          <div>
            <label className="block text-gray-500 dark:text-gray-400 font-medium">Last Edited</label>
            <p className="text-gray-800 dark:text-white mt-1">{taskData.editedDate}</p>
          </div>
          <div>
            <label className="block text-gray-500 dark:text-gray-400 font-medium">Status</label>
            <div className={`mt-1 inline-block px-3 py-1 rounded-full text-xs font-medium ${
              taskData.status === 'Completed'
                ? 'bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-400'
                : taskData.status === 'In Progress'
                  ? 'bg-warning-100 text-warning-800 dark:bg-warning-900/30 dark:text-warning-400'
                  : taskData.status === 'Overdue'
                    ? 'bg-error-100 text-error-800 dark:bg-error-900/30 dark:text-error-400'
                    : taskData.status === 'Archived'
                      ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      : 'bg-danger-100 text-danger-800 dark:bg-danger-900/30 dark:text-danger-400'
            }`}>
              {taskData.status}
            </div>
          </div>
          <div>
            <label className="block text-gray-500 dark:text-gray-400 font-medium">Category</label>
            <p className="text-gray-800 dark:text-white mt-1">{taskData.category}</p>
          </div>
          <div>
            <label className="block text-gray-500 dark:text-gray-400 font-medium">Task Type</label>
            <p className="text-gray-800 dark:text-white mt-1">{taskData.type}</p>
          </div>
          <div>
            <label className="block text-gray-500 dark:text-gray-400 font-medium">Sub Type</label>
            <p className="text-gray-800 dark:text-white mt-1">{taskData.subType}</p>
          </div>
          <div>
            <label className="block text-gray-500 dark:text-gray-400 font-medium">Quantity</label>
            <p className="text-gray-800 dark:text-white mt-1">{taskData.quantity}</p>
          </div>
          <div>
            <label className="block text-gray-500 dark:text-gray-400 font-medium">Priority</label>
            <div className="flex items-center gap-2 mt-1">
              <span className={`size-3 rounded-full ${
                taskData.priority === 'High' ? 'bg-red-500' : 
                taskData.priority === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
              }`}></span>
              <p className="text-gray-800 dark:text-white">{taskData.priority}</p>
            </div>
          </div>
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-500 dark:text-gray-400 font-medium mb-2">Description</label>
          <p className="text-gray-800 dark:text-white text-sm">{taskData.description}</p>
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-500 dark:text-gray-400 font-medium mb-2">Attachments</label>
          {loadingAttachments ? (
            <div className="flex items-center justify-center h-20">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Loading attachments...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {attachments && attachments.length > 0 ? (
                attachments.map(attachment => (
                  <div
                    key={attachment.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                    onClick={() => handlePreview(attachment)}
                  >
                    <span className="material-symbols-outlined text-gray-500 text-2xl flex-shrink-0">
                      {getFileIcon(attachment.file_type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate" title={attachment.filename}>{attachment.filename}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{getFileSizeDisplay(attachment.file_size)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">No attachments</p>
              )}
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-3">
          <Button 
            variant="outline"
            onClick={onClose}
          >
            Close
          </Button>
          <Button 
            variant="primary"
            className="flex items-center gap-2"
            onClick={() => {
              console.log('Edit button clicked', { task, onEdit: !!onEdit });
              if (onEdit) {
                console.log('Calling onEdit with task:', task);
                onEdit(task, onTaskUpdate); // Pass the onTaskUpdate callback
              } else {
                console.error('onEdit function is not provided');
              }
            }}
          >
            <span className="material-symbols-outlined text-base">edit</span>
            Edit Task
          </Button>
        </div>
      </div>

      {/* Attachment Preview Modal using React Portal */}
      {previewAttachment && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-90 z-[99999] flex flex-col">
          <div className="flex justify-between items-center p-4 bg-gray-900 text-white">
            <p className="truncate max-w-xs">{previewAttachment.filename}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => downloadAttachment(previewAttachment)}
                className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 text-white"
                aria-label="Save"
              >
                <span className="material-symbols-outlined">download</span>
              </button>
              {!previewAttachment.file_type.includes('pdf') && 
               (previewAttachment.file_type.includes('image') || 
                previewAttachment.file_type.includes('text/plain') ||
                previewAttachment.filename.toLowerCase().endsWith('.txt')) && (
                <button
                  onClick={() => {
                    if (previewAttachment.file_type.includes('image')) {
                      // Create a new window with the image for proper printing
                      const printWindow = window.open('', '_blank');
                      printWindow.document.write(`
                        <!DOCTYPE html>
                        <html>
                          <head>
                            <title>Print Image</title>
                            <style>
                              body { 
                                margin: 0; 
                                padding: 20px; 
                                display: flex; 
                                justify-content: center; 
                                align-items: center; 
                                min-height: 100vh; 
                                background: white; 
                              }
                              img { 
                                max-width: 100%; 
                                max-height: 100vh; 
                                object-fit: contain; 
                              }
                            </style>
                          </head>
                          <body>
                            <img src="${previewAttachment.previewUrl}" alt="Print Preview" />
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                      printWindow.focus();
                      printWindow.print();
                    } else if (previewAttachment.file_type.includes('text/plain') || 
                               previewAttachment.filename.toLowerCase().endsWith('.txt')) {
                      // Create a new window with the text for proper printing
                      const printWindow = window.open('', '_blank');
                      printWindow.document.write(`
                        <!DOCTYPE html>
                        <html>
                          <head>
                            <title>Print Text</title>
                            <style>
                              body { 
                                margin: 20px; 
                                font-family: monospace;
                                font-size: 14px;
                                white-space: pre-wrap;
                                word-wrap: break-word;
                                background: white; 
                                color: black;
                              }
                            </style>
                          </head>
                          <body>
                            <pre style="margin: 0;">${previewAttachment.previewUrl}</pre>
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                      printWindow.focus();
                      printWindow.print();
                    } else {
                      // For other non-PDF files, we can't really print effectively
                      alert('Printing is only available for image and text files');
                    }
                  }}
                  className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 text-white"
                  aria-label="Print"
                >
                  <span className="material-symbols-outlined">print</span>
                </button>
              )}
              <button
                onClick={closePreview}
                className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 text-white"
                aria-label="Close preview"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto bg-gray-800 text-white">
            {renderPreviewContent(previewAttachment)}
          </div>
        </div>,
        document.body
      )}
    </Modal>
  );
};

export default ViewTaskModal;