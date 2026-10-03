/**
 * SOS alert UI card (red emergency styling).
 */
import { useState, useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import { resolveSOSAlert, formatApiError } from "../../services/api";
import LocationName from "../common/LocationName";

const SOSAlertCard = ({ alert, onResolved }) => {
  const { role } = useContext(AuthContext);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState("");

  const rawTime = alert?.timestamp || alert?.created_at;
  const ts = rawTime ? new Date(rawTime) : null;
  const timeLabel = ts ? ts.toLocaleString() : "Unknown time";

  const studentLabel =
    alert?.student_username || alert?.student || alert?.user || "Unknown student";

  const locationLabel = (() => {
    if (alert?.latitude != null && alert?.longitude != null) {
      return (
        <LocationName latitude={alert.latitude} longitude={alert.longitude} />
      );
    }
    return alert?.location || "Location unavailable";
  })();

  const status = alert?.status || 'ACTIVE';
  const isActive = status === 'ACTIVE';
  const isResolved = status === 'RESOLVED';
  const isCancelled = status === 'CANCELLED';

  const handleResolve = async () => {
    setResolving(true);
    setError("");
    try {
      const result = await resolveSOSAlert(alert.id);
      if (result?.success) {
        if (onResolved) onResolved(alert.id);
      }
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setResolving(false);
    }
  };

  const getStatusBadge = () => {
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

  const getCardClass = () => {
    switch (status) {
      case 'ACTIVE':
        return 'border-danger';
      case 'RESOLVED':
        return 'border-success';
      case 'CANCELLED':
        return 'border-warning';
      default:
        return 'border-secondary';
    }
  };

  const getHeaderClass = () => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-danger';
      case 'RESOLVED':
        return 'bg-success';
      case 'CANCELLED':
        return 'bg-warning';
      default:
        return 'bg-secondary';
    }
  };

  return (
    <div className={`card shadow-sm mb-3 ${getCardClass()}`}>
      <div className={`card-header text-white d-flex justify-content-between align-items-center ${getHeaderClass()}`}>
        <div className="fw-semibold">🚨 SOS ALERT</div>
        <div className="d-flex gap-1">
          {getStatusBadge()}
          <span className="badge bg-light text-danger">HIGH</span>
        </div>
      </div>
      <div className="card-body">
        {error && (
          <div className="alert alert-danger py-2 small mb-2" role="alert">
            {error}
          </div>
        )}
        <div className="mb-2">
          <div className="text-muted small">Student</div>
          <div className="fw-semibold">{studentLabel}</div>
        </div>
        <div className="mb-2">
          <div className="text-muted small">Location</div>
          <div className="fw-semibold">{locationLabel}</div>
        </div>
        <div className="mb-2">
          <div className="text-muted small">Time</div>
          <div className="fw-semibold">{timeLabel}</div>
        </div>
        {isResolved && alert?.resolved_at && (
          <div className="mb-2">
            <div className="text-muted small">Resolved At</div>
            <div className="fw-semibold">{new Date(alert.resolved_at).toLocaleString()}</div>
          </div>
        )}
        {isCancelled && alert?.cancelled_at && (
          <div className="mb-2">
            <div className="text-muted small">Cancelled At</div>
            <div className="fw-semibold">{new Date(alert.cancelled_at).toLocaleString()}</div>
          </div>
        )}
        {alert?.description ? (
          <div className="mt-3">
            <div className="text-muted small">Notes</div>
            <div>{alert.description}</div>
          </div>
        ) : null}
        {isActive && (role === 'parent' || role === 'admin') && (
          <div className="mt-3">
            <button
              className="btn btn-sm btn-success w-100"
              onClick={handleResolve}
              disabled={resolving}
            >
              {resolving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Resolving…
                </>
              ) : (
                "✓ Mark as Resolved"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SOSAlertCard;


