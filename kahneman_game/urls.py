from django.urls import path

from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('api/analyze-video/', views.analyze_video, name='analyze_video'),
]
