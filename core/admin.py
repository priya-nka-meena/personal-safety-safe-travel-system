from django.contrib import admin
from .models import SOSAlert


@admin.register(SOSAlert)
class SOSAlertAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'location', 'danger_level', 'timestamp']
    list_filter = ['danger_level', 'timestamp']
    search_fields = ['user__username', 'location', 'description']
    readonly_fields = ['timestamp']
    date_hierarchy = 'timestamp'

