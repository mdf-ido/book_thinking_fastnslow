import base64
import os
from typing import Any, Dict, List

import cv2
import numpy as np


def _encode_preview(crop: np.ndarray) -> str | None:
    if crop is None or crop.size == 0:
        return None

    crop = cv2.resize(crop, (180, 180), interpolation=cv2.INTER_AREA)
    encoded = cv2.imencode('.png', crop)[1]
    return 'data:image/png;base64,' + base64.b64encode(encoded.tobytes()).decode('ascii')


def _load_cascades():
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
    return face_cascade, eye_cascade


def _safe_float(value: float, default: float = 0.0) -> float:
    return float(value) if value is not None and np.isfinite(value) else default


def _estimate_pupil_radius(eye_crop: np.ndarray) -> float | None:
    if eye_crop.size == 0:
        return None

    gray = cv2.cvtColor(eye_crop, cv2.COLOR_BGR2GRAY) if eye_crop.ndim == 3 else eye_crop
    gray = cv2.equalizeHist(gray)

    _, binary = cv2.threshold(gray, 75, 255, cv2.THRESH_BINARY_INV)
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None

    largest = max(contours, key=cv2.contourArea)
    area = cv2.contourArea(largest)
    if area < 30:
        return None

    (x, y), radius = cv2.minEnclosingCircle(largest)
    if radius < 3:
        return None

    return float(radius)


def analyze_video(video_path: str | os.PathLike[str]) -> Dict[str, Any]:
    video_path = str(video_path)
    face_cascade, eye_cascade = _load_cascades()
    if face_cascade.empty() or eye_cascade.empty():
        return {
            'status': 'failed',
            'quality': 'unavailable',
            'message': 'OpenCV Haar cascades could not be loaded.',
            'load_index': 0.0,
            'dilation_pct': 0.0,
        }

    capture = cv2.VideoCapture(video_path)
    if not capture.isOpened():
        return {
            'status': 'failed',
            'quality': 'unavailable',
            'message': 'The uploaded video could not be opened.',
            'load_index': 0.0,
            'dilation_pct': 0.0,
        }

    radii: List[float] = []
    preview_crop: np.ndarray | None = None
    best_quality = -1.0
    frame_count = 0
    max_frames = 60

    while frame_count < max_frames:
        ok, frame = capture.read()
        if not ok:
            break

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60))
        if len(faces) == 0:
            frame_count += 1
            continue

        face = max(faces, key=lambda box: box[2] * box[3])
        x, y, w, h = [int(v) for v in face]
        face_roi = gray[y:y + h, x:x + w]
        eyes = eye_cascade.detectMultiScale(face_roi, scaleFactor=1.1, minNeighbors=5, minSize=(20, 20))
        if len(eyes) == 0:
            frame_count += 1
            continue

        eye_values: List[float] = []
        for ex, ey, ew, eh in sorted(eyes, key=lambda box: box[2] * box[3], reverse=True)[:2]:
            eye_crop = frame[y + ey:y + ey + eh, x + ex:x + ex + ew]
            if eye_crop.size == 0:
                continue
            radius = _estimate_pupil_radius(eye_crop)
            if radius is not None:
                eye_values.append(radius)
                if radius > best_quality:
                    best_quality = radius
                    preview_crop = eye_crop

        if eye_values:
            radii.extend(eye_values)

        frame_count += 1

    capture.release()

    if len(radii) < 3:
        return {
            'status': 'ok',
            'quality': 'poor',
            'message': 'A face and usable eye regions were not detected reliably in the clip.',
            'load_index': 10.0,
            'dilation_pct': 0.0,
            'samples': len(radii),
            'eye_preview': _encode_preview(preview_crop),
        }

    baseline_radius = float(np.median(radii[: min(10, len(radii))]))
    if baseline_radius <= 0:
        baseline_radius = float(np.mean(radii))

    dilation_values = [((radius / baseline_radius) - 1.0) * 100.0 for radius in radii]
    mean_dilation = float(np.mean(dilation_values))
    load_index = 12.0 + min(40.0, abs(mean_dilation) * 1.5)

    if len(radii) >= 25:
        quality = 'good'
    elif len(radii) >= 12:
        quality = 'fair'
    else:
        quality = 'weak'

    response = {
        'status': 'ok',
        'quality': quality,
        'message': 'Video clip analyzed successfully.',
        'load_index': round(_safe_float(load_index), 1),
        'dilation_pct': round(_safe_float(mean_dilation), 1),
        'baseline_pupil_px': round(_safe_float(baseline_radius), 2),
        'samples': len(radii),
        'dilation_series': [round(_safe_float(value), 2) for value in dilation_values],
        'eye_preview': _encode_preview(preview_crop),
    }
    return response
