from django.db import models
from django.contrib.auth.models import User


class SOSAlert(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sos_alerts')
    location = models.CharField(max_length=255)
    description = models.TextField()
    danger_level = models.IntegerField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'SOS Alert'
        verbose_name_plural = 'SOS Alerts'

    def __str__(self):
        return f"SOS Alert from {self.user.username} at {self.timestamp}"
