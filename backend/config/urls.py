from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('django-admin/', admin.site.urls),
    path('api/', include('accounts.urls')),
    path('api/', include('projects.urls')),
    path('api/', include('plots.urls')),
    path('api/', include('attendance.urls')),
    path('api/', include('reports.urls')),
    path('api/', include('feedback.urls')),
    path('api/', include('todos.urls')),
    path('api/', include('tutorials.urls')),
    path('api/', include('achievements.urls')),
    path('api/', include('leaves.urls')),
    path('api/', include('notifications.urls')),
    path('api/', include('offers.urls')),
    path('api/', include('banners.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
