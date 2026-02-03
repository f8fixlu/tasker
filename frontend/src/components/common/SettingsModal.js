import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import Button from './Button';
import Input from './Input';
import Modal from './Modal';

const SettingsModal = ({ isOpen, onClose }) => {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const fileInputRef = useRef(null);
  const [signatoryData, setSignatoryData] = useState({
    preparedBy: {
      name: '',
      position: '',
      title: 'Prepared By'
    },
    reviewedBy: {
      name: '',
      position: '',
      title: 'Reviewed By'
    },
    notedBy: {
      name: '',
      position: '',
      title: 'Noted By'
    }
  });
  const [loadingSignatories, setLoadingSignatories] = useState(true);
  const [profileData, setProfileData] = useState({
    fullName: user?.name || user?.full_name || '',
    email: user?.email || '',
    profileImage: user?.profile_image_url || '',
    profileImageFile: null
  });

  // Update profileData when user data changes (e.g., after profile image operations)
  useEffect(() => {
    setProfileData({
      fullName: user?.name || user?.full_name || '',
      email: user?.email || '',
      profileImage: user?.profile_image_url || '',
      profileImageFile: null
    });
  }, [user]);
  const [bugReport, setBugReport] = useState({
    description: '',
    steps: '',
    attachment: null
  });
  const [bugReportSubmitted, setBugReportSubmitted] = useState(false);
  const [isBugReportModalOpen, setIsBugReportModalOpen] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [notificationPreferences, setNotificationPreferences] = useState({
    email: true,
    push: false,
    taskRelated: true,
    eventRelated: true,
    system: true
  });
  const [securityData, setSecurityData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [securityErrors, setSecurityErrors] = useState({});
  const [securityLoading, setSecurityLoading] = useState(false);

  // Database management state
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
  const [autoSavePath, setAutoSavePath] = useState('');

  useEffect(() => {
    if (user) {
      setProfileData({
        fullName: user?.name || user?.full_name || '',
        email: user?.email || '',
        profileImage: user?.profile_image_url || '',
        profileImageFile: null
      });
    }

    // Load saved notification preferences from localStorage
    const savedPreferences = localStorage.getItem('notificationPreferences');
    if (savedPreferences) {
      try {
        const parsedPreferences = JSON.parse(savedPreferences);
        setNotificationPreferences(parsedPreferences);
      } catch (error) {
        console.error('Error loading notification preferences:', error);
      }
    }

    // Load auto-save settings from localStorage
    const savedAutoSaveEnabled = localStorage.getItem('autoSaveDatabaseEnabled');
    if (savedAutoSaveEnabled !== null) {
      setAutoSaveEnabled(savedAutoSaveEnabled === 'true');
    }

    const savedAutoSavePath = localStorage.getItem('autoSaveDatabasePath');
    if (savedAutoSavePath) {
      setAutoSavePath(savedAutoSavePath);
    }
  }, [user]);

  // Save auto-save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('autoSaveDatabaseEnabled', autoSaveEnabled.toString());
    localStorage.setItem('autoSaveDatabasePath', autoSavePath);
  }, [autoSaveEnabled, autoSavePath]);

  // Load signatory data when modal opens and signatories tab is active
  useEffect(() => {
    if (isOpen && activeTab === 'signatories') {
      loadSignatoryData();
    }
  }, [isOpen, activeTab]);

  const loadSignatoryData = async () => {
    setLoadingSignatories(true);
    try {
      // In a real implementation, this would fetch from an API
      // For now, we'll use a mock implementation or retrieve from local storage
      const savedSignatories = localStorage.getItem(`signatories_${user?.id}`);
      if (savedSignatories) {
        const parsedData = JSON.parse(savedSignatories);
        // Ensure title properties exist for backward compatibility
        setSignatoryData({
          preparedBy: {
            name: parsedData.preparedBy.name || '',
            position: parsedData.preparedBy.position || '',
            title: parsedData.preparedBy.title || 'Prepared By'
          },
          reviewedBy: {
            name: parsedData.reviewedBy.name || '',
            position: parsedData.reviewedBy.position || '',
            title: parsedData.reviewedBy.title || 'Reviewed By'
          },
          notedBy: {
            name: parsedData.notedBy.name || '',
            position: parsedData.notedBy.position || '',
            title: parsedData.notedBy.title || 'Noted By'
          }
        });
      } else {
        // Default values could be loaded from user profile settings
        setSignatoryData({
          preparedBy: {
            name: user?.name || user?.full_name || '',
            position: user?.position || 'Job Order',
            title: 'Prepared By'
          },
          reviewedBy: {
            name: '',
            position: '',
            title: 'Reviewed By'
          },
          notedBy: {
            name: '',
            position: '',
            title: 'Noted By'
          }
        });
      }
    } catch (error) {
      console.error('Error loading signatory data:', error);
      // Set default empty values
      setSignatoryData({
        preparedBy: {
          name: '',
          position: '',
          title: 'Prepared By'
        },
        reviewedBy: {
          name: '',
          position: '',
          title: 'Reviewed By'
        },
        notedBy: {
          name: '',
          position: '',
          title: 'Noted By'
        }
      });
    } finally {
      setLoadingSignatories(false);
    }
  };

  const saveSignatoryData = async () => {
    try {
      // In a real implementation, this would save to an API
      // For now, we'll save to local storage
      localStorage.setItem(`signatories_${user?.id}`, JSON.stringify(signatoryData));
      setSuccessMessage('Signatory data saved successfully!');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error saving signatory data:', error);
      setSuccessMessage('Error saving signatory data: ' + error.message);
      setShowSuccessModal(true);
    }
  };

  const handleBugReportSubmit = (e) => {
    e.preventDefault();
    // In a real app, this would submit the bug report to an API
    setBugReportSubmitted(true);
    // Reset form after submission
    setBugReport({ description: '', steps: '', attachment: null });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setBugReport(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProfileImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.match('image.*')) {
        alert('Please select an image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB limit');
        return;
      }

      // Create a preview URL for immediate visual feedback
      const reader = new FileReader();
      reader.onload = (event) => {
        // Update the user's profile image in the state with the preview
        setProfileData(prev => ({
          ...prev,
          profileImage: event.target.result
        }));
      };
      reader.readAsDataURL(file);

      // Store the file object for later upload during save
      setProfileData(prev => ({
        ...prev,
        profileImageFile: file
      }));
    }
  };

  // Handle security form changes
  const handleSecurityChange = (e) => {
    const { name, value } = e.target;
    setSecurityData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear the specific error when user starts typing
    if (securityErrors[name]) {
      setSecurityErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Validate password strength
  const validatePassword = (password) => {
    const errors = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/(?=.*[a-z])/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/(?=.*\d)/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    return errors;
  };

  // Validate security form
  const validateSecurityForm = () => {
    const errors = {};

    if (!securityData.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }

    if (!securityData.newPassword) {
      errors.newPassword = 'New password is required';
    } else {
      const passwordErrors = validatePassword(securityData.newPassword);
      if (passwordErrors.length > 0) {
        errors.newPassword = passwordErrors.join(', ');
      }
    }

    if (!securityData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password';
    } else if (securityData.newPassword !== securityData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setSecurityErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle password change
  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (!validateSecurityForm()) {
      return;
    }

    setSecurityLoading(true);

    try {
      const passwordChangeData = {
        currentPassword: securityData.currentPassword,
        newPassword: securityData.newPassword
      };

      await authService.changePassword(passwordChangeData);

      // Show success message and reset form
      setSuccessMessage('Password updated successfully!');
      setShowSuccessModal(true);

      // Reset form fields after successful update
      setSecurityData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Error changing password:', error);

      // Extract message from error response - API service might not have the response object
      let errorMessage = 'Error changing password';
      let errorCode = null;

      // Handle different error response formats from the API service
      if (error.data) {
        // If data is a string, it might be a raw response
        if (typeof error.data === 'string') {
          try {
            const parsed = JSON.parse(error.data);
            errorMessage = parsed.error || parsed.message || errorMessage;
            errorCode = parsed.code;
          } catch (e) {
            errorMessage = error.data;
          }
        } else {
          // If data is an object
          errorMessage = error.data.error || error.data.message || errorMessage;
          errorCode = error.data.code;
        }
      } else if (error.response && error.response.data) {
        // Handle response from axios-like error structure
        if (typeof error.response.data === 'string') {
          try {
            const parsed = JSON.parse(error.response.data);
            errorMessage = parsed.error || parsed.message || errorMessage;
            errorCode = parsed.code;
          } catch (e) {
            errorMessage = error.response.data;
          }
        } else {
          errorMessage = error.response.data.error || error.response.data.message || errorMessage;
          errorCode = error.response.data.code;
        }
      } else if (error.message && !error.message.includes('API request failed')) {
        // If we have a specific error message from the API service
        errorMessage = error.message;
      }

      // Check for specific error codes and messages
      if (errorCode === 'INCORRECT_CURRENT_PASSWORD' || errorMessage.includes('Current password is incorrect')) {
        setSecurityErrors(prev => ({
          ...prev,
          currentPassword: 'Current password is incorrect'
        }));
      } else if (errorCode === 'SAME_PASSWORD' || errorMessage.includes('New password must be different')) {
        setSecurityErrors(prev => ({
          ...prev,
          newPassword: 'New password must be different from current password'
        }));
      } else if (errorCode === 'WEAK_PASSWORD' || errorMessage.includes('New password must be at least') || errorMessage.includes('Password must contain')) {
        setSecurityErrors(prev => ({
          ...prev,
          newPassword: errorMessage
        }));
      } else if (error.status === 401) {
        // For 401 errors that aren't specifically about current password, show the success modal
        // as this likely indicates session has expired
        if (!errorMessage.includes('Current password is incorrect')) {
          setSecurityErrors(prev => ({
            ...prev,
            currentPassword: 'Authentication required. Please log in again.'
          }));
          setSuccessMessage('Session expired. Please log in again.');
          setShowSuccessModal(true);
        } else {
          // If it's just an incorrect current password, show it inline like other errors
          setSecurityErrors(prev => ({
            ...prev,
            currentPassword: 'Current password is incorrect'
          }));
        }
      } else if (error.status === 400) {
        if (errorCode === 'INCORRECT_CURRENT_PASSWORD' || errorMessage.includes('Current password is incorrect')) {
          setSecurityErrors(prev => ({
            ...prev,
            currentPassword: 'Current password is incorrect'
          }));
        } else if (errorCode === 'WEAK_PASSWORD' || errorMessage.includes('New password must be at least') || errorMessage.includes('Password must contain')) {
          setSecurityErrors(prev => ({
            ...prev,
            newPassword: errorMessage
          }));
        } else if (errorCode === 'SAME_PASSWORD' || errorMessage.includes('New password must be different')) {
          setSecurityErrors(prev => ({
            ...prev,
            newPassword: 'New password must be different from current password'
          }));
        } else if (errorCode) {
          // Handle other specific error codes from the backend
          setSecurityErrors(prev => ({
            ...prev,
            currentPassword: errorMessage
          }));
        } else {
          // For other 400 errors, check if we have more specific info
          setSecurityErrors(prev => ({
            ...prev,
            currentPassword: errorMessage
          }));
        }
      } else {
        setSecurityErrors(prev => ({
          ...prev,
          currentPassword: 'An error occurred. Please try again.'
        }));
      }
    } finally {
      setSecurityLoading(false);
    }
  };

  const handleDeleteProfileImage = async () => {
    try {
      // Use the authService to delete the profile image
      const result = await authService.deleteProfileImage();

      // Update local state to remove the profile image
      setProfileData(prev => ({
        ...prev,
        profileImage: null,
        profileImageFile: null
      }));

      // Refresh the user data in the AuthContext to update the navbar
      if (refreshUser) {
        await refreshUser();
      }

      setSuccessMessage('Profile picture deleted successfully!');
      setShowSuccessModal(true);
      setShowDeleteConfirmModal(false); // Close the confirmation modal
    } catch (error) {
      console.error('Error deleting profile picture:', error);
      setSuccessMessage('Error deleting profile picture: ' + error.message);
      setShowSuccessModal(true);
      setShowDeleteConfirmModal(false); // Close the confirmation modal
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();

    try {
      let profileUpdateData = {
        full_name: profileData.fullName,
        email: profileData.email
      };

      // If a new profile image was selected, upload it first
      if (profileData.profileImageFile) {
        // Use the authService to upload the profile image
        const result = await authService.uploadProfileImage(profileData.profileImageFile);

        // Update the profileUpdateData with the new image URL from the response
        profileUpdateData.profile_image_url = result.user.profile_image_url;

        // Update local state with new image URL
        setProfileData(prev => ({
          ...prev,
          profileImage: result.user.profile_image_url
        }));
      }

      // Update the profile with all data (text fields + image URL if updated)
      const response = await authService.updateProfile(profileUpdateData);

      // Refresh the user data in the AuthContext to update the navbar
      if (refreshUser) {
        await refreshUser();
      }

      setSuccessMessage('Profile updated successfully!');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error updating profile:', error);
      setSuccessMessage('Error updating profile: ' + error.message);
      setShowSuccessModal(true);
    }
  };


  const handleExportDatabase = async () => {
    try {
      // Show progress modal
      setProgressMessage('Exporting database...');
      setProgressPercentage(0);
      setShowProgressModal(true);

      // Simulate progress for export
      const progressInterval = setInterval(() => {
        setProgressPercentage(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90; // Stop at 90% until complete
          }
          return prev + 10;
        });
      }, 500);

      // Get token from both localStorage and sessionStorage like the API service does
      let token = localStorage.getItem('token');
      if (!token) {
        token = sessionStorage.getItem('token');
      }

      if (!token) {
        clearInterval(progressInterval);
        setShowProgressModal(false);
        throw new Error('No authentication token found. Please log in again.');
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/database/backup`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      clearInterval(progressInterval);
      setProgressPercentage(100);

      if (!response.ok) {
        // Try to get error details from response
        let errorDetails;
        try {
          const errorData = await response.json();
          errorDetails = errorData.error || `HTTP error! status: ${response.status}`;
        } catch (e) {
          errorDetails = `HTTP error! status: ${response.status}`;
        }
        throw new Error(errorDetails);
      }

      // Get the blob data
      const blob = await response.blob();

      // Create a download link for the SQLite database file
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      // Use user.id or user.email as fallback if user.id is not available
      const userId = user?.id || user?.email?.split('@')[0] || 'unknown';
      link.href = url;
      link.download = `tasker_user_${userId}_backup_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.db`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSuccessMessage('Database exported successfully!');
      setShowSuccessModal(true);
    } catch (error) {
      // If the endpoint doesn't exist, explain that it needs to be implemented
      console.error('Error exporting full database:', error);
      setSuccessMessage('Error exporting full database: ' + error.message);
      setShowSuccessModal(true);
    } finally {
      // Hide progress modal
      setShowProgressModal(false);
    }
  };

  const handleImportDatabase = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      // Check the file extension to determine the type - only allow database files
      const fileExtension = file.name.split('.').pop().toLowerCase();

      if (['db', 'sqlite', 'sqlite3'].includes(fileExtension)) {
        // Handle SQLite file import
        // For SQLite files, we need to upload to the backend for processing
        // Use direct fetch to properly handle multipart form data
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');

        if (!token) {
          setSuccessMessage('Authentication required. Please log in again.');
          setShowSuccessModal(true);
          return;
        }

        const formData = new FormData();
        formData.append('database', file);

        try {
          if (!window.confirm('This will replace your current database with the imported SQLite file. Are you sure you want to continue?\n\nWARNING: This will completely replace your current data.')) {
            return;
          }

          // Show progress modal
          setProgressMessage('Importing database...');
          setProgressPercentage(0);
          setShowProgressModal(true);

          // Simulate progress for import
          const progressInterval = setInterval(() => {
            setProgressPercentage(prev => {
              if (prev >= 90) {
                clearInterval(progressInterval);
                return 90; // Stop at 90% until complete
              }
              return prev + 5;
            });
          }, 300);

          const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/database/restore`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
              // Note: Don't set Content-Type header for FormData, let browser set it automatically
            },
            body: formData
          });

          clearInterval(progressInterval);
          setProgressPercentage(100);

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
          }

          setSuccessMessage('Database restored successfully! Reloading the page to show changes...');
          setShowSuccessModal(true);

          // Wait a moment to show the success message, then reload the page
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } catch (uploadError) {
          // If the endpoint doesn't exist, explain that it needs to be implemented
          console.error('Error uploading SQLite file:', uploadError);
          setSuccessMessage('Error restoring database from SQLite file: ' + uploadError.message);
          setShowSuccessModal(true);
        } finally {
          // Hide progress modal
          setShowProgressModal(false);
        }
      } else {
        setSuccessMessage('Unsupported file format. Please use SQLite database files (.db, .sqlite, .sqlite3).');
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error('Error reading file:', error);
      setSuccessMessage('Error reading file: ' + error.message);
      setShowSuccessModal(true);
    }
  };

  const toggleAutoSave = () => {
    setAutoSaveEnabled(!autoSaveEnabled);
  };

  const selectAutoSavePath = async () => {
    // For web applications, we can't actually select a folder path due to security restrictions
    // Instead, we'll prompt the user to input the path manually or provide a simulated experience
    // In a real implementation with Node.js/Electron, we could use native file dialogs

    const path = window.prompt('Enter the folder path where you want to save database backups:', autoSavePath || 'C:\\Users\\YourName\\Documents\\tasker-backup\\');
    if (path !== null) {
      setAutoSavePath(path);
    }
  };

  // Reset bug report state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setBugReportSubmitted(false);
      setIsBugReportModalOpen(false);
    }
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings" size="2xl">
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'profile'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
          onClick={() => setActiveTab('profile')}
        >
          Profile
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'security'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
          onClick={() => setActiveTab('security')}
        >
          Account Security
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'notifications'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
          onClick={() => setActiveTab('notifications')}
        >
          Notifications
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'signatories'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
          onClick={() => setActiveTab('signatories')}
        >
          Signatories
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'database'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
          onClick={() => setActiveTab('database')}
        >
          Database
        </button>
      </div>
      
      <div className="flex flex-col gap-6 max-h-[70vh] overflow-y-auto pr-2">
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-[#111418] dark:text-white pb-4">Profile Settings</h2>
            <div className="flex items-center gap-6 mb-6">
              <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-20" 
                   style={{ backgroundImage: `url("${profileData.profileImage || 'https://lh3.googleusercontent.com/aida-public/AB6AXuBOFjiORNq3pJX6Ev0LBUjNah_fMzXsW3VJ271wG70iy2b2zsbdiINl_aTBpU2JVYNQ85k--f6rsTYYN22Y3oUUC1eIHyIdije8qlzEKuTAJ8v_9fe_y9m84LqU3VrdWIe_jYDMOYAg_ZHG_XhrLABa9uy_QZYfP-cqxcz0ebl1nj0E1mUs4wLnAjRb6nTSXI841iYD_YTOmdPX89MWDrciQsNI6fJ2qrADAVGceCK7h0ws8p56Y_Q8KW0euNNYk1AUxxRnCrrQ9CS0'}")` }}>
              </div>
              <div>
                <input
                  id="profile-image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleProfileImageChange}
                />
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="primary"
                    onClick={() => document.getElementById('profile-image-upload').click()}
                    className="flex items-center justify-center p-2"
                    title="Upload new picture"
                  >
                    <span className="material-symbols-outlined text-sm">upload</span>
                  </Button>
                  {profileData.profileImage && (
                    <Button
                      variant="danger"
                      onClick={() => setShowDeleteConfirmModal(true)}
                      className="flex items-center justify-center p-2"
                      title="Delete picture"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </Button>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">At least 800x800 px recommended. JPG, PNG are allowed.</p>
              </div>
            </div>
            <form className="grid grid-cols-1 sm:grid-cols-2 gap-4" onSubmit={handleProfileSubmit}>
              <Input
                label="Full Name"
                id="fullName"
                name="fullName"
                type="text"
                value={profileData.fullName}
                onChange={(e) => setProfileData({...profileData, fullName: e.target.value})}
              />
              <Input
                label="Email"
                id="email"
                name="email"
                type="email"
                value={profileData.email}
                onChange={(e) => setProfileData({...profileData, email: e.target.value})}
              />
              <div className="sm:col-span-2 flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
                <Button variant="primary" type="submit">Save Changes</Button>
              </div>
            </form>
          </div>
        )}
        
        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-[#111418] dark:text-white pb-4">Account Security</h2>
            <form className="grid grid-cols-1 gap-4" onSubmit={handlePasswordChange}>
              <Input
                label="Current Password"
                id="currentPassword"
                name="currentPassword"
                type="password"
                value={securityData.currentPassword}
                onChange={handleSecurityChange}
                error={securityErrors.currentPassword}
              />
              <Input
                label="New Password"
                id="newPassword"
                name="newPassword"
                type="password"
                value={securityData.newPassword}
                onChange={handleSecurityChange}
                error={securityErrors.newPassword}
                helperText="Password must be at least 8 characters with uppercase, lowercase, and number"
              />
              <Input
                label="Confirm New Password"
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={securityData.confirmPassword}
                onChange={handleSecurityChange}
                error={securityErrors.confirmPassword}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={securityLoading}
                >
                  {securityLoading ? 'Updating...' : 'Update Password'}
                </Button>
              </div>
            </form>
          </div>
        )}
        
        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-[#111418] dark:text-white pb-4">Notifications</h2>
            <form className="grid grid-cols-1 gap-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[#333333] dark:text-gray-300">Email Notifications</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    checked={notificationPreferences.email}
                    onChange={(e) => {
                      const newPreferences = {
                        ...notificationPreferences,
                        email: e.target.checked
                      };
                      setNotificationPreferences(newPreferences);
                      // Save to localStorage immediately
                      localStorage.setItem('notificationPreferences', JSON.stringify(newPreferences));
                    }}
                    className="sr-only peer"
                    type="checkbox"
                    value=""
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/50 dark:peer-focus:ring-primary/80 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[#333333] dark:text-gray-300">Push Notifications</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    checked={notificationPreferences.push}
                    onChange={(e) => {
                      const newPreferences = {
                        ...notificationPreferences,
                        push: e.target.checked
                      };
                      setNotificationPreferences(newPreferences);
                      // Save to localStorage immediately
                      localStorage.setItem('notificationPreferences', JSON.stringify(newPreferences));
                    }}
                    className="sr-only peer"
                    type="checkbox"
                    value=""
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/50 dark:peer-focus:ring-primary/80 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                </label>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-2">
                <h3 className="text-lg font-medium text-[#111418] dark:text-white mb-3">Notification Types</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#333333] dark:text-gray-300">Task Related Events</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        checked={notificationPreferences.taskRelated}
                        onChange={(e) => {
                          const newPreferences = {
                            ...notificationPreferences,
                            taskRelated: e.target.checked
                          };
                          setNotificationPreferences(newPreferences);
                          // Save to localStorage immediately
                          localStorage.setItem('notificationPreferences', JSON.stringify(newPreferences));
                        }}
                        className="sr-only peer"
                        type="checkbox"
                        value=""
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/50 dark:peer-focus:ring-primary/80 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#333333] dark:text-gray-300">Event Related Events</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        checked={notificationPreferences.eventRelated}
                        onChange={(e) => {
                          const newPreferences = {
                            ...notificationPreferences,
                            eventRelated: e.target.checked
                          };
                          setNotificationPreferences(newPreferences);
                          // Save to localStorage immediately
                          localStorage.setItem('notificationPreferences', JSON.stringify(newPreferences));
                        }}
                        className="sr-only peer"
                        type="checkbox"
                        value=""
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/50 dark:peer-focus:ring-primary/80 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#333333] dark:text-gray-300">System Events</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        checked={notificationPreferences.system}
                        onChange={(e) => {
                          const newPreferences = {
                            ...notificationPreferences,
                            system: e.target.checked
                          };
                          setNotificationPreferences(newPreferences);
                          // Save to localStorage immediately
                          localStorage.setItem('notificationPreferences', JSON.stringify(newPreferences));
                        }}
                        className="sr-only peer"
                        type="checkbox"
                        value=""
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/50 dark:peer-focus:ring-primary/80 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
                <Button variant="primary" type="button" onClick={async () => {
                  try {
                    setSuccessMessage('Notification preferences saved successfully!');
                    setShowSuccessModal(true);
                    // Optionally close the modal after saving
                    // onClose();
                  } catch (error) {
                    setSuccessMessage('Error saving notification preferences: ' + error.message);
                    setShowSuccessModal(true);
                  }
                }}>Save Changes</Button>
              </div>
            </form>
          </div>
        )}
        

        {/* Signatories Tab */}
        {activeTab === 'signatories' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-[#111418] dark:text-white pb-4">Report Signatories</h2>
            {loadingSignatories ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : (
              <form className="space-y-6">
                <div>
                  <Input
                    label="Role Title"
                    id="preparedByTitle"
                    name="preparedByTitle"
                    type="text"
                    value={signatoryData.preparedBy.title || 'Prepared By'}
                    onChange={(e) => setSignatoryData(prev => ({
                      ...prev,
                      preparedBy: { ...prev.preparedBy, title: e.target.value }
                    }))}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <Input
                      label="Name"
                      id="preparedByName"
                      name="preparedByName"
                      type="text"
                      value={signatoryData.preparedBy.name}
                      onChange={(e) => setSignatoryData(prev => ({
                        ...prev,
                        preparedBy: { ...prev.preparedBy, name: e.target.value }
                      }))}
                    />
                    <Input
                      label="Position"
                      id="preparedByPosition"
                      name="preparedByPosition"
                      type="text"
                      value={signatoryData.preparedBy.position}
                      onChange={(e) => setSignatoryData(prev => ({
                        ...prev,
                        preparedBy: { ...prev.preparedBy, position: e.target.value }
                      }))}
                    />
                  </div>
                </div>

                <div>
                  <Input
                    label="Role Title"
                    id="reviewedByTitle"
                    name="reviewedByTitle"
                    type="text"
                    value={signatoryData.reviewedBy.title || 'Reviewed By'}
                    onChange={(e) => setSignatoryData(prev => ({
                      ...prev,
                      reviewedBy: { ...prev.reviewedBy, title: e.target.value }
                    }))}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <Input
                      label="Name"
                      id="reviewedByName"
                      name="reviewedByName"
                      type="text"
                      value={signatoryData.reviewedBy.name}
                      onChange={(e) => setSignatoryData(prev => ({
                        ...prev,
                        reviewedBy: { ...prev.reviewedBy, name: e.target.value }
                      }))}
                    />
                    <Input
                      label="Position"
                      id="reviewedByPosition"
                      name="reviewedByPosition"
                      type="text"
                      value={signatoryData.reviewedBy.position}
                      onChange={(e) => setSignatoryData(prev => ({
                        ...prev,
                        reviewedBy: { ...prev.reviewedBy, position: e.target.value }
                      }))}
                    />
                  </div>
                </div>

                <div>
                  <Input
                    label="Role Title"
                    id="notedByTitle"
                    name="notedByTitle"
                    type="text"
                    value={signatoryData.notedBy.title || 'Noted By'}
                    onChange={(e) => setSignatoryData(prev => ({
                      ...prev,
                      notedBy: { ...prev.notedBy, title: e.target.value }
                    }))}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <Input
                      label="Name"
                      id="notedByName"
                      name="notedByName"
                      type="text"
                      value={signatoryData.notedBy.name}
                      onChange={(e) => setSignatoryData(prev => ({
                        ...prev,
                        notedBy: { ...prev.notedBy, name: e.target.value }
                      }))}
                    />
                    <Input
                      label="Position"
                      id="notedByPosition"
                      name="notedByPosition"
                      type="text"
                      value={signatoryData.notedBy.position}
                      onChange={(e) => setSignatoryData(prev => ({
                        ...prev,
                        notedBy: { ...prev.notedBy, position: e.target.value }
                      }))}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
                  <Button variant="primary" type="button" onClick={saveSignatoryData}>Save Changes</Button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Database Tab */}
        {activeTab === 'database' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-[#111418] dark:text-white pb-4">Database Management</h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-[#111418] dark:text-white mb-3">Export Database</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Export your full database to an SQLite file for backup or transfer to another system.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    variant="primary"
                    onClick={handleExportDatabase}
                    className="w-full sm:w-auto"
                  >
                    Export Full Database (SQLite)
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-[#111418] dark:text-white mb-3">Import Database</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Import data from an SQLite database file to restore your data.
                </p>
                <input
                  id="database-import"
                  type="file"
                  accept=".db,.sqlite,.sqlite3"
                  className="hidden"
                  onChange={handleImportDatabase}
                />
                <Button
                  variant="outline"
                  type="button"
                  className="w-full sm:w-auto"
                  onClick={() => document.getElementById('database-import').click()}
                >
                  Choose File
                </Button>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Supports SQLite database files (.db, .sqlite, .sqlite3).
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium text-[#111418] dark:text-white mb-3">Auto-save Database</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Enable automatic saving of your database to a specified location.
                </p>

                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={autoSaveEnabled}
                        onChange={toggleAutoSave}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/50 dark:peer-focus:ring-primary/80 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                      <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                        {autoSaveEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </label>
                  </div>

                  {autoSaveEnabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Save Path
                        </label>
                        <input
                          type="text"
                          value={autoSavePath}
                          onChange={(e) => setAutoSavePath(e.target.value)}
                          placeholder="C:\Users\YourName\Documents\tasker-backup\"
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          variant="outline"
                          type="button"
                          onClick={selectAutoSavePath}
                          className="w-full"
                        >
                          Browse
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bug Report Modal */}
      <Modal
        isOpen={isBugReportModalOpen}
        onClose={() => setIsBugReportModalOpen(false)}
        title={bugReportSubmitted ? "Bug Report Submitted" : "Report a Bug"}
      >
        <div className="py-4">
          {bugReportSubmitted ? (
            <div className="text-center py-8">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <span className="material-symbols-outlined text-green-600">check</span>
              </div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mt-4" id="modal-title-success">
                Bug Report Submitted
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Thank you for your feedback! Our team will review your report and take the necessary actions. We appreciate you helping us improve Tasker.
                </p>
              </div>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleBugReportSubmit}>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="bug-description">Bug Description</label>
                <textarea
                  className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:ring-primary focus:border-primary" 
                  id="bug-description"
                  name="description"
                  rows="3"
                  value={bugReport.description}
                  onChange={handleInputChange}
                  required
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="steps-to-reproduce">Steps to Reproduce</label>
                <textarea
                  className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:ring-primary focus:border-primary" 
                  id="steps-to-reproduce"
                  name="steps"
                  rows="3"
                  value={bugReport.steps}
                  onChange={handleInputChange}
                  required
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="bug-attachment">Attach Screenshots</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    <svg aria-hidden="true" className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
                    </svg>
                    <div className="flex text-sm text-gray-600 dark:text-gray-400">
                      <label className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary" htmlFor="file-upload">
                        <span>Upload a file</span>
                        <input className="sr-only" id="file-upload" name="file-upload" type="file" />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG, GIF up to 10MB</p>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 mt-6">
          {!bugReportSubmitted ? (
            <>
              <Button 
                variant="outline"
                onClick={() => setIsBugReportModalOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                variant="primary"
                type="submit"
                onClick={handleBugReportSubmit}
              >
                Submit
              </Button>
            </>
          ) : (
            <Button 
              variant="primary"
              onClick={() => {
                setIsBugReportModalOpen(false);
                setBugReportSubmitted(false);
              }}
            >
              Close
            </Button>
          )}
        </div>
      </Modal>

      {/* Progress Modal */}
      <Modal
        isOpen={showProgressModal}
        onClose={() => {}}
        title="Operation in Progress"
        size="md"
      >
        <div className="py-4">
          <div className="flex items-center justify-center mb-4">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
          </div>
          <p className="text-center text-gray-700 dark:text-gray-300 mb-4">{progressMessage}</p>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
            <div
              className="bg-primary h-2.5 rounded-full transition-all duration-300 ease-in-out"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2">{progressPercentage}%</p>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirmModal}
        onClose={() => setShowDeleteConfirmModal(false)}
        title="Confirm Delete"
      >
        <div className="py-4">
          <p className="text-gray-700 dark:text-gray-300">
            Are you sure you want to delete your profile picture? This action cannot be undone.
          </p>

          <div className="mt-6 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirmModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteProfileImage}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Success Confirmation Modal */}
      <Modal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          if (successMessage.includes('successfully')) {
            onClose(); // Close the main settings modal after success
          }
        }}
        title={successMessage.includes('Error') ? "Error" : "Success"}
      >
        <div className="py-4">
          <p className={successMessage.includes('Error')
            ? "text-red-600 dark:text-red-400"
            : "text-gray-700 dark:text-gray-300"}>
            {successMessage}
          </p>

          <div className="mt-6 flex justify-end">
            <Button
              variant="primary"
              onClick={() => {
                setShowSuccessModal(false);
                if (successMessage.includes('successfully')) {
                  onClose(); // Close the main settings modal after success
                }
              }}
            >
              OK
            </Button>
          </div>
        </div>
      </Modal>
    </Modal>
  );
};

export default SettingsModal;