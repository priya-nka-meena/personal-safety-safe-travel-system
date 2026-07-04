from django.urls import path
from . import views

app_name = 'core'

urlpatterns = [
    # Authentication APIs
    path('api/auth/csrf/', views.auth_csrf, name='auth-csrf'),
    path('api/auth/logout/', views.logout_view, name='logout'),
    path('api/auth/student/register/', views.student_register, name='student-register'),
    path('api/auth/parent/register/', views.parent_register, name='parent-register'),
    path('api/auth/login/', views.login, name='login'),
    path('api/auth/me/', views.auth_me, name='auth-me'),
    
    # Travel APIs
    path('api/travel/start/', views.travel_start, name='travel-start'),
    path('api/travel/stop/', views.travel_stop, name='travel-stop'),
    path('api/travel/status/', views.travel_status, name='travel-status'),
    path('api/location/update/', views.location_update, name='location-update'),
    
    # SOS Alert APIs
    path('api/sos-alerts/', views.sos_alert_list_create, name='sos-alert-list-create'),
    path('api/sos-alerts/<int:alert_id>/resolve/', views.sos_alert_resolve, name='sos-alert-resolve'),
    path('api/sos-alerts/<int:alert_id>/cancel/', views.sos_alert_cancel, name='sos-alert-cancel'),
    path('api/sos-alerts/history/', views.sos_alert_history, name='sos-alert-history'),

    path('api/parent/monitoring/', views.parent_monitoring, name='parent-monitoring'),
    path('api/parent/link-student/', views.parent_link_student, name='parent-link-student'),
    path('api/parent/home-location/', views.parent_home_location, name='parent-home-location'),
    path('api/parent/update-location/', views.parent_update_location, name='parent-update-location'),
    path('api/parent/stop-sharing-location/', views.parent_stop_sharing_location, name='parent-stop-sharing-location'),
    path('api/parent/location/', views.parent_get_location, name='parent-get-location'),
    path('api/admin/overview/', views.admin_overview, name='admin-overview'),
]

