import { useState, useEffect } from "react";
import { getCompletedSessions } from "../../services/api";

const TravelHistory = ({ onViewJourney }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getCompletedSessions();
      setSessions(Array.isArray(data) ? data : []);
    } catch (err) {
      setError("Failed to load travel history");
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (session) => {
    let duration = session.duration;
    if ((duration == null || duration === "") && session.started_at && session.ended_at) {
      duration = Math.floor((new Date(session.ended_at) - new Date(session.started_at)) / 1000);
    }
    if (duration == null || duration === "") return "—";
    const totalMinutes = Math.floor(duration / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
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

  if (sessions.length === 0) {
    return (
      <div className="card border-0 shadow-sm">
        <div className="card-body text-center py-5">
          <p className="text-muted mb-2 fw-semibold">No travel history yet</p>
          <p className="text-muted small mb-0">
            Completed journeys will appear here once your child ends a travel session.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="row g-4">
      {sessions.map((session) => (
        <div className="col-12 col-md-6 col-lg-4" key={session.id}>
          <div className="card shadow-sm h-100 border-0">
            <div className="card-header bg-white">
              <div className="d-flex justify-content-between align-items-center">
                <span className="fw-semibold">{formatDate(session.started_at)}</span>
                <span className="badge bg-success">Completed</span>
              </div>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <div className="small text-muted mb-1">From</div>
                <div className="fw-semibold">
                  📍 {session.start_location_name || "Location unavailable"}
                </div>
              </div>
              <div className="mb-3">
                <div className="small text-muted mb-1">To</div>
                <div className="fw-semibold">
                  📍 {session.destination_location_name || "Location unavailable"}
                </div>
              </div>
              <div className="row g-2 mb-3">
                <div className="col-6">
                  <div className="small text-muted">Started</div>
                  <div className="fw-semibold">{formatTime(session.started_at)}</div>
                </div>
                <div className="col-6">
                  <div className="small text-muted">Ended</div>
                  <div className="fw-semibold">{formatTime(session.ended_at)}</div>
                </div>
              </div>
              <div className="row g-2">
                <div className="col-6">
                  <div className="small text-muted">Duration</div>
                  <div className="fw-semibold">{formatDuration(session)}</div>
                </div>
                <div className="col-6">
                  <div className="small text-muted">Distance</div>
                  <div className="fw-semibold">
                    {session.total_distance != null ? `${Number(session.total_distance).toFixed(1)} km` : "—"}
                  </div>
                </div>
              </div>
            </div>
            <div className="card-footer bg-white border-0">
              <button
                className="btn btn-sm btn-primary w-100"
                onClick={() => onViewJourney(session.id)}
              >
                View Journey
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TravelHistory;
