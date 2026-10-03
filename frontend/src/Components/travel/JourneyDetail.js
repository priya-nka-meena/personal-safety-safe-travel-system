import { useState, useEffect } from "react";
import LiveMap from "../Map/LiveMap";
import { getSessionDetail } from "../../services/api";

const JourneyDetail = ({ sessionId, onClose }) => {
  const [session, setSession] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadSessionDetail();
  }, [sessionId]);

  const loadSessionDetail = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getSessionDetail(sessionId);
      setSession(data);
      
      // Load history for the session
      const historyResponse = await fetch(`/api/tracking/sessions/${sessionId}/history/`);
      const historyData = await historyResponse.json();
      setHistory(Array.isArray(historyData) ? historyData : []);
    } catch (err) {
      setError("Failed to load journey details");
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
      weekday: 'long', 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
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

  // Prepare map data
  const startLocation = session?.start_latitude && session?.start_longitude
    ? { latitude: parseFloat(session.start_latitude), longitude: parseFloat(session.start_longitude) }
    : null;
  
  const endLocation = session?.current_latitude && session?.current_longitude
    ? { latitude: parseFloat(session.current_latitude), longitude: parseFloat(session.current_longitude) }
    : null;
  
  const routePoints = history.map(point => ({
    latitude: parseFloat(point.latitude),
    longitude: parseFloat(point.longitude)
  }));

  // Generate timeline from history (sample points to avoid overcrowding)
  const generateTimeline = () => {
    if (history.length === 0) return [];
    
    // Sample every 10th point to keep timeline manageable
    const sampledPoints = history.filter((_, index) => index % 10 === 0);
    
    // Always include the last point
    if (history.length > 0 && (history.length - 1) % 10 !== 0) {
      sampledPoints.push(history[history.length - 1]);
    }
    
    return sampledPoints.map((point, index) => ({
      time: new Date(point.recorded_at).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }),
      location: `Point ${index + 1}`,
      coordinates: `${parseFloat(point.latitude).toFixed(4)}, ${parseFloat(point.longitude).toFixed(4)}`
    }));
  };

  const timeline = generateTimeline();

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

  if (!session) {
    return null;
  }

  return (
    <div className="card shadow-sm border-0">
      <div className="card-header bg-white d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Journey Details</h5>
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={onClose}
        >
          Close
        </button>
      </div>
      <div className="card-body">
        {/* Journey Summary */}
        <div className="mb-4">
          <h6 className="mb-3">Journey Summary</h6>
          <div className="row g-3">
            <div className="col-md-6">
              <div className="small text-muted">Date</div>
              <div className="fw-semibold">{formatDate(session.started_at)}</div>
            </div>
            <div className="col-md-6">
              <div className="small text-muted">Duration</div>
              <div className="fw-semibold">{formatDuration(session)}</div>
            </div>
            <div className="col-md-6">
              <div className="small text-muted">Distance</div>
              <div className="fw-semibold">
                {session.total_distance != null ? `${Number(session.total_distance).toFixed(1)} km` : "—"}
              </div>
            </div>
            <div className="col-md-6">
              <div className="small text-muted">Status</div>
              <div className="fw-semibold">{session.status}</div>
            </div>
          </div>
        </div>

        {/* Route */}
        <div className="mb-4">
          <h6 className="mb-3">Route</h6>
          <div className="d-flex align-items-center gap-3">
            <div className="flex-grow-1">
              <div className="small text-muted mb-1">Start</div>
              <div className="fw-semibold">
                📍 {session.start_location_name || "Location unavailable"}
              </div>
              <div className="small text-muted">{formatTime(session.started_at)}</div>
            </div>
            <div className="text-muted">→</div>
            <div className="flex-grow-1">
              <div className="small text-muted mb-1">End</div>
              <div className="fw-semibold">
                📍 {session.destination_location_name || "Location unavailable"}
              </div>
              <div className="small text-muted">{formatTime(session.ended_at)}</div>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="mb-4">
          <h6 className="mb-3">Route Map</h6>
          <LiveMap
            studentLocation={endLocation}
            homeLocation={startLocation}
            destination={endLocation}
            routePoints={routePoints}
            height="400px"
          />
        </div>

        {/* Timeline */}
        <div>
          <h6 className="mb-3">Route Timeline</h6>
          {timeline.length === 0 ? (
            <p className="text-muted small">No timeline data available</p>
          ) : (
            <div className="timeline">
              {timeline.map((point, index) => (
                <div key={index} className="d-flex align-items-start gap-3 mb-3">
                  <div className="timeline-dot bg-primary rounded-circle" style={{ width: '12px', height: '12px', marginTop: '4px' }}></div>
                  <div className="flex-grow-1">
                    <div className="fw-semibold">{point.time}</div>
                    <div className="small text-muted">{point.coordinates}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JourneyDetail;
