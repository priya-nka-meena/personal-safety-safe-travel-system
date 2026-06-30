from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import transaction
from django.utils import timezone
from django.shortcuts import get_object_or_404
from .models import TravelSession, LocationHistory
from .serializers import (
    TravelSessionCreateSerializer,
    TravelSessionSerializer,
    LocationHistorySerializer,
    LocationUpdateSerializer,
    DistanceRequestSerializer,
)
from .permissions import IsSessionParticipant
from .utils import haversine_distance, mark_session_expired
from core.models import CustomUser, StudentParentLink


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def session_start(request):
    """
    POST: Start a new travel session
    Body: { destination_latitude?, destination_longitude?, parent_id? }
    """
    if request.user.role != 'STUDENT':
        return Response({
            'success': False,
            'message': 'Only students can start travel sessions'
        }, status=status.HTTP_403_FORBIDDEN)
    
    serializer = TravelSessionCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Get parent if provided
    parent_id = request.data.get('parent_id')
    parent = None
    if parent_id:
        try:
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
    
    # Create session with start location from request
    session = TravelSession.objects.create(
        student=request.user,
        parent=parent,
        start_latitude=serializer.validated_data['start_latitude'],
        start_longitude=serializer.validated_data['start_longitude'],
        destination_latitude=serializer.validated_data.get('destination_latitude'),
        destination_longitude=serializer.validated_data.get('destination_longitude'),
        status='ACTIVE'
    )
    
    response_serializer = TravelSessionSerializer(session)
    return Response({
        'session_id': str(session.id),
        'status': session.status,
        'started_at': session.started_at,
        'session': response_serializer.data
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def session_location_update(request, session_id):
    """
    POST: Update location for a travel session
    Body: { latitude, longitude, accuracy_meters? }
    Auth: must be the session's student
    """
    session = get_object_or_404(TravelSession, id=session_id)
    
    # Check permission
    if session.student != request.user:
        return Response({
            'success': False,
            'message': 'Only the session student can update location'
        }, status=status.HTTP_403_FORBIDDEN)
    
    # Check if session is active
    if session.status != 'ACTIVE':
        return Response({
            'success': False,
            'message': 'Cannot update location on inactive session'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    serializer = LocationUpdateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Use transaction to update session and add history atomically
    with transaction.atomic():
        # Update current location on session
        session.current_latitude = serializer.validated_data['latitude']
        session.current_longitude = serializer.validated_data['longitude']
        session.last_update_at = timezone.now()
        session.save()
        
        # Add to history
        LocationHistory.objects.create(
            session=session,
            latitude=serializer.validated_data['latitude'],
            longitude=serializer.validated_data['longitude'],
            accuracy_meters=serializer.validated_data.get('accuracy_meters')
        )
    
    return Response({
        'current_latitude': float(session.current_latitude),
        'current_longitude': float(session.current_longitude),
        'recorded_at': session.last_update_at.isoformat()
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def session_end(request, session_id):
    """
    POST: End a travel session
    Auth: must be the session's student
    """
    session = get_object_or_404(TravelSession, id=session_id)
    
    # Check permission
    if session.student != request.user:
        return Response({
            'success': False,
            'message': 'Only the session student can end the session'
        }, status=status.HTTP_403_FORBIDDEN)
    
    if session.status != 'ACTIVE':
        return Response({
            'success': False,
            'message': 'Session is not active'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    session.status = 'ENDED'
    session.ended_at = timezone.now()
    session.save()
    
    return Response({
        'session_id': str(session.id),
        'status': session.status,
        'ended_at': session.ended_at.isoformat()
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def session_detail(request, session_id):
    """
    GET: Get current session state
    Auth: student or linked parent
    """
    session = get_object_or_404(TravelSession, id=session_id)
    
    print(f"[session_detail] request.user.id: {request.user.id}")
    print(f"[session_detail] request.user.role: {request.user.role}")
    print(f"[session_detail] session.id: {session.id}")
    print(f"[session_detail] session.student.id: {session.student.id}")
    print(f"[session_detail] session.parent: {session.parent}")
    
    # Check permission
    if session.student != request.user:
        # Check if user is a linked parent
        if request.user.role == 'PARENT':
            linked_parents = list(StudentParentLink.objects.filter(
                student=session.student
            ).values_list('parent_id', flat=True))
            print(f"[session_detail] Linked parent IDs: {linked_parents}")
            print(f"[session_detail] Checking if parent {request.user.id} is linked")
            
            if not StudentParentLink.objects.filter(
                student=session.student,
                parent=request.user
            ).exists():
                print(f"[session_detail] DENIED: Parent not linked to student")
                return Response({
                    'success': False,
                    'message': 'Access denied'
                }, status=status.HTTP_403_FORBIDDEN)
            print(f"[session_detail] GRANTED: Parent is linked")
        else:
            print(f"[session_detail] DENIED: User is not student or parent")
            return Response({
                'success': False,
                'message': 'Access denied'
            }, status=status.HTTP_403_FORBIDDEN)
    else:
        print(f"[session_detail] GRANTED: User is the student")
    
    # Auto-expire if stale
    mark_session_expired(session)
    
    serializer = TravelSessionSerializer(session)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def session_history(request, session_id):
    """
    GET: Get location history for a session
    Query param: since (timestamp) for incremental fetches
    Auth: student or linked parent
    """
    session = get_object_or_404(TravelSession, id=session_id)
    
    print(f"[session_history] request.user.id: {request.user.id}")
    print(f"[session_history] request.user.role: {request.user.role}")
    print(f"[session_history] session.id: {session.id}")
    print(f"[session_history] session.student.id: {session.student.id}")
    print(f"[session_history] session.parent: {session.parent}")
    
    # Check permission
    if session.student != request.user:
        # Check if user is a linked parent
        if request.user.role == 'PARENT':
            linked_parents = list(StudentParentLink.objects.filter(
                student=session.student
            ).values_list('parent_id', flat=True))
            print(f"[session_history] Linked parent IDs: {linked_parents}")
            print(f"[session_history] Checking if parent {request.user.id} is linked")
            
            if not StudentParentLink.objects.filter(
                student=session.student,
                parent=request.user
            ).exists():
                print(f"[session_history] DENIED: Parent not linked to student")
                return Response({
                    'success': False,
                    'message': 'Access denied'
                }, status=status.HTTP_403_FORBIDDEN)
            print(f"[session_history] GRANTED: Parent is linked")
        else:
            print(f"[session_history] DENIED: User is not student or parent")
            return Response({
                'success': False,
                'message': 'Access denied'
            }, status=status.HTTP_403_FORBIDDEN)
    else:
        print(f"[session_history] GRANTED: User is the student")
    
    # Filter by since parameter if provided
    since = request.query_params.get('since')
    queryset = session.history.all()
    
    if since:
        try:
            since_dt = timezone.datetime.fromisoformat(since)
            queryset = queryset.filter(recorded_at__gt=since_dt)
        except ValueError:
            return Response({
                'success': False,
                'message': 'Invalid since timestamp format'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    serializer = LocationHistorySerializer(queryset, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def session_distance(request, session_id):
    """
    GET: Calculate distance between session current location and parent location
    Query params: parent_latitude, parent_longitude (optional if parent is also tracking)
    Auth: student or linked parent
    """
    session = get_object_or_404(TravelSession, id=session_id)
    
    print(f"[session_distance] request.user.id: {request.user.id}")
    print(f"[session_distance] request.user.role: {request.user.role}")
    print(f"[session_distance] session.id: {session.id}")
    print(f"[session_distance] session.student.id: {session.student.id}")
    print(f"[session_distance] session.parent: {session.parent}")
    
    # Check permission
    if session.student != request.user:
        # Check if user is a linked parent
        if request.user.role == 'PARENT':
            linked_parents = list(StudentParentLink.objects.filter(
                student=session.student
            ).values_list('parent_id', flat=True))
            print(f"[session_distance] Linked parent IDs: {linked_parents}")
            print(f"[session_distance] Checking if parent {request.user.id} is linked")
            
            if not StudentParentLink.objects.filter(
                student=session.student,
                parent=request.user
            ).exists():
                print(f"[session_distance] DENIED: Parent not linked to student")
                return Response({
                    'success': False,
                    'message': 'Access denied'
                }, status=status.HTTP_403_FORBIDDEN)
            print(f"[session_distance] GRANTED: Parent is linked")
        else:
            print(f"[session_distance] DENIED: User is not student or parent")
            return Response({
                'success': False,
                'message': 'Access denied'
            }, status=status.HTTP_403_FORBIDDEN)
    else:
        print(f"[session_distance] GRANTED: User is the student")
    
    # Auto-expire if stale
    mark_session_expired(session)
    
    if not session.current_latitude or not session.current_longitude:
        return Response({
            'success': False,
            'message': 'No current location available'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Get parent location from query params or use parent's last known location
    parent_lat = request.query_params.get('parent_latitude')
    parent_lon = request.query_params.get('parent_longitude')
    
    if parent_lat and parent_lon:
        try:
            parent_lat = float(parent_lat)
            parent_lon = float(parent_lon)
        except ValueError:
            return Response({
                'success': False,
                'message': 'Invalid parent location coordinates'
            }, status=status.HTTP_400_BAD_REQUEST)
    else:
        return Response({
            'success': False,
            'message': 'Parent location coordinates required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Calculate distance
    distance_km = haversine_distance(
        float(session.current_latitude),
        float(session.current_longitude),
        parent_lat,
        parent_lon
    )
    
    return Response({
        'distance_km': round(distance_km, 2)
    }, status=status.HTTP_200_OK)
