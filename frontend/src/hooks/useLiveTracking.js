import { useState, useEffect, useRef, useCallback } from 'react';
import { updateSessionLocation } from '../services/tracking';

const LOCATION_SEND_EVERY_MS = 5000; // 5 seconds

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

export const useLiveTracking = (sessionId, isActive = false) => {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationError, setLocationError] = useState("");
  const [isTracking, setIsTracking] = useState(false);
  const [lastSentAt, setLastSentAt] = useState(null);
  
  const watchIdRef = useRef(null);
  const lastSendRef = useRef(0);
  const isActiveRef = useRef(isActive);

  // Update ref when isActive changes
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  const setFriendlyGeoError = useCallback((err) => {
    if (!err) {
      setLocationError("Unable to access location.");
      return;
    }
    if (err.code === 1) {
      setLocationError(
        "Location permission denied. Enable location in your browser settings to track travel."
      );
    } else if (err.code === 2) {
      setLocationError("Location unavailable. Check GPS or network and try again.");
    } else if (err.code === 3) {
      setLocationError("Location request timed out. Try again.");
    } else {
      setLocationError(err.message || "Unable to access location.");
    }
  }, []);

  const startTracking = useCallback(async () => {
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
        if (!isActiveRef.current || !sessionId) return;
        if (now - lastSendRef.current < LOCATION_SEND_EVERY_MS) return;

        lastSendRef.current = now;
        try {
          await updateSessionLocation(sessionId, latitude, longitude, position.coords.accuracy);
          setLastSentAt(new Date());
        } catch (e) {
          console.error("Failed to update location:", e);
        }
      },
      (err) => setFriendlyGeoError(err),
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
    
    setIsTracking(true);
  }, [sessionId, setFriendlyGeoError]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  }, []);

  const getCurrentPosition = useCallback(async () => {
    try {
      const pos = await getCurrentPositionOnce();
      const latitude = Number(pos.coords.latitude.toFixed(6));
      const longitude = Number(pos.coords.longitude.toFixed(6));
      setCurrentLocation({ latitude, longitude });
      setLocationError("");
      return { latitude, longitude };
    } catch (geoErr) {
      setFriendlyGeoError(geoErr);
      return null;
    }
  }, [setFriendlyGeoError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Auto-start/stop based on isActive
  useEffect(() => {
    if (isActive && sessionId) {
      startTracking();
    } else {
      stopTracking();
    }
  }, [isActive, sessionId, startTracking, stopTracking]);

  return {
    currentLocation,
    locationError,
    isTracking,
    lastSentAt,
    startTracking,
    stopTracking,
    getCurrentPosition,
  };
};
