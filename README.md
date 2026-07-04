# Safe Travel & Personal Safety System

## Overview

A full-stack personal safety and travel tracking system designed to help parents monitor their children's real-time location during travel. The system enables students to share their live location with parents, send emergency SOS alerts, and maintain travel history logs. Parents can view their children's location on an interactive map, receive emergency notifications, and track distance from home or reference points.

## Architecture

### Technology Stack

**Backend (Django)**
- Django REST Framework for REST APIs
- PostgreSQL/SQLite for data persistence
- Session-based authentication with CSRF protection
- Polling-based real-time updates

**Frontend (React)**
- React.js for single-page application
- React Router for navigation
- Leaflet + React-Leaflet for interactive maps
- Axios for API communication
- Bootstrap for responsive UI

**Integration**
- REST API communication between frontend and backend
- Session-based authentication (Django sessions)
- Polling mechanism for real-time location updates (8-second intervals)
- CSRF token management for secure API calls

### System Structure

```
personal-safety-safe-travel-system/
├── core/                    # Core models and authentication
│   ├── models.py          # CustomUser, SOSAlert, StudentParentLink, TravelSession (legacy)
│   ├── views.py           # Auth, SOS, Parent monitoring, Legacy travel APIs
│   ├── urls.py            # Core URL routing
│   └── serializers.py     # Core serializers
├── tracking/               # Enhanced tracking system (primary)
│   ├── models.py          # TravelSession (UUID-based), LocationHistory
│   ├── views.py           # Session management, history APIs
│   ├── urls.py            # Tracking URL routing
│   ├── serializers.py     # Tracking serializers
│   ├── permissions.py     # Session access permissions
│   └── utils.py           # Distance calculation, session expiration
├── safety_system/          # Django project configuration
│   ├── settings.py        # Project settings
│   └── urls.py            # Root URL configuration
└── frontend/               # React frontend
    ├── src/
    │   ├── Components/
    │   │   ├── dashboards/ # Student, Parent, Admin dashboards
    │   │   ├── Map/        # LiveMap component
    │   │   ├── alerts/     # SOS alert components
    │   │   ├── auth/       # Login/Register components
    │   │   ├── sos/        # SOS history components
    │   │   └── travel/     # Journey detail components
    │   ├── services/       # API service layer (api.js, tracking.js)
    │   └── hooks/          # Custom React hooks
    └── package.json
```

## Core Modules

### 1. Authentication System

**Features:**
- Role-based access control (Student, Parent, Admin)
- Session-based authentication with CSRF protection
- Student invite codes for parent linking
- Student-Parent relationship management

**APIs:**
- `GET /api/auth/csrf/` - Get CSRF token for session-authenticated requests
- `POST /api/auth/student/register/` - Student registration
- `POST /api/auth/parent/register/` - Parent registration
- `POST /api/auth/login/` - User login (supports username or email)
- `GET /api/auth/me/` - Current user info
- `POST /api/auth/logout/` - User logout

### 2. Student Tracking System

**Features:**
- Real-time GPS location sharing
- Travel session management (start/end)
- Location history with timestamps
- Session expiration handling
- Parent monitoring access

**APIs:**
- `POST /api/tracking/sessions/start/` - Start travel session
- `POST /api/tracking/sessions/<uuid:session_id>/location/` - Update location
- `POST /api/tracking/sessions/<uuid:session_id>/end/` - End travel session
- `GET /api/tracking/sessions/<uuid:session_id>/` - Get session details
- `GET /api/tracking/sessions/<uuid:session_id>/history/` - Get location history
- `GET /api/tracking/sessions/<uuid:session_id>/distance/` - Calculate distance
- `GET /api/tracking/sessions/completed/` - Get completed sessions

**Note:** Session IDs are UUIDs, not integers. Legacy travel APIs exist in core module (`/api/travel/start/`, `/api/travel/stop/`, `/api/travel/status/`, `/api/location/update/`) but the tracking APIs are the primary implementation.

### 3. Parent Dashboard

**Features:**
- Link students via invite code, email, or ID
- View linked students' live location
- Set home location as reference point
- Monitor travel status (online/offline, traveling/not traveling)
- View and resolve SOS alerts
- Interactive map with route visualization

**APIs:**
- `GET /api/parent/monitoring/` - Get linked students and their status
- `POST /api/parent/link-student/` - Link a student (by ID, email, or invite code)
- `GET /api/parent/home-location/` - Get parent home location
- `POST /api/parent/home-location/` - Update parent home location

**Deprecated APIs (still functional):**
- `POST /api/parent/update-location/` - Update parent live location (deprecated)
- `POST /api/parent/stop-sharing-location/` - Stop sharing parent live location (deprecated)
- `GET /api/parent/location/` - Get parent live location status (deprecated)

### 4. SOS Alert System

**Features:**
- Emergency alert creation by students
- Alert lifecycle management (active/resolved)
- Location coordinates with alerts
- Parent/admin resolution capability
- Resolution timestamp tracking

**APIs:**
- `GET /api/sos-alerts/` - Get SOS alerts (role-filtered)
- `POST /api/sos-alerts/` - Create SOS alert (students only)
- `POST /api/sos-alerts/<int:alert_id>/resolve/` - Mark alert as resolved (parents/admins only)
- `POST /api/sos-alerts/<int:alert_id>/cancel/` - Cancel alert (students only)
- `GET /api/sos-alerts/history/` - Get SOS alert history

**SOS Alert Lifecycle:**
- `is_active`: Whether the alert is currently active (default True)
- `is_resolved`: Whether the alert has been resolved by parent/admin (default False)
- `status`: Computed field (ACTIVE, RESOLVED, CANCELLED)
- `cancelled_at`/`cancelled_by`: Cancellation tracking (students can cancel their own alerts)
- `resolved_at`/`resolved_by`: Resolution tracking (parents/admins can resolve)

### 5. Route History System

**Features:**
- Time-series location logging
- Incremental history fetching with `since` parameter
- Fallback to last 30 minutes on invalid parameters
- Polyline route visualization on map

**APIs:**
- `GET /api/tracking/sessions/<uuid:session_id>/history/` - Get location history

**History API Behavior:**
- Accepts optional `since` query parameter for incremental fetches
- If `since` is invalid or missing, returns last 30 minutes of data
- Returns array of location points with latitude, longitude, and timestamp

## Data Flow

### Student GPS → Backend API → Session Storage → Parent Dashboard Polling → Map Rendering

1. **Student Location Update**
   - Student device captures GPS coordinates
   - Frontend sends POST request to `/api/tracking/sessions/<uuid:session_id>/location/`
   - Backend validates authentication and session ownership
   - Backend updates `TravelSession.current_latitude/longitude`
   - Backend creates new `LocationHistory` record
   - Backend responds with confirmation

2. **Parent Monitoring (Polling)**
   - Parent dashboard polls `/api/parent/monitoring/` every 8 seconds
   - Backend retrieves linked students and their active sessions
   - Backend includes current location and session status
   - Backend checks session expiration (2-minute timeout)
   - Frontend updates UI with latest data

3. **Session History Retrieval**
   - Parent selects student session to view on map
   - Frontend polls `/api/tracking/sessions/<uuid:session_id>/history/` with `since` parameter
   - Backend returns location points since last fetch (or last 30 minutes if invalid)
   - Frontend renders polyline route on map

4. **SOS Alert Flow**
   - Student triggers SOS alert from dashboard
   - Frontend sends POST to `/api/sos-alerts/` with location and description
   - Backend creates `SOSAlert` record with `is_active=True`, `is_resolved=False`
   - Parent dashboard polls and displays new alert
   - Parent clicks "Mark as Resolved"
   - Frontend sends POST to `/api/sos-alerts/<int:alert_id>/resolve/`
   - Backend updates `is_resolved=True`, `resolved_at=now()`, `resolved_by=parent`
   - Frontend refreshes alert list
   - Student can also cancel their own alert via `/api/sos-alerts/<int:alert_id>/cancel/`

## Key Design Decisions

### Polling vs WebSockets

**Decision:** Implemented polling-based updates (8-second intervals) instead of WebSockets.

**Rationale:**
- **Simplicity:** Polling is easier to implement and debug in Django REST Framework
- **Compatibility:** Works with standard session authentication without additional infrastructure
- **Reliability:** No connection state management required
- **Scalability:** For the expected user base (family-scale), polling overhead is acceptable

**Trade-offs:**
- **Real-time accuracy:** 8-second delay between updates vs. instant WebSocket push
- **Server load:** Continuous polling creates more HTTP requests vs. persistent connections
- **Battery impact:** More frequent network activity on mobile devices

### Simplicity vs Real-time Accuracy

**Decision:** Prioritized implementation simplicity and reliability over sub-second real-time accuracy.

**Rationale:**
- **Use case:** Parent monitoring of children's travel doesn't require sub-second updates
- **GPS accuracy:** GPS itself has inherent inaccuracies (5-10 meters typical)
- **Network latency:** Mobile networks introduce variability anyway
- **Development time:** Polling approach reduced development complexity significantly

**Trade-offs:**
- **Emergency response:** SOS alerts have same polling delay (could be improved with WebSockets)
- **Smooth tracking:** Route visualization may show gaps between polling intervals

### Map Performance vs Frequent Updates

**Decision:** Limited map refresh rate and used efficient Leaflet rendering.

**Rationale:**
- **Browser performance:** Frequent map re-renders cause UI lag
- **Data transfer:** Reducing update frequency saves bandwidth
- **User experience:** 8-second updates feel "live enough" without overwhelming the UI

**Trade-offs:**
- **Visual smoothness:** Student movement appears in discrete jumps vs. smooth animation
- **Route accuracy:** Fewer data points mean less precise route visualization

### Relational DB for Location History

**Decision:** Used PostgreSQL/SQLite relational database for location history instead of time-series database.

**Rationale:**
- **Simplicity:** No additional infrastructure required
- **Relationships:** Easy to join with user and session data
- **Query flexibility:** SQL provides powerful filtering and aggregation
- **Backup/migration:** Standard database tools work well

**Trade-offs:**
- **Write performance:** Time-series databases (e.g., InfluxDB) handle high-frequency writes better
- **Storage efficiency:** Time-series databases compress data more efficiently
- **Query performance:** Specialized time-series queries are faster in dedicated databases

### Parent Location Design

**Decision:** Separated "home location" (static) from "live location" (dynamic), deprecated live location sharing.

**Rationale:**
- **Clarity:** Home location is a stable reference point for distance calculations
- **Privacy:** Continuous live location sharing raises privacy concerns
- **Simplicity:** Static location is easier to manage and understand
- **Use case:** Parents typically want to know distance from home, not their own live location

**Trade-offs:**
- **Flexibility:** Cannot track parent's movement for dynamic meeting points
- **Emergency scenarios:** Parent's live location could be useful in some emergencies

## Limitations

### No Full Real-Time Streaming

The system uses polling (8-second intervals) rather than true real-time streaming via WebSockets. This means:
- Location updates have up to 8-second delay
- SOS alerts may not be instantly visible to parents
- Not suitable for applications requiring sub-second accuracy

### Background Tracking Depends on Browser Permissions

The student tracking relies on browser Geolocation API, which has limitations:
- Tracking stops when browser tab is inactive or closed
- Mobile browsers may throttle background location updates
- Requires user permission and browser support
- No native mobile app for true background tracking

### GPS Accuracy Limitations

The system depends on device GPS accuracy:
- Typical GPS accuracy: 5-10 meters in good conditions
- Poor accuracy indoors, in urban canyons, or with weak signal
- No dead reckoning or sensor fusion for improved accuracy
- Location jumps may occur when GPS signal is lost

### Polling Scalability

The polling approach may not scale well for large deployments:
- Each parent dashboard makes requests every 8 seconds
- Server load increases linearly with active users
- Not optimized for thousands of concurrent users
- Could be mitigated with WebSockets or server-sent events

### Session Expiration

Travel sessions expire after 2 minutes of inactivity (not 2 hours):
- Sessions are marked as EXPIRED if no location update for 2 minutes
- Students must restart tracking after expiration
- No automatic session continuation
- Designed for active travel monitoring, not all-day tracking
- Expiration is checked on each API call via `is_session_expired()` utility

## Future Improvements

### WebSockets Upgrade

**Goal:** Replace polling with WebSockets for true real-time updates.

**Benefits:**
- Instant location updates
- Lower server load for many concurrent users
- Better battery life on mobile devices
- Instant SOS alert delivery

**Implementation:**
- Use Django Channels for WebSocket support
- Implement Redis as message broker
- Update frontend to use WebSocket client
- Maintain polling as fallback for compatibility

### Mobile App with Background Tracking

**Goal:** Develop native mobile apps (iOS/Android) for true background tracking.

**Benefits:**
- Continuous tracking even when app is closed
- Better GPS accuracy with sensor fusion
- Push notifications for SOS alerts
- Better battery optimization

**Implementation:**
- Use React Native or Flutter for cross-platform development
- Implement background geolocation services
- Add push notification support
- Maintain web app for non-mobile users

### Route Optimization + ETA Integration

**Goal:** Add route planning and estimated time of arrival features.

**Benefits:**
- Show optimal route to destination
- Calculate ETA based on traffic
- Alert parent if student is off-route
- Suggest safer routes

**Implementation:**
- Integrate with routing APIs (Google Maps, OSRM)
- Add destination selection in student dashboard
- Implement route deviation detection
- Add ETA calculations to parent dashboard

### Enhanced SOS Features

**Goal:** Improve SOS alert system with additional emergency features.

**Benefits:**
- Automatic emergency contact notification
- Audio/video recording during SOS
- Location sharing with emergency services
- SOS escalation to multiple contacts

**Implementation:**
- Add emergency contact management
- Implement media capture during SOS
- Integrate with emergency service APIs where available
- Add SOS history and analytics

### Offline Support

**Goal:** Enable basic functionality without internet connectivity.

**Benefits:**
- Continue tracking in areas with poor connectivity
- Queue location updates for later sync
- Offline map viewing
- Better reliability in rural areas

**Implementation:**
- Use service workers for offline caching
- Implement local storage for location queue
- Add offline map tiles
- Sync queued data when connection restored

## Installation

### Prerequisites
- Python 3.8+
- Node.js 16+
- PostgreSQL (optional, SQLite for development)

### Backend Setup

```bash
# Navigate to project root
cd personal-safety-safe-travel-system

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Start development server
python manage.py runserver
```

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

The frontend will be available at `http://localhost:3000` and will proxy API requests to `http://localhost:8000`.

## Usage

### For Students

1. Register as a student
2. Note your invite code (share with parents)
3. Start a travel session when beginning travel
4. Allow location permissions when prompted
5. Send SOS alerts in emergency situations

### For Parents

1. Register as a parent
2. Link students using their invite code, email, or student ID
3. Set your home location as reference point
4. Monitor linked students' location on the dashboard
5. View and resolve SOS alerts

### For Administrators

1. Access admin panel at `/admin/`
2. Manage users and student-parent links
3. View system statistics
4. Monitor SOS alerts and travel sessions

## Security Considerations

- Session-based authentication with CSRF protection
- Role-based access control (Student, Parent, Admin)
- Student-parent linking requires explicit consent (invite codes)
- Location data accessible only to linked parents
- SOS alerts include resolution tracking for audit trail
- UUID-based session IDs prevent enumeration attacks
- Session access permissions enforced via `IsSessionParticipant` permission class
- Parents can only resolve SOS alerts for linked students
- Students can only cancel their own SOS alerts

## License

This project is developed for educational and personal safety purposes.
