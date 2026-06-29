from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import (
    CustomUser,
    StudentParentLink,
    TravelSession,
    LiveLocation,
    SOSAlert
)


@admin.register(CustomUser)
class CustomUserAdmin(BaseUserAdmin):
    """Admin configuration for CustomUser"""
    list_display = ['username', 'email', 'role', 'invite_code', 'first_name', 'last_name', 'is_staff', 'date_joined']
    list_filter = ['role', 'is_staff', 'is_superuser', 'is_active', 'date_joined']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Additional Info', {'fields': ('role', 'invite_code')}),
        ('Safe Locations (Student only)', {
            'fields': ('home_latitude', 'home_longitude', 'safe_place_latitude', 'safe_place_longitude'),
            'classes': ('collapse',)
        }),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Additional Info', {'fields': ('role',)}),
    )


@admin.register(StudentParentLink)
class StudentParentLinkAdmin(admin.ModelAdmin):
    """Admin configuration for StudentParentLink"""
    list_display = ['id', 'student', 'parent', 'created_at']
    list_filter = ['created_at']
    search_fields = ['student__username', 'parent__username', 'student__email', 'parent__email']
    readonly_fields = ['created_at']
    date_hierarchy = 'created_at'


@admin.register(TravelSession)
class TravelSessionAdmin(admin.ModelAdmin):
    """Admin configuration for TravelSession"""
    list_display = ['id', 'student', 'start_time', 'end_time', 'is_active', 'duration']
    list_filter = ['is_active', 'start_time']
    search_fields = ['student__username', 'student__email']
    readonly_fields = ['start_time']
    date_hierarchy = 'start_time'
    
    def duration(self, obj):
        """Calculate duration if session is completed"""
        if obj.end_time and obj.start_time:
            delta = obj.end_time - obj.start_time
            return str(delta).split('.')[0]  # Remove microseconds
        return "Ongoing"
    duration.short_description = 'Duration'


@admin.register(LiveLocation)
class LiveLocationAdmin(admin.ModelAdmin):
    """Admin configuration for LiveLocation"""
    list_display = ['id', 'travel_session', 'latitude', 'longitude', 'timestamp']
    list_filter = ['timestamp']
    search_fields = ['travel_session__student__username']
    readonly_fields = ['timestamp']
    date_hierarchy = 'timestamp'


@admin.register(SOSAlert)
class SOSAlertAdmin(admin.ModelAdmin):
    """Admin configuration for SOSAlert - updated to work with new model structure"""
    list_display = ['id', 'student', 'travel_session', 'location', 'danger_level', 'is_active', 'timestamp']
    list_filter = ['danger_level', 'is_active', 'timestamp']
    search_fields = ['student__username', 'location', 'description']
    readonly_fields = ['timestamp']
    date_hierarchy = 'timestamp'
    fieldsets = (
        ('Alert Information', {
            'fields': ('student', 'travel_session', 'danger_level', 'is_active', 'timestamp')
        }),
        ('Location Details', {
            'fields': ('location', 'latitude', 'longitude', 'description')
        }),
    )

