import { useEffect, useState, useCallback, useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import AppNavbar from "../common/AppNavbar";
import SOSAlertCard from "../alerts/SOSAlertCard";
import LiveMap from "../Map/LiveMap";
import TravelHistory from "../travel/TravelHistory";
import JourneyDetail from "../travel/JourneyDetail";
import SOSHistory from "../sos/SOSHistory";
import LocationName from "../common/LocationName";
import { useSessionPolling } from "../../hooks/useSessionPolling";
import {
  getParentMonitoring,
  getSOSAlerts,
  linkStudent,
  getParentHomeLocation,
  updateParentHomeLocation,
  formatApiError,
} from "../../services/api";
import "../Dashboard.css";

const POLL_MS = 8000;

const ParentDashboard = () => {
  const { role } = useContext(AuthContext);
  const [students, setStudents] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [linkInput, setLinkInput] = useState("");
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkMessage, setLinkMessage] = useState("");
  const [linkVariant, setLinkVariant] = useState("success");
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [selectedJourneyId, setSelectedJourneyId] = useState(null);
  const [dashboardView, setDashboardView] = useState('monitoring'); // 'monitoring', 'history', 'journey', 'alerts', 'sos-history'
  
  // Parent home location state (static reference point)
  const [parentHomeLocation, setParentHomeLocation] = useState(null);
  const [homeLocationError, setHomeLocationError] = useState("");
  const [homeLocationLoading, setHomeLocationLoading] = useState(false);
  const [showHomeLocationEdit, setShowHomeLocationEdit] = useState(false);
  const [homeLocationInput, setHomeLocationInput] = useState({ latitude: '', longitude: '' });
  
  // Session polling for selected student
  const { sessionData, history } = useSessionPolling(selectedSessionId, !!selectedSessionId);

  const loadAll = useCallback(async () => {
    setError("");
    try {
      const [mon, alertData, homeLoc] = await Promise.all([
        getParentMonitoring(),
        getSOSAlerts(),
        getParentHomeLocation(),
      ]);

      if (mon?.students) {
        setStudents(mon.students);
        // Update parent home location from monitoring response
        if (mon.parent_home_latitude && mon.parent_home_longitude) {
          setParentHomeLocation({
            latitude: mon.parent_home_latitude,
            longitude: mon.parent_home_longitude
          });
        }
      } else {
        setStudents([]);
      }

      setAlerts(Array.isArray(alertData) ? alertData : []);
      
      // Also update from dedicated home location endpoint
      if (homeLoc?.success && homeLoc.home_latitude && homeLoc.home_longitude) {
        setParentHomeLocation({
          latitude: homeLoc.home_latitude,
          longitude: homeLoc.home_longitude
        });
      }
    } catch (err) {
      const msg = formatApiError(err);
      if (msg.includes("Only parents")) {
        setError("Parent access required.");
      } else if (msg.includes("not linked") || msg.includes("No students")) {
        setStudents([]);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
    const t = setInterval(loadAll, POLL_MS);
    return () => clearInterval(t);
  }, [loadAll]);

  const handleLinkStudent = async (e) => {
    e.preventDefault();
    const identifier = linkInput.trim();
    if (!identifier) {
      setLinkVariant("warning");
      setLinkMessage("Enter a student ID, email, or invite code.");
      return;
    }

    setLinkLoading(true);
    setLinkMessage("");

    try {
      const result = await linkStudent(identifier);
      if (result?.success) {
        setLinkVariant("success");
        setLinkMessage(result.message || "Student linked successfully.");
        setLinkInput("");
        await loadAll();
      } else {
        setLinkVariant("warning");
        setLinkMessage(result?.message || "Unable to link student.");
      }
    } catch (err) {
      setLinkVariant("danger");
      setLinkMessage(formatApiError(err));
    } finally {
      setLinkLoading(false);
    }
  };

  const activeAlerts = alerts.filter((a) => a.status === 'ACTIVE');
  const resolvedAlerts = alerts.filter((a) => a.status === 'RESOLVED');
  const cancelledAlerts = alerts.filter((a) => a.status === 'CANCELLED');
  const totalAlerts = alerts.length;

  const handleSelectSession = (sessionId) => {
    setSelectedSessionId(sessionId);
  };

  const handleCloseMap = () => {
    setSelectedSessionId(null);
  };

  const handleViewJourney = (sessionId) => {
    setSelectedJourneyId(sessionId);
    setDashboardView('journey');
  };

  const handleCloseJourney = () => {
    setSelectedJourneyId(null);
    setDashboardView('history');
  };

  // Handle home location update
  const handleUpdateHomeLocation = async (e) => {
    e.preventDefault();
    setHomeLocationLoading(true);
    setHomeLocationError("");
    
    try {
      const latitude = parseFloat(homeLocationInput.latitude);
      const longitude = parseFloat(homeLocationInput.longitude);
      
      if (isNaN(latitude) || isNaN(longitude)) {
        setHomeLocationError("Invalid coordinates");
        setHomeLocationLoading(false);
        return;
      }
      
      if (!(-90 <= latitude <= 90) || !(-180 <= longitude <= 180)) {
        setHomeLocationError("Coordinates out of valid range");
        setHomeLocationLoading(false);
        return;
      }
      
      const result = await updateParentHomeLocation(latitude, longitude);
      
      if (result?.success) {
        setParentHomeLocation({ latitude, longitude });
        setShowHomeLocationEdit(false);
        setHomeLocationInput({ latitude: '', longitude: '' });
      }
    } catch (err) {
      setHomeLocationError(formatApiError(err));
    } finally {
      setHomeLocationLoading(false);
    }
  };

  // Handle getting current location for home location
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setHomeLocationError("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setHomeLocationInput({
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6)
        });
      },
      (error) => {
        setHomeLocationError("Unable to get current location: " + error.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Prepare map data from session
  const studentLocation = sessionData?.current_latitude && sessionData?.current_longitude
    ? { latitude: parseFloat(sessionData.current_latitude), longitude: parseFloat(sessionData.current_longitude) }
    : null;
  
  const destination = sessionData?.destination_latitude && sessionData?.destination_longitude
    ? { latitude: parseFloat(sessionData.destination_latitude), longitude: parseFloat(sessionData.destination_longitude) }
    : null;
  
  const routePoints = history.map(point => ({
    latitude: parseFloat(point.latitude),
    longitude: parseFloat(point.longitude)
  }));

  // Get student's home location from students array
  const selectedStudent = students.find(s => s.session_id === selectedSessionId);
  const homeLocation = selectedStudent?.home_latitude && selectedStudent?.home_longitude
    ? { latitude: parseFloat(selectedStudent.home_latitude), longitude: parseFloat(selectedStudent.home_longitude) }
    : null;

  // Calculate distance using Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Determine which location to use for distance calculation
  // Priority: Parent Home Location > Student Home Location
  const distanceTarget = parentHomeLocation || homeLocation;
  const distance = studentLocation && distanceTarget
    ? calculateDistance(
        studentLocation.latitude,
        studentLocation.longitude,
        distanceTarget.latitude,
        distanceTarget.longitude
      )
    : null;

  return (
    <div className="dashboard-container">
      <AppNavbar title="Parent Dashboard" subtitle="Monitor linked students in real time" />

      <div className="container py-4">
        {error && (
          <div className="alert alert-warning d-flex align-items-center" role="alert">
            <span>{error}</span>
          </div>
        )}

        {/* Dashboard Navigation */}
        <div className="card shadow-sm border-0 mb-4">
          <div className="card-body">
            <div className="btn-group w-100" role="group">
              <button
                className={`btn ${dashboardView === 'monitoring' ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setDashboardView('monitoring')}
              >
                📡 Live Monitoring
              </button>
              <button
                className={`btn ${dashboardView === 'history' ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setDashboardView('history')}
              >
                📜 Travel History
              </button>
              <button
                className={`btn ${dashboardView === 'alerts' ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setDashboardView('alerts')}
              >
                🚨 SOS Alerts
              </button>
              <button
                className={`btn ${dashboardView === 'sos-history' ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setDashboardView('sos-history')}
              >
                📋 SOS History
              </button>
            </div>
          </div>
        </div>

        {/* Show Home Location section in all views */}
        <div className="card shadow-sm border-0 mb-4">
          <div className="card-header bg-white">
            <h5 className="mb-0">🏠 My Home Location</h5>
          </div>
          <div className="card-body">
            {homeLocationError && (
              <div className="alert alert-danger py-2 small" role="alert">
                {homeLocationError}
              </div>
            )}
            
            {!showHomeLocationEdit ? (
              <>
                {parentHomeLocation ? (
                  <div className="mb-3">
                    <div className="small text-muted mb-1">Saved home location</div>
                    <div className="font-monospace fw-semibold">
                      {parentHomeLocation.latitude.toFixed(5)}, {parentHomeLocation.longitude.toFixed(5)}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted small mb-3">
                    No home location set. Set your home location to use it as a reference point for tracking your child's distance.
                  </p>
                )}
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setShowHomeLocationEdit(true);
                    setHomeLocationError("");
                    if (parentHomeLocation) {
                      setHomeLocationInput({
                        latitude: parentHomeLocation.latitude.toString(),
                        longitude: parentHomeLocation.longitude.toString()
                      });
                    }
                  }}
                >
                  {parentHomeLocation ? "✏️ Edit Home Location" : "➕ Set Home Location"}
                </button>
              </>
            ) : (
              <form onSubmit={handleUpdateHomeLocation}>
                <div className="mb-3">
                  <label htmlFor="homeLatitude" className="form-label small text-muted">
                    Latitude
                  </label>
                  <div className="input-group">
                    <input
                      id="homeLatitude"
                      type="text"
                      className="form-control"
                      placeholder="e.g. 40.7128"
                      value={homeLocationInput.latitude}
                      onChange={(e) => setHomeLocationInput({...homeLocationInput, latitude: e.target.value})}
                      disabled={homeLocationLoading}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={handleGetCurrentLocation}
                      disabled={homeLocationLoading}
                    >
                      📍 Current
                    </button>
                  </div>
                </div>
                <div className="mb-3">
                  <label htmlFor="homeLongitude" className="form-label small text-muted">
                    Longitude
                  </label>
                  <input
                    id="homeLongitude"
                    type="text"
                    className="form-control"
                    placeholder="e.g. -74.0060"
                    value={homeLocationInput.longitude}
                    onChange={(e) => setHomeLocationInput({...homeLocationInput, longitude: e.target.value})}
                    disabled={homeLocationLoading}
                  />
                </div>
                <div className="d-flex gap-2">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={homeLocationLoading}
                  >
                    {homeLocationLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" />
                        Saving…
                      </>
                    ) : (
                      "💾 Save Location"
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => {
                      setShowHomeLocationEdit(false);
                      setHomeLocationError("");
                      setHomeLocationInput({ latitude: '', longitude: '' });
                    }}
                    disabled={homeLocationLoading}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* View-specific content */}
        {dashboardView === 'monitoring' && (
          <>
            {/* Link Student Section - only in monitoring view */}
            <div className="card shadow-sm border-0 mb-4">
              <div className="card-header bg-white">
                <h5 className="mb-0">Link student</h5>
              </div>
              <div className="card-body">
                <p className="text-muted small">
                  Enter your child&apos;s student ID, email, or unique invite code to start monitoring.
                </p>
                {linkMessage && (
                  <div className={`alert alert-${linkVariant} py-2 small`} role="alert">
                    {linkMessage}
                  </div>
                )}
                <form className="row g-2 align-items-end" onSubmit={handleLinkStudent}>
                  <div className="col-md-8">
                    <label htmlFor="linkIdentifier" className="form-label small text-muted">
                      Student ID, email, or invite code
                    </label>
                    <input
                      id="linkIdentifier"
                      type="text"
                      className="form-control"
                      placeholder="e.g. 42, student@school.edu, or A1B2C3D4"
                      value={linkInput}
                      onChange={(e) => setLinkInput(e.target.value)}
                      disabled={linkLoading}
                    />
                  </div>
                  <div className="col-md-4">
                    <button
                      type="submit"
                      className="btn btn-primary w-100"
                      disabled={linkLoading}
                    >
                      {linkLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" />
                          Linking…
                        </>
                      ) : (
                        "Link student"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {loading && (
              <div className="d-flex justify-content-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading…</span>
                </div>
              </div>
            )}

            {!loading && (
              <>
                {/* Live Map Section */}
                {selectedSessionId && (
                  <div className="card shadow-sm border-0 mb-4">
                    <div className="card-header bg-white d-flex justify-content-between align-items-center">
                      <h5 className="mb-0">🗺️ Live Tracking Map</h5>
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={handleCloseMap}
                      >
                        Close Map
                      </button>
                    </div>
                    <div className="card-body">
                      {sessionData ? (
                        <>
                          <div className="mb-3">
                            <span className={`badge ${sessionData.status === 'ACTIVE' ? 'bg-success' : 'bg-secondary'}`}>
                              {sessionData.status}
                            </span>
                            {sessionData.status === 'ACTIVE' && (
                              <span className="text-muted small ms-2">
                                Last updated: {sessionData.last_update_at ? new Date(sessionData.last_update_at).toLocaleString() : '—'}
                              </span>
                            )}
                          </div>
                          {distance !== null && (
                            <div className="mb-3">
                              <div className="small text-muted">
                                Distance to {parentHomeLocation ? 'Parent Home' : 'Student Home'}
                              </div>
                              <div className="fw-semibold">
                                {distance.toFixed(2)} km
                              </div>
                            </div>
                          )}
                          <LiveMap
                            studentLocation={studentLocation}
                            parentLocation={parentHomeLocation}
                            homeLocation={homeLocation}
                            destination={destination}
                            routePoints={routePoints}
                            height="400px"
                          />
                        </>
                      ) : (
                        <div className="text-center py-5">
                          <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading…</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h4 className="mb-0 text-secondary">Linked students</h4>
                  <span className="badge bg-secondary text-uppercase">{role}</span>
                </div>

                {students.length === 0 ? (
                  <div className="card border-0 shadow-sm">
                    <div className="card-body text-center py-5">
                      <p className="text-muted mb-2 fw-semibold">No students linked yet</p>
                      <p className="text-muted small mb-0">
                        Use the form above to link your child, or ask an administrator to create a
                        student–parent link in Django Admin.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="row g-4 mb-5">
                    {students.map((s) => (
                      <div className="col-12 col-md-6 col-xl-4" key={s.link_id || s.student_id}>
                        <div className="card shadow-sm h-100 border-0">
                          <div className="card-header bg-white d-flex justify-content-between align-items-center flex-wrap gap-2">
                            <span className="fw-semibold">{s.full_name || s.username}</span>
                            <div className="d-flex gap-1 flex-wrap">
                              <span
                                className={`badge ${s.is_online ? "bg-success" : "bg-secondary"}`}
                              >
                                {s.is_online ? "Online" : "Offline"}
                              </span>
                              <span
                                className={`badge ${s.travel_active ? "bg-primary" : "bg-light text-dark border"}`}
                              >
                                {s.travel_active ? "Traveling" : "Not traveling"}
                              </span>
                            </div>
                          </div>
                          <div className="card-body">
                            <div className="small text-muted mb-1">Username</div>
                            <div className="mb-3">{s.username}</div>
                            {s.latest_location ? (
                              <>
                                <div className="small text-muted mb-1">Latest location</div>
                                <div className="fw-semibold">
                                  <LocationName
                                    latitude={s.latest_location.latitude}
                                    longitude={s.latest_location.longitude}
                                  />
                                </div>
                                <div className="small text-muted mt-2">
                                  Last updated{" "}
                                  {new Date(s.latest_location.timestamp).toLocaleString()}
                                </div>
                              </>
                            ) : (
                              <p className="text-muted small mb-0">
                                {s.travel_active
                                  ? "Waiting for location updates…"
                                  : "No active travel session — location appears when the student starts travel."}
                              </p>
                            )}
                          </div>
                          {s.travel_active && (
                            <div className="card-footer bg-white border-0">
                              <button
                                className="btn btn-sm btn-primary w-100"
                                onClick={() => handleSelectSession(s.session_id)}
                              >
                                🗺️ View Live Map
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {dashboardView === 'history' && (
          <>
            {selectedJourneyId ? (
              <JourneyDetail sessionId={selectedJourneyId} onClose={handleCloseJourney} />
            ) : (
              <TravelHistory onViewJourney={handleViewJourney} />
            )}
          </>
        )}

        {dashboardView === 'alerts' && (
          <>
            {/* SOS Counters */}
            <div className="row g-3 mb-4">
              <div className="col-12 col-md-3">
                <div className="card border-danger shadow-sm">
                  <div className="card-body text-center">
                    <div className="display-6 fw-bold text-danger">{activeAlerts.length}</div>
                    <div className="small text-muted">Active SOS</div>
                  </div>
                </div>
              </div>
              <div className="col-12 col-md-3">
                <div className="card border-success shadow-sm">
                  <div className="card-body text-center">
                    <div className="display-6 fw-bold text-success">{resolvedAlerts.length}</div>
                    <div className="small text-muted">Resolved SOS</div>
                  </div>
                </div>
              </div>
              <div className="col-12 col-md-3">
                <div className="card border-warning shadow-sm">
                  <div className="card-body text-center">
                    <div className="display-6 fw-bold text-warning">{cancelledAlerts.length}</div>
                    <div className="small text-muted">Cancelled SOS</div>
                  </div>
                </div>
              </div>
              <div className="col-12 col-md-3">
                <div className="card border-secondary shadow-sm">
                  <div className="card-body text-center">
                    <div className="display-6 fw-bold text-secondary">{totalAlerts}</div>
                    <div className="small text-muted">Total Alerts</div>
                  </div>
                </div>
              </div>
            </div>

            <h4 className="text-secondary mb-3">
              SOS alerts{" "}
              {activeAlerts.length > 0 ? (
                <span className="badge bg-danger">{activeAlerts.length} active</span>
              ) : null}
            </h4>
            {alerts.length === 0 ? (
              <p className="text-muted">No SOS alerts from linked students.</p>
            ) : (
              alerts.map((a) => <SOSAlertCard key={a.id} alert={a} onResolved={() => loadAll()} />)
            )}
          </>
        )}

        {dashboardView === 'sos-history' && (
          <SOSHistory />
        )}
      </div>
    </div>
  );
};

export default ParentDashboard;
