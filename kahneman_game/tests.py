import io
import json
import tempfile
import cv2
import numpy as np
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client, TestCase
from django.urls import reverse

from .vision_pipeline import (
    _annotate_pupil,
    _estimate_pupil,
    analyze_video,
    get_cascades,
    simulate_pupil_analysis,
)


class TestCognitiveViews(TestCase):
    def setUp(self):
        self.client = Client()

    def test_index_page_loads(self):
        response = self.client.get(reverse('index'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Thinking, Fast and Slow')
        self.assertContains(response, 'Chapter 2')
        self.assertContains(response, 'Attention and Effort')

    def test_health_check_endpoint(self):
        response = self.client.get(reverse('health_check'))
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn(data.get('status'), ['ok', 'degraded'])
        self.assertTrue(data.get('cascades_loaded'))

    def test_cognitive_benchmark_endpoint(self):
        response = self.client.get(reverse('cognitive_benchmark'))
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('tasks', data)
        self.assertIn('1', data['tasks'])
        self.assertIn('3', data['tasks'])
        self.assertEqual(data['tasks']['1']['name'], 'Add-1')
        self.assertEqual(data['tasks']['3']['name'], 'Add-3')
        self.assertIn('citation', data)

    def test_simulate_analysis_get(self):
        response = self.client.get(reverse('simulate_analysis') + '?level=2&elapsed=4.0')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['status'], 'ok')
        self.assertTrue(data['is_simulation'])
        self.assertIn('dilation_pct', data)
        self.assertIn('peak_dilation_pct', data)
        self.assertIn('eye_preview', data)
        self.assertTrue(data['eye_preview'].startswith('data:image/png;base64,'))

    def test_simulate_analysis_post(self):
        payload = json.dumps({'level': 3, 'elapsed': 5.0})
        response = self.client.post(
            reverse('simulate_analysis'),
            data=payload,
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['status'], 'ok')
        self.assertGreater(data['load_index'], 20.0)

    def test_analyze_video_missing_file(self):
        response = self.client.post(reverse('analyze_video'), data={})
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertIn('error', data)

    def test_analyze_video_with_synthetic_video(self):
        # Generate a mini in-memory video
        with tempfile.NamedTemporaryFile(suffix='.avi') as temp_vid:
            writer = cv2.VideoWriter(temp_vid.name, cv2.VideoWriter_fourcc(*'MJPG'), 10, (320, 240))
            for _ in range(8):
                frame = np.full((240, 320, 3), 120, dtype=np.uint8)
                writer.write(frame)
            writer.release()

            temp_vid.seek(0)
            video_bytes = temp_vid.read()

        uploaded = SimpleUploadedFile('test_clip.avi', video_bytes, content_type='video/avi')
        response = self.client.post(
            reverse('analyze_video'),
            data={'video': uploaded, 'level': 2},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['status'], 'ok')
        self.assertIn('load_index', data)
        self.assertIn('dilation_pct', data)

    def test_analyze_video_corrupt_file(self):
        bad_file = SimpleUploadedFile('bad.webm', b'not a real video file content', content_type='video/webm')
        response = self.client.post(
            reverse('analyze_video'),
            data={'video': bad_file},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['status'], 'failed')


class TestVisionPipeline(TestCase):
    def test_cascades_load(self):
        face_casc, eye_casc = get_cascades()
        self.assertIsNotNone(face_casc)
        self.assertIsNotNone(eye_casc)
        self.assertFalse(face_casc.empty())
        self.assertFalse(eye_casc.empty())

    def test_estimate_pupil_empty(self):
        self.assertIsNone(_estimate_pupil(np.array([])))
        self.assertIsNone(_estimate_pupil(np.zeros((5, 5, 3), dtype=np.uint8)))

    def test_estimate_pupil_synthetic_eye(self):
        # Create an eye crop: light sclera, darker iris, very dark center pupil
        crop = np.full((120, 120, 3), 220, dtype=np.uint8)
        cv2.circle(crop, (60, 60), 30, (80, 50, 40), -1)  # Iris
        cv2.circle(crop, (60, 60), 12, (10, 10, 10), -1)  # Dark pupil

        result = _estimate_pupil(crop)
        self.assertIsNotNone(result)
        (cx, cy), radius = result
        self.assertAlmostEqual(cx, 60.0, delta=6.0)
        self.assertAlmostEqual(cy, 60.0, delta=6.0)
        self.assertAlmostEqual(radius, 12.0, delta=5.0)

    def test_annotate_pupil(self):
        crop = np.zeros((60, 60, 3), dtype=np.uint8)
        annotated = _annotate_pupil(crop, ((30.0, 30.0), 8.0))
        self.assertEqual(annotated.shape, crop.shape)
        # Verify annotation modified pixels
        self.assertTrue(np.any(annotated != crop))

    def test_simulate_pupil_analysis(self):
        for lvl in [1, 2, 3, 4]:
            sim = simulate_pupil_analysis(level=lvl, elapsed_seconds=3.0)
            self.assertEqual(sim['status'], 'ok')
            self.assertGreaterEqual(sim['samples'], 18)
            self.assertIn('cognitive_tier', sim)
            self.assertIn('dilation_series', sim)
            self.assertEqual(len(sim['dilation_series']), sim['samples'])

    def test_analyze_video_nonexistent(self):
        res = analyze_video('non_existent_file.webm')
        self.assertEqual(res['status'], 'failed')


class TestKahnemanMathRules(TestCase):
    def test_add_n_digit_wrapping(self):
        # Kahneman Chapter 2: "Add the current level number to each digit. Digits wrap at 10."
        def solve(digits, level):
            return "".join(str((int(d) + level) % 10) for d in str(digits))

        # Add-1
        self.assertEqual(solve("5291", 1), "6302")
        self.assertEqual(solve("9999", 1), "0000")
        # Add-2
        self.assertEqual(solve("4819", 2), "6031")
        # Add-3
        self.assertEqual(solve("8924", 3), "1257")
        # Add-4
        self.assertEqual(solve("7890", 4), "1234")
