import api from './api';

/**
 * Authentication Service
 * Handles all auth-related API calls
 */

export const authService = {
  /**
   * Login user
   */
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    if (response.success && response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response;
  },

  /**
   * Register new user
   */
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    if (response.success && response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response;
  },

  /**
   * Logout user
   */
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  /**
   * Get current user
   */
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },

  /**
   * Get user profile
   */
  getProfile: async () => {
    return await api.get('/auth/me');
  },

  /**
   * Update user profile
   */
  updateProfile: async (userData) => {
    const response = await api.put('/auth/profile', userData);
    if (response.success && response.data.user) {
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response;
  },
};

export default authService;
