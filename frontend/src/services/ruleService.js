import api from './api';

/**
 * Rule Service
 * Handles all rule-related API calls
 */

export const ruleService = {
  /**
   * Get all rules
   */
  getRules: async (params = {}) => {
    return await api.get('/rules', { params });
  },

  /**
   * Get single rule
   */
  getRule: async (ruleId) => {
    return await api.get(`/rules/${ruleId}`);
  },

  /**
   * Create new rule
   */
  createRule: async (ruleData) => {
    return await api.post('/rules', ruleData);
  },

  /**
   * Update rule
   */
  updateRule: async (ruleId, ruleData) => {
    return await api.put(`/rules/${ruleId}`, ruleData);
  },

  /**
   * Delete rule
   */
  deleteRule: async (ruleId) => {
    return await api.delete(`/rules/${ruleId}`);
  },

  /**
   * Toggle rule enabled/disabled
   */
  toggleRule: async (ruleId) => {
    return await api.patch(`/rules/${ruleId}/toggle`);
  },
};

export default ruleService;
