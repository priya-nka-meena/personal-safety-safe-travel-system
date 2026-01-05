from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.contrib.auth import authenticate
from django.utils import timezone
from .models import CustomUser, SOSAlert, TravelSession, LiveLocation
from .serializers import (
    CustomUserSerializer,
    LoginSerializer,
    SOSAlertSerializer,
    TravelSessionSerializer,
    LiveLocationSerializer
)


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
            return Response({
                'success': True,
                'message': 'Login successful',
                'user_id': user.id,
                'role': user.role,
                'username': user.username
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


# ==================== SOS ALERT APIs ====================

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
        else:  # PARENT
            # Get all students linked to this parent
            student_ids = request.user.student_links.values_list('student_id', flat=True)
            alerts = SOSAlert.objects.filter(student_id__in=student_ids)
        
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
                is_active=True
            ).first()
            
            # Create SOS alert with HIGH danger level
            alert = serializer.save(
                student=request.user,
                travel_session=active_session,
                danger_level=3  # HIGH
            )
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


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
    
    # Check if there's an active session
    active_session = TravelSession.objects.filter(
        student=request.user,
        is_active=True
    ).first()
    
    if active_session:
        return Response({
            'success': False,
            'message': 'An active travel session already exists',
            'session_id': active_session.id
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Create new travel session
    session = TravelSession.objects.create(
        student=request.user,
        is_active=True
    )
    
    serializer = TravelSessionSerializer(session)
    return Response({
        'success': True,
        'message': 'Travel session started',
        'session': serializer.data
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
    
    # Get active session
    active_session = TravelSession.objects.filter(
        student=request.user,
        is_active=True
    ).first()
    
    if not active_session:
        return Response({
            'success': False,
            'message': 'No active travel session found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Stop the session
    active_session.is_active = False
    active_session.end_time = timezone.now()
    active_session.save()
    
    serializer = TravelSessionSerializer(active_session)
    return Response({
        'success': True,
        'message': 'Travel session stopped',
        'session': serializer.data
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
    
    # Get active travel session
    active_session = TravelSession.objects.filter(
        student=request.user,
        is_active=True
    ).first()
    
    if not active_session:
        return Response({
            'success': False,
            'message': 'No active travel session found. Please start a travel session first.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Create location update
    serializer = LiveLocationSerializer(data=request.data)
    if serializer.is_valid():
        location = serializer.save(travel_session=active_session)
        return Response({
            'success': True,
            'message': 'Location updated successfully',
            'location': serializer.data
        }, status=status.HTTP_201_CREATED)
    
    return Response({
        'success': False,
        'errors': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)

