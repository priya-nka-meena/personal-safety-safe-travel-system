from django.urls import path
from . import views

app_name = 'tracking'

urlpatterns = [
    # Session management
    path('api/tracking/sessions/start/', views.session_start, name='session-start'),
    path('api/tracking/sessions/<uuid:session_id>/location/', views.session_location_update, name='session-location-update'),
    path('api/tracking/sessions/<uuid:session_id>/end/', views.session_end, name='session-end'),
    
    # Session data retrieval
    path('api/tracking/sessions/<uuid:session_id>/', views.session_detail, name='session-detail'),
    path('api/tracking/sessions/<uuid:session_id>/history/', views.session_history, name='session-history'),
    path('api/tracking/sessions/<uuid:session_id>/distance/', views.session_distance, name='session-distance'),
]
