import math
import requests
from django.utils import timezone
from datetime import timedelta

_REVERSE_GEOCODE_CACHE = {}


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


def _geocode_cache_key(latitude, longitude):
    return f"{round(float(latitude), 4)},{round(float(longitude), 4)}"


def _format_nominatim_name(data):
    address = data.get('address') or {}
    parts = []
    for key in (
        'amenity', 'building', 'university', 'college', 'suburb',
        'neighbourhood', 'village', 'town', 'city', 'state', 'country',
    ):
        value = address.get(key)
        if value and value not in parts:
            parts.append(value)
    if parts:
        return ', '.join(parts[:3])
    display_name = data.get('display_name')
    if display_name:
        parts = [p.strip() for p in display_name.split(',') if p.strip()]
        return ', '.join(parts[:3]) if parts else None
    return None


def reverse_geocode(latitude, longitude):
    """
    Convert latitude/longitude to a human-readable location using Nominatim.
    Results are cached so identical coordinates are not requested repeatedly.
    """
    if latitude is None or longitude is None:
        return None
    try:
        key = _geocode_cache_key(latitude, longitude)
    except (TypeError, ValueError):
        return None
    if key in _REVERSE_GEOCODE_CACHE:
        return _REVERSE_GEOCODE_CACHE[key]
    name = None
    try:
        response = requests.get(
            'https://nominatim.openstreetmap.org/reverse',
            params={'lat': latitude, 'lon': longitude, 'format': 'json'},
            headers={'User-Agent': 'SafeTravelSystem/1.0'},
            timeout=5,
        )
        if response.status_code == 200:
            name = _format_nominatim_name(response.json())
    except Exception as e:
        print(f"Reverse geocoding failed for ({latitude}, {longitude}): {e}")
    if name:
        _REVERSE_GEOCODE_CACHE[key] = name
    return name


def travelled_distance_km(points):
    """Sum consecutive Haversine distances for LocationHistory-like points."""
    if len(points) < 2:
        return 0.0
    total = 0.0
    for i in range(len(points) - 1):
        total += haversine_distance(
            float(points[i].latitude),
            float(points[i].longitude),
            float(points[i + 1].latitude),
            float(points[i + 1].longitude),
        )
    return total


def finalize_session_summary(session, force=False):
    """
    Fill duration, travelled distance, and From/To names from LocationHistory.
    From = first history point (fallback: session start coordinates).
    To = last history point (fallback: current coordinates).
    """
    points = list(session.history.all().order_by('recorded_at'))
    update_fields = []

    if session.started_at and session.ended_at and (force or session.duration is None):
        session.duration = session.ended_at - session.started_at
        update_fields.append('duration')

    if force or session.total_distance is None:
        session.total_distance = travelled_distance_km(points)
        update_fields.append('total_distance')

    if force or not session.start_location_name:
        if points:
            from_lat, from_lon = points[0].latitude, points[0].longitude
        else:
            from_lat, from_lon = session.start_latitude, session.start_longitude
        start_name = reverse_geocode(from_lat, from_lon)
        if start_name:
            session.start_location_name = start_name
            update_fields.append('start_location_name')

    if force or not session.destination_location_name:
        if points:
            to_lat, to_lon = points[-1].latitude, points[-1].longitude
        else:
            to_lat, to_lon = session.current_latitude, session.current_longitude
        dest_name = reverse_geocode(to_lat, to_lon)
        if dest_name:
            session.destination_location_name = dest_name
            update_fields.append('destination_location_name')

    if update_fields:
        session.save(update_fields=update_fields)
    return session


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
