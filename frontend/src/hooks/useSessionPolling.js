import { useState, useEffect, useCallback, useRef } from 'react';
import { getSessionDetail, getSessionHistory } from '../services/tracking';

const POLL_INTERVAL_MS = 5000; // 5 seconds

export const useSessionPolling = (sessionId, isActive = true) => {
  const [sessionData, setSessionData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const lastHistoryTimestampRef = useRef(null);
  const isActiveRef = useRef(isActive);

  // Update ref when isActive changes
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  const fetchSessionData = useCallback(async () => {
    if (!sessionId || !isActiveRef.current) return;

    setLoading(true);
    setError(null);

    try {
      const [session, newHistory] = await Promise.all([
        getSessionDetail(sessionId),
        getSessionHistory(sessionId, lastHistoryTimestampRef.current)
      ]);

      setSessionData(session);

      // Append new history points
      if (newHistory && newHistory.length > 0) {
        setHistory(prev => [...prev, ...newHistory]);
        // Update last timestamp for incremental fetches
        lastHistoryTimestampRef.current = newHistory[newHistory.length - 1].recorded_at;
      }
    } catch (err) {
      console.error("Failed to fetch session data:", err);
      setError(err.message || "Failed to fetch session data");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Initial fetch
  useEffect(() => {
    if (sessionId && isActive) {
      fetchSessionData();
    }
  }, [sessionId, isActive, fetchSessionData]);

  // Set up polling
  useEffect(() => {
    if (!sessionId || !isActive) return;

    const interval = setInterval(() => {
      fetchSessionData();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [sessionId, isActive, fetchSessionData]);

  const resetHistory = useCallback(() => {
    setHistory([]);
    lastHistoryTimestampRef.current = null;
  }, []);

  return {
    sessionData,
    history,
    loading,
    error,
    resetHistory,
    refetch: fetchSessionData,
  };
};
