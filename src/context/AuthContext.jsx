import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

// Configure axios interceptor to automatically attach authorization header
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('karneval_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const AuthContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const { i18n } = useTranslation();
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('karneval_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('karneval_token'));
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('karneval_dark') === 'true');

  // Load persisted state on mount
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem('karneval_lang');
      if (savedLang) {
        i18n.changeLanguage(savedLang);
      }
    } catch {
      // If localStorage is corrupted, just start fresh
      localStorage.removeItem('karneval_token');
      localStorage.removeItem('karneval_user');
    }
    Promise.resolve().then(() => setLoading(false));
  }, [i18n]);

  // Sync dark mode class on <html>
  useEffect(() => {
    const html = document.documentElement;
    if (darkMode) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
    localStorage.setItem('karneval_dark', darkMode);
  }, [darkMode]);

  // Sync language direction
  useEffect(() => {
    const dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = i18n.language;
    localStorage.setItem('karneval_lang', i18n.language);
  }, [i18n.language]);

  const login = useCallback(async (email, password) => {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email,
      password,
    });
    // The backend AuthResponse returns accessToken in the "message" field
    const { message: newToken, ...userData } = response.data;
    setToken(newToken);
    setUser(userData);
    localStorage.setItem('karneval_token', newToken);
    localStorage.setItem('karneval_user', JSON.stringify(userData));
    return userData;
  }, []);

  const register = useCallback(async (registerData) => {
    const response = await axios.post(`${API_BASE}/auth/register`, registerData);
    return response.data;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('karneval_token');
    localStorage.removeItem('karneval_user');
  }, []);

  const toggleDarkMode = useCallback(() => {
    setDarkMode((prev) => !prev);
  }, []);

  const toggleLanguage = useCallback(() => {
    const newLang = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(newLang);
  }, [i18n]);

  const value = {
    user,
    token,
    loading,
    darkMode,
    language: i18n.language,
    login,
    register,
    logout,
    toggleDarkMode,
    toggleLanguage,
    isAuthenticated: !!token && !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

