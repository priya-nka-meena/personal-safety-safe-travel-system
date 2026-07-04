import math
from django.utils import timezone
from datetime import timedelta


def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the great circle distance between two points on Earth.
    
    Args:
        lat1, lon1: Latitude and longitude of first point (in decimal degrees)
        lat2, lon2: Latitude and longitude of second point (in decimal degrees)
    
    Returns:
        Distance in kilometers
    """
    # Convert decimal degrees to radians
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    
    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    # Radius of Earth in kilometers
    r = 6371
    
    return c * r


def is_session_expired(session, timeout_minutes=2):
    """
    Check if a session has expired based on last_update_at.
    
    Args:
        session: TravelSession instance
        timeout_minutes: Minutes of inactivity before considering a session expired
    
    Returns:
        Boolean indicating if the session is expired
    """
    if session.status != 'ACTIVE':
        return False
    
    threshold = timezone.now() - timedelta(minutes=timeout_minutes)
    return session.last_update_at < threshold


def mark_session_expired(session):
    """
    Mark a session as expired if it has exceeded the timeout threshold.
    
    Args:
        session: TravelSession instance
    
    Returns:
        Boolean indicating if the session was marked as expired
    """
    if is_session_expired(session):
        session.status = 'EXPIRED'
        session.ended_at = timezone.now()
        session.save()
        return True
    return False
