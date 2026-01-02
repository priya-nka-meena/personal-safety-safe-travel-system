from django.urls import path
from . import views

app_name = 'core'

urlpatterns = [
    path('api/sos-alerts/', views.sos_alert_list_create, name='sos-alert-list-create'),
]

