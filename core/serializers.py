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
    """Serializer for LiveLocation - travel_session is set automatically by the view"""
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6, coerce_to_string=False)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6, coerce_to_string=False)
    
    class Meta:
        model = LiveLocation
        fields = ['id', 'travel_session', 'latitude', 'longitude', 'timestamp']
        read_only_fields = ['id', 'travel_session', 'timestamp']


class SOSAlertSerializer(serializers.ModelSerializer):
    """Updated SOSAlert serializer - student and travel_session are set automatically by the view"""
    student_username = serializers.CharField(source='student.username', read_only=True)
    student_id = serializers.IntegerField(source='student.id', read_only=True)
    student_full_name = serializers.SerializerMethodField()
    resolved_by_username = serializers.CharField(source='resolved_by.username', read_only=True, allow_null=True)
    cancelled_by_username = serializers.CharField(source='cancelled_by.username', read_only=True, allow_null=True)
    status = serializers.SerializerMethodField()
    cancelled_at = serializers.DateTimeField(read_only=True, allow_null=True)
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6, coerce_to_string=False, required=False, allow_null=True)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6, coerce_to_string=False, required=False, allow_null=True)

    class Meta:
        model = SOSAlert
        fields = [
            'id', 'student', 'student_id', 'student_username', 'student_full_name',
            'travel_session', 'location', 'latitude', 'longitude', 'description',
            'danger_level', 'is_active', 'timestamp',
            'is_resolved', 'resolved_at', 'resolved_by', 'resolved_by_username',
            'status', 'cancelled_at', 'cancelled_by', 'cancelled_by_username',
        ]
        read_only_fields = ['id', 'student', 'travel_session', 'timestamp', 'is_resolved', 'resolved_at', 'resolved_by', 'status', 'cancelled_at', 'cancelled_by']

    def get_student_full_name(self, obj):
        if obj.student:
            return obj.student.get_full_name() or obj.student.username
        return None

    def get_status(self, obj):
        """Compute status from boolean fields for frontend compatibility"""
        if obj.is_resolved:
            return 'RESOLVED'
        elif not obj.is_active:
            return 'CANCELLED'
        else:
            return 'ACTIVE'


class LinkStudentSerializer(serializers.Serializer):
    """Parent links a student by ID, email, or invite code."""
    identifier = serializers.CharField(required=True, trim_whitespace=True)

