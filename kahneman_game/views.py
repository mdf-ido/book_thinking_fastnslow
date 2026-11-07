import json
import tempfile
from pathlib import Path

from django.conf import settings
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST, require_http_methods

from .vision_pipeline import (
    analyze_video as analyze_uploaded_video,
    get_cascades,
    simulate_pupil_analysis,
)


@ensure_csrf_cookie
def index(request):
    """Serve the interactive Chapter 2 Cognitive Pupillometry Lab."""
    context = {
        'title': 'Thinking, Fast and Slow · Chapter 2 Lab',
        'book_title': 'Thinking, Fast and Slow',
        'chapter': 'Chapter 2: Attention and Effort',
    }
    return render(request, 'kahneman_game/index.html', context)


@require_GET
def health_check(request):
    """Health and readiness check for containerized / Kubernetes environments."""
    face_casc, eye_casc = get_cascades()
    cascades_ready = face_casc is not None and eye_casc is not None

    return JsonResponse(
        {
            'status': 'ok' if cascades_ready else 'degraded',
            'service': 'kahneman-attention-and-effort-lab',
            'cascades_loaded': cascades_ready,
        },
        status=200 if cascades_ready else 503,
    )


@require_GET
def cognitive_benchmark(request):
    """
    Return Daniel Kahneman & Jackson Beatty's empirical 1966 pupillometry benchmark data.
    Provides ground truth reference lines for the visual telemetry charts.
    """
    benchmarks = {
        'tasks': {
            1: {
                'name': 'Add-1',
                'description': 'Add 1 to each of 4 digits in rhythm.',
                'mean_dilation_pct': 5.2,
                'peak_dilation_pct': 8.1,
                'cognitive_effort': 'Low to Moderate',
                'system': 'System 1 transition to light System 2',
            },
            2: {
                'name': 'Add-2',
                'description': 'Add 2 to each of 4 digits in rhythm.',
                'mean_dilation_pct': 9.8,
                'peak_dilation_pct': 14.2,
                'cognitive_effort': 'Moderate',
                'system': 'System 2 actively engaged',
            },
            3: {
                'name': 'Add-3',
                'description': 'Add 3 to each of 4 digits. Jackson Beatty & Kahneman classic experiment.',
                'mean_dilation_pct': 15.6,
                'peak_dilation_pct': 21.0,
                'cognitive_effort': 'High / Near Capacity',
                'system': 'System 2 near maximum working memory capacity',
            },
            4: {
                'name': 'Add-4 (Overload)',
                'description': 'Add 4 to each digit. Pushes working memory beyond 7±2 chunks.',
                'mean_dilation_pct': 18.0,
                'peak_dilation_pct': 24.5,
                'cognitive_effort': 'Cognitive Overload',
                'system': 'System 2 capacity exceeded; pupils plateau or contract suddenly',
            },
        },
        'citation': 'Beatty, J., & Kahneman, D. (1966). Pupillary changes in two memory tasks. Psychonomic Science, 5(10), 371-372.',
        'chapter': 'Thinking, Fast and Slow (Chapter 2: Attention and Effort)',
    }
    return JsonResponse(benchmarks)


@require_http_methods(['GET', 'POST'])
def simulate_analysis(request):
    """
    Generate synthetic pupillometric telemetry matching Kahneman's equations.
    Used for simulation mode when webcam is unavailable or for instant lab demos.
    """
    try:
        if request.method == 'POST' and request.content_type == 'application/json':
            body = json.loads(request.body.decode('utf-8'))
            level = int(body.get('level', 1))
            elapsed = float(body.get('elapsed', 3.2))
        else:
            level = int(request.GET.get('level', 1))
            elapsed = float(request.GET.get('elapsed', 3.2))
    except (ValueError, json.JSONDecodeError):
        level = 1
        elapsed = 3.2

    level = max(1, min(4, level))
    elapsed = max(0.5, min(15.0, elapsed))

    result = simulate_pupil_analysis(level=level, elapsed_seconds=elapsed)
    return JsonResponse(result)


@csrf_protect
@require_POST
def analyze_video(request):
    """
    Receive uploaded webcam video clip and run OpenCV pupillometry pipeline.
    """
    uploaded = request.FILES.get('video')
    if uploaded is None:
        return JsonResponse({'error': 'No video file was uploaded.'}, status=400)

    try:
        level = int(request.POST.get('level', 1))
    except (ValueError, TypeError):
        level = 1

    upload_dir = Path(settings.BASE_DIR) / 'tmp_uploads'
    upload_dir.mkdir(exist_ok=True)

    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix='.webm', dir=upload_dir, delete=False) as temp_file:
            for chunk in uploaded.chunks():
                temp_file.write(chunk)
            temp_path = temp_file.name

        result = analyze_uploaded_video(temp_path, level=level)
        return JsonResponse(result)
    except Exception as exc:
        return JsonResponse(
            {
                'status': 'failed',
                'quality': 'unavailable',
                'message': f'Video analysis failed: {exc}',
                'load_index': 0.0,
                'dilation_pct': 0.0,
                'peak_dilation_pct': 0.0,
                'samples': 0,
            },
            status=500,
        )
    finally:
        if temp_path and Path(temp_path).exists():
            Path(temp_path).unlink(missing_ok=True)
