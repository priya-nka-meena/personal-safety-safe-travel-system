from django.db import models
from django.contrib.auth.models import AbstractUser
import secrets
from tracking.models import TravelSession as TrackingTravelSession

# ==================== SYSTEM ARCHITECTURE ====================
# This system is organized into four core modules:
# 1. Student Live Tracking (dynamic GPS stream) - tracking.TravelSession, tracking.LocationHistory
# 2. Parent Home Location (static reference) - CustomUser.parent_home_latitude/longitude
# 3. SOS System (event-based emergency lifecycle) - core.SOSAlert with resolution fields
# 4. Travel History (time-series location logs) - core.LiveLocation (legacy), tracking.LocationHistory
# =============================================================


def generate_invite_code():
    return secrets.token_hex(4).upper()


class CustomUser(AbstractUser):
    """
    Custom user model with role field
    
    MODULE 2: Parent Home Location (static reference)
    - parent_home_latitude/longitude: Static reference point for student tracking
    - home_latitude/longitude: Student's home location (for STUDENT role)
    """
    ROLE_CHOICES = [
        ('STUDENT', 'Student'),
        ('PARENT', 'Parent'),
    ]
    
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='STUDENT')
    invite_code = models.CharField(max_length=16, unique=True, null=True, blank=True)
    
    # Safe location fields (for STUDENT role only)
    home_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    home_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    safe_place_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    safe_place_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    
    # Parent home location fields (for PARENT role only)
    # This is the static reference point for student tracking
    parent_home_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    parent_home_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    
    # DEPRECATED: Parent live location fields (kept for backward compatibility)
    # Will be removed in future migration after data migration
    parent_current_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    parent_current_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    parent_last_location_update = models.DateTimeField(null=True, blank=True)
    is_sharing_live_location = models.BooleanField(default=False)
    
    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'
    
    def __str__(self):
        return f"{self.username} ({self.role})"

    def save(self, *args, **kwargs):
        if self.role == 'STUDENT' and not self.invite_code:
            code = generate_invite_code()
            while CustomUser.objects.filter(invite_code=code).exists():
                code = generate_invite_code()
            self.invite_code = code
        super().save(*args, **kwargs)


class StudentParentLink(models.Model):
    """Explicit linking model for Student-Parent relationships"""
    student = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='parent_links',
        limit_choices_to={'role': 'STUDENT'}
    )
    parent = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='student_links',
        limit_choices_to={'role': 'PARENT'}
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Student-Parent Link'
        verbose_name_plural = 'Student-Parent Links'
        unique_together = ['student', 'parent']
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.student.username} - {self.parent.username}"


class TravelSession(models.Model):
    """
    MODULE 4: Travel History (time-series location logs)
    Legacy travel session model - superseded by tracking.TravelSession
    Kept for backward compatibility
    """
    student = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='travel_sessions',
        limit_choices_to={'role': 'STUDENT'}
    )
    start_time = models.DateTimeField(auto_now_add=True)
    end_time = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        verbose_name = 'Travel Session'
        verbose_name_plural = 'Travel Sessions'
        ordering = ['-start_time']
    
    def __str__(self):
        status = "Active" if self.is_active else "Completed"
        return f"Travel Session {self.id} - {self.student.username} ({status})"


class LiveLocation(models.Model):
    """Live location updates during travel sessions"""
    travel_session = models.ForeignKey(
        TravelSession,
        on_delete=models.CASCADE,
        related_name='live_locations'
    )
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Live Location'
        verbose_name_plural = 'Live Locations'
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"Location at ({self.latitude}, {self.longitude}) - {self.timestamp}"


class SOSAlert(models.Model):
    """SOS Alert model - updated to use CustomUser and integrate with travel sessions
    
    Lifecycle management:
    - is_active: Whether the alert is currently active (default True)
    - is_resolved: Whether the alert has been resolved by parent/admin (default False)
    - resolved_at: Timestamp when the alert was resolved (nullable)
    """
    student = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='sos_alerts',
        limit_choices_to={'role': 'STUDENT'},
        # null=True,  # Temporarily nullable for migration - will be removed after data migration
        # blank=True
    )
    travel_session = models.ForeignKey(
        TrackingTravelSession,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sos_alerts'
    )
    location = models.CharField(max_length=255)
    description = models.TextField()
   
    danger_level = models.IntegerField(default=3)  # Default to HIGH (3)
    is_active = models.BooleanField(default=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    # Resolution lifecycle fields
    is_resolved = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='resolved_sos_alerts',
        limit_choices_to={'role': 'PARENT'}
    )
    
    # Store current location coordinates if available
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'SOS Alert'
        verbose_name_plural = 'SOS Alerts'

    def __str__(self):
        student_name = self.student.username if self.student else "Unknown"
        return f"SOS Alert from {student_name} at {self.timestamp}"
