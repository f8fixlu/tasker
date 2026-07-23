import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import { Icon } from '../components/common/Icon';

const Register = () => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();
  const { setTemporaryTheme, clearTemporaryTheme } = useTheme();

  // Effect to retain the user's theme preference on this page
  useEffect(() => {
    // For existing users, preserve their theme preference; for new users, default to light theme
    const savedTheme = localStorage.getItem('theme');
    // If user has a theme preference, use it; otherwise default to light theme
    const themeToUse = savedTheme || 'light';
    setTemporaryTheme(themeToUse);

    // Cleanup function to restore previous theme when component unmounts
    return () => {
      clearTemporaryTheme();
    };
  }, [setTemporaryTheme, clearTemporaryTheme]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    // Clear the error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setErrors({});

    // Client-side validation
    const newErrors = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email address is invalid';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    const result = await register(formData.full_name, formData.email, formData.password);

    if (result.success) {
      // Show success modal instead of immediately navigating
      setShowSuccessModal(true);
    } else {
      setError(result.message);
      // Handle field-specific errors from backend (like existing email)
      if (result.fieldErrors) {
        setErrors(prev => ({
          ...prev,
          ...result.fieldErrors
        }));
      }
      setLoading(false);
    }
  };

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-md">
        <header className="text-center mb-8">
          <div className="flex flex-col items-center justify-center gap-4 text-primary mb-2">
            <img src={`${process.env.PUBLIC_URL}/logo/tasker_logo.png`} alt="Tasker Logo" className="size-16" />
            <h1 className="text-[#111418] dark:text-white text-3xl font-bold leading-tight tracking-[-0.015em]">Tasker</h1>
          </div>
          <h2 className="text-xl text-[#333333] dark:text-white">Create your account</h2>
          <p className="text-sm text-[#617589] dark:text-gray-400 mt-1">Start organizing your tasks and boost your productivity.</p>
        </header>
        
        <main className="w-full">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
                {error}
              </div>
            )}
            
            <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
              <Input
                label="Full Name"
                id="full-name"
                name="full_name"
                type="text"
                placeholder="John Doe"
                value={formData.full_name}
                onChange={handleChange}
                error={errors.full_name}
              />

              <Input
                label="Email"
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
              />

              <Input
                label="Password"
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
              />

              <Input
                label="Confirm Password"
                id="confirm-password"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                error={errors.confirmPassword}
              />
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>
          </div>
          
          <p className="text-center text-sm text-[#617589] dark:text-gray-400 mt-6">
            Already have an account?
            <Link className="font-medium text-primary hover:underline ml-1" to="/login">Log in</Link>
          </p>
        </main>

        {/* Success Modal */}
        <Modal
          isOpen={showSuccessModal}
          onClose={() => {
            setShowSuccessModal(false);
            navigate('/dashboard'); // Navigate to dashboard after closing modal
          }}
          title="Account Created Successfully!"
          size="md"
        >
          <div className="py-4">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Icon name="check_circle" className="text-green-600 dark:text-green-400 text-3xl" />
              </div>
            </div>
            <p className="text-center text-gray-700 dark:text-gray-300 mb-2">
              Your account has been created successfully!
            </p>
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              You can now start using Tasker.
            </p>
          </div>
          <div className="mt-6 flex justify-center">
            <Button
              variant="primary"
              onClick={() => {
                setShowSuccessModal(false);
                navigate('/dashboard'); // Navigate to dashboard after clicking button
              }}
            >
              Go to Dashboard
            </Button>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default Register;