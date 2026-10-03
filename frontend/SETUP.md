# Quick Setup Guide

## Step 1: Install Dependencies

```bash
cd frontend
npm install
```

This installs:
- React 19.2.3
- Bootstrap 5.3.0
- Axios 1.6.0

## Step 2: Configure Django Backend (if needed)

Make sure your Django backend has CORS configured in `settings.py`:

```python
INSTALLED_APPS = [
    # ... other apps
    'corsheaders',
]

MIDDLEWARE = [
    # ... other middleware
    'corsheaders.middleware.CorsMiddleware',
    # ...
]

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

CORS_ALLOW_CREDENTIALS = True
```

## Step 3: Start Django Backend

```bash
# In the project root directory
python manage.py runserver
```

Backend should run on `http://localhost:8000`

## Step 4: Start React Frontend

```bash
# In the frontend directory
npm start
```

Frontend will open at `http://localhost:3000`

## Step 5: Test the Application

1. Open `http://localhost:3000` in your browser
2. Login with a student account (create one via Django admin if needed)
3. Click "Start Travel Session"
4. Allow location access when prompted
5. Test the SOS alert button

## Troubleshooting

### CORS Errors
- Make sure `django-cors-headers` is installed: `pip install django-cors-headers`
- Verify CORS settings in Django `settings.py`

### Location Not Working
- Use HTTPS or localhost (required for geolocation)
- Check browser permissions
- Some browsers require user interaction before allowing geolocation

### API Connection Issues
- Verify Django server is running on port 8000
- Check `API_BASE_URL` in `src/services/api.js`
- Check browser console for errors

## File Structure

```
frontend/
├── src/
│   ├── Components/
│   │   ├── Login.js          # Login page
│   │   ├── Login.css
│   │   ├── Dashboard.js      # Student dashboard
│   │   └── Dashboard.css
│   ├── services/
│   │   └── api.js           # API calls (axios)
│   ├── App.js               # Main app (routing)
│   └── index.js             # Entry point
└── package.json
```

## API Endpoints

- `POST /api/auth/login/` - Login
- `POST /api/travel/start/` - Start travel
- `POST /api/travel/stop/` - Stop travel
- `POST /api/location/update/` - Update location
- `POST /api/sos-alerts/` - Send SOS

All endpoints require authentication (session-based).

