from django.urls import path
from . import views

app_name = 'core'

urlpatterns = [
    # Authentication APIs
    path('api/auth/student/register/', views.student_register, name='student-register'),
    path('api/auth/parent/register/', views.parent_register, name='parent-register'),
    path('api/auth/login/', views.login, name='login'),
    
    # Travel APIs
    path('api/travel/start/', views.travel_start, name='travel-start'),
    path('api/travel/stop/', views.travel_stop, name='travel-stop'),
    path('api/location/update/', views.location_update, name='location-update'),
    
    # SOS Alert APIs
    path('api/sos-alerts/', views.sos_alert_list_create, name='sos-alert-list-create'),
]

