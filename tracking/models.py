from django.db import models
import uuid


class TravelSession(models.Model):
    """Travel session for tracking student journeys with enhanced features"""
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
    """Historical location points for a travel session"""
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
