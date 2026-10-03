import { useState, useEffect, useRef } from "react";
import AppNavbar from "../common/AppNavbar";
import {
  startTravelSession,
  stopTravelSession,
  updateLocation,
  sendSOSAlert,
  cancelSOSAlert,
  getSOSAlerts,
  getTravelStatus,
  getCurrentUser,
  formatApiError,
} from "../../services/api";
import LocationName from "../common/LocationName";
import "../Dashboard.css";

const LOCATION_SEND_EVERY_MS = 5000;

function getCurrentPositionOnce(options) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
      ...options,
    });
  });
}

const StudentDashboard = () => {
  const [isTraveling, setIsTraveling] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationError, setLocationError] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusVariant, setStatusVariant] = useState("success");
  const [lastSentAt, setLastSentAt] = useState(null);
  const [sessionStartedAt, setSessionStartedAt] = useState(null);
  const [sosLoading, setSosLoading] = useState(false);
  const [sosSuccess, setSosSuccess] = useState("");
  const [activeSOS, setActiveSOS] = useState(null);
  const [inviteCode, setInviteCode] = useState("");
  const [studentId, setStudentId] = useState(null);
  const [linkedParentsCount, setLinkedParentsCount] = useState(0);
  const [locationUpdateError, setLocationUpdateError] = useState("");

  const watchIdRef = useRef(null);
  const lastSendRef = useRef(0);
  const travelingRef = useRef(false);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const setFriendlyGeoError = (err) => {
    if (!err) {
      setLocationError("Unable to access location.");
      return;
    }
    if (err.code === 1) {
      setLocationError(
        "Location permission denied. Enable location in your browser settings to track travel and send SOS."
      );
    } else if (err.code === 2) {
      setLocationError("Location unavailable. Check GPS or network and try again.");
    } else if (err.code === 3) {
      setLocationError("Location request timed out. Try again.");
    } else {
      setLocationError(err.message || "Unable to access location.");
    }
  };

  const startLocationTracking = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }

    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const latitude = Number(position.coords.latitude.toFixed(6));
        const longitude = Number(position.coords.longitude.toFixed(6));

        setCurrentLocation({ latitude, longitude });
        setLocationError("");

        const now = Date.now();
        if (!travelingRef.current) return;
        if (now - lastSendRef.current < LOCATION_SEND_EVERY_MS) return;

        lastSendRef.current = now;
        try {
          await updateLocation(latitude, longitude);
          setLastSentAt(new Date());
          setLocationUpdateError("");
        } catch (e) {
          setLocationUpdateError(formatApiError(e));
        }
      },
      (err) => setFriendlyGeoError(err),
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  const resumeActiveSession = async (startedAt) => {
    travelingRef.current = true;
    setIsTraveling(true);
    setSessionStartedAt(startedAt ? new Date(startedAt) : new Date());
    try {
      await getCurrentPositionOnce();
    } catch (geoErr) {
      setFriendlyGeoError(geoErr);
    }
    startLocationTracking();
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [me, travel, alerts] = await Promise.all([getCurrentUser(), getTravelStatus(), getSOSAlerts()]);

        if (cancelled) return;

        if (me?.invite_code) setInviteCode(me.invite_code);
        if (me?.user_id) setStudentId(me.user_id);
        if (me?.linked_parents_count != null) setLinkedParentsCount(me.linked_parents_count);

        // Check for active SOS
        const active = alerts.find(a => a.status === 'ACTIVE');
        setActiveSOS(active || null);

        if (travel?.travel_active) {
          const loc = travel.latest_location;
          if (loc) {
            setCurrentLocation({
              latitude: loc.latitude,
              longitude: loc.longitude,
            });
            setLastSentAt(new Date(loc.timestamp));
          }
          await resumeActiveSession(travel.session_started_at);
        }
      } catch {
        // Session validation handled globally; ignore load errors here.
      }
    })();

    return () => {
      cancelled = true;
    };
    // Restore active travel session once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStartTravel = async () => {
    setLoading(true);
    setStatusMessage("");
    setLocationError("");
    setLocationUpdateError("");

    try {
      try {
        const pos = await getCurrentPositionOnce();
        const latitude = Number(pos.coords.latitude.toFixed(6));
        const longitude = Number(pos.coords.longitude.toFixed(6));
        setCurrentLocation({ latitude, longitude });
        setLocationError("");
      } catch (geoErr) {
        setFriendlyGeoError(geoErr);
        setStatusVariant("danger");
        setStatusMessage("Location permission is required to start travel.");
        return;
      }

      const response = await startTravelSession(
        currentLocation.latitude,
        currentLocation.longitude
      );

      if (response.success) {
        travelingRef.current = true;
        setIsTraveling(true);
        setSessionStartedAt(new Date());
        setStatusVariant("success");
        startLocationTracking();
        setStatusMessage("Travel session is active. Location updates are sent every few seconds.");
      } else {
        setStatusVariant("warning");
        setStatusMessage(response.message || "Failed to start travel session");
      }
    } catch (error) {
      const data = error.response?.data ?? error;
      if (data?.session_id || data?.message?.includes("already exists")) {
        setStatusVariant("info");
        setStatusMessage("Resuming your active travel session.");
        await resumeActiveSession();
      } else {
        setStatusVariant("danger");
        setStatusMessage(formatApiError(error));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStopTravel = async () => {
    setLoading(true);
    setStatusMessage("");
    setLocationUpdateError("");

    try {
      const response = await stopTravelSession();

      if (response.success) {
        travelingRef.current = false;
        setIsTraveling(false);
        setSessionStartedAt(null);
        setLastSentAt(null);
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
        setStatusVariant("success");
        setStatusMessage("Travel session stopped.");
      } else {
        setStatusVariant("warning");
        setStatusMessage(response.message || "Failed to stop travel session");
      }
    } catch (error) {
      const data = error.response?.data ?? error;
      if (error.response?.status === 404 || data?.message?.includes("No active")) {
        travelingRef.current = false;
        setIsTraveling(false);
        setSessionStartedAt(null);
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
        setStatusVariant("warning");
        setStatusMessage("No active travel session found.");
      } else {
        setStatusVariant("danger");
        setStatusMessage(formatApiError(error));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendSOS = async () => {
    setSosSuccess("");
    setSosLoading(true);
    setStatusMessage("");

    try {
      let lat = currentLocation?.latitude;
      let lng = currentLocation?.longitude;

      if (lat == null || lng == null) {
        const pos = await getCurrentPositionOnce();
        lat = Number(pos.coords.latitude.toFixed(6));
        lng = Number(pos.coords.longitude.toFixed(6));
        setCurrentLocation({ latitude: lat, longitude: lng });
        setLocationError("");
      }

      const locationDescription = `Lat: ${Number(lat).toFixed(6)}, Lng: ${Number(lng).toFixed(6)}`;
      const response = await sendSOSAlert(
        locationDescription,
        lat,
        lng,
        "Emergency SOS — student needs immediate assistance"
      );

      if (response?.id) {
        setSosSuccess("SOS alert sent. Your contacts and monitors have been notified.");
        setStatusVariant("success");
        setStatusMessage("SOS delivered successfully.");
        setActiveSOS(response);
      } else {
        setStatusVariant("warning");
        setStatusMessage("SOS response was unexpected. Please try again or call emergency services.");
      }
    } catch (error) {
      if (error?.code === 1) {
        setLocationError(
          "Location is required for SOS. Allow location access, then try again."
        );
        setStatusVariant("danger");
        setStatusMessage("SOS failed — location permission required.");
      } else {
        setStatusVariant("danger");
        setStatusMessage(formatApiError(error));
      }
    } finally {
      setSosLoading(false);
    }
  };

  const handleCancelSOS = async () => {
    if (!activeSOS) return;
    
    setSosLoading(true);
    try {
      await cancelSOSAlert(activeSOS.id);
      setActiveSOS(null);
      setStatusVariant("success");
      setStatusMessage("SOS alert cancelled successfully.");
      setSosSuccess("");
    } catch (error) {
      setStatusVariant("danger");
      setStatusMessage(formatApiError(error));
    } finally {
      setSosLoading(false);
    }
  };

  const alertClass =
    statusVariant === "success"
      ? "alert-success"
      : statusVariant === "danger"
        ? "alert-danger"
        : statusVariant === "warning"
          ? "alert-warning"
          : "alert-info";

  return (
    <div className="dashboard-container">
      <AppNavbar
        title="Student Dashboard"
        subtitle="Safe travel session and live location"
      />

      <div className="container py-4">
        {statusMessage && (
          <div
            className={`alert ${alertClass} alert-dismissible fade show`}
            role="alert"
          >
            {statusMessage}
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={() => setStatusMessage("")}
            />
          </div>
        )}

        {locationError && (
          <div className="alert alert-danger alert-dismissible fade show" role="alert">
            {locationError}
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={() => setLocationError("")}
            />
          </div>
        )}

        {locationUpdateError && (
          <div className="alert alert-warning alert-dismissible fade show" role="alert">
            {locationUpdateError}
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={() => setLocationUpdateError("")}
            />
          </div>
        )}

        <div className="row g-4">
          <div className="col-12 col-lg-4">
            <div className="card shadow h-100 border-0">
              <div className="card-header bg-white border-bottom">
                <h5 className="mb-0 text-primary">Live position</h5>
              </div>
              <div className="card-body">
                <p className="mb-2">
                  <span className="text-muted small d-block">Travel status</span>
                  <span className={`badge ${isTraveling ? "bg-success" : "bg-secondary"} fs-6`}>
                    {isTraveling ? "ACTIVE" : "INACTIVE"}
                  </span>
                </p>
                <hr />
                <div className="row g-2">
                  <div className="col-12">
                    <div className="text-muted small">Current location</div>
                    <div className="fw-semibold">
                      {currentLocation ? (
                        <LocationName
                          latitude={currentLocation.latitude}
                          longitude={currentLocation.longitude}
                        />
                      ) : (
                        "—"
                      )}
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="text-muted small">Last updated</div>
                    <div className="fw-semibold">
                      {lastSentAt ? lastSentAt.toLocaleTimeString() : "—"}
                    </div>
                  </div>
                  {isTraveling && sessionStartedAt ? (
                    <div className="col-12">
                      <div className="text-muted small">Session started</div>
                      <div className="fw-semibold">{sessionStartedAt.toLocaleString()}</div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-4">
            <div className="card shadow h-100 border-0">
              <div className="card-header bg-primary text-white">
                <h5 className="mb-0">Travel session</h5>
              </div>
              <div className="card-body d-flex flex-column">
                <p className="text-muted small">
                  Start a session before you travel. Your position is shared with the server every{" "}
                  {LOCATION_SEND_EVERY_MS / 1000}s while active.
                </p>
                <div className="d-grid gap-2 mt-auto">
                  <button
                    type="button"
                    className="btn btn-success btn-lg"
                    onClick={handleStartTravel}
                    disabled={loading || isTraveling}
                  >
                    {loading && !isTraveling ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" />
                        Starting…
                      </>
                    ) : (
                      "▶ Start travel session"
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-lg"
                    onClick={handleStopTravel}
                    disabled={loading || !isTraveling}
                  >
                    {loading && isTraveling ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" />
                        Stopping…
                      </>
                    ) : (
                      "⏹ Stop travel session"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-4">
            <div className={`card shadow h-100 ${activeSOS ? 'border-warning' : 'border-danger'}`}>
              <div className={`card-header text-white ${activeSOS ? 'bg-warning' : 'bg-danger'}`}>
                <h5 className="mb-0">🚨 Emergency SOS</h5>
              </div>
              <div className="card-body d-flex flex-column">
                {activeSOS ? (
                  <>
                    <div className="alert alert-warning small mb-3">
                      <strong>🔴 SOS Active</strong><br />
                      Emergency alert sent to your parent.
                    </div>
                    <div className="d-grid mt-auto">
                      <button
                        type="button"
                        className="btn btn-outline-warning fw-bold"
                        onClick={handleCancelSOS}
                        disabled={sosLoading}
                      >
                        {sosLoading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" />
                            Cancelling…
                          </>
                        ) : (
                          "Cancel SOS"
                        )}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="small text-muted">
                      Sends your current GPS position immediately. Only use in a real emergency.
                    </p>
                    {sosSuccess ? (
                      <div className="alert alert-success small mb-3">{sosSuccess}</div>
                    ) : null}
                    <div className="d-grid mt-auto">
                      <button
                        type="button"
                        className="btn btn-danger btn-lg fw-bold"
                        onClick={handleSendSOS}
                        disabled={sosLoading}
                      >
                        {sosLoading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" />
                            Sending SOS…
                          </>
                        ) : (
                          "SEND SOS ALERT"
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="card shadow-sm border-0 mt-4">
          <div className="card-body">
            <h6 className="text-secondary">Share with parent</h6>
            <p className="small text-muted mb-2">
              Give your parent your student ID or invite code so they can link your account.
            </p>
            <div className="row g-3">
              <div className="col-md-4">
                <div className="text-muted small">Student ID</div>
                <div className="fw-semibold font-monospace">{studentId ?? "—"}</div>
              </div>
              <div className="col-md-4">
                <div className="text-muted small">Invite code</div>
                <div className="fw-semibold font-monospace">{inviteCode || "—"}</div>
              </div>
              <div className="col-md-4">
                <div className="text-muted small">Linked parents</div>
                <div className="fw-semibold">{linkedParentsCount}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card shadow-sm border-0 mt-4">
          <div className="card-body">
            <h6 className="text-secondary">Safety checklist</h6>
            <ul className="mb-0 small text-muted">
              <li>Keep browser location permission on while traveling.</li>
              <li>Stop the session when you arrive.</li>
              <li>For life-threatening emergencies, also call local emergency services.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
