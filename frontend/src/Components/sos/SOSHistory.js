import { useState, useEffect } from "react";
import { getSOSAlertHistory } from "../../services/api";
import LocationName from "../common/LocationName";

const SOSHistory = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getSOSAlertHistory();
      setAlerts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError("Failed to load SOS history");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="badge bg-warning text-dark">🔴 Active</span>;
      case 'RESOLVED':
        return <span className="badge bg-success text-white">🟢 Resolved</span>;
      case 'CANCELLED':
        return <span className="badge bg-warning text-dark">🟡 Cancelled</span>;
      default:
        return <span className="badge bg-secondary">Unknown</span>;
    }
  };

  const getRowClass = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'table-danger';
      case 'RESOLVED':
        return 'table-success';
      case 'CANCELLED':
        return 'table-warning';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-warning" role="alert">
        {error}
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="card border-0 shadow-sm">
        <div className="card-body text-center py-5">
          <p className="text-muted mb-2 fw-semibold">No SOS history yet</p>
          <p className="text-muted small mb-0">
            SOS alerts will appear here once they are triggered.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card shadow-sm border-0">
      <div className="card-header bg-white">
        <h5 className="mb-0">SOS History</h5>
      </div>
      <div className="card-body">
        <div className="table-responsive">
          <table className="table table-hover">
            <thead>
              <tr>
                <th>Date</th>
                <th>Student</th>
                <th>Status</th>
                <th>Time Triggered</th>
                <th>Time Resolved/Cancelled</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => (
                <tr key={alert.id} className={getRowClass(alert.status)}>
                  <td>{formatDate(alert.timestamp)}</td>
                  <td>{alert.student_username || 'Unknown'}</td>
                  <td>{getStatusBadge(alert.status)}</td>
                  <td>{formatTime(alert.timestamp)}</td>
                  <td>
                    {alert.status === 'RESOLVED' && alert.resolved_at
                      ? formatTime(alert.resolved_at)
                      : alert.status === 'CANCELLED' && alert.cancelled_at
                      ? formatTime(alert.cancelled_at)
                      : '—'}
                  </td>
                  <td className="small">
                    {alert.latitude && alert.longitude
                      ? <LocationName latitude={alert.latitude} longitude={alert.longitude} />
                      : alert.location || "Location unavailable"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SOSHistory;
