import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const API_BASE_URL = 'http://localhost:8000';

export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    userRole: null,
    userData: null,
    token: null,
  });

  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const restoreSession = async () => {
      const storedToken = localStorage.getItem('token');
      const storedAuth = localStorage.getItem('sdg3_auth');

      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${storedToken}` },
        });

        if (response.status === 401) {
          localStorage.removeItem('sdg3_auth');
          localStorage.removeItem('token');
          return;
        }

        if (!response.ok) {
          const parsedAuth = storedAuth ? JSON.parse(storedAuth) : {};
          setAuthState({ ...parsedAuth, isAuthenticated: true, token: storedToken });
          return;
        }

        const user = await response.json();
        setAuthState({
          isAuthenticated: true,
          userRole: user.role,
          userData: { id: user.id, name: user.name, email: user.email },
          token: storedToken,
        });
      } catch (error) {
        console.error('Error restoring auth state:', error);
        const parsedAuth = storedAuth ? JSON.parse(storedAuth) : {};
        setAuthState({ ...parsedAuth, isAuthenticated: true, token: storedToken });
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession().catch((error) => {
      console.error('Error loading auth state:', error);
      localStorage.removeItem('sdg3_auth');
      localStorage.removeItem('token');
      setIsLoading(false);
    });
  }, []);

  // Persist auth state to localStorage
  useEffect(() => {
    if (isLoading) return;

    if (authState.isAuthenticated && authState.token) {
      const { token, ...authWithoutToken } = authState;
      localStorage.setItem('sdg3_auth', JSON.stringify(authWithoutToken));
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('sdg3_auth');
      localStorage.removeItem('token');
    }
  }, [authState]);

  const login = async (email, password, username = null) => {
    try {
      console.log('Login request:', { email, username });

      const body = username 
        ? { email: 'admin@sdg3.com', password, username }  // Admin login with username
        : { email, password };  // Regular user login

      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Login error response:', error);
        throw new Error(error.detail || 'Login failed');
      }

      const data = await response.json();
      console.log('Login success:', { user: data.user });

      const newAuthState = {
        isAuthenticated: true,
        userRole: data.user.role,
        userData: {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
        },
        token: data.access_token,
      };

      setAuthState(newAuthState);
      return newAuthState;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const signup = async (name, email, password, role = 'user', adminSecretKey = null) => {
    try {
      const endpoint = role === 'admin'
        ? `${API_BASE_URL}/api/auth/signup/admin`
        : `${API_BASE_URL}/api/auth/signup`;

      const body = role === 'admin'
        ? { name, email, password, admin_secret_key: adminSecretKey }
        : { name, email, password };

      console.log('Signup request:', { endpoint, body: { ...body, password: '***' } });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Signup error response:', error);
        throw new Error(error.detail || 'Signup failed');
      }

      const data = await response.json();
      console.log('Signup success:', { user: data.user });

      const newAuthState = {
        isAuthenticated: true,
        userRole: data.user.role,
        userData: {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
        },
        token: data.access_token,
      };

      setAuthState(newAuthState);
      return newAuthState;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const logout = () => {
    setAuthState({
      isAuthenticated: false,
      userRole: null,
      userData: null,
      token: null,
    });
    localStorage.removeItem('sdg3_auth');
    localStorage.removeItem('token');
  };

  const value = {
    ...authState,
    login,
    signup,
    logout,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
