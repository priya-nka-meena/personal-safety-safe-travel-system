# Student Safety System - React Frontend

A React frontend application for the Student Safety System that connects to a Django REST API backend.

## Features

- **Student Login**: Secure authentication with Django backend
- **Travel Session Management**: Start and stop travel sessions
- **Live Location Tracking**: Automatic location updates using browser geolocation API
- **SOS Alert**: Emergency alert system with location data
- **Responsive UI**: Clean, modern interface built with Bootstrap 5

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Django backend running on `http://localhost:8000`

## Installation

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

This will install:
- React 19.2.3
- Bootstrap 5.3.0
- Axios 1.6.0
- Other required dependencies

## Configuration

### Backend API URL

The frontend is configured to connect to `http://localhost:8000` by default.

To change the backend URL, edit `src/services/api.js`:

```javascript
const API_BASE_URL = 'http://your-backend-url:port';
```

### CORS Configuration

Make sure your Django backend has CORS configured to allow requests from the React app (typically `http://localhost:3000`).

In your Django `settings.py`, ensure you have:

```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

CORS_ALLOW_CREDENTIALS = True
```

## Running the Application

1. Make sure your Django backend is running on `http://localhost:8000`

2. Start the React development server:
```bash
npm start
```

3. Open your browser and navigate to:
```
http://localhost:3000
```

The app will automatically reload if you make changes to the code.

## Project Structure

```
frontend/
├── public/
│   └── index.html          # HTML template
├── src/
│   ├── Components/
│   │   ├── Login.js         # Login page component
│   │   ├── Login.css        # Login page styles
│   │   ├── Dashboard.js     # Student dashboard component
│   │   └── Dashboard.css    # Dashboard styles
│   ├── services/
│   │   └── api.js           # API service functions (axios)
│   ├── App.js               # Main app component (routing)
│   ├── App.css              # App-level styles
│   ├── index.js             # React entry point
│   └── index.css            # Global styles
├── package.json             # Dependencies and scripts
└── README.md               # This file
```

## API Endpoints Used

The frontend connects to these Django REST API endpoints:

- `POST /api/auth/login/` - User authentication
- `POST /api/travel/start/` - Start travel session
- `POST /api/travel/stop/` - Stop travel session
- `POST /api/location/update/` - Update live location
- `POST /api/sos-alerts/` - Send SOS alert

## Usage Guide

### For Students

1. **Login**: Enter your username/email and password
2. **Start Travel Session**: Click "Start Travel Session" button
   - Allow location access when prompted by browser
   - Location will be automatically tracked and sent to server
3. **Stop Travel Session**: Click "Stop Travel Session" when you reach your destination
4. **Send SOS Alert**: In case of emergency, click "SEND SOS ALERT" button
   - Your current location will be included automatically

### Browser Permissions

The app requires location permissions to function properly:
- **Chrome/Edge**: Click "Allow" when prompted
- **Firefox**: Click "Allow" when prompted
- **Safari**: Go to Safari > Preferences > Websites > Location Services and allow

## Building for Production

To create a production build:

```bash
npm run build
```

This creates an optimized build in the `build/` folder that you can serve with any static file server.

## Troubleshooting

### "Network Error" or CORS Issues

- Ensure Django backend is running
- Check CORS settings in Django `settings.py`
- Verify API_BASE_URL in `src/services/api.js`

### Location Not Working

- Check browser permissions for location access
- Ensure you're using HTTPS or localhost (required for geolocation API)
- Check browser console for error messages

### Login Not Working

- Verify Django backend is running and accessible
- Check that session authentication is enabled in Django
- Check browser console for API errors

### Dependencies Issues

If you encounter dependency errors:

```bash
rm -rf node_modules package-lock.json
npm install
```

## Technologies Used

- **React 19.2.3** - UI library
- **Bootstrap 5.3.0** - CSS framework
- **Axios 1.6.0** - HTTP client
- **Browser Geolocation API** - Location tracking

## Development Notes

- The app uses React hooks (useState, useEffect) for state management
- Session-based authentication (cookies) is used for security
- Location tracking uses `navigator.geolocation.watchPosition()` for continuous updates
- All API calls are handled through the `api.js` service file

## License

This project is part of the Student Safety System.
