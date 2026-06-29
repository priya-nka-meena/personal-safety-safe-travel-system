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

    path('api/parent/monitoring/', views.parent_monitoring, name='parent-monitoring'),
    path('api/parent/link-student/', views.parent_link_student, name='parent-link-student'),
    path('api/admin/overview/', views.admin_overview, name='admin-overview'),
]

