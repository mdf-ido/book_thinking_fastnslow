import tempfile
from pathlib import Path

from django.conf import settings
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from django.views.decorators.http import require_POST

from .vision_pipeline import analyze_video as analyze_uploaded_video


@ensure_csrf_cookie
def index(request):
    return render(request, 'kahneman_game/index.html')


@csrf_protect
@require_POST
def analyze_video(request):
    uploaded = request.FILES.get('video')
    if uploaded is None:
        return JsonResponse({'error': 'No video file was uploaded.'}, status=400)

    upload_dir = Path(settings.BASE_DIR) / 'tmp_uploads'
    upload_dir.mkdir(exist_ok=True)

    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix='.webm', dir=upload_dir, delete=False) as temp_file:
            for chunk in uploaded.chunks():
                temp_file.write(chunk)
            temp_path = temp_file.name

        result = analyze_uploaded_video(temp_path)
        return JsonResponse(result)
    except Exception as exc:  # pragma: no cover - defensive JSON fallback for browser clients
        return JsonResponse(
            {
                'status': 'failed',
                'quality': 'unavailable',
                'message': f'Video analysis failed: {exc}',
                'load_index': 0.0,
                'dilation_pct': 0.0,
            },
            status=500,
        )
    finally:
        if temp_path and Path(temp_path).exists():
            Path(temp_path).unlink(missing_ok=True)
