# Frontend-Backend Connection Checklist

## ✅ Verification Steps

### 1. API Base URL ✅
- **Location**: `frontend/src/services/api.js`
- **Current Value**: `http://127.0.0.1:8000`
- **Status**: ✅ Correct

### 2. Backend Endpoints ✅
- **Student Register**: `POST http://127.0.0.1:8000/api/auth/student/register/`
- **Parent Register**: `POST http://127.0.0.1:8000/api/auth/parent/register/`
- **Login**: `POST http://127.0.0.1:8000/api/auth/login/`
- **Status**: ✅ All endpoints exist

### 3. CORS Configuration ⚠️
**Action Required**: Add CORS headers to Django settings

Add to `safety_system/settings.py`:

```python
INSTALLED_APPS = [
    # ... existing apps
    'corsheaders',  # Add this
    'rest_framework',
    'core',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',  # Add this (should be near top)
    'django.contrib.sessions.middleware.SessionMiddleware',
    # ... rest of middleware
]

# Add at the end of settings.py
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

CORS_ALLOW_CREDENTIALS = True
```

**Install django-cors-headers**:
```bash
pip install django-cors-headers
```

### 4. Error Logging ✅
- Console logging added to all API calls
- Error details displayed in UI
- Backend errors properly formatted

### 5. Sample Payloads

#### Student Registration:
```json
{
  "username": "teststudent",
  "email": "student@test.com",
  "password": "testpass123",
  "password2": "testpass123",
  "role": "STUDENT",
  "first_name": "Test",
  "last_name": "Student"
}
```

#### Login:
```json
{
  "username": "teststudent",
  "password": "testpass123"
}
```

### 6. Common Errors & Fixes

#### Error 400: Bad Request
- **Cause**: Validation errors (missing fields, invalid data)
- **Fix**: Check console logs for specific field errors
- **Example**: Password too short, email invalid, username taken

#### Error 404: Not Found
- **Cause**: Wrong endpoint URL
- **Fix**: Verify URL in `api.js` matches Django `urls.py`
- **Current**: ✅ URLs match

#### Error 500: Internal Server Error
- **Cause**: Backend code error
- **Fix**: Check Django server logs
- **Action**: Review backend console output

#### CORS Error
- **Cause**: CORS not configured
- **Fix**: Add `django-cors-headers` and configure as above
- **Symptom**: "Access to XMLHttpRequest blocked by CORS policy"

### 7. Testing Steps

1. **Start Django Backend**:
```bash
python manage.py runserver
```
Should see: "Starting development server at http://127.0.0.1:8000/"

2. **Start React Frontend**:
```bash
cd frontend
npm start
```
Should open: `http://localhost:3000`

3. **Open Browser Console** (F12)
   - Look for 🔵 (request) and ✅ (success) or ❌ (error) logs
   - Check Network tab for actual HTTP requests

4. **Test Registration**:
   - Fill form with valid data
   - Submit
   - Check console for logs
   - Check Network tab for response

5. **Test Login**:
   - Use registered credentials
   - Submit
   - Should redirect to dashboard

### 8. Debugging Tips

- **Check Browser Console**: All API calls are logged
- **Check Network Tab**: See actual HTTP requests/responses
- **Check Django Console**: See backend logs
- **Check Django Admin**: Verify user was created

### 9. Role-Based Routing ✅

After successful login:
- **STUDENT** → `/student` dashboard
- **PARENT** → `/parent` dashboard  
- **ADMIN** → `/admin` dashboard

ProtectedRoute validates role before allowing access.

