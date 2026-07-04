from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.contrib.auth import authenticate, login as django_login, logout as django_logout
from django.db.models import Q
from django.utils import timezone
from django.views.decorators.csrf import ensure_csrf_cookie
from .models import CustomUser, SOSAlert, TravelSession as CoreTravelSession, LiveLocation, StudentParentLink
from tracking.models import TravelSession
from .serializers import (
    CustomUserSerializer,
    LoginSerializer,
    SOSAlertSerializer,
    TravelSessionSerializer,
    LiveLocationSerializer,
    LinkStudentSerializer,
)

# ==================== SYSTEM ARCHITECTURE ====================
# This system is organized into four core modules:
# 1. Student Live Tracking (dynamic GPS stream) - tracking.TravelSession, tracking.LocationHistory
# 2. Parent Home Location (static reference) - CustomUser.parent_home_latitude/longitude
# 3. SOS System (event-based emergency lifecycle) - core.SOSAlert with resolution fields
# 4. Travel History (time-series location logs) - core.LiveLocation (legacy), tracking.LocationHistory
# =============================================================


# ==================== AUTHENTICATION APIs ====================

@api_view(['POST'])
@permission_classes([AllowAny])
def student_register(request):
    """
    POST: Register a new student user
    """
    serializer = CustomUserSerializer(data=request.data)
    if serializer.is_valid():
        # Ensure role is STUDENT
        if serializer.validated_data.get('role') != 'STUDENT':
            serializer.validated_data['role'] = 'STUDENT'
        
        user = serializer.save()
        return Response({
            'success': True,
            'message': 'Student registered successfully',
            'user_id': user.id,
            'role': user.role,
            'username': user.username
        }, status=status.HTTP_201_CREATED)
    return Response({
        'success': False,
        'errors': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def parent_register(request):
    """
    POST: Register a new parent user
    """
    serializer = CustomUserSerializer(data=request.data)
    if serializer.is_valid():
        # Ensure role is PARENT
        if serializer.validated_data.get('role') != 'PARENT':
            serializer.validated_data['role'] = 'PARENT'
        
        user = serializer.save()
        return Response({
            'success': True,
            'message': 'Parent registered successfully',
            'user_id': user.id,
            'role': user.role,
            'username': user.username
        }, status=status.HTTP_201_CREATED)
    return Response({
        'success': False,
        'errors': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """
    POST: Login with username/email and password
    """
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        username = serializer.validated_data['username']
        password = serializer.validated_data['password']
        
        # Try to authenticate with username
        user = authenticate(username=username, password=password)
        
        # If not found, try with email
        if user is None:
            try:
                user_obj = CustomUser.objects.get(email=username)
                user = authenticate(username=user_obj.username, password=password)
            except CustomUser.DoesNotExist:
                pass
        
        if user is not None:
            # Establish Django session so SessionAuthentication works for API calls
            django_login(request, user)
            return Response({
                'success': True,
                'message': 'Login successful',
                'user_id': user.id,
                'role': user.role,
                'username': user.username,
                'is_staff': user.is_staff,
                'is_superuser': user.is_superuser,
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'success': False,
                'message': 'Invalid credentials'
            }, status=status.HTTP_401_UNAUTHORIZED)
    
    return Response({
        'success': False,
        'errors': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def auth_csrf(request):
    """Set CSRF cookie for the SPA; required for session-authenticated POST requests."""
    return Response({'detail': 'ok'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    django_logout(request)
    return Response({'success': True, 'message': 'Logged out'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def auth_me(request):
    """Return the current session user (validates session cookie)."""
    user = request.user
    payload = {
        'authenticated': True,
        'user_id': user.id,
        'username': user.username,
        'email': user.email,
        'role': user.role,
        'is_staff': user.is_staff,
        'is_superuser': user.is_superuser,
    }
    if user.role == 'STUDENT':
        payload['invite_code'] = user.invite_code
        payload['linked_parents_count'] = user.parent_links.count()
    return Response(payload)


def _find_student_by_identifier(identifier):
    """Resolve a student by numeric ID, email, or invite code."""
    identifier = (identifier or '').strip()
    if not identifier:
        return None

    if identifier.isdigit():
        student = CustomUser.objects.filter(id=int(identifier), role='STUDENT').first()
        if student:
            return student

    student = CustomUser.objects.filter(
        Q(email__iexact=identifier) | Q(invite_code__iexact=identifier),
        role='STUDENT',
    ).first()
    return student


# ==================== SOS ALERT APIs ====================
# MODULE 3: SOS System (event-based emergency lifecycle)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def sos_alert_list_create(request):
    """
    GET: Retrieve all SOS alerts for the authenticated user
    POST: Create a new SOS alert
    """
    if request.method == 'GET':
        # Students see their own alerts, parents see alerts from linked students
        if request.user.role == 'STUDENT':
            alerts = SOSAlert.objects.filter(student=request.user)
        elif request.user.role == 'PARENT':
            student_ids = request.user.student_links.values_list('student_id', flat=True)
            alerts = SOSAlert.objects.filter(student_id__in=student_ids)
        elif request.user.is_staff:
            alerts = SOSAlert.objects.all()
        else:
            alerts = SOSAlert.objects.none()
        
        serializer = SOSAlertSerializer(alerts, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        # Only students can create SOS alerts
        if request.user.role != 'STUDENT':
            return Response({
                'success': False,
                'message': 'Only students can create SOS alerts'
            }, status=status.HTTP_403_FORBIDDEN)
        
        serializer = SOSAlertSerializer(data=request.data)
        if serializer.is_valid():
            # Get active travel session if exists
            active_session = TravelSession.objects.filter(
                student=request.user,
                status='ACTIVE'
            ).first()
            
            # Create SOS alert with HIGH danger level
            alert = serializer.save(
                student=request.user,
                travel_session=active_session,
                danger_level=3,
                is_active=True,
            )
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sos_alert_resolve(request, alert_id):
    """
    POST: Mark an SOS alert as resolved
    Only parents or admins can resolve SOS alerts
    """
    # Only parents and admins can resolve alerts
    if request.user.role not in ['PARENT'] and not request.user.is_staff:
        return Response({
            'success': False,
            'message': 'Only parents or admins can resolve SOS alerts'
        }, status=status.HTTP_403_FORBIDDEN)
    
    try:
        alert = SOSAlert.objects.get(id=alert_id)
    except SOSAlert.DoesNotExist:
        return Response({
            'success': False,
            'message': 'SOS alert not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # If parent, verify they are linked to the student
    if request.user.role == 'PARENT':
        if not StudentParentLink.objects.filter(
            parent=request.user,
            student=alert.student
        ).exists():
            return Response({
                'success': False,
                'message': 'You are not linked to this student'
            }, status=status.HTTP_403_FORBIDDEN)
    
    # Mark as resolved
    alert.is_resolved = True
    alert.resolved_at = timezone.now()
    alert.resolved_by = request.user
    alert.save()
    
    serializer = SOSAlertSerializer(alert)
    return Response({
        'success': True,
        'message': 'SOS alert resolved successfully',
        'alert': serializer.data
    }, status=status.HTTP_200_OK)


# ==================== TRAVEL APIs ====================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def travel_start(request):
    """
    POST: Start a new travel session
    Only students can start travel sessions
    """
    if request.user.role != 'STUDENT':
        return Response({
            'success': False,
            'message': 'Only students can start travel sessions'
        }, status=status.HTTP_403_FORBIDDEN)
    
    # Check if there's an active session in the new tracking model
    active_session = TravelSession.objects.filter(
        student=request.user,
        status='ACTIVE'
    ).first()
    
    if active_session:
        return Response({
            'success': False,
            'message': 'An active travel session already exists',
            'session_id': str(active_session.id)
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Get current location for start
    start_latitude = request.data.get('start_latitude')
    start_longitude = request.data.get('start_longitude')
    
    if not start_latitude or not start_longitude:
        return Response({
            'success': False,
            'message': 'start_latitude and start_longitude are required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Get parent if provided
    parent_id = request.data.get('parent_id')
    parent = None
    if parent_id:
        try:
            from core.models import StudentParentLink
            parent = CustomUser.objects.get(id=parent_id, role='PARENT')
            # Verify parent is linked to student
            if not StudentParentLink.objects.filter(
                student=request.user,
                parent=parent
            ).exists():
                return Response({
                    'success': False,
                    'message': 'Parent is not linked to this student'
                }, status=status.HTTP_400_BAD_REQUEST)
        except CustomUser.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Parent not found'
            }, status=status.HTTP_404_NOT_FOUND)
    
    # Create new travel session using tracking.TravelSession
    session = TravelSession.objects.create(
        student=request.user,
        parent=parent,
        start_latitude=start_latitude,
        start_longitude=start_longitude,
        destination_latitude=request.data.get('destination_latitude'),
        destination_longitude=request.data.get('destination_longitude'),
        status='ACTIVE'
    )
    
    return Response({
        'success': True,
        'message': 'Travel session started',
        'session_id': str(session.id),
        'status': session.status,
        'started_at': session.started_at.isoformat()
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def travel_stop(request):
    """
    POST: Stop the active travel session
    Only students can stop their own travel sessions
    """
    if request.user.role != 'STUDENT':
        return Response({
            'success': False,
            'message': 'Only students can stop travel sessions'
        }, status=status.HTTP_403_FORBIDDEN)
    
    # Get active session from tracking model
    active_session = TravelSession.objects.filter(
        student=request.user,
        status='ACTIVE'
    ).first()
    
    if not active_session:
        return Response({
            'success': False,
            'message': 'No active travel session found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Stop the session
    active_session.status = 'ENDED'
    active_session.ended_at = timezone.now()
    active_session.save()
    
    return Response({
        'success': True,
        'message': 'Travel session stopped',
        'session_id': str(active_session.id)
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def location_update(request):
    """
    POST: Update live location during travel session
    Only students can update their location
    """
    if request.user.role != 'STUDENT':
        return Response({
            'success': False,
            'message': 'Only students can update location'
        }, status=status.HTTP_403_FORBIDDEN)
    
    # Get active travel session from tracking model
    active_session = TravelSession.objects.filter(
        student=request.user,
        status='ACTIVE'
    ).first()
    
    if not active_session:
        return Response({
            'success': False,
            'message': 'No active travel session found. Please start a travel session first.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Update current location on session and add to history
    from tracking.models import LocationHistory
    from django.db import transaction
    
    latitude = request.data.get('latitude')
    longitude = request.data.get('longitude')
    
    if not latitude or not longitude:
        return Response({
            'success': False,
            'message': 'latitude and longitude are required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    with transaction.atomic():
        # Update current location on session
        active_session.current_latitude = latitude
        active_session.current_longitude = longitude
        active_session.last_update_at = timezone.now()
        active_session.save()
        
        # Add to history
        LocationHistory.objects.create(
            session=active_session,
            latitude=latitude,
            longitude=longitude,
            accuracy_meters=request.data.get('accuracy_meters')
        )
    
    return Response({
        'success': True,
        'message': 'Location updated successfully',
        'current_latitude': float(active_session.current_latitude),
        'current_longitude': float(active_session.current_longitude),
        'recorded_at': active_session.last_update_at.isoformat()
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def travel_status(request):
    """Current travel session and latest location for the authenticated student."""
    if request.user.role != 'STUDENT':
        return Response({
            'success': False,
            'message': 'Only students can access travel status',
        }, status=status.HTTP_403_FORBIDDEN)

    active_session = TravelSession.objects.filter(
        student=request.user,
        status='ACTIVE',
    ).first()

    latest = None
    if active_session:
        # Check if session is stale (expired)
        from tracking.utils import is_session_expired
        if is_session_expired(active_session):
            active_session = None
        else:
            # Get location from the session's current location
            if active_session.current_latitude and active_session.current_longitude:
                latest = {
                    'latitude': float(active_session.current_latitude),
                    'longitude': float(active_session.current_longitude),
                    'timestamp': active_session.last_update_at.isoformat(),
                }

    return Response({
        'success': True,
        'travel_active': active_session is not None,
        'session_id': str(active_session.id) if active_session else None,
        'session_started_at': active_session.started_at.isoformat() if active_session else None,
        'latest_location': latest,
    })


# ==================== PARENT MONITORING ====================

# Parent Home Location Management (Static reference point for student tracking)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def parent_home_location(request):
    """
    GET: Retrieve parent's home location (static reference point)
    POST: Update parent's home location
    Only parents can access their home location
    """
    if request.user.role != 'PARENT':
        return Response({
            'success': False,
            'message': 'Only parents can access home location'
        }, status=status.HTTP_403_FORBIDDEN)
    
    if request.method == 'GET':
        return Response({
            'success': True,
            'home_latitude': float(request.user.parent_home_latitude) if request.user.parent_home_latitude else None,
            'home_longitude': float(request.user.parent_home_longitude) if request.user.parent_home_longitude else None,
        }, status=status.HTTP_200_OK)
    
    elif request.method == 'POST':
        latitude = request.data.get('latitude')
        longitude = request.data.get('longitude')
        
        if not latitude or not longitude:
            return Response({
                'success': False,
                'message': 'latitude and longitude are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            latitude = float(latitude)
            longitude = float(longitude)
        except ValueError:
            return Response({
                'success': False,
                'message': 'Invalid coordinates format'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate coordinate ranges
        if not (-90 <= latitude <= 90) or not (-180 <= longitude <= 180):
            return Response({
                'success': False,
                'message': 'Coordinates out of valid range'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update parent's home location
        request.user.parent_home_latitude = latitude
        request.user.parent_home_longitude = longitude
        request.user.save()
        
        return Response({
            'success': True,
            'message': 'Home location updated successfully',
            'home_latitude': latitude,
            'home_longitude': longitude
        }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def parent_monitoring(request):
    """
    Linked students, travel status, and latest live location for the authenticated parent.
    """
    if request.user.role != 'PARENT':
        return Response({
            'success': False,
            'message': 'Only parents can access this resource',
        }, status=status.HTTP_403_FORBIDDEN)

    links = StudentParentLink.objects.filter(parent=request.user).select_related('student')
    students_payload = []
    online_threshold = timezone.now() - timezone.timedelta(minutes=2)

    for link in links:
        student = link.student
        active_session = TravelSession.objects.filter(
            student=student,
            status='ACTIVE',
        ).first()

        latest = None
        is_online = False
        if active_session:
            # Check if session is stale (expired)
            from tracking.utils import is_session_expired
            if is_session_expired(active_session):
                active_session = None
            else:
                # Get location from the session's current location
                if active_session.current_latitude and active_session.current_longitude:
                    latest = {
                        'latitude': float(active_session.current_latitude),
                        'longitude': float(active_session.current_longitude),
                        'timestamp': active_session.last_update_at.isoformat(),
                    }
                    is_online = active_session.last_update_at >= online_threshold

        students_payload.append({
            'link_id': link.id,
            'student_id': student.id,
            'username': student.username,
            'full_name': student.get_full_name() or student.username,
            'travel_active': active_session is not None,
            'is_online': is_online,
            'session_id': str(active_session.id) if active_session else None,
            'session_started_at': active_session.started_at.isoformat() if active_session else None,
            'latest_location': latest,
            'home_latitude': float(student.home_latitude) if student.home_latitude else None,
            'home_longitude': float(student.home_longitude) if student.home_longitude else None,
        })

    # Include parent's home location in response
    return Response({
        'success': True,
        'students': students_payload,
        'parent_home_latitude': float(request.user.parent_home_latitude) if request.user.parent_home_latitude else None,
        'parent_home_longitude': float(request.user.parent_home_longitude) if request.user.parent_home_longitude else None,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def parent_update_location(request):
    """
    POST: Update parent's live location
    Only parents can update their location
    """
    if request.user.role != 'PARENT':
        return Response({
            'success': False,
            'message': 'Only parents can update their location'
        }, status=status.HTTP_403_FORBIDDEN)
    
    latitude = request.data.get('latitude')
    longitude = request.data.get('longitude')
    
    if not latitude or not longitude:
        return Response({
            'success': False,
            'message': 'latitude and longitude are required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        latitude = float(latitude)
        longitude = float(longitude)
    except ValueError:
        return Response({
            'success': False,
            'message': 'Invalid coordinates format'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Validate coordinate ranges
    if not (-90 <= latitude <= 90) or not (-180 <= longitude <= 180):
        return Response({
            'success': False,
            'message': 'Coordinates out of valid range'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Update parent's live location
    request.user.parent_current_latitude = latitude
    request.user.parent_current_longitude = longitude
    request.user.parent_last_location_update = timezone.now()
    request.user.is_sharing_live_location = True
    request.user.save()
    
    return Response({
        'success': True,
        'message': 'Location updated successfully',
        'latitude': latitude,
        'longitude': longitude,
        'updated_at': request.user.parent_last_location_update.isoformat()
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def parent_stop_sharing_location(request):
    """
    POST: Stop sharing parent's live location
    Only parents can stop sharing their location
    """
    if request.user.role != 'PARENT':
        return Response({
            'success': False,
            'message': 'Only parents can stop sharing their location'
        }, status=status.HTTP_403_FORBIDDEN)
    
    request.user.is_sharing_live_location = False
    request.user.save()
    
    return Response({
        'success': True,
        'message': 'Location sharing stopped'
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def parent_get_location(request):
    """
    GET: Retrieve parent's live location status
    Only parents can access their own location status
    """
    if request.user.role != 'PARENT':
        return Response({
            'success': False,
            'message': 'Only parents can access their location status'
        }, status=status.HTTP_403_FORBIDDEN)
    
    return Response({
        'success': True,
        'is_sharing_live_location': request.user.is_sharing_live_location,
        'current_latitude': float(request.user.parent_current_latitude) if request.user.parent_current_latitude else None,
        'current_longitude': float(request.user.parent_current_longitude) if request.user.parent_current_longitude else None,
        'last_location_update': request.user.parent_last_location_update.isoformat() if request.user.parent_last_location_update else None,
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def parent_link_student(request):
    """Parent links a student using student ID, email, or invite code."""
    if request.user.role != 'PARENT':
        return Response({
            'success': False,
            'message': 'Only parents can link students',
        }, status=status.HTTP_403_FORBIDDEN)

    serializer = LinkStudentSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({
            'success': False,
            'errors': serializer.errors,
        }, status=status.HTTP_400_BAD_REQUEST)

    identifier = serializer.validated_data['identifier']
    student = _find_student_by_identifier(identifier)

    if not student:
        return Response({
            'success': False,
            'message': 'No student found with that ID, email, or invite code.',
        }, status=status.HTTP_404_NOT_FOUND)

    if StudentParentLink.objects.filter(parent=request.user, student=student).exists():
        return Response({
            'success': False,
            'message': 'This student is already linked to your account.',
        }, status=status.HTTP_400_BAD_REQUEST)

    link = StudentParentLink.objects.create(parent=request.user, student=student)
    link_data = {
        'link_id': link.id,
        'student_id': student.id,
        'username': student.username,
        'full_name': student.get_full_name() or student.username,
    }

    return Response({
        'success': True,
        'message': f'Successfully linked with {link_data["full_name"]}.',
        'link': link_data,
    }, status=status.HTTP_201_CREATED)


# ==================== ADMIN STATISTICS ====================


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_overview(request):
    if not request.user.is_staff:
        return Response({
            'success': False,
            'message': 'Admin access required',
        }, status=status.HTTP_403_FORBIDDEN)

    return Response({
        'success': True,
        'total_users': CustomUser.objects.count(),
        'total_students': CustomUser.objects.filter(role='STUDENT').count(),
        'total_parents': CustomUser.objects.filter(role='PARENT').count(),
        'active_travel_sessions': TravelSession.objects.filter(status='ACTIVE').count(),
        'sos_alerts': SOSAlert.objects.count(),
        'active_sos_alerts': SOSAlert.objects.filter(is_active=True).count(),
        'student_parent_links': StudentParentLink.objects.count(),
    })

