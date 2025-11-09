import api from './api';

/**
 * Alert Service
 * Handles all alert-related API calls
 */

export const alertService = {
  /**
   * Get all alerts with filters
   */
  getAlerts: async (params = {}) => {
    return await api.get('/alerts', { params });
  },

  /**
   * Get single alert
   */
  getAlert: async (alertId) => {
    return await api.get(`/alerts/${alertId}`);
  },

  /**
   * Create new alert
   */
  createAlert: async (alertData) => {
    return await api.post('/alerts', alertData);
  },

  /**
   * Update alert
   */
  updateAlert: async (alertId, alertData) => {
    return await api.put(`/alerts/${alertId}`, alertData);
  },

  /**
   * Resolve alert
   */
  resolveAlert: async (alertId, notes) => {
    return await api.put(`/alerts/${alertId}/resolve`, { notes });
  },

  /**
   * Delete alert
   */
  deleteAlert: async (alertId) => {
    return await api.delete(`/alerts/${alertId}`);
  },
};

export default alertService;
