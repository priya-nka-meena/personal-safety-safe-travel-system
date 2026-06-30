from rest_framework import serializers
from .models import TravelSession, LocationHistory


class TravelSessionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a new travel session"""
    class Meta:
        model = TravelSession
        fields = [
            'id', 'student', 'parent', 'status',
            'start_latitude', 'start_longitude',
            'destination_latitude', 'destination_longitude',
            'started_at'
        ]
        read_only_fields = ['id', 'student', 'status', 'started_at']


class TravelSessionSerializer(serializers.ModelSerializer):
    """Serializer for reading travel session data"""
    student_username = serializers.CharField(source='student.username', read_only=True)
    parent_username = serializers.CharField(source='parent.username', read_only=True, allow_null=True)
    
    class Meta:
        model = TravelSession
        fields = [
            'id', 'student', 'student_username', 'parent', 'parent_username',
            'status', 'start_latitude', 'start_longitude',
            'destination_latitude', 'destination_longitude',
            'current_latitude', 'current_longitude',
            'started_at', 'ended_at', 'last_update_at'
        ]
        read_only_fields = ['started_at', 'last_update_at']


class LocationHistorySerializer(serializers.ModelSerializer):
    """Serializer for location history points"""
    class Meta:
        model = LocationHistory
        fields = ['id', 'session', 'latitude', 'longitude', 'recorded_at', 'accuracy_meters']
        read_only_fields = ['id', 'recorded_at']


class LocationUpdateSerializer(serializers.Serializer):
    """Serializer for location updates"""
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6, coerce_to_string=False)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6, coerce_to_string=False)
    accuracy_meters = serializers.FloatField(required=False, allow_null=True)


class DistanceRequestSerializer(serializers.Serializer):
    """Serializer for distance calculation requests"""
    parent_latitude = serializers.DecimalField(max_digits=9, decimal_places=6, coerce_to_string=False, required=False)
    parent_longitude = serializers.DecimalField(max_digits=9, decimal_places=6, coerce_to_string=False, required=False)
