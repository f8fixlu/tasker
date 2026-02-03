import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { reportsService } from '../services/reportsService';

const PrintReport = () => {
  const { user } = useAuth();
  const [pageSize, setPageSize] = useState('a4');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // This is mock data for the report - in real implementation, this would come from API
  const [signatoryData, setSignatoryData] = useState({
    preparedBy: { name: '', position: '' },
    reviewedBy: { name: '', position: '' },
    notedBy: { name: '', position: '' }
  });

  // Helper function to determine if signature section has all 9 lines (all fields populated)
  const hasAllSignatureFields = () => {
    const hasPreparedByName = !!reportData?.signatureSection.preparedBy.name;
    const hasPreparedByPosition = !!reportData?.signatureSection.preparedBy.position;
    const hasReviewedByName = !!reportData?.signatureSection.reviewedBy.name;
    const hasReviewedByPosition = !!reportData?.signatureSection.reviewedBy.position;
    const hasNotedByName = !!reportData?.signatureSection.notedBy.name;
    const hasNotedByPosition = !!reportData?.signatureSection.notedBy.position;

    // All 6 fields (3 names and 3 positions) need to be populated to have all 9 lines
    return hasPreparedByName && hasPreparedByPosition &&
           hasReviewedByName && hasReviewedByPosition &&
           hasNotedByName && hasNotedByPosition;
  };

  // Load signatory data from local storage or API
  const loadSignatoryData = () => {
    if (user) {
      try {
        const savedSignatories = localStorage.getItem(`signatories_${user?.id}`);
        if (savedSignatories) {
          setSignatoryData(JSON.parse(savedSignatories));
        }
      } catch (error) {
        console.error('Error loading signatory data:', error);
        // Set default values if there's an error
        setSignatoryData({
          preparedBy: { name: '', position: '' },
          reviewedBy: { name: '', position: '' },
          notedBy: { name: '', position: '' }
        });
      }
    }
  };

  useEffect(() => {
    loadSignatoryData();
  }, [user]);

  const mockReportData = {
    title: "ACCOMPLISHMENT REPORT",
    period: "For the period of August 1-31, 2025",
    tasksByDate: [
      {
        date: "August 1",
        tasks: [
          "Sealed and scanned 10 CAV documents - batch 1",
          "Released 10 CAV documents (for abroad) - batch 1",
          "Sealed and scanned 15 CAV documents - batch 1",
          "Released 15 CAV documents (for abroad) - batch 1",
          "Closed 17 communication documents from gdrive – batch 1"
        ]
      },
      {
        date: "August 4",
        tasks: [
          "Attended the Asean month celebration and joined the quiz bee contest",
          "Sealed and scanned 15 CAV documents - batch 1",
          "Released 15 CAV documents (for abroad) - batch 1"
        ]
      },
      {
        date: "August 5",
        tasks: [
          "Sealed and scanned 8 CAV documents - batch 1",
          "Released 8 CAV documents (for abroad) - batch 1",
          "Scanned 6 purchase order and/or procurement documents and attachments",
          "Filed 16 released communication batch 1 (indorsement, acknowledgement, ER/PR, others)",
          "Filed 4 released communication batch 1 (Correction of names)",
          "Filed 19 released communication batch 2 (indorsement, acknowledgement, ER/PR, others)",
          "Closed 28 communication documents from gdrive – batch 1"
        ]
      },
      {
        date: "August 6",
        tasks: [
          "Sealed and scanned 12 CAV documents - batch 2",
          "Released 12 CAV documents (for abroad) - batch 2",
          "Scanned 8 purchase order and/or procurement documents and attachments",
          "Filed 14 released communication batch 3 (indorsement, acknowledgement, ER/PR, others)",
          "Filed 3 released communication batch 3 (Correction of names)",
          "Closed 22 communication documents from gdrive – batch 2",
          "Attended technical working group meeting for process improvement",
          "Assisted in document verification for scholarship applications",
          "Prepared monthly summary report for supervisor",
          "Updated tracking system for pending applications",
          "Coordinated with other departments for document verification",
          "Processed 50+ telephone inquiries regarding application status",
          "Organized and archived completed files for July",
          "Attended professional development webinar",
          "Completed compliance checklist for monthly review"
        ]
      }
    ],
    signatureSection: {
      preparedBy: signatoryData.preparedBy,
      reviewedBy: signatoryData.reviewedBy,
      notedBy: signatoryData.notedBy
    }
  };

  useEffect(() => {
    // In a real implementation, this would fetch from the API
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call when backend is ready
      // const data = await reportsService.getReportData();
      setReportData(mockReportData);
      setError(null);
    } catch (err) {
      console.error('Error fetching report data:', err);
      setError('Failed to fetch report data');
      setReportData(mockReportData); // Use mock data as fallback
    } finally {
      setLoading(false);
    }
  };

  const handlePageSizeChange = (e) => {
    setPageSize(e.target.value);
  };

  const handlePrint = () => {
    window.print();
  };

  // Calculate pages based on content, ensuring signature section is never cut
  // In a real implementation, this would be dynamic based on content
  let pages = [];

  if (reportData) {
    // Add content pages
    pages.push(
      { id: 1, tasks: reportData.tasksByDate.slice(0, 3) },
      { id: 2, tasks: [reportData.tasksByDate[3]] }
    );

    // Check if signature section exists and add it on a separate page
    const hasSignature = reportData?.signatureSection.preparedBy.name ||
                        reportData?.signatureSection.preparedBy.position ||
                        reportData?.signatureSection.reviewedBy.name ||
                        reportData?.signatureSection.reviewedBy.position ||
                        reportData?.signatureSection.notedBy.name ||
                        reportData?.signatureSection.notedBy.position;

    if (hasSignature) {
      // Add a separate page for the signature section to prevent cutting
      pages.push({ id: pages.length + 1, isSignaturePage: true });
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error! </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`bg-gray-100 dark:bg-gray-800 flex flex-col min-h-screen ${pageSize === 'a4' ? 'paper-a4' : pageSize === 'letter' ? 'paper-letter' : 'paper-folio'}`}
      style={{ fontFamily: "'Bookman Old Style', serif" }}
    >
      {/* Print Controls (Hidden in print view) */}
      <div className="w-full max-w-7xl flex justify-end items-center px-4 py-4 no-print sticky top-0 z-50" style={{ backgroundColor: "transparent" }}>
        <div className="flex items-center space-x-4 bg-white p-3 rounded-lg shadow">
          {/* Export to PDF Button - would need html2pdf.js implementation */}
          <button 
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded inline-flex items-center"
            onClick={() => alert('PDF export functionality would be implemented here')}
          >
            <svg className="fill-current w-4 h-4 mr-2" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 8V2H7v6H2v8h20V8h-9zM7 12H5v-2h2v2zm10 0h-2v-2h2v2z"></path>
              <path d="M.002 10h4v2h-4zM16.002 10h4v2h-4z"></path>
            </svg>
            <span>Export as PDF</span>
          </button>
          
          {/* Page Size Dropdown */}
          <div>
            <label className="sr-only" htmlFor="page-size">Page Size</label>
            <select 
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md" 
              id="page-size" 
              name="page-size"
              value={pageSize}
              onChange={handlePageSizeChange}
            >
              <option value="a4">A4</option>
              <option value="letter">Letter</option>
              <option value="folio">Folio</option>
            </select>
          </div>
          
          {/* Print Button */}
          <button 
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded inline-flex items-center"
            onClick={handlePrint}
          >
            <svg className="fill-current w-4 h-4 mr-2" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path d="M17 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2zM5 7a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1H5z"></path>
              <path d="M4 3a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm12 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2zM7 15a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-1H7v1z"></path>
            </svg>
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Document Content (Visible in both screen and print) */}
      <div id="print-area" className="page-container">
        {pages.map((page, index) => {
          // Check if this is a signature page
          if (page.isSignaturePage) {
            // Render signature-only page
            return (
              <div
                key={`page-${page.id}`}
                className={`page ${pageSize === 'a4' ? 'paper-a4' : pageSize === 'letter' ? 'paper-letter' : 'paper-folio'}`}
                id={`page-${page.id}`}
              >
                {/* Page Header */}
                <header className="page-header">
                  <div className="flex items-center justify-center space-x-0.5">
                    <img
                      src="/logo/logoleft.png"
                      alt="Left Logo"
                      className="h-16 w-16 flex-shrink-0 rounded"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        const span = document.createElement('span');
                        span.className = 'text-xs text-gray-500';
                        span.textContent = 'Logo';
                        e.target.parentNode.appendChild(span);
                      }}
                    />
                    <div className="text-center px-1">
                      <p style={{ fontSize: '10pt' }}>Republic of the Philippines</p>
                      <p style={{ fontSize: '10pt' }}>OFFICE OF THE PRESIDENT</p>
                      <p style={{ fontSize: '10pt', fontWeight: 'bold' }}>COMMISSION ON HIGHER EDUCATION</p>
                      <p style={{ fontSize: '10pt' }}>Regional Office I</p>
                      <p className="mb-4" style={{ fontSize: '10pt' }}>San Fernando City, La Union</p>
                    </div>
                    <img
                      src="/logo/logoright.png"
                      alt="Right Logo"
                      className="h-16 w-16 flex-shrink-0 rounded"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        const span = document.createElement('span');
                        span.className = 'text-xs text-gray-500';
                        span.textContent = 'Logo';
                        e.target.parentNode.appendChild(span);
                      }}
                    />
                  </div>
                </header>

                {/* Page Content */}
                <div className="page-content">
                  <main className="mt-8 flex flex-col justify-center items-center h-full">
                    {/* Empty space to center the signature section */}
                    <div style={{ flex: 1 }}></div>

                    {/* Signature section on its own page */}
                    <footer className="mt-12" style={{ breakInside: 'avoid' }}>
                      {(reportData?.signatureSection.preparedBy.name || reportData?.signatureSection.preparedBy.position) && (
                        <div className="flex justify-between" style={{ breakInside: 'avoid' }}>
                          <div className="w-1/2" style={{ breakInside: 'avoid' }}>
                            <p style={{ fontSize: '12pt' }}>Prepared by:</p>
                            <div className="mt-8" style={{ breakInside: 'avoid' }}>
                              {reportData?.signatureSection.preparedBy.name && (
                                <p className="font-bold mt-4" style={{ fontSize: '12pt' }}>{reportData?.signatureSection.preparedBy.name}</p>
                              )}
                              {reportData?.signatureSection.preparedBy.position && (
                                <p className="mt-2" style={{ fontSize: '12pt' }}>{reportData?.signatureSection.preparedBy.position}</p>
                              )}
                            </div>
                          </div>
                          <div className="w-1/2" style={{ breakInside: 'avoid' }}>
                            {(reportData?.signatureSection.reviewedBy.name || reportData?.signatureSection.reviewedBy.position) && (
                              <>
                                <p style={{ fontSize: '12pt' }}>Reviewed by:</p>
                                <div className="mt-8" style={{ breakInside: 'avoid' }}>
                                  {reportData?.signatureSection.reviewedBy.name && (
                                    <p className="font-bold mt-4" style={{ fontSize: '12pt' }}>{reportData?.signatureSection.reviewedBy.name}</p>
                                  )}
                                  {reportData?.signatureSection.reviewedBy.position && (
                                    <p className="mt-2" style={{ fontSize: '12pt' }}>{reportData?.signatureSection.reviewedBy.position}</p>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                      {(reportData?.signatureSection.notedBy.name || reportData?.signatureSection.notedBy.position) && (
                        <div className="mt-8" style={{ breakInside: 'avoid' }}>
                          <p style={{ fontSize: '12pt' }}>Noted by:</p>
                          <div className="mt-8" style={{ breakInside: 'avoid' }}>
                            {reportData?.signatureSection.notedBy.name && (
                              <p className="font-bold mt-4" style={{ fontSize: '12pt' }}>{reportData?.signatureSection.notedBy.name}</p>
                            )}
                            {reportData?.signatureSection.notedBy.position && (
                              <p className="mt-2" style={{ fontSize: '12pt' }}>{reportData?.signatureSection.notedBy.position}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </footer>

                    {/* Empty space to center the signature section */}
                    <div style={{ flex: 2 }}></div>
                  </main>
                </div>

                {/* Page Footer */}
                <div className="page-footer" style={{ fontSize: '12pt' }}>Page {page.id} of {pages.length}</div>
              </div>
            );
          } else {
            // Render regular content page
            return (
              <div
                key={`page-${page.id}`}
                className={`page ${pageSize === 'a4' ? 'paper-a4' : pageSize === 'letter' ? 'paper-letter' : 'paper-folio'}`}
                id={`page-${page.id}`}
              >
                {/* Page Header */}
                <header className="page-header">
                  <div className="flex items-center justify-center space-x-0.5">
                    <img
                      src="/logo/logoleft.png"
                      alt="Left Logo"
                      className="h-16 w-16 flex-shrink-0 rounded"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        const span = document.createElement('span');
                        span.className = 'text-xs text-gray-500';
                        span.textContent = 'Logo';
                        e.target.parentNode.appendChild(span);
                      }}
                    />
                    <div className="text-center px-1">
                      <p style={{ fontSize: '10pt' }}>Republic of the Philippines</p>
                      <p style={{ fontSize: '10pt' }}>OFFICE OF THE PRESIDENT</p>
                      <p style={{ fontSize: '10pt', fontWeight: 'bold' }}>COMMISSION ON HIGHER EDUCATION</p>
                      <p style={{ fontSize: '10pt' }}>Regional Office I</p>
                      <p className="mb-4" style={{ fontSize: '10pt' }}>San Fernando City, La Union</p>
                    </div>
                    <img
                      src="/logo/logoright.png"
                      alt="Right Logo"
                      className="h-16 w-16 flex-shrink-0 rounded"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        const span = document.createElement('span');
                        span.className = 'text-xs text-gray-500';
                        span.textContent = 'Logo';
                        e.target.parentNode.appendChild(span);
                      }}
                    />
                  </div>
                </header>

                {/* Page Content */}
                <div className="page-content">
                  <main className="mt-8">
                    {index === 0 && (
                      <>
                        <h1 className="text-center font-bold tracking-wider" style={{ fontSize: '12pt' }}>{reportData?.title}</h1>
                        <p className="text-center mt-1" style={{ fontSize: '12pt' }}>{reportData?.period}</p>
                      </>
                    )}

                    <div className="mt-8 space-y-6">
                      {page.tasks.map((dateGroup, dateIndex) => (
                        <div key={`date-${dateIndex}`}>
                          <h2 className="font-bold" style={{ fontSize: '12pt' }}>Tasks/Activities Undertaken ({dateGroup.date}):</h2>
                          <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                            {dateGroup.tasks.map((task, taskIndex) => (
                              <li key={`task-${index}-${dateIndex}-${taskIndex}`} style={{ fontSize: '12pt' }}>{task}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </main>
                </div>

                {/* Page Footer */}
                <div className="page-footer" style={{ fontSize: '12pt' }}>Page {page.id} of {pages.length}</div>
              </div>
            );
          }
        })}
      </div>

      <style jsx>{`
        .text-12pt {
          font-size: 12pt !important;
        }
        
        .paper-a4 {
          width: 210mm;
          min-height: 297mm;
        }
        
        .paper-letter {
          width: 215.9mm;
          min-height: 279.4mm;
        }
        
        .paper-folio {
          width: 215.9mm;
          min-height: 330.2mm;
        }
        
        .page {
          position: relative;
          background: white;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
          margin: 1rem auto;
          display: flex;
          flex-direction: column;
          break-inside: avoid;
        }
        
        .page-header {
          padding: 1.5cm 1.5cm 0 1.5cm;
          flex-shrink: 0;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .page-footer {
          position: absolute;
          bottom: 0.5cm;
          right: 1.5cm;
          font-size: 10pt;
          padding: 0;
        }
        
        .page-content {
          padding: 0 1.5cm 1.5cm 1.5cm;
          flex-grow: 1;
          display: flex;
          flex-direction: column;
        }
        
        .page-break-after {
          page-break-after: always;
        }
        
        .page-break-before {
          page-break-before: always;
        }
        
        .no-print {
          background-color: #f3f4f6;
        }
        
        /* Print-specific styles */
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
            background: white;
            margin: 0;
            padding: 0;
            font-family: 'Bookman Old Style', serif;
          }
          
          .no-print {
            display: none !important;
          }
          
          .page {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            min-height: 100vh !important;
            height: 100vh !important;
            box-shadow: none !important;
            display: block !important;
            position: relative !important;
            page-break-inside: auto !important;
          }
          
          .page:not(:last-child) {
            page-break-after: always !important;
          }
          
          .page-header {
            padding: 1.5cm 1.5cm 0 1.5cm !important;
            display: block !important;
            position: static !important;
            width: 100% !important;
            box-sizing: border-box !important;
            border-bottom: 1px solid #e5e7eb !important;
          }
          
          .page-header .text-10pt {
            font-size: 10pt !important;
          }
          
          .page-content {
            display: block !important;
            position: static !important;
            width: 100% !important;
            box-sizing: border-box !important;
            padding: 0 1.5cm 1.5cm 1.5cm !important;
          }
          
          .page-footer {
            position: absolute !important;
            bottom: 0.2cm !important;
            right: 1.5cm !important;
            width: auto !important;
            text-align: right !important;
            padding: 0 !important;
            font-size: 10pt !important;
          }
          
          .page-header .text-10pt {
            font-size: 10pt !important;
          }
          
          @page {
            margin: 0.5cm;
          }
          
          @page :first {
            margin-top: 0.5cm;
          }
          
          thead { 
            display: table-header-group; 
          }
          
          tfoot { 
            display: table-footer-group; 
          }
        }
        
        /* Screen-specific layout adjustments */
        @media screen {
          body {
            background-color: #e5e7eb;
            padding: 1rem;
          }
          
          .page-container {
            max-width: calc(215.9mm + 2rem);
            margin: 0 auto;
          }
        }
        
        /* Responsive adjustments */
        @media screen and (max-width: 768px) {
          .page {
            width: 95% !important;
            margin: 0.5rem auto;
          }
          
          .page-header, .page-content {
            padding: 1cm;
          }
        }
      `}</style>
    </div>
  );
};

export default PrintReport;