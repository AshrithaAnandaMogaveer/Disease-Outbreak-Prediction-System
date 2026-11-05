import { motion } from 'framer-motion';
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Mail, Lock, Shield, User as UserIcon, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [selectedRole, setSelectedRole] = useState('user');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    adminSecretKey: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forgot password state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStatus, setForgotStatus] = useState('idle'); // idle | loading | success | error
  const [forgotError, setForgotError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleRoleChange = (role) => {
    setSelectedRole(role);
    setErrors({});
    if (role === 'user') {
      setFormData(prev => ({ ...prev, adminSecretKey: '', username: '' }));
    } else {
      setFormData(prev => ({ ...prev, email: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (selectedRole === 'admin') {
      // Admin validation
      if (!formData.username.trim()) {
        newErrors.username = 'Username is required';
      }
      if (!formData.password) {
        newErrors.password = 'Password is required';
      }
    } else {
      // User validation
      if (!formData.email.trim()) {
        newErrors.email = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Email is invalid';
      }
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters';
      }
    }
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    
    if (Object.keys(newErrors).length === 0) {
      setIsSubmitting(true);
      try {
        // Call backend API through AuthContext
        const authState = selectedRole === 'admin'
          ? await login(formData.email, formData.password, formData.username)
          : await login(formData.email, formData.password);

        // Redirect based on role returned from backend
        if (authState.userRole === 'admin') {
          navigate('/admin-dashboard');
        } else {
          navigate('/whats-happening');
        }
      } catch (error) {
        setErrors({ 
          password: error.message || 'Login failed. Please check your credentials.' 
        });
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setErrors(newErrors);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim() || !/\S+@\S+\.\S+/.test(forgotEmail)) {
      setForgotError('Please enter a valid email address.');
      return;
    }
    setForgotStatus('loading');
    setForgotError('');
    try {
      await axios.post('http://localhost:8000/api/auth/forgot-password', { email: forgotEmail });
      setForgotStatus('success');
    } catch {
      setForgotStatus('error');
      setForgotError('Something went wrong. Please try again.');
    }
  };

  const closeForgotModal = () => {
    setShowForgotModal(false);
    setForgotEmail('');
    setForgotStatus('idle');
    setForgotError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4" style={{background: 'linear-gradient(135deg, #0f172a 0%, #064e3b 50%, #0c4a6e 100%)'}}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <LogIn className="w-8 h-8 text-primary-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
            <p className="text-gray-600">Login to access your account</p>
          </div>

          {/* Role Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Choose Role
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleRoleChange('user')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedRole === 'user'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <UserIcon className={`w-6 h-6 mx-auto mb-2 ${
                  selectedRole === 'user' ? 'text-primary-600' : 'text-gray-400'
                }`} />
                <p className={`font-medium ${
                  selectedRole === 'user' ? 'text-primary-700' : 'text-gray-600'
                }`}>
                  User
                </p>
              </button>
              <button
                type="button"
                onClick={() => handleRoleChange('admin')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedRole === 'admin'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Shield className={`w-6 h-6 mx-auto mb-2 ${
                  selectedRole === 'admin' ? 'text-primary-600' : 'text-gray-400'
                }`} />
                <p className={`font-medium ${
                  selectedRole === 'admin' ? 'text-primary-700' : 'text-gray-600'
                }`}>
                  Admin
                </p>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {selectedRole === 'user' ? (
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-800 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border text-gray-900 placeholder-gray-400 ${
                      errors.email ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'
                    } focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all`}
                    placeholder="your.email@example.com"
                  />
                </div>
                {errors.email && <p className="mt-1.5 text-sm text-red-600 font-medium">{errors.email}</p>}
              </div>
            ) : (
              <div>
                <label htmlFor="username" className="block text-sm font-semibold text-gray-800 mb-2">
                  Username
                </label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border text-gray-900 placeholder-gray-400 ${
                      errors.username ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'
                    } focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all`}
                    placeholder="Enter admin username"
                  />
                </div>
                {errors.username && <p className="mt-1.5 text-sm text-red-600 font-medium">{errors.username}</p>}
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-800 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border text-gray-900 placeholder-gray-400 ${
                    errors.password ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'
                  } focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all`}
                  placeholder="Enter your password"
                />
              </div>
              {errors.password && <p className="mt-1.5 text-sm text-red-600 font-medium">{errors.password}</p>}
              <div className="text-right mt-1">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-sm text-primary-600 hover:text-primary-700 font-semibold"
                >
                  Forgot Password?
                </button>
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={isSubmitting}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors shadow-lg ${
                isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isSubmitting ? 'Logging in...' : 'Login'}
            </motion.button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600 font-medium">
              Don't have an account?{' '}
              <Link to="/signup" className="text-primary-600 hover:text-primary-700 font-bold underline underline-offset-2">
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </motion.div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md relative"
          >
            <button
              onClick={closeForgotModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Mail className="w-6 h-6 text-primary-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Forgot Password?</h2>
              <p className="text-gray-500 text-sm mt-1">
                Enter your email and we'll send you a reset link.
              </p>
            </div>

            {forgotStatus === 'success' ? (
              <div className="text-center">
                <p className="text-green-600 font-medium">✅ Reset link sent!</p>
                <p className="text-gray-500 text-sm mt-1">
                  Check your inbox at <strong>{forgotEmail}</strong> for the password reset link.
                </p>
                <button
                  onClick={closeForgotModal}
                  className="mt-4 w-full bg-primary-600 text-white py-2 rounded-lg font-semibold hover:bg-primary-700 transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => { setForgotEmail(e.target.value); setForgotError(''); }}
                      className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                      placeholder="your.email@example.com"
                    />
                  </div>
                  {forgotError && <p className="mt-1 text-sm text-red-500">{forgotError}</p>}
                </div>

                <motion.button
                  type="submit"
                  disabled={forgotStatus === 'loading'}
                  whileHover={{ scale: forgotStatus === 'loading' ? 1 : 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {forgotStatus === 'loading' ? 'Sending...' : 'Send Reset Link'}
                </motion.button>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Login;
