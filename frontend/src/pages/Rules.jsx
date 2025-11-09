import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import ruleService from '../services/ruleService';
import toast from 'react-hot-toast';
import { Settings, Plus, Edit, Trash2, ToggleLeft, ToggleRight, XCircle } from 'lucide-react';

const Rules = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const response = await ruleService.getRules();
      setRules(response.data.rules);
    } catch (error) {
      toast.error('Failed to fetch rules');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (ruleId) => {
    try {
      await ruleService.toggleRule(ruleId);
      toast.success('Rule toggled successfully');
      fetchRules();
    } catch (error) {
      toast.error('Failed to toggle rule');
    }
  };

  const handleDelete = async (ruleId) => {
    if (!window.confirm('Are you sure you want to delete this rule?')) return;
    
    try {
      await ruleService.deleteRule(ruleId);
      toast.success('Rule deleted successfully');
      fetchRules();
    } catch (error) {
      toast.error('Failed to delete rule');
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Rules</h1>
            <p className="text-gray-600 mt-1">Configure alert escalation and auto-close rules</p>
          </div>
          <button
            onClick={() => {
              setEditingRule(null);
              setShowModal(true);
            }}
            className="btn btn-primary flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Rule
          </button>
        </div>

        {/* Rules List */}
        <div className="grid grid-cols-1 gap-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : rules.length === 0 ? (
            <div className="card text-center py-12">
              <Settings className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No rules configured yet</p>
            </div>
          ) : (
            rules.map((rule) => (
              <div key={rule._id} className="card hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">{rule.name}</h3>
                      <span className={`badge ${rule.enabled ? 'badge-success' : 'bg-gray-100 text-gray-800'}`}>
                        {rule.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                      <span className="badge badge-info capitalize">
                        {rule.sourceType.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-4">{rule.description}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Conditions</h4>
                        <div className="space-y-1 text-sm text-gray-600">
                          {rule.conditions.escalate_if_count && (
                            <p>• Escalate after {rule.conditions.escalate_if_count} occurrences</p>
                          )}
                          {rule.conditions.window_mins && (
                            <p>• Within {rule.conditions.window_mins} minutes</p>
                          )}
                          {rule.conditions.auto_close_if && (
                            <p>• Auto-close if: {rule.conditions.auto_close_if}</p>
                          )}
                          {rule.conditions.auto_close_after_mins && (
                            <p>• Auto-close after {rule.conditions.auto_close_after_mins} minutes</p>
                          )}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Actions</h4>
                        <div className="space-y-1 text-sm text-gray-600">
                          {rule.actions.escalate_to_severity && (
                            <p>• Escalate to: {rule.actions.escalate_to_severity}</p>
                          )}
                          {rule.actions.notify && (
                            <p>• Send notifications: {rule.actions.notificationChannels?.join(', ')}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    <button
                      onClick={() => handleToggle(rule.ruleId)}
                      className={`p-2 rounded-lg ${rule.enabled ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                      title={rule.enabled ? 'Disable' : 'Enable'}
                    >
                      {rule.enabled ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6" />}
                    </button>
                    <button
                      onClick={() => {
                        setEditingRule(rule);
                        setShowModal(true);
                      }}
                      className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg"
                      title="Edit"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(rule.ruleId)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Rule Modal */}
      {showModal && (
        <RuleModal
          rule={editingRule}
          onClose={() => {
            setShowModal(false);
            setEditingRule(null);
          }}
          fetchRules={fetchRules}
        />
      )}
    </Layout>
  );
};

// Rule Modal Component
const RuleModal = ({ rule, onClose, fetchRules }) => {
  const [formData, setFormData] = useState(rule || {
    ruleId: `RULE_${Date.now()}`,
    sourceType: 'overspeed',
    name: '',
    description: '',
    enabled: true,
    priority: 0,
    conditions: {
      escalate_if_count: 0,
      window_mins: 0,
      auto_close_if: '',
      auto_close_after_mins: 0
    },
    actions: {
      escalate_to_severity: '',
      notify: false,
      notificationChannels: []
    }
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (rule) {
        await ruleService.updateRule(rule.ruleId, formData);
        toast.success('Rule updated successfully');
      } else {
        await ruleService.createRule(formData);
        toast.success('Rule created successfully');
      }
      onClose();
      fetchRules();
    } catch (error) {
      toast.error(rule ? 'Failed to update rule' : 'Failed to create rule');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{rule ? 'Edit Rule' : 'Create Rule'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XCircle className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Rule Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Source Type *</label>
              <select
                value={formData.sourceType}
                onChange={(e) => setFormData({ ...formData, sourceType: e.target.value })}
                className="input"
                required
              >
                <option value="overspeed">Overspeed</option>
                <option value="compliance">Compliance</option>
                <option value="feedback_negative">Negative Feedback</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <input
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                className="input"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input"
                rows="2"
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Conditions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Escalate if count</label>
                <input
                  type="number"
                  value={formData.conditions.escalate_if_count}
                  onChange={(e) => setFormData({
                    ...formData,
                    conditions: { ...formData.conditions, escalate_if_count: parseInt(e.target.value) || 0 }
                  })}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Within minutes</label>
                <input
                  type="number"
                  value={formData.conditions.window_mins}
                  onChange={(e) => setFormData({
                    ...formData,
                    conditions: { ...formData.conditions, window_mins: parseInt(e.target.value) || 0 }
                  })}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Auto-close if</label>
                <input
                  type="text"
                  value={formData.conditions.auto_close_if}
                  onChange={(e) => setFormData({
                    ...formData,
                    conditions: { ...formData.conditions, auto_close_if: e.target.value }
                  })}
                  className="input"
                  placeholder="e.g., document_valid"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Auto-close after (mins)</label>
                <input
                  type="number"
                  value={formData.conditions.auto_close_after_mins}
                  onChange={(e) => setFormData({
                    ...formData,
                    conditions: { ...formData.conditions, auto_close_after_mins: parseInt(e.target.value) || 0 }
                  })}
                  className="input"
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Escalate to severity</label>
                <select
                  value={formData.actions.escalate_to_severity}
                  onChange={(e) => setFormData({
                    ...formData,
                    actions: { ...formData.actions, escalate_to_severity: e.target.value }
                  })}
                  className="input"
                >
                  <option value="">None</option>
                  <option value="INFO">Info</option>
                  <option value="WARNING">Warning</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.actions.notify}
                  onChange={(e) => setFormData({
                    ...formData,
                    actions: { ...formData.actions, notify: e.target.checked }
                  })}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-700">Enable notifications</label>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary flex-1">
              {loading ? 'Saving...' : (rule ? 'Update Rule' : 'Create Rule')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Rules;
