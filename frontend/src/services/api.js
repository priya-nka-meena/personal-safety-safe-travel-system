import axios from 'axios';

// Empty base URL in dev uses CRA proxy (package.json) so cookies are same-origin.
const API_BASE_URL = process.env.REACT_APP_API_URL || '';

const AUTH_PUBLIC_PATHS = [
  '/api/auth/login/',
  '/api/auth/student/register/',
  '/api/auth/parent/register/',
  '/api/auth/csrf/',
];

function getCookie(name) {
  if (!document.cookie) return null;
  const match = document.cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : null;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let csrfBootstrapPromise = null;

async function ensureCsrfToken() {
  if (getCookie('csrftoken')) return;
  if (!csrfBootstrapPromise) {
    csrfBootstrapPromise = api.get('/api/auth/csrf/').finally(() => {
      csrfBootstrapPromise = null;
    });
  }
  await csrfBootstrapPromise;
}

api.interceptors.request.use(
  async (config) => {
    const method = config.method?.toLowerCase();
    if (method && ['post', 'put', 'patch', 'delete'].includes(method)) {
      await ensureCsrfToken();
      const csrfToken = getCookie('csrftoken');
      if (csrfToken) {
        config.headers['X-CSRFToken'] = csrfToken;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

function isAuthFailure(error) {
  const status = error.response?.status;
  const detail = error.response?.data?.detail;
  if (status === 401) return true;
  if (status === 403) {
    return (
      detail === 'Authentication credentials were not provided.' ||
      detail === 'CSRF Failed: CSRF token missing or incorrect.'
    );
  }
  return false;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    const isPublicAuth = AUTH_PUBLIC_PATHS.some((p) => url.includes(p));

    if (isAuthFailure(error) && !isPublicAuth) {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

/** Fetch CSRF cookie before the first mutating request. */
export const bootstrapCsrfCookie = async () => {
  await ensureCsrfToken();
};

/** Normalize API / network errors into a user-facing string. */
export const formatApiError = (error) => {
  if (!error) return 'Something went wrong. Please try again.';
  if (typeof error === 'string') return error;

  const data = error.response?.data ?? error;
  const status = error.response?.status;

  if (status === 403 && data?.detail?.includes('CSRF')) {
    return 'Security token expired. Please refresh the page and try again.';
  }
  if (status === 401 || data?.detail === 'Authentication credentials were not provided.') {
    return 'Your session has expired. Please log in again.';
  }

  if (data?.message) return data.message;
  if (data?.detail) return data.detail;
  if (data?.error) return data.error;

  if (data?.errors && typeof data.errors === 'object') {
    const [field, msgs] = Object.entries(data.errors)[0] || [];
    if (field && msgs) {
      const msg = Array.isArray(msgs) ? msgs[0] : msgs;
      return `${field}: ${msg}`;
    }
  }

  if (error.message === 'Network Error') {
    return 'Cannot reach the server. Check your connection and that the backend is running.';
  }

  return error.message || 'Something went wrong. Please try again.';
};

//////////////////// AUTHENTICATION ////////////////////

export const login = async (username, password) => {
  await bootstrapCsrfCookie();
  const response = await api.post('/api/auth/login/', { username, password });
  return response.data;
};

export const logout = async () => {
  try {
    await api.post('/api/auth/logout/');
  } catch {
    // Session may already be expired; still clear client state.
  }
};

export const getCurrentUser = async () => {
  const response = await api.get('/api/auth/me/');
  return response.data;
};

export const register = async (
  username,
  email,
  password,
  role,
  firstName = '',
  lastName = ''
) => {
  await bootstrapCsrfCookie();

  const endpoint =
    role === 'STUDENT'
      ? '/api/auth/student/register/'
      : '/api/auth/parent/register/';

  const response = await api.post(endpoint, {
    username,
    email,
    password,
    password2: password,
    role,
    first_name: firstName,
    last_name: lastName,
  });

  return response.data;
};

//////////////////// TRAVEL ////////////////////

export const startTravelSession = async (startLatitude, startLongitude, destinationLatitude = null, destinationLongitude = null, parentId = null) => {
  const response = await api.post('/api/travel/start/', {
    start_latitude: startLatitude,
    start_longitude: startLongitude,
    destination_latitude: destinationLatitude,
    destination_longitude: destinationLongitude,
    parent_id: parentId,
  });
  return response.data;
};

export const stopTravelSession = async () => {
  const response = await api.post('/api/travel/stop/');
  return response.data;
};

export const getTravelStatus = async () => {
  const response = await api.get('/api/travel/status/');
  return response.data;
};

//////////////////// LOCATION ////////////////////

export const updateLocation = async (latitude, longitude) => {
  const response = await api.post('/api/location/update/', { latitude, longitude });
  return response.data;
};

//////////////////// SOS ////////////////////

export const sendSOSAlert = async (
  location,
  latitude = null,
  longitude = null,
  description = 'Emergency SOS Alert'
) => {
  const response = await api.post('/api/sos-alerts/', {
    location,
    latitude,
    longitude,
    description,
  });
  return response.data;
};

export const getSOSAlerts = async () => {
  const response = await api.get('/api/sos-alerts/');
  return response.data;
};

export const resolveSOSAlert = async (alertId) => {
  const response = await api.post(`/api/sos-alerts/${alertId}/resolve/`);
  return response.data;
};

//////////////////// PARENT / ADMIN ////////////////////

export const getParentMonitoring = async () => {
  const response = await api.get('/api/parent/monitoring/');
  return response.data;
};

export const linkStudent = async (identifier) => {
  const response = await api.post('/api/parent/link-student/', { identifier });
  return response.data;
};

export const getParentHomeLocation = async () => {
  const response = await api.get('/api/parent/home-location/');
  return response.data;
};

export const updateParentHomeLocation = async (latitude, longitude) => {
  const response = await api.post('/api/parent/home-location/', { latitude, longitude });
  return response.data;
};

export const updateParentLocation = async (latitude, longitude) => {
  const response = await api.post('/api/parent/update-location/', { latitude, longitude });
  return response.data;
};

export const stopSharingParentLocation = async () => {
  const response = await api.post('/api/parent/stop-sharing-location/');
  return response.data;
};

export const getParentLocation = async () => {
  const response = await api.get('/api/parent/location/');
  return response.data;
};

export const getAdminOverview = async () => {
  const response = await api.get('/api/admin/overview/');
  return response.data;
};

export const getCompletedSessions = async () => {
  const response = await api.get('/api/tracking/sessions/completed/');
  return response.data;
};

export const getSessionDetail = async (sessionId) => {
  const response = await api.get(`/api/tracking/sessions/${sessionId}/`);
  return response.data;
};

export const cancelSOSAlert = async (alertId) => {
  const response = await api.post(`/api/sos-alerts/${alertId}/cancel/`);
  return response.data;
};

export const getSOSAlertHistory = async () => {
  const response = await api.get('/api/sos-alerts/history/');
  return response.data;
};

export default api;
