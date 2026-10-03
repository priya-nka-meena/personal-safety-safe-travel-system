import React, { useState } from 'react';
import { useLiveTracking } from '../../hooks/useLiveTracking';
import { startTrackingSession, endTrackingSession } from '../../services/tracking';
import { formatApiError } from '../../services/api';

const StudentTracker = ({ parentId = null }) => {
  const [sessionId, setSessionId] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusVariant, setStatusVariant] = useState('success');
  const [destination, setDestination] = useState({ latitude: null, longitude: null });

  const {
    currentLocation,
    locationError,
    isTracking,
    lastSentAt,
    getCurrentPosition,
  } = useLiveTracking(sessionId, isActive);

  const handleStartSession = async () => {
    setLoading(true);
    setStatusMessage('');
    setLocationError('');

    try {
      // Get current position for start location
      const position = await getCurrentPosition();
      if (!position) {
        setStatusVariant('danger');
        setStatusMessage('Location permission is required to start tracking.');
        return;
      }

      const response = await startTrackingSession(
        position.latitude,
        position.longitude,
        destination.latitude,
        destination.longitude,
        parentId
      );

      if (response.session_id) {
        setSessionId(response.session_id);
        setIsActive(true);
        setStatusVariant('success');
        setStatusMessage('Tracking session started. Your location is being shared.');
      }
    } catch (error) {
      setStatusVariant('danger');
      setStatusMessage(formatApiError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleEndSession = async () => {
    setLoading(true);
    setStatusMessage('');

    try {
      await endTrackingSession(sessionId);
      setSessionId(null);
      setIsActive(false);
      setStatusVariant('success');
      setStatusMessage('Tracking session ended.');
    } catch (error) {
      setStatusVariant('danger');
      setStatusMessage(formatApiError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleSetDestination = async () => {
    const position = await getCurrentPosition();
    if (position) {
      setDestination({ latitude: position.latitude, longitude: position.longitude });
      setStatusVariant('info');
      setStatusMessage('Destination set to current location.');
    }
  };

  const alertClass =
    statusVariant === 'success'
      ? 'alert-success'
      : statusVariant === 'danger'
        ? 'alert-danger'
        : statusVariant === 'warning'
          ? 'alert-warning'
          : 'alert-info';

  return (
    <div className="card shadow-sm border-0">
      <div className="card-header bg-primary text-white">
        <h5 className="mb-0">📍 Live Tracking</h5>
      </div>
      <div className="card-body">
        {statusMessage && (
          <div className={`alert ${alertClass} alert-dismissible fade show mb-3`} role="alert">
            {statusMessage}
            <button
              type="button"
              className="btn-close"
              onClick={() => setStatusMessage('')}
            />
          </div>
        )}

        {locationError && (
          <div className="alert alert-danger alert-dismissible fade show mb-3" role="alert">
            {locationError}
            <button
              type="button"
              className="btn-close"
              onClick={() => setLocationError('')}
            />
          </div>
        )}

        <div className="mb-3">
          <div className="text-muted small mb-1">Current Location</div>
          {currentLocation ? (
            <div className="font-monospace fw-semibold">
              {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
            </div>
          ) : (
            <div className="text-muted">—</div>
          )}
        </div>

        <div className="mb-3">
          <div className="text-muted small mb-1">Tracking Status</div>
          <span className={`badge ${isActive ? 'bg-success' : 'bg-secondary'} fs-6`}>
            {isActive ? 'ACTIVE' : 'INACTIVE'}
          </span>
        </div>

        {isActive && lastSentAt && (
          <div className="mb-3">
            <div className="text-muted small mb-1">Last Update</div>
            <div className="fw-semibold">{lastSentAt.toLocaleTimeString()}</div>
          </div>
        )}

        <div className="mb-3">
          <div className="text-muted small mb-1">Destination (Optional)</div>
          {destination.latitude && destination.longitude ? (
            <div className="font-monospace small">
              {destination.latitude.toFixed(6)}, {destination.longitude.toFixed(6)}
              <button
                className="btn btn-sm btn-outline-secondary ms-2"
                onClick={() => setDestination({ latitude: null, longitude: null })}
              >
                Clear
              </button>
            </div>
          ) : (
            <button
              className="btn btn-sm btn-outline-primary"
              onClick={handleSetDestination}
              disabled={!currentLocation}
            >
              Set to Current Location
            </button>
          )}
        </div>

        <div className="d-grid gap-2">
          {!isActive ? (
            <button
              type="button"
              className="btn btn-success btn-lg"
              onClick={handleStartSession}
              disabled={loading || !currentLocation}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Starting…
                </>
              ) : (
                '▶ Start Tracking'
              )}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-outline-danger btn-lg"
              onClick={handleEndSession}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Stopping…
                </>
              ) : (
                '⏹ Stop Tracking'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentTracker;
