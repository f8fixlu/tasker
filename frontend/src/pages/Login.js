import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import ForgotPasswordModal from '../components/ForgotPasswordModal';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);

  const { login } = useAuth();
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
    if (e.target.type === 'checkbox') {
      setRememberMe(e.target.checked);
    } else {
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
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setErrors({});

    // Client-side validation
    const newErrors = {};

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

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    const result = await login(formData.email, formData.password, rememberMe);

    if (result.success) {
      // AuthContext handles navigation after login
    } else {
      setError(result.message);
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
          <p className="text-base text-gray-600 dark:text-gray-400">Welcome back! Please login to your account.</p>
        </header>
        
        <main className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}
          
          <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
            <Input
              label="Email or Username"
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
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary"
                />
                <label htmlFor="remember-me" className="text-sm text-[#333333] dark:text-gray-300">Remember Me</label>
              </div>
              <button
                type="button"
                className="text-sm font-medium text-primary hover:underline"
                onClick={() => setShowForgotPasswordModal(true)}
              >
                Forgot Password?
              </button>
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </main>

        <footer className="mt-8 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Don{'\''}t have an account?{' '}
            <Link className="font-medium text-primary hover:underline" to="/register">
              Sign up
            </Link>
          </p>
        </footer>
      </div>

      {showForgotPasswordModal && (
        <ForgotPasswordModal
          onClose={() => setShowForgotPasswordModal(false)}
        />
      )}
    </div>
  );
};

export default Login;