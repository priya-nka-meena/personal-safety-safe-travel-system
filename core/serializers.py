from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import CustomUser, StudentParentLink, TravelSession, LiveLocation, SOSAlert


class CustomUserSerializer(serializers.ModelSerializer):
    """Serializer for CustomUser - used in registration"""
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True, label='Confirm Password')
    
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'password', 'password2', 'role', 'first_name', 'last_name']
        extra_kwargs = {
            'password': {'write_only': True},
            'email': {'required': True}
        }
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password2')
        user = CustomUser.objects.create_user(**validated_data)
        return user


class LoginSerializer(serializers.Serializer):
    """Serializer for login"""
    username = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True)


class StudentParentLinkSerializer(serializers.ModelSerializer):
    """Serializer for StudentParentLink"""
    student_username = serializers.CharField(source='student.username', read_only=True)
    parent_username = serializers.CharField(source='parent.username', read_only=True)
    
    class Meta:
        model = StudentParentLink
        fields = ['id', 'student', 'parent', 'student_username', 'parent_username', 'created_at']
        read_only_fields = ['id', 'created_at']


class TravelSessionSerializer(serializers.ModelSerializer):
    """Serializer for TravelSession"""
    student_username = serializers.CharField(source='student.username', read_only=True)
    
    class Meta:
        model = TravelSession
        fields = ['id', 'student', 'student_username', 'start_time', 'end_time', 'is_active']
        read_only_fields = ['id', 'start_time']


class LiveLocationSerializer(serializers.ModelSerializer):
    """Serializer for LiveLocation"""
    class Meta:
        model = LiveLocation
        fields = ['id', 'travel_session', 'latitude', 'longitude', 'timestamp']
        read_only_fields = ['id', 'timestamp']


class SOSAlertSerializer(serializers.ModelSerializer):
    """Updated SOSAlert serializer"""
    student_username = serializers.CharField(source='student.username', read_only=True)
    student_id = serializers.IntegerField(source='student.id', read_only=True)

    class Meta:
        model = SOSAlert
        fields = [
            'id', 'student', 'student_id', 'student_username', 'travel_session',
            'location', 'latitude', 'longitude', 'description', 'danger_level', 'timestamp'
        ]
        read_only_fields = ['id', 'timestamp']

