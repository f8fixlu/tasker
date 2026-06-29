import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { reportsService } from '../services/reportsService';
import api from '../services/api';

const PrintReport = () => {
  const { user } = useAuth();
  const [pageSize, setPageSize] = useState('a4');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // This is mock data for the report - in real implementation, this would come from API
  const [signatoryData, setSignatoryData] = useState([]);
  const [headerImage, setHeaderImage] = useState(null);
  const [footerImage, setFooterImage] = useState(null);
  const [showDefaultHeader, setShowDefaultHeader] = useState(true);
  const [headerOnAllPages, setHeaderOnAllPages] = useState(true);
  const [reportTitleText, setReportTitleText] = useState('ACCOMPLISHMENT REPORT');

  // Helper function to determine if signature section has all fields populated (dynamic signatory system)
  const hasAllSignatureFields = () => {
    // Check if signatoryData is in array format
    if (Array.isArray(signatoryData)) {
      return signatoryData.length > 0 && signatoryData.every(sig => sig.name && sig.position);
    }
    
    return false;
  };

  // Load signatory data from API first, fallback to local storage
  const loadSignatoryData = async () => {
    console.log('Loading signatory data for user:', user);
    if (user) {
      try {
        // First try to get from API via user profile using the api service
        console.log('Fetching user profile...');
        const userData = await api.get('/users/profile');
        console.log('User data received:', userData);
        
        // Check if signatory data exists in user profile
        if (userData.user?.signatories) {
          console.log('Signatories found in user data:', userData.user.signatories);
          // If signatories is an array (like from DB), use it directly
          if (Array.isArray(userData.user.signatories)) {
            setSignatoryData(userData.user.signatories);
            console.log('Set signatory data from array format:', userData.user.signatories);
          } else if (typeof userData.user.signatories === 'object') {
            // If it's in object format, convert to array format
            const signatoryArray = [];
            
            // Handle signatory1, signatory2, etc. format
            let signatoryIndex = 1;
            while (userData.user.signatories[`signatory${signatoryIndex}`]) {
              const signatoryField = userData.user.signatories[`signatory${signatoryIndex}`];
              if (signatoryField && (signatoryField.name || signatoryField.position)) {
                signatoryArray.push({
                  title: signatoryField.title || `Signatory ${signatoryArray.length + 1}`,
                  name: signatoryField.name || '',
                  position: signatoryField.position || ''
                });
              }
              signatoryIndex++;
            }
            
            // Also handle legacy format (preparedBy, reviewedBy, notedBy) if they exist
            if (userData.user.signatories.preparedBy && (userData.user.signatories.preparedBy.name || userData.user.signatories.preparedBy.position)) {
              signatoryArray.push({
                title: userData.user.signatories.preparedBy.title || `Signatory ${signatoryArray.length + 1}`,
                name: userData.user.signatories.preparedBy.name || '',
                position: userData.user.signatories.preparedBy.position || ''
              });
            }
            
            if (userData.user.signatories.reviewedBy && (userData.user.signatories.reviewedBy.name || userData.user.signatories.reviewedBy.position)) {
              signatoryArray.push({
                title: userData.user.signatories.reviewedBy.title || `Signatory ${signatoryArray.length + 1}`,
                name: userData.user.signatories.reviewedBy.name || '',
                position: userData.user.signatories.reviewedBy.position || ''
              });
            }
            
            if (userData.user.signatories.notedBy && (userData.user.signatories.notedBy.name || userData.user.signatories.notedBy.position)) {
              signatoryArray.push({
                title: userData.user.signatories.notedBy.title || `Signatory ${signatoryArray.length + 1}`,
                name: userData.user.signatories.notedBy.name || '',
                position: userData.user.signatories.notedBy.position || ''
              });
            }
            
            setSignatoryData(signatoryArray);
            console.log('Set signatory data from object format:', signatoryArray);
          }
        } else {
          console.log('No signatories in API response, trying localStorage');
          // If no signatories in API, try localStorage as fallback
          const savedSignatories = localStorage.getItem(`signatories_${user?.id}`);
          if (savedSignatories) {
            const parsedSignatories = JSON.parse(savedSignatories);
            // If it's an array (like from DB), use it directly
            if (Array.isArray(parsedSignatories)) {
              setSignatoryData(parsedSignatories);
            } else if (typeof parsedSignatories === 'object') {
              // Convert object format to array format
              const signatoryArray = [];
              
              // Handle signatory1, signatory2, etc. format
              let signatoryIndex = 1;
              while (parsedSignatories[`signatory${signatoryIndex}`]) {
                const signatoryField = parsedSignatories[`signatory${signatoryIndex}`];
                if (signatoryField && (signatoryField.name || signatoryField.position)) {
                  signatoryArray.push({
                    title: signatoryField.title || `Signatory ${signatoryArray.length + 1}`,
                    name: signatoryField.name || '',
                    position: signatoryField.position || ''
                  });
                }
                signatoryIndex++;
              }
              
              // Also handle legacy format (preparedBy, reviewedBy, notedBy) if they exist
              if (parsedSignatories.preparedBy && (parsedSignatories.preparedBy.name || parsedSignatories.preparedBy.position)) {
                signatoryArray.push({
                  title: parsedSignatories.preparedBy.title || `Signatory ${signatoryArray.length + 1}`,
                  name: parsedSignatories.preparedBy.name || '',
                  position: parsedSignatories.preparedBy.position || ''
                });
              }
              
              if (parsedSignatories.reviewedBy && (parsedSignatories.reviewedBy.name || parsedSignatories.reviewedBy.position)) {
                signatoryArray.push({
                  title: parsedSignatories.reviewedBy.title || `Signatory ${signatoryArray.length + 1}`,
                  name: parsedSignatories.reviewedBy.name || '',
                  position: parsedSignatories.reviewedBy.position || ''
                });
              }
              
              if (parsedSignatories.notedBy && (parsedSignatories.notedBy.name || parsedSignatories.notedBy.position)) {
                signatoryArray.push({
                  title: parsedSignatories.notedBy.title || `Signatory ${signatoryArray.length + 1}`,
                  name: parsedSignatories.notedBy.name || '',
                  position: parsedSignatories.notedBy.position || ''
                });
              }
              
              setSignatoryData(signatoryArray);
            } else {
              setSignatoryData([]);
            }
            console.log('Loaded signatory data from localStorage:', parsedSignatories);
          } else {
            console.log('No signatory data found in localStorage');
          }
        }

        // Load header image from API (outside signatories if/else)
        if (userData.user?.header_image) {
          setHeaderImage(userData.user.header_image);
        } else {
          const savedHeaderImage = localStorage.getItem(`headerImage_${user?.id}`);
          if (savedHeaderImage) {
            setHeaderImage(savedHeaderImage);
          }
        }

        // Load footer image from API
        if (userData.user?.footer_image) {
          setFooterImage(userData.user.footer_image);
        } else {
          const savedFooterImage = localStorage.getItem(`footerImage_${user?.id}`);
          if (savedFooterImage) {
            setFooterImage(savedFooterImage);
          }
        }

        // Load show default header setting
        if (userData.user?.show_default_header !== undefined) {
          setShowDefaultHeader(!!userData.user.show_default_header);
        } else {
          const saved = localStorage.getItem(`showDefaultHeader_${user?.id}`);
          if (saved !== null) {
            setShowDefaultHeader(saved === 'true');
          }
        }

        // Load header on all pages setting
        if (userData.user?.header_on_all_pages !== undefined) {
          setHeaderOnAllPages(!!userData.user.header_on_all_pages);
        } else {
          const saved = localStorage.getItem(`headerOnAllPages_${user?.id}`);
          if (saved !== null) {
            setHeaderOnAllPages(saved === 'true');
          }
        }

        // Load report title
        if (userData.user?.report_title) {
          setReportTitleText(userData.user.report_title);
        } else {
          const saved = localStorage.getItem(`reportTitleText_${user?.id}`);
          if (saved) {
            setReportTitleText(saved);
          }
        }
      } catch (error) {
        console.error('Error loading signatory data:', error);
        // Set default empty array if there's an error
        setSignatoryData([]);
        // Try loading header image from localStorage as fallback
        const savedHeaderImage = localStorage.getItem(`headerImage_${user?.id}`);
        if (savedHeaderImage) {
          setHeaderImage(savedHeaderImage);
        }

        // Try loading footer image from localStorage as fallback
        const savedFooterImage = localStorage.getItem(`footerImage_${user?.id}`);
        if (savedFooterImage) {
          setFooterImage(savedFooterImage);
        }

        // Try loading show default header from localStorage as fallback
        const savedDefaultHeader = localStorage.getItem(`showDefaultHeader_${user?.id}`);
        if (savedDefaultHeader !== null) {
          setShowDefaultHeader(savedDefaultHeader === 'true');
        }

        // Try loading header on all pages from localStorage as fallback
        const savedHeaderOnAllPages = localStorage.getItem(`headerOnAllPages_${user?.id}`);
        if (savedHeaderOnAllPages !== null) {
          setHeaderOnAllPages(savedHeaderOnAllPages === 'true');
        }

        // Try loading report title from localStorage as fallback
        const savedReportTitle = localStorage.getItem(`reportTitleText_${user?.id}`);
        if (savedReportTitle) {
          setReportTitleText(savedReportTitle);
        }
      }
    } else {
      console.log('No user available to load signatory data');
    }
  };

  useEffect(() => {
    const loadAndFetch = async () => {
      console.log('Checking user in effect:', user);
      // Wait a bit to ensure user is fully loaded if needed
      if (user && user.id) {  // Check that user exists and has an id
        console.log('Loading signatory data for user ID:', user.id);
        setLoading(true); // Set loading state while fetching data
        await loadSignatoryData();
        // Add a small delay to ensure state is updated before fetching report data
        await new Promise(resolve => setTimeout(resolve, 100));
        fetchReportData();
        setLoading(false); // Stop loading after everything is loaded
      } else {
        console.log('User not available or invalid, skipping signatory data load');
        // Still try to load from localStorage as fallback
        const savedSignatories = localStorage.getItem(`signatories_${user?.id || 'unknown'}`);
        if (savedSignatories) {
          try {
            const parsedSignatories = JSON.parse(savedSignatories);
            setSignatoryData(parsedSignatories);
            console.log('Loaded signatory data from localStorage as fallback:', parsedSignatories);
          } catch (e) {
            console.error('Error parsing localStorage signatory data:', e);
          }
        }
        // Try loading header image from localStorage as fallback
        const savedHeaderImage = localStorage.getItem(`headerImage_${user?.id || 'unknown'}`);
        if (savedHeaderImage) {
          setHeaderImage(savedHeaderImage);
        }

        // Try loading footer image from localStorage as fallback
        const savedFooterImage = localStorage.getItem(`footerImage_${user?.id || 'unknown'}`);
        if (savedFooterImage) {
          setFooterImage(savedFooterImage);
        }

        setLoading(false); // Make sure loading is stopped even if user is not available
      }
    };

    loadAndFetch();
  }, [user]);

  const mockReportData = {
    title: reportTitleText,
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
    signatureSection: signatoryData
  };

  // When signatory data changes, we need to refetch report data to update the pages
  useEffect(() => {
    if (reportData) {
      // Update the signature section of the existing report data
      setReportData(prevData => ({
        ...prevData,
        signatureSection: signatoryData
      }));
    }
  }, [signatoryData]);

  // When report title changes, update the report data
  useEffect(() => {
    if (reportData) {
      setReportData(prevData => ({
        ...prevData,
        title: reportTitleText
      }));
    }
  }, [reportTitleText]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call when backend is ready
      // const data = await reportsService.getReportData();
      
      // Create mock report data with current signatoryData
      const currentMockReportData = {
        ...mockReportData,
        signatureSection: signatoryData
      };

      setReportData(currentMockReportData);
      setError(null);
    } catch (err) {
      console.error('Error fetching report data:', err);
      setError('Failed to fetch report data');
      // Create mock report data with current signatoryData even in error case
      const currentMockReportData = {
        ...mockReportData,
        signatureSection: signatoryData
      };
      setReportData(currentMockReportData); // Use mock data as fallback
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
    const hasSignature = Array.isArray(signatoryData) && signatoryData.some(sig => sig.name || sig.position);

    if (hasSignature) {
      // Add a separate page for the signature section to prevent cutting
      pages.push({ id: pages.length + 1, isSignaturePage: true });
    }
  }

  if (!user || loading) {
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
      {/* Debug info - remove in production */}
      <div className="debug-info fixed top-0 left-0 bg-yellow-200 p-2 text-xs z-50">
        <div>Signatory Data: {JSON.stringify(signatoryData, null, 2)}</div>
        <div>User: {user ? user.id : 'No user'}</div>
      </div>
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
                {(headerOnAllPages || index === 0) && (
                  <header className="page-header">
                    {headerImage ? (
                      <div className="flex justify-center mb-2">
                        <img
                          src={headerImage}
                          alt="Report Header"
                          className="max-h-16 w-auto object-contain"
                        />
                      </div>
                    ) : showDefaultHeader ? (
                      <div className="flex justify-center">
                        <img
                          src="/header/ched_header.png"
                          alt="CHED Header"
                          className="max-h-16 w-auto object-contain"
                        />
                      </div>
                    ) : null}
                  </header>
                )}

                {/* Page Content */}
                <div className="page-content">
                  <main className="mt-8 flex flex-col justify-center items-center h-full">
                    {/* Empty space to center the signature section */}
                    <div style={{ flex: 1 }}></div>

                    {/* Signature section on its own page */}
                    <footer className="mt-12" style={{ breakInside: 'avoid' }}>
                      {/* Render signatories from the array */}
                      {(() => {
                        // Use the signatoryData array directly
                        const signatories = Array.isArray(signatoryData) ? 
                          signatoryData.filter(sig => sig.name || sig.position) : [];

                        // Render signatories in pairs (left/right) with additional ones below
                        const rows = [];
                        for (let i = 0; i < signatories.length; i += 2) {
                          const leftSig = signatories[i];
                          const rightSig = signatories[i + 1];

                          if (rightSig) {
                            // Two signatories in this row
                            rows.push(
                              <div key={`row-${i}`} className="flex justify-between" style={{ breakInside: 'avoid' }}>
                                <div className="w-1/2" style={{ breakInside: 'avoid' }}>
                                  <p style={{ fontSize: '12pt' }}>{leftSig.title || `Signatory ${i + 1}`}</p>
                                  <div className="mt-8" style={{ breakInside: 'avoid' }}>
                                    {leftSig.name && (
                                      <p className="font-bold mt-4" style={{ fontSize: '12pt' }}>{leftSig.name}</p>
                                    )}
                                    {leftSig.position && (
                                      <p className="mt-2" style={{ fontSize: '12pt' }}>{leftSig.position}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="w-1/2" style={{ breakInside: 'avoid' }}>
                                  <p style={{ fontSize: '12pt' }}>{rightSig.title || `Signatory ${i + 2}`}</p>
                                  <div className="mt-8" style={{ breakInside: 'avoid' }}>
                                    {rightSig.name && (
                                      <p className="font-bold mt-4" style={{ fontSize: '12pt' }}>{rightSig.name}</p>
                                    )}
                                    {rightSig.position && (
                                      <p className="mt-2" style={{ fontSize: '12pt' }}>{rightSig.position}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          } else {
                            // Single signatory in this row (left side only)
                            rows.push(
                              <div key={`row-${i}`} className="flex justify-between" style={{ breakInside: 'avoid' }}>
                                <div className="w-1/2" style={{ breakInside: 'avoid' }}>
                                  <p style={{ fontSize: '12pt' }}>{leftSig.title || `Signatory ${i + 1}`}</p>
                                  <div className="mt-8" style={{ breakInside: 'avoid' }}>
                                    {leftSig.name && (
                                      <p className="font-bold mt-4" style={{ fontSize: '12pt' }}>{leftSig.name}</p>
                                    )}
                                    {leftSig.position && (
                                      <p className="mt-2" style={{ fontSize: '12pt' }}>{leftSig.position}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="w-1/2" style={{ breakInside: 'avoid' }}>
                                  {/* Empty space to maintain layout */}
                                </div>
                              </div>
                            );
                          }
                        }

                        return rows;
                      })()}
                    </footer>

                    {/* Empty space to center the signature section */}
                    <div style={{ flex: 2 }}></div>
                  </main>
                </div>

                {/* Page Footer */}
                <div className="page-footer" style={{ fontSize: '12pt' }}>Page {page.id} of {pages.length}</div>
                {footerImage && (
                  <div className="flex justify-center mt-4">
                    <img
                      src={footerImage}
                      alt="Report Footer"
                      className="max-h-16 w-auto object-contain"
                    />
                  </div>
                )}
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
                {(headerOnAllPages || index === 0) && (
                  <header className="page-header">
                    {headerImage ? (
                      <div className="flex justify-center mb-2">
                        <img
                          src={headerImage}
                          alt="Report Header"
                          className="max-h-16 w-auto object-contain"
                        />
                      </div>
                    ) : showDefaultHeader ? (
                      <div className="flex justify-center">
                        <img
                          src="/header/ched_header.png"
                          alt="CHED Header"
                          className="max-h-16 w-auto object-contain"
                        />
                      </div>
                    ) : null}
                  </header>
                )}

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
                {footerImage && (
                  <div className="flex justify-center mt-4">
                    <img
                      src={footerImage}
                      alt="Report Footer"
                      className="max-h-16 w-auto object-contain"
                    />
                  </div>
                )}
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