import api from './api';

/**
 * Dashboard Service
 * Handles all dashboard-related API calls
 */

export const dashboardService = {
  /**
   * Get dashboard overview
   */
  getOverview: async () => {
    return await api.get('/dashboard/overview');
  },

  /**
   * Get top offenders
   */
  getTopOffenders: async (limit = 5) => {
    return await api.get('/dashboard/top-offenders', { params: { limit } });
  },

  /**
   * Get recent events
   */
  getRecentEvents: async (limit = 10, hours = 24) => {
    return await api.get('/dashboard/recent-events', { params: { limit, hours } });
  },

  /**
   * Get auto-closed alerts
   */
  getAutoClosedAlerts: async (limit = 10, days = 7) => {
    return await api.get('/dashboard/auto-closed', { params: { limit, days } });
  },

  /**
   * Get alert trends
   */
  getTrends: async (days = 7) => {
    return await api.get('/dashboard/trends', { params: { days } });
  },

  /**
   * Get alerts by source
   */
  getAlertsBySource: async () => {
    return await api.get('/dashboard/by-source');
  },
};

export default dashboardService;
