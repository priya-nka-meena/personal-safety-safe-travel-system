from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import TemplateView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('core.urls')),
    path('', include('tracking.urls')),
]

# Serve the React application for frontend routes
urlpatterns += [
    re_path(
        r'^(?!api/|admin/|static/).*$',
        TemplateView.as_view(template_name='index.html'),
        name='react-app',
    ),
]