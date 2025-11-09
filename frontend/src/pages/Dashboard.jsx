import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import dashboardService from '../services/dashboardService';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  TrendingUp,
  Users,
  Clock,
  Activity
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { format } from 'date-fns';

const COLORS = {
  CRITICAL: '#ef4444',
  WARNING: '#f59e0b',
  INFO: '#3b82f6',
  OPEN: '#8b5cf6',
  ESCALATED: '#dc2626',
  AUTO_CLOSED: '#10b981',
  RESOLVED: '#059669',
};

const Dashboard = () => {
  const [overview, setOverview] = useState(null);
  const [topOffenders, setTopOffenders] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);
  const [autoClosedAlerts, setAutoClosedAlerts] = useState([]);
  const [trends, setTrends] = useState([]);
  const [bySource, setBySource] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [
        overviewData,
        offendersData,
        eventsData,
        autoClosedData,
        trendsData,
        sourceData
      ] = await Promise.all([
        dashboardService.getOverview(),
        dashboardService.getTopOffenders(5),
        dashboardService.getRecentEvents(10),
        dashboardService.getAutoClosedAlerts(10),
        dashboardService.getTrends(7),
        dashboardService.getAlertsBySource()
      ]);

      setOverview(overviewData.data);
      setTopOffenders(offendersData.data.topOffenders);
      setRecentEvents(eventsData.data.recentEvents);
      setAutoClosedAlerts(autoClosedData.data.autoClosedAlerts);
      setTrends(trendsData.data.trends);
      setBySource(sourceData.data.bySource);
      setLoading(false);
    } catch (err) {
      toast.error('Failed to load dashboard data');
      console.error('Dashboard error:', err);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Real-time alert monitoring and analytics</p>
          </div>
          <button
            onClick={fetchDashboardData}
            className="btn btn-primary"
          >
            <Activity className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>

        {/* Severity Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Critical Alerts"
            value={overview?.severity.CRITICAL || 0}
            icon={AlertTriangle}
            color="red"
            trend={overview?.recentEscalations}
            trendLabel="Recent escalations"
          />
          <StatCard
            title="Warning Alerts"
            value={overview?.severity.WARNING || 0}
            icon={AlertCircle}
            color="yellow"
          />
          <StatCard
            title="Info Alerts"
            value={overview?.severity.INFO || 0}
            icon={Info}
            color="blue"
          />
          <StatCard
            title="Active Alerts"
            value={overview?.activeAlerts || 0}
            icon={TrendingUp}
            color="purple"
          />
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Distribution */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Alert Status Distribution
            </h3>
            {overview && (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Open', value: overview.status.OPEN },
                      { name: 'Escalated', value: overview.status.ESCALATED },
                      { name: 'Auto-Closed', value: overview.status.AUTO_CLOSED },
                      { name: 'Resolved', value: overview.status.RESOLVED }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomLabel}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {[COLORS.OPEN, COLORS.ESCALATED, COLORS.AUTO_CLOSED, COLORS.RESOLVED].map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Alerts by Source */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Alerts by Source Type
            </h3>
            <div className="space-y-3">
              {bySource.map((source) => (
                <div key={source._id} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 capitalize">
                        {source._id.replace('_', ' ')}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        {source.count}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${(source.count / Math.max(...bySource.map(s => s.count))) * 100}%`
                        }}
                      ></div>
                    </div>
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs text-red-600">C: {source.critical}</span>
                      <span className="text-xs text-yellow-600">W: {source.warning}</span>
                      <span className="text-xs text-blue-600">I: {source.info}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Trends Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Alert Trends (Last 7 Days)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={formatTrendsData(trends)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="OPEN" stroke={COLORS.OPEN} strokeWidth={2} />
              <Line type="monotone" dataKey="ESCALATED" stroke={COLORS.ESCALATED} strokeWidth={2} />
              <Line type="monotone" dataKey="AUTO_CLOSED" stroke={COLORS.AUTO_CLOSED} strokeWidth={2} />
              <Line type="monotone" dataKey="RESOLVED" stroke={COLORS.RESOLVED} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top Offenders and Recent Events */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Offenders */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Top Offenders
              </h3>
              <Users className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-3">
              {topOffenders.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No data available</p>
              ) : (
                topOffenders.map((offender, index) => (
                  <div
                    key={offender.driverId}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {offender.driverName || offender.driverId}
                        </p>
                        <p className="text-xs text-gray-500">ID: {offender.driverId}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">{offender.totalAlerts}</p>
                      <div className="flex gap-1 text-xs">
                        <span className="text-red-600">C:{offender.criticalAlerts}</span>
                        <span className="text-yellow-600">W:{offender.warningAlerts}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Events */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Recent Events
              </h3>
              <Clock className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {recentEvents.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No recent events</p>
              ) : (
                recentEvents.map((event) => (
                  <div
                    key={event._id}
                    className="p-3 border border-gray-200 rounded-lg hover:border-primary-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`badge ${getStatusBadgeClass(event.toStatus)}`}>
                            {event.toStatus}
                          </span>
                          <span className="text-xs text-gray-500">
                            {event.alert?.sourceType?.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-900 mt-1">{event.alertId}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {event.triggeredBy} • {format(new Date(event.timestamp), 'MMM dd, HH:mm')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Auto-Closed Alerts */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recently Auto-Closed Alerts
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Alert ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Driver
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Closure Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Closed At
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {autoClosedAlerts.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
                      No auto-closed alerts
                    </td>
                  </tr>
                ) : (
                  autoClosedAlerts.map((alert) => (
                    <tr key={alert._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-600">
                        {alert.alertId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                        {alert.sourceType.replace('_', ' ')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {alert.metadata?.driverName || alert.metadata?.driverId || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {alert.closureReason}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(alert.autoClosedAt), 'MMM dd, yyyy HH:mm')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

// Helper Components
const StatCard = ({ title, value, icon: Icon, color, trend, trendLabel }) => {
  const colorClasses = {
    red: 'bg-red-50 text-red-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {trend !== undefined && (
            <p className="text-xs text-gray-500 mt-1">
              {trend} {trendLabel}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {Icon && <Icon className="h-8 w-8" />}
        </div>
      </div>
    </div>
  );
};

// Helper Functions
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
  const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

  return percent > 0.05 ? (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      className="text-xs font-semibold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  ) : null;
};

const formatTrendsData = (trends) => {
  return trends.map(trend => {
    const statuses = {
      OPEN: 0,
      ESCALATED: 0,
      AUTO_CLOSED: 0,
      RESOLVED: 0
    };
    
    trend.statuses.forEach(s => {
      statuses[s.status] = s.count;
    });

    return {
      date: format(new Date(trend._id), 'MMM dd'),
      ...statuses
    };
  });
};

const getStatusBadgeClass = (status) => {
  const classes = {
    OPEN: 'badge-info',
    ESCALATED: 'badge-critical',
    AUTO_CLOSED: 'badge-success',
    RESOLVED: 'badge-success'
  };
  return classes[status] || 'badge-info';
};

export default Dashboard;
