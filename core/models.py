from django.db import models
from django.contrib.auth.models import AbstractUser


class CustomUser(AbstractUser):
    """Custom user model with role field"""
    ROLE_CHOICES = [
        ('STUDENT', 'Student'),
        ('PARENT', 'Parent'),
    ]
    
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='STUDENT')
    
    # Safe location fields (for STUDENT role only)
    home_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    home_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    safe_place_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    safe_place_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    
    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'
    
    def __str__(self):
        return f"{self.username} ({self.role})"


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
    """Travel session for tracking student journeys"""
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
    """SOS Alert model - updated to use CustomUser and integrate with travel sessions"""
    student = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='sos_alerts',
        limit_choices_to={'role': 'STUDENT'},
        null=True,  # Temporarily nullable for migration - will be removed after data migration
        blank=True
    )
    travel_session = models.ForeignKey(
        TravelSession,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sos_alerts'
    )
    location = models.CharField(max_length=255)
    description = models.TextField()
    danger_level = models.IntegerField(default=3)  # Default to HIGH (3)
    timestamp = models.DateTimeField(auto_now_add=True)
    
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
