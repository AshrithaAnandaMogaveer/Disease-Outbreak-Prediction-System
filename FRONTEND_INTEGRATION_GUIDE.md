# Frontend Integration Guide

Complete guide for integrating the React frontend with the FastAPI backend.

## Overview

This guide shows how to connect your existing SDG 3 Health Platform frontend (React + Vite) with the newly created FastAPI backend.

## Backend Status

✅ Backend is fully implemented and running at: `http://localhost:8000`
✅ API documentation available at: `http://localhost:8000/docs`

## Integration Steps

### Step 1: Install Axios

```bash
cd sdg3-health-platform
npm install axios
```

### Step 2: Create API Configuration

Create `src/api/config.js`:

```javascript
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### Step 3: Create API Service

Create `src/api/services.js`:

```javascript
import api from './config';

// Authentication
export const authService = {
  signup: async (email, password, name) => {
    const response = await api.post('/api/auth/signup', { email, password, name });
    return response.data;
  },

  signupAdmin: async (email, password, name, adminSecretKey) => {
    const response = await api.post('/api/auth/signup/admin', {
      email,
      password,
      name,
      admin_secret_key: adminSecretKey,
    });
    return response.data;
  },

  login: async (email, password) => {
    const response = await api.post('/api/auth/login', { email, password });
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/api/auth/me');
    return response.data;
  },
};

// Predictions
export const predictionService = {
  analyze: async (healthData, environmentalData, populationData, climateVariation = null) => {
    const response = await api.post('/api/predictions/analyze', {
      health_data: healthData,
      environmental_data: environmentalData,
      population_data: populationData,
      climate_variation: climateVariation,
    });
    return response.data;
  },

  save: async (predictionData) => {
    const response = await api.post('/api/predictions/save', predictionData);
    return response.data;
  },

  getHistory: async (skip = 0, limit = 20) => {
    const response = await api.get(`/api/predictions/history?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  getDetail: async (predictionId) => {
    const response = await api.get(`/api/predictions/${predictionId}`);
    return response.data;
  },

  delete: async (predictionId) => {
    const response = await api.delete(`/api/predictions/${predictionId}`);
    return response.data;
  },
};

// Admin
export const adminService = {
  getUsers: async (skip = 0, limit = 50) => {
    const response = await api.get(`/api/admin/users?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  getPredictions: async (skip = 0, limit = 50) => {
    const response = await api.get(`/api/admin/predictions?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  getStatistics: async () => {
    const response = await api.get('/api/admin/statistics');
    return response.data;
  },
};
```

### Step 4: Update AuthContext

Update `src/context/AuthContext.jsx`:

```javascript
import { createContext, useState, useContext, useEffect } from 'react';
import { authService } from '../api/services';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing token
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
      setIsAuthenticated(true);
      const parsedUser = JSON.parse(user);
      setUserData(parsedUser);
      setUserRole(parsedUser.role);
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authService.login(email, password);
      
      // Store token and user data
      localStorage.setItem('token', response.access_token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      setIsAuthenticated(true);
      setUserData(response.user);
      setUserRole(response.user.role);
      
      return { success: true, user: response.user };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Login failed' 
      };
    }
  };

  const signup = async (email, password, name, isAdmin = false, adminSecretKey = '') => {
    try {
      let response;
      
      if (isAdmin) {
        response = await authService.signupAdmin(email, password, name, adminSecretKey);
      } else {
        response = await authService.signup(email, password, name);
      }
      
      // Store token and user data
      localStorage.setItem('token', response.access_token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      setIsAuthenticated(true);
      setUserData(response.user);
      setUserRole(response.user.role);
      
      return { success: true, user: response.user };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Signup failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUserData(null);
    setUserRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userRole,
        userData,
        loading,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

### Step 5: Update Login Page

Update `src/pages/Login.jsx`:

```javascript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);
    
    setLoading(false);

    if (result.success) {
      // Redirect based on role
      if (result.user.role === 'admin') {
        navigate('/admin-dashboard');
      } else {
        navigate('/predict-outbreak');
      }
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Login</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="your@email.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="mt-6 text-center text-gray-600">
          Don't have an account?{' '}
          <button
            onClick={() => navigate('/signup')}
            className="text-blue-600 hover:underline font-semibold"
          >
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
}
```

### Step 6: Update Signup Page

Update `src/pages/Signup.jsx` to include role selection and admin secret key field.

### Step 7: Update PredictOutbreak Page

Update `src/pages/PredictOutbreak.jsx` to use backend API:

```javascript
import { predictionService } from '../api/services';

// In your analyze function:
const handleAnalyze = async () => {
  try {
    setLoading(true);
    
    const healthData = {
      active_cases: parseInt(formData.activeCases),
      new_cases: parseInt(formData.newCases),
      hospital_admissions: parseInt(formData.hospitalAdmissions),
      recovery_rate: parseFloat(formData.recoveryRate),
    };

    const environmentalData = {
      temperature: parseFloat(formData.temperature),
      rainfall: parseFloat(formData.rainfall),
      humidity: parseFloat(formData.humidity),
      air_quality: parseFloat(formData.airQuality),
    };

    const populationData = {
      population_density: parseFloat(formData.populationDensity),
      area_type: formData.areaType,
      migration_rate: parseFloat(formData.migrationRate),
    };

    const climateVariation = {
      temperature_change: climateChanges.temperature,
      rainfall_change: climateChanges.rainfall,
      humidity_change: climateChanges.humidity,
    };

    const response = await predictionService.analyze(
      healthData,
      environmentalData,
      populationData,
      climateVariation
    );

    // Update state with response
    setRiskScore(response.risk_analysis.risk_score);
    setRiskLevel(response.risk_analysis.risk_level);
    setWeeklyProjections(response.risk_analysis.weekly_projections);
    setMonthlyProjections(response.risk_analysis.monthly_projections);
    setReport(response.report);
    
    setLoading(false);
  } catch (error) {
    console.error('Analysis failed:', error);
    setLoading(false);
    alert('Failed to analyze outbreak risk. Please try again.');
  }
};
```

### Step 8: Create Environment File

Create `.env` in frontend root:

```env
VITE_API_URL=http://localhost:8000
```

For production:
```env
VITE_API_URL=https://api.yourdomain.com
```

### Step 9: Update package.json

Add proxy configuration (optional):

```json
{
  "proxy": "http://localhost:8000"
}
```

## Testing Integration

### 1. Start Backend

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

### 2. Start Frontend

```bash
cd sdg3-health-platform
npm run dev
```

### 3. Test Flow

1. Visit `http://localhost:5174`
2. Click "Sign Up"
3. Register a new user
4. Login with credentials
5. Navigate to "Predict Outbreak"
6. Fill form and click "Generate Outbreak Risk"
7. Verify data comes from backend

## API Endpoint Mapping

### Frontend → Backend

| Frontend Action | Backend Endpoint | Method |
|----------------|------------------|--------|
| User Signup | `/api/auth/signup` | POST |
| Admin Signup | `/api/auth/signup/admin` | POST |
| Login | `/api/auth/login` | POST |
| Get Profile | `/api/auth/me` | GET |
| Analyze Risk | `/api/predictions/analyze` | POST |
| Save Prediction | `/api/predictions/save` | POST |
| Get History | `/api/predictions/history` | GET |
| Get Detail | `/api/predictions/{id}` | GET |
| Delete Prediction | `/api/predictions/{id}` | DELETE |
| Admin: Users | `/api/admin/users` | GET |
| Admin: Predictions | `/api/admin/predictions` | GET |
| Admin: Statistics | `/api/admin/statistics` | GET |

## Data Format Conversion

### Frontend → Backend

```javascript
// Frontend format
const formData = {
  activeCases: "100",
  newCases: "50",
  // ...
};

// Convert to backend format
const healthData = {
  active_cases: parseInt(formData.activeCases),
  new_cases: parseInt(formData.newCases),
  // ...
};
```

### Backend → Frontend

```javascript
// Backend response
{
  risk_analysis: {
    risk_score: 65.4,
    risk_level: "High",
    // ...
  }
}

// Use in frontend
setRiskScore(response.risk_analysis.risk_score);
setRiskLevel(response.risk_analysis.risk_level);
```

## Error Handling

```javascript
try {
  const response = await predictionService.analyze(...);
  // Handle success
} catch (error) {
  if (error.response) {
    // Server responded with error
    console.error('Server error:', error.response.data.detail);
    alert(error.response.data.detail);
  } else if (error.request) {
    // Request made but no response
    console.error('Network error:', error.request);
    alert('Network error. Please check your connection.');
  } else {
    // Something else happened
    console.error('Error:', error.message);
    alert('An unexpected error occurred.');
  }
}
```

## CORS Configuration

Backend is already configured for CORS. If you encounter issues:

1. Check backend `.env`:
```env
CORS_ORIGINS=http://localhost:5174,http://localhost:3000
```

2. Restart backend after changes

## Common Issues

### Issue: Network Error

**Solution**: Ensure backend is running at `http://localhost:8000`

### Issue: 401 Unauthorized

**Solution**: Check if token is being sent in headers. Clear localStorage and login again.

### Issue: CORS Error

**Solution**: Add frontend URL to backend `CORS_ORIGINS` in `.env`

### Issue: Data not saving

**Solution**: Verify token is valid and user is authenticated

## Next Steps

1. ✅ Backend running
2. ✅ Frontend configured
3. ⚠️ Update all pages to use backend API
4. ⚠️ Remove localStorage simulation code
5. ⚠️ Test all features end-to-end
6. ⚠️ Deploy both frontend and backend

## Production Deployment

### Frontend

```bash
# Build
npm run build

# Deploy to Vercel/Netlify
# Set environment variable: VITE_API_URL=https://api.yourdomain.com
```

### Backend

See `backend/DEPLOYMENT.md` for complete deployment guide.

## Status

✅ Backend: Fully implemented and tested
✅ API: All endpoints working
✅ Documentation: Complete
⚠️ Frontend: Needs integration updates
⚠️ Testing: End-to-end testing required

## Support

- Backend API Docs: `http://localhost:8000/docs`
- Backend Setup: `backend/SETUP_GUIDE.md`
- API Testing: `backend/API_TESTING.md`
- Deployment: `backend/DEPLOYMENT.md`
