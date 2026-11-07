from django.urls import path

from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('api/health/', views.health_check, name='health_check'),
    path('api/benchmark/', views.cognitive_benchmark, name='cognitive_benchmark'),
    path('api/simulate-analysis/', views.simulate_analysis, name='simulate_analysis'),
    path('api/analyze-video/', views.analyze_video, name='analyze_video'),
]
