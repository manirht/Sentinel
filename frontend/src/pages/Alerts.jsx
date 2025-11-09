import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import alertService from '../services/alertService';
import toast from 'react-hot-toast';
import { AlertTriangle, Check, XCircle, Filter, Plus, Eye } from 'lucide-react';
import { format } from 'date-fns';

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    severity: '',
    sourceType: '',
    page: 1,
    limit: 20
  });
  const [pagination, setPagination] = useState(null);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchAlerts();
  }, [filters]);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const response = await alertService.getAlerts(filters);
      setAlerts(response.data.alerts);
      setPagination(response.data.pagination);
    } catch (err) {
      toast.error('Failed to fetch alerts');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value, page: 1 });
  };

  const handleResolve = async (alertId) => {
    try {
      await alertService.resolveAlert(alertId, 'Manually resolved');
      toast.success('Alert resolved successfully');
      fetchAlerts();
    } catch (err) {
      toast.error('Failed to resolve alert');
    }
  };

  const handleViewDetails = async (alert) => {
    try {
      const response = await alertService.getAlert(alert.alertId);
      setSelectedAlert(response.data);
      setShowModal(true);
    } catch (err) {
      toast.error('Failed to fetch alert details');
    }
  };

  const getSeverityBadge = (severity) => {
    const badges = {
      CRITICAL: 'badge-critical',
      WARNING: 'badge-warning',
      INFO: 'badge-info'
    };
    return `badge ${badges[severity]}`;
  };

  const getStatusBadge = (status) => {
    const badges = {
      OPEN: 'badge-info',
      ESCALATED: 'badge-critical',
      AUTO_CLOSED: 'badge-success',
      RESOLVED: 'badge-success'
    };
    return `badge ${badges[status]}`;
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Alerts</h1>
            <p className="text-gray-600 mt-1">Manage and monitor system alerts</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Alert
          </button>
        </div>

        {/* Filters */}
        <div className="card">
          <div className="flex items-center gap-4 flex-wrap">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="input max-w-xs"
            >
              <option value="">All Status</option>
              <option value="OPEN">Open</option>
              <option value="ESCALATED">Escalated</option>
              <option value="AUTO_CLOSED">Auto-Closed</option>
              <option value="RESOLVED">Resolved</option>
            </select>
            <select
              value={filters.severity}
              onChange={(e) => handleFilterChange('severity', e.target.value)}
              className="input max-w-xs"
            >
              <option value="">All Severity</option>
              <option value="CRITICAL">Critical</option>
              <option value="WARNING">Warning</option>
              <option value="INFO">Info</option>
            </select>
            <select
              value={filters.sourceType}
              onChange={(e) => handleFilterChange('sourceType', e.target.value)}
              className="input max-w-xs"
            >
              <option value="">All Sources</option>
              <option value="overspeed">Overspeed</option>
              <option value="compliance">Compliance</option>
              <option value="feedback_negative">Negative Feedback</option>
              <option value="maintenance">Maintenance</option>
            </select>
            <button
              onClick={() => setFilters({ status: '', severity: '', sourceType: '', page: 1, limit: 20 })}
              className="btn btn-secondary"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Alerts Table */}
        <div className="card">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Alert ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {alerts.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                        No alerts found
                      </td>
                    </tr>
                  ) : (
                    alerts.map((alert) => (
                      <tr key={alert._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-600">
                          {alert.alertId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                          {alert.sourceType.replace('_', ' ')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={getSeverityBadge(alert.severity)}>{alert.severity}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={getStatusBadge(alert.status)}>{alert.status}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {alert.metadata?.driverName || alert.metadata?.driverId || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {format(new Date(alert.timestamp), 'MMM dd, yyyy HH:mm')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                          <button
                            onClick={() => handleViewDetails(alert)}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            <Eye className="h-4 w-4 inline" />
                          </button>
                          {(alert.status === 'OPEN' || alert.status === 'ESCALATED') && (
                            <button
                              onClick={() => handleResolve(alert.alertId)}
                              className="text-green-600 hover:text-green-900"
                            >
                              <Check className="h-4 w-4 inline" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <div className="text-sm text-gray-700">
                Showing page {pagination.page} of {pagination.pages} ({pagination.total} total)
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilters({ ...filters, page: pagination.page - 1 })}
                  disabled={pagination.page === 1}
                  className="btn btn-secondary disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setFilters({ ...filters, page: pagination.page + 1 })}
                  disabled={pagination.page === pagination.pages}
                  className="btn btn-secondary disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Alert Details Modal */}
      {showModal && selectedAlert && (
        <AlertDetailsModal
          alert={selectedAlert}
          onClose={() => {
            setShowModal(false);
            setSelectedAlert(null);
          }}
          onResolve={handleResolve}
          fetchAlerts={fetchAlerts}
        />
      )}

      {/* Create Alert Modal */}
      {showCreateModal && (
        <CreateAlertModal
          onClose={() => setShowCreateModal(false)}
          fetchAlerts={fetchAlerts}
        />
      )}
    </Layout>
  );
};

// Alert Details Modal Component
const AlertDetailsModal = ({ alert, onClose, onResolve, fetchAlerts }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Alert Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XCircle className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Alert ID</label>
              <p className="text-lg font-semibold text-gray-900">{alert.alert.alertId}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Source Type</label>
              <p className="text-lg capitalize">{alert.alert.sourceType.replace('_', ' ')}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Severity</label>
              <p><span className={`badge ${alert.alert.severity === 'CRITICAL' ? 'badge-critical' : alert.alert.severity === 'WARNING' ? 'badge-warning' : 'badge-info'}`}>{alert.alert.severity}</span></p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <p><span className={`badge ${alert.alert.status === 'ESCALATED' ? 'badge-critical' : alert.alert.status.includes('CLOSED') || alert.alert.status === 'RESOLVED' ? 'badge-success' : 'badge-info'}`}>{alert.alert.status}</span></p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Metadata</label>
            <div className="mt-2 bg-gray-50 p-4 rounded-lg">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                {JSON.stringify(alert.alert.metadata, null, 2)}
              </pre>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500 mb-2 block">Alert History</label>
            <div className="space-y-2">
              {alert.history.map((event) => (
                <div key={event._id} className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">
                        {event.fromStatus || 'NEW'} → {event.toStatus}
                      </p>
                      <p className="text-sm text-gray-600">{event.reason}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {event.triggeredBy} • {format(new Date(event.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {(alert.alert.status === 'OPEN' || alert.alert.status === 'ESCALATED') && (
            <div className="flex gap-2 pt-4">
              <button
                onClick={async () => {
                  await onResolve(alert.alert.alertId);
                  onClose();
                  fetchAlerts();
                }}
                className="btn btn-success flex-1"
              >
                <Check className="h-4 w-4 mr-2" />
                Resolve Alert
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Create Alert Modal Component
const CreateAlertModal = ({ onClose, fetchAlerts }) => {
  const [formData, setFormData] = useState({
    sourceType: 'overspeed',
    severity: 'INFO',
    metadata: {
      driverId: '',
      driverName: '',
      vehicleId: '',
      vehicleNumber: ''
    }
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await alertService.createAlert(formData);
      toast.success('Alert created successfully');
      onClose();
      fetchAlerts();
    } catch (err) {
      toast.error('Failed to create alert');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Create Alert</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XCircle className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Source Type</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
            <select
              value={formData.severity}
              onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
              className="input"
              required
            >
              <option value="INFO">Info</option>
              <option value="WARNING">Warning</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Driver ID</label>
            <input
              type="text"
              value={formData.metadata.driverId}
              onChange={(e) => setFormData({ ...formData, metadata: { ...formData.metadata, driverId: e.target.value }})}
              className="input"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Driver Name</label>
            <input
              type="text"
              value={formData.metadata.driverName}
              onChange={(e) => setFormData({ ...formData, metadata: { ...formData.metadata, driverName: e.target.value }})}
              className="input"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Number</label>
            <input
              type="text"
              value={formData.metadata.vehicleNumber}
              onChange={(e) => setFormData({ ...formData, metadata: { ...formData.metadata, vehicleNumber: e.target.value }})}
              className="input"
              required
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary flex-1">
              {loading ? 'Creating...' : 'Create Alert'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Alerts;
