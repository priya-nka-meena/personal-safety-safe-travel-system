from django.db import models
import uuid

# ==================== SYSTEM ARCHITECTURE ====================
# This system is organized into four core modules:
# 1. Student Live Tracking (dynamic GPS stream) - tracking.TravelSession, tracking.LocationHistory
# 2. Parent Home Location (static reference) - CustomUser.parent_home_latitude/longitude
# 3. SOS System (event-based emergency lifecycle) - core.SOSAlert with resolution fields
# 4. Travel History (time-series location logs) - core.LiveLocation (legacy), tracking.LocationHistory
# =============================================================


class TravelSession(models.Model):
    """
    MODULE 1: Student Live Tracking (dynamic GPS stream)
    Enhanced travel session model for real-time student tracking
    
    Features:
    - UUID-based primary key for security
    - Start/end location tracking
    - Current location updates
    - Session status management (ACTIVE, ENDED, EXPIRED)
    - Parent linkage for monitoring
    """
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('ENDED', 'Ended'),
        ('EXPIRED', 'Expired'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        'core.CustomUser',
        on_delete=models.CASCADE,
        related_name='tracking_sessions',
        limit_choices_to={'role': 'STUDENT'}
    )
    parent = models.ForeignKey(
        'core.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='monitored_sessions',
        limit_choices_to={'role': 'PARENT'}
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='ACTIVE')
    
    # Start location
    start_latitude = models.DecimalField(max_digits=9, decimal_places=6)
    start_longitude = models.DecimalField(max_digits=9, decimal_places=6)
    
    # Destination (optional)
    destination_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    destination_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    
    # Current location (updated during travel)
    current_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    current_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    
    # Human-readable location names (for travel history display)
    start_location_name = models.CharField(max_length=255, null=True, blank=True)
    destination_location_name = models.CharField(max_length=255, null=True, blank=True)
    
    # Journey statistics (calculated when session ends)
    total_distance = models.FloatField(null=True, blank=True, help_text='Total distance in kilometers')
    duration = models.DurationField(null=True, blank=True, help_text='Journey duration')
    
    # Timestamps
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    last_update_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Travel Session'
        verbose_name_plural = 'Travel Sessions'
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['student', 'status']),
            models.Index(fields=['status', 'last_update_at']),
        ]
    
    def __str__(self):
        return f"Session {self.id} - {self.student.username} ({self.status})"


class LocationHistory(models.Model):
    """
    MODULE 4: Travel History (time-series location logs)
    Historical location points for a travel session
    
    Features:
    - Time-series GPS coordinates
    - Accuracy metrics
    - Indexed for efficient querying
    """
    id = models.BigAutoField(primary_key=True)
    session = models.ForeignKey(
        TravelSession,
        on_delete=models.CASCADE,
        related_name='history'
    )
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    recorded_at = models.DateTimeField(auto_now_add=True)
    accuracy_meters = models.FloatField(null=True, blank=True)
    
    class Meta:
        verbose_name = 'Location History'
        verbose_name_plural = 'Location Histories'
        ordering = ['recorded_at']
        indexes = [
            models.Index(fields=['session', 'recorded_at']),
        ]
    
    def __str__(self):
        return f"Location at ({self.latitude}, {self.longitude}) - {self.recorded_at}"
