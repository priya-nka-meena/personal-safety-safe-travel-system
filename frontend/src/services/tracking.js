import api from './api';

//////////////////// TRACKING SESSIONS ////////////////////

export const startTrackingSession = async (startLatitude, startLongitude, destinationLatitude = null, destinationLongitude = null, parentId = null) => {
  const response = await api.post('/api/tracking/sessions/start/', {
    start_latitude: startLatitude,
    start_longitude: startLongitude,
    destination_latitude: destinationLatitude,
    destination_longitude: destinationLongitude,
    parent_id: parentId,
  });
  return response.data;
};

export const updateSessionLocation = async (sessionId, latitude, longitude, accuracyMeters = null) => {
  const response = await api.post(`/api/tracking/sessions/${sessionId}/location/`, {
    latitude,
    longitude,
    accuracy_meters: accuracyMeters,
  });
  return response.data;
};

export const endTrackingSession = async (sessionId) => {
  const response = await api.post(`/api/tracking/sessions/${sessionId}/end/`);
  return response.data;
};

export const getSessionDetail = async (sessionId) => {
  const response = await api.get(`/api/tracking/sessions/${sessionId}/`);
  return response.data;
};

export const getSessionHistory = async (sessionId, since = null) => {
  const params = since ? { since } : {};
  const response = await api.get(`/api/tracking/sessions/${sessionId}/history/`, { params });
  return response.data;
};

export const getSessionDistance = async (sessionId, parentLatitude, parentLongitude) => {
  const response = await api.get(`/api/tracking/sessions/${sessionId}/distance/`, {
    params: {
      parent_latitude: parentLatitude,
      parent_longitude: parentLongitude,
    },
  });
  return response.data;
};

export default api;
