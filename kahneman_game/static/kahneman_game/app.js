const levelValue = document.getElementById('level-value');
const scoreValue = document.getElementById('score-value');
const livesValue = document.getElementById('lives-value');
const promptValue = document.getElementById('prompt-value');
const answerForm = document.getElementById('answer-form');
const answerInput = document.getElementById('answer-input');
const messageBox = document.getElementById('message-box');
const cameraToggle = document.getElementById('camera-toggle');
const cameraPreview = document.getElementById('camera-preview');
const eyeAnalysisCanvas = document.getElementById('eye-analysis-canvas');
const cameraStatus = document.getElementById('camera-status');
const loadIndex = document.getElementById('load-index');
const retinaPreview = document.getElementById('retina-preview');
const analysisResult = document.getElementById('analysis-result');
const analysisLog = document.getElementById('analysis-log');
const attemptCounter = document.getElementById('attempt-counter');
const attemptThumbnails = document.getElementById('attempt-thumbnails');
const dilationChart = document.getElementById('dilation-chart');

const state = {
  level: 1,
  score: 0,
  lives: 3,
  currentDigits: [],
  stream: null,
  faceLandmarker: null,
  faceDetector: null,
  mediaRecorder: null,
  recording: false,
  animationFrameId: null,
  isTracking: false,
  eyeValidationPassed: false,
  detectionAttempts: 0,
  detectionTimeoutId: null,
  demoMode: false,
  analysisContext: null,
  retinaContext: null,
  dilationHistory: [],
  baselinePupilRadius: null,
  currentDilationSignal: 0,
  analysisLog: [],
  lastAnalysisLogFrame: 0,
  roundRecordingTimeoutId: null,
  levelAttempts: Array(4).fill(null),
  levelAttemptIndex: 0,
};

function randomDigits() {
  return Array.from({ length: 4 }, () => Math.floor(Math.random() * 10));
}

function createPrompt() {
  state.currentDigits = randomDigits();
  promptValue.textContent = state.currentDigits.join('');
  answerInput.value = '';
  answerInput.focus();
}

function setMessage(text, type = 'info') {
  messageBox.textContent = text;
  messageBox.className = `message-box ${type}`;
}

function updateHud() {
  levelValue.textContent = state.level;
  scoreValue.textContent = state.score;
  livesValue.textContent = state.lives;
}

function setAnalysisResult(message, tone = 'info') {
  if (!analysisResult) {
    return;
  }

  analysisResult.textContent = message;
  analysisResult.className = `analysis-result ${tone}`;
}

function getCsrfToken() {
  const cookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith('csrftoken='));

  return cookie ? decodeURIComponent(cookie.split('=')[1]) : '';
}

function appendAnalysisLog(message) {
  if (!analysisLog) {
    return;
  }

  const stamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const entry = `[${stamp}] ${message}`;

  state.analysisLog.unshift(entry);
  state.analysisLog = state.analysisLog.slice(0, 8);

  analysisLog.innerHTML = '';
  state.analysisLog.forEach((line) => {
    const item = document.createElement('div');
    item.className = 'analysis-log-entry';
    item.textContent = line;
    analysisLog.appendChild(item);
  });
}

function resetWorkflowLogs() {
  state.analysisLog = [];
  appendAnalysisLog('Current workflow: camera access -> round recording -> backend analysis');
  appendAnalysisLog('Recording begins when each challenge starts and ends when the user answers.');
}

function updateAttemptCounter() {
  if (!attemptCounter) {
    return;
  }

  const filled = state.levelAttempts.filter(Boolean).length;
  attemptCounter.textContent = `${filled} / 4`;
}

function resetLevelAttempts() {
  state.levelAttempts = Array(4).fill(null);
  state.levelAttemptIndex = 0;
  updateAttemptCounter();
  renderAttemptGrid();
  drawDilationChart();
}

function renderAttemptGrid() {
  if (!attemptThumbnails) {
    return;
  }

  attemptThumbnails.innerHTML = '';

  for (let index = 0; index < 4; index += 1) {
    const entry = state.levelAttempts[index] || null;
    const card = document.createElement('div');
    card.className = `attempt-card ${entry ? 'filled' : 'empty'}`;

    if (entry && entry.eyePreview) {
      const image = document.createElement('img');
      image.className = 'attempt-thumb';
      image.src = entry.eyePreview;
      image.alt = `Attempt ${index + 1} eye crop`;
      image.loading = 'lazy';
      card.appendChild(image);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'attempt-thumb placeholder';
      placeholder.textContent = entry ? 'No crop' : 'Waiting';
      card.appendChild(placeholder);
    }

    const meta = document.createElement('div');
    meta.className = 'attempt-meta';
    const label = document.createElement('strong');
    label.textContent = entry ? `Try ${index + 1}` : `Try ${index + 1}`;

    const value = document.createElement('span');
    value.textContent = entry ? `${entry.dilationPct.toFixed(1)}% dilation` : 'pending';

    meta.appendChild(label);
    meta.appendChild(value);
    card.appendChild(meta);
    attemptThumbnails.appendChild(card);
  }

  updateAttemptCounter();
}

function drawDilationChart() {
  if (!dilationChart) {
    return;
  }

  const ctx = dilationChart.getContext('2d');
  const width = dilationChart.width;
  const height = dilationChart.height;
  ctx.clearRect(0, 0, width, height);

  const values = state.levelAttempts.flatMap((entry) => Array.isArray(entry.dilationSeries) && entry.dilationSeries.length > 0
    ? entry.dilationSeries
    : [entry.dilationPct]);

  if (!values.length) {
    ctx.fillStyle = '#9fb3d9';
    ctx.font = '12px sans-serif';
    ctx.fillText('No dilation data yet', 14, 20);
    return;
  }

  const min = Math.min(...values, -20);
  const max = Math.max(...values, 20);
  const range = Math.max(max - min, 1);
  const padding = 16;

  ctx.strokeStyle = 'rgba(125, 211, 252, 0.3)';
  ctx.lineWidth = 1;
  for (let line = 0; line <= 3; line += 1) {
    const y = padding + ((height - padding * 2) / 3) * line;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
  }

  ctx.beginPath();
  values.forEach((value, index) => {
    const x = padding + (index / Math.max(values.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.strokeStyle = '#7dd3fc';
  ctx.lineWidth = 2.25;
  ctx.stroke();
}

function recordAttemptResult(payload) {
  if (!payload || Object.keys(payload).length === 0) {
    return;
  }

  const attemptSlot = Math.min(Math.max(state.levelAttemptIndex - 1, 0), 3);
  const attempt = {
    eyePreview: payload.eye_preview || '',
    dilationPct: Number.isFinite(Number(payload.dilation_pct)) ? Number(payload.dilation_pct) : 0,
    loadIndex: Number.isFinite(Number(payload.load_index)) ? Number(payload.load_index) : 0,
    quality: payload.quality || 'unknown',
    samples: Number(payload.samples) || 0,
    dilationSeries: Array.isArray(payload.dilation_series)
      ? payload.dilation_series.filter((value) => Number.isFinite(Number(value))).map((value) => Number(value))
      : [Number.isFinite(Number(payload.dilation_pct)) ? Number(payload.dilation_pct) : 0],
  };

  state.levelAttempts[attemptSlot] = attempt;
  updateAttemptCounter();
  renderAttemptGrid();
  drawDilationChart();
}

function calculateExpectedAnswer() {
  return state.currentDigits.map((digit) => (digit + state.level) % 10).join('');
}

function stopRoundRecording() {
  if (state.roundRecordingTimeoutId) {
    clearTimeout(state.roundRecordingTimeoutId);
    state.roundRecordingTimeoutId = null;
  }

  if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
    appendAnalysisLog('Stopping round recording and uploading the clip for analysis.');
    state.mediaRecorder.stop();
  } else {
    state.recording = false;
  }
}

function beginRoundRecording() {
  if (!state.stream || !cameraPreview || state.recording || !window.MediaRecorder) {
    return;
  }

  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
      ? 'video/webm;codecs=vp8'
      : 'video/webm';

  const chunks = [];
  const recorder = new MediaRecorder(state.stream, { mimeType });
  state.mediaRecorder = recorder;
  state.recording = true;

  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  recorder.onstop = async () => {
    state.recording = false;
    const blob = new Blob(chunks, { type: mimeType });
    const formData = new FormData();
    formData.append('video', blob, 'round-capture.webm');

    try {
      setAnalysisResult('Uploading and analyzing the round clip...', 'info');
      appendAnalysisLog('Sending the captured round clip to the Django analysis endpoint.');

      const response = await fetch('/api/analyze-video/', {
        method: 'POST',
        body: formData,
        credentials: 'same-origin',
        headers: {
          'X-CSRFToken': getCsrfToken(),
        },
      });

      const text = await response.text();
      let payload = {};
      if (text) {
        try {
          payload = JSON.parse(text);
        } catch (error) {
          throw new Error(`Server returned a non-JSON response: ${text.slice(0, 180)}`);
        }
      }

      if (!response.ok) {
        throw new Error(payload.error || 'The round video could not be analyzed.');
      }

      const summary = payload.message || 'Analysis complete.';
      const tone = payload.quality === 'good' || payload.quality === 'fair' ? 'success' : 'info';
      if (payload.eye_preview) {
        renderRetinaPreviewFromDataUrl(payload.eye_preview);
      }
      recordAttemptResult(payload);
      setAnalysisResult(
        `${summary} Quality: ${payload.quality}. Dilation: ${payload.dilation_pct}% • Load: ${payload.load_index}.`,
        tone
      );
      appendAnalysisLog(
        `Analysis ready quality=${payload.quality} dilation=${payload.dilation_pct}% load=${payload.load_index} samples=${payload.samples} eyePreview=${Boolean(payload.eye_preview)}`
      );
    } catch (error) {
      console.error('Video upload analysis failed:', error);
      setAnalysisResult(error.message || 'Video analysis failed.', 'error');
      appendAnalysisLog(`Upload error: ${error.message || String(error)}`);
    }
  };

  recorder.onerror = (event) => {
    state.recording = false;
    console.error('MediaRecorder error:', event);
    setAnalysisResult('Recording failed before the round clip could be analyzed.', 'error');
    appendAnalysisLog('MediaRecorder reported an error while capturing the round clip.');
  };

  recorder.start();
  appendAnalysisLog('Round recording started for the current challenge.');
  cameraStatus.textContent = 'Recording round clip';

  if (state.roundRecordingTimeoutId) {
    clearTimeout(state.roundRecordingTimeoutId);
  }
  state.roundRecordingTimeoutId = setTimeout(() => {
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
  }, 8000);
}

function startRound() {
  state.levelAttemptIndex += 1;
  createPrompt();
  if (state.stream && cameraPreview && !state.recording) {
    beginRoundRecording();
  }
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function averagePoint(points) {
  if (!points || points.length === 0) {
    return null;
  }

  const total = points.reduce(
    (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
    { x: 0, y: 0 }
  );

  return {
    x: total.x / points.length,
    y: total.y / points.length,
  };
}

function getFaceBounds(landmarks) {
  if (!landmarks || landmarks.length === 0) return null;

  const xs = landmarks.map((point) => point.x);
  const ys = landmarks.map((point) => point.y);

  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
    center: {
      x: (Math.min(...xs) + Math.max(...xs)) / 2,
      y: (Math.min(...ys) + Math.max(...ys)) / 2,
    },
  };
}

function applyCameraZoom(landmarks) {
  if (!cameraPreview) return;

  const faceBounds = getFaceBounds(landmarks);
  if (!faceBounds) {
    cameraPreview.style.transform = 'scale(1)';
    cameraPreview.style.transformOrigin = 'center center';
    return;
  }

  const zoomLevel = faceBounds.width < 0.25 ? 1.8 : faceBounds.width < 0.4 ? 1.45 : 1.15;
  cameraPreview.style.transformOrigin = `${(faceBounds.center.x * 100).toFixed(0)}% ${(faceBounds.center.y * 100).toFixed(0)}%`;
  cameraPreview.style.transform = `scale(${zoomLevel})`;

  const videoTrack = state.stream && state.stream.getVideoTracks ? state.stream.getVideoTracks()[0] : null;
  if (videoTrack && typeof videoTrack.applyConstraints === 'function') {
    const capabilities = videoTrack.getCapabilities ? videoTrack.getCapabilities() : {};
    if (capabilities.zoom) {
      const minZoom = capabilities.zoom.min || 1;
      const maxZoom = capabilities.zoom.max || 2;
      const safeZoom = Math.min(Math.max(zoomLevel, minZoom), maxZoom);
      videoTrack.applyConstraints({ advanced: [{ zoom: safeZoom }] }).catch((error) => {
        console.warn('Camera zoom constraint not supported or rejected:', error);
      });
    }
  }
}

function getEyeMetrics(landmarks) {
  if (!landmarks || landmarks.length < 200) {
    return null;
  }

  const leftEyeTop = landmarks[159];
  const leftEyeBottom = landmarks[145];
  const leftEyeLeft = landmarks[33];
  const leftEyeRight = landmarks[133];
  const rightEyeTop = landmarks[386];
  const rightEyeBottom = landmarks[374];
  const rightEyeLeft = landmarks[362];
  const rightEyeRight = landmarks[263];

  const leftEyeCenter = averagePoint([landmarks[468], landmarks[469], landmarks[470], landmarks[471], landmarks[472], landmarks[473]]);
  const rightEyeCenter = averagePoint([landmarks[473], landmarks[474], landmarks[475], landmarks[476], landmarks[477], landmarks[478], landmarks[479]]);

  const leftHeight = distance(leftEyeTop, leftEyeBottom);
  const leftWidth = distance(leftEyeLeft, leftEyeRight);
  const rightHeight = distance(rightEyeTop, rightEyeBottom);
  const rightWidth = distance(rightEyeLeft, rightEyeRight);

  if (!leftEyeCenter || !rightEyeCenter) {
    return null;
  }

  return {
    leftEyeCenter,
    rightEyeCenter,
    leftEyeHeight: leftHeight,
    leftEyeWidth: leftWidth,
    rightEyeHeight: rightHeight,
    rightEyeWidth: rightWidth,
  };
}

function getDetectionQuality(landmarks) {
  if (!landmarks || landmarks.length < 200) {
    return { score: 0, label: 'no face' };
  }

  const leftRoi = getEyeRoi(landmarks, 'left');
  const rightRoi = getEyeRoi(landmarks, 'right');

  const faceBounds = getFaceBounds(landmarks);
  const metrics = getEyeMetrics(landmarks);

  let score = 0;
  if (faceBounds) score += 30;
  if (metrics) score += 25;
  if (leftRoi) score += 20;
  if (rightRoi) score += 20;
  if (faceBounds && faceBounds.width > 0.2 && faceBounds.width < 0.7) score += 5;

  if (score >= 85) return { score, label: 'good' };
  if (score >= 60) return { score, label: 'fair' };
  if (score >= 30) return { score, label: 'weak' };
  return { score, label: 'poor' };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeSignal(value, min = -100, max = 100) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const span = max - min || 1;
  return clamp(((value - min) / span) * 100, 0, 100);
}

function computeDilationSignalFromLandmarks(landmarks) {
  const leftRoi = getEyeRoi(landmarks, 'left');
  const rightRoi = getEyeRoi(landmarks, 'right');

  if (!leftRoi && !rightRoi) {
    return null;
  }

  const roiSamples = [leftRoi, rightRoi]
    .filter(Boolean)
    .map((roi) => estimatePupilFromRoi(roi))
    .filter(Boolean);

  if (roiSamples.length === 0) {
    return null;
  }

  const avgRadius = roiSamples.reduce((sum, sample) => sum + sample.spread, 0) / roiSamples.length;
  const avgIrisRatio = roiSamples.reduce((sum, sample) => sum + sample.irisRatio, 0) / roiSamples.length;

  if (!Number.isFinite(avgRadius) || avgRadius <= 0) {
    return null;
  }

  if (state.baselinePupilRadius === null) {
    state.baselinePupilRadius = avgRadius;
  }

  const relativeChange = ((avgRadius / state.baselinePupilRadius) - 1) * 100;
  const normalizedOffset = (relativeChange * 0.6) + ((avgIrisRatio - 0.5) * 80);
  state.dilationHistory.push(normalizedOffset);

  if (state.dilationHistory.length > 25) {
    state.dilationHistory.shift();
  }

  const smoothed = state.dilationHistory.reduce((sum, value) => sum + value, 0) / state.dilationHistory.length;
  state.currentDilationSignal = clamp(smoothed, -50, 50);
  return state.currentDilationSignal;
}

function ensureAnalysisContext() {
  if (!eyeAnalysisCanvas) {
    return null;
  }

  if (!state.analysisContext) {
    state.analysisContext = eyeAnalysisCanvas.getContext('2d', { willReadFrequently: true });
  }

  return state.analysisContext;
}

function ensureRetinaContext() {
  if (!retinaPreview) {
    return null;
  }

  if (!state.retinaContext) {
    state.retinaContext = retinaPreview.getContext('2d');
  }

  return state.retinaContext;
}

function renderRetinaPreview(landmarks) {
  const ctx = ensureRetinaContext();
  if (!ctx || !cameraPreview || !cameraPreview.videoWidth || !cameraPreview.videoHeight) {
    return;
  }

  const roi = getEyeRoi(landmarks, 'left') || getEyeRoi(landmarks, 'right');
  if (!roi) {
    retinaPreview.style.display = 'none';
    return;
  }

  const width = cameraPreview.videoWidth;
  const height = cameraPreview.videoHeight;
  const cropPaddingX = roi.width * width * 0.7;
  const cropPaddingY = roi.height * height * 0.7;
  const cropX = Math.max(0, Math.floor((roi.x * width) - cropPaddingX));
  const cropY = Math.max(0, Math.floor((roi.y * height) - cropPaddingY));
  const cropW = Math.min(width - cropX, Math.ceil((roi.width * width) + cropPaddingX * 2));
  const cropH = Math.min(height - cropY, Math.ceil((roi.height * height) + cropPaddingY * 2));

  retinaPreview.width = 180;
  retinaPreview.height = 180;
  retinaPreview.style.display = 'block';
  ctx.clearRect(0, 0, retinaPreview.width, retinaPreview.height);
  ctx.fillStyle = '#020914';
  ctx.fillRect(0, 0, retinaPreview.width, retinaPreview.height);
  ctx.drawImage(cameraPreview, cropX, cropY, cropW, cropH, 0, 0, retinaPreview.width, retinaPreview.height);

  const pupil = estimatePupilFromRoi(roi);
  if (pupil) {
    const px = (pupil.centerX / cropW) * retinaPreview.width;
    const py = (pupil.centerY / cropH) * retinaPreview.height;
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px, py, Math.max(8, pupil.spread * 0.8), 0, Math.PI * 2);
    ctx.stroke();
  }
}

function renderRetinaPreviewFromDataUrl(dataUrl) {
  if (!retinaPreview || !dataUrl) {
    return;
  }

  const ctx = ensureRetinaContext();
  if (!ctx) {
    return;
  }

  const image = new Image();
  image.onload = () => {
    retinaPreview.width = 180;
    retinaPreview.height = 180;
    retinaPreview.style.display = 'block';
    ctx.clearRect(0, 0, retinaPreview.width, retinaPreview.height);
    ctx.drawImage(image, 0, 0, retinaPreview.width, retinaPreview.height);
  };
  image.src = dataUrl;
}

function drawEyeAnalysis(landmarks) {
  const ctx = ensureAnalysisContext();
  if (!ctx || !cameraPreview || !cameraPreview.videoWidth || !cameraPreview.videoHeight) {
    return;
  }

  if (eyeAnalysisCanvas.style.display !== 'block') {
    eyeAnalysisCanvas.style.display = 'block';
  }

  const canvasWidth = cameraPreview.videoWidth;
  const canvasHeight = cameraPreview.videoHeight;
  eyeAnalysisCanvas.width = canvasWidth;
  eyeAnalysisCanvas.height = canvasHeight;

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.drawImage(cameraPreview, 0, 0, canvasWidth, canvasHeight);

  const leftRoi = getEyeRoi(landmarks, 'left');
  const rightRoi = getEyeRoi(landmarks, 'right');

  [
    { roi: leftRoi, color: '#00e5ff', label: 'L' },
    { roi: rightRoi, color: '#fbbf24', label: 'R' },
  ].forEach(({ roi, color, label }) => {
    if (!roi) return;

    const x = roi.x * canvasWidth;
    const y = roi.y * canvasHeight;
    const width = roi.width * canvasWidth;
    const height = roi.height * canvasHeight;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);

    const pupil = estimatePupilFromRoi(roi);
    if (pupil) {
      const centerX = (roi.centerX * canvasWidth) + 0.5;
      const centerY = (roi.centerY * canvasHeight) + 0.5;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(centerX, centerY, Math.max(4, pupil.spread * 0.5), 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = '12px sans-serif';
      ctx.fillText(label, centerX + 8, centerY - 8);
    }
  });

  renderRetinaPreview(landmarks);

  const detectionSummary = [
    leftRoi ? 'left eye ok' : 'left eye missing',
    rightRoi ? 'right eye ok' : 'right eye missing',
  ].join(' • ');

  cameraStatus.textContent = detectionSummary;
}

function getEyeRoi(landmarks, side) {
  if (!landmarks || landmarks.length < 200) {
    return null;
  }

  const eyeIndices = side === 'left'
    ? [33, 133, 159, 145]
    : [362, 263, 386, 374];

  const points = eyeIndices.map((index) => landmarks[index]).filter(Boolean);
  if (points.length < 4) {
    return null;
  }

  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
}

function estimatePupilFromRoi(roi) {
  const ctx = ensureAnalysisContext();
  if (!ctx || !cameraPreview || !cameraPreview.videoWidth || !cameraPreview.videoHeight) {
    return null;
  }

  const width = cameraPreview.videoWidth;
  const height = cameraPreview.videoHeight;
  const cropX = Math.max(0, Math.floor(roi.x * width - roi.width * width * 0.35));
  const cropY = Math.max(0, Math.floor(roi.y * height - roi.height * height * 0.35));
  const cropW = Math.min(width - cropX, Math.ceil((roi.width * width + roi.width * width * 0.7)));
  const cropH = Math.min(height - cropY, Math.ceil((roi.height * height + roi.height * height * 0.7)));

  if (cropW < 10 || cropH < 10) {
    return null;
  }

  const tempCanvas = eyeAnalysisCanvas;
  tempCanvas.width = cropW;
  tempCanvas.height = cropH;
  ctx.clearRect(0, 0, cropW, cropH);
  ctx.drawImage(cameraPreview, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

  const imageData = ctx.getImageData(0, 0, cropW, cropH);
  const { data } = imageData;

  let darkPixels = 0;
  let darkX = 0;
  let darkY = 0;
  let minLuma = 255;
  let maxLuma = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    minLuma = Math.min(minLuma, luma);
    maxLuma = Math.max(maxLuma, luma);

    if (luma < 110) {
      darkPixels += 1;
      darkX += (i / 4) % cropW;
      darkY += Math.floor((i / 4) / cropW);
    }
  }

  if (darkPixels < 20) {
    return null;
  }

  const centerX = darkX / darkPixels;
  const centerY = darkY / darkPixels;
  const spread = Math.max(4, Math.sqrt(darkPixels / Math.PI));
  const irisRatio = Math.min(1.0, (spread / Math.max(10, cropW * 0.28)) * 2.2);

  return {
    centerX,
    centerY,
    darkPixels,
    spread,
    irisRatio,
    minLuma,
    maxLuma,
  };
}

function getEyePupilEstimate(landmarks) {
  const leftRoi = getEyeRoi(landmarks, 'left');
  const rightRoi = getEyeRoi(landmarks, 'right');

  if (!leftRoi && !rightRoi) {
    return 0;
  }

  const estimates = [leftRoi && estimatePupilFromRoi(leftRoi), rightRoi && estimatePupilFromRoi(rightRoi)]
    .filter(Boolean);

  if (estimates.length === 0) {
    return 0;
  }

  return estimates.reduce((sum, estimate) => sum + estimate.irisRatio, 0) / estimates.length;
}

function getEyeLoadEstimate(landmarks) {
  const metrics = getEyeMetrics(landmarks);
  if (!metrics) {
    return 0;
  }

  const leftRatio = metrics.leftEyeHeight / (metrics.leftEyeWidth || 0.0001);
  const rightRatio = metrics.rightEyeHeight / (metrics.rightEyeWidth || 0.0001);
  const avgEyeRatio = (leftRatio + rightRatio) / 2;
  const pupilEstimate = getEyePupilEstimate(landmarks);
  const dilationSignal = computeDilationSignalFromLandmarks(landmarks) ?? 0;
  const normalizedDilation = normalizeSignal(dilationSignal, -20, 20);
  const combinedRatio = (avgEyeRatio * 50 + pupilEstimate * 50 + normalizedDilation) / 2;
  const normalizedValue = Math.max(0, Math.min(100, combinedRatio));
  return Number(normalizedValue.toFixed(1));
}

function getMediaPipeClasses() {
  const resolver = window.FilesetResolver || (window.Vision && window.Vision.FilesetResolver);
  const faceLandmarker = window.FaceLandmarker || (window.Vision && window.Vision.FaceLandmarker);
  return { resolver, faceLandmarker };
}

function getBrowserFaceDetector() {
  if (typeof FaceDetector === 'function') {
    return FaceDetector;
  }
  return null;
}

async function initializeBrowserFaceDetector() {
  const FaceDetectorClass = getBrowserFaceDetector();
  if (!FaceDetectorClass) {
    appendAnalysisLog('browser native FaceDetector API unavailable; falling back to MediaPipe only');
    return false;
  }

  try {
    state.faceDetector = new FaceDetectorClass({
      fastMode: true,
      maxDetectedFaces: 1,
      filterBoxBlur: 0.3,
    });
    appendAnalysisLog('browser native FaceDetector API initialized');
    return true;
  } catch (error) {
    appendAnalysisLog(`browser FaceDetector API failed to initialize: ${error && error.message ? error.message : String(error)}`);
    return false;
  }
}

const MEDIA_PIPE_WASM_BASE = '/static/kahneman_game/mediapipe/wasm/';

async function initializeFaceTracking() {
  const { resolver, faceLandmarker } = getMediaPipeClasses();

  if (!resolver || !faceLandmarker) {
    console.error('MediaPipe classes missing:', { resolver, faceLandmarker, windowVision: !!(window.Vision) });
    setMessage('MediaPipe failed to load. Webcam tracking is unavailable in this browser.', 'error');
    return false;
  }

  try {
    const vision = await resolver.forVisionTasks(MEDIA_PIPE_WASM_BASE);

    const commonOptions = {
      baseOptions: {
        modelAssetPath: '/static/kahneman_game/mediapipe/face_landmarker.task',
        delegate: 'CPU',
      },
      runningMode: 'VIDEO',
      numFaces: 1,
    };

    state.faceLandmarker = await faceLandmarker.createFromOptions(vision, commonOptions);
    appendAnalysisLog('MediaPipe face landmarker initialized successfully');
    await initializeBrowserFaceDetector();
    return true;
  } catch (error) {
    console.error('Face tracking initialization failed:', error);
    try {
      const vision = await resolver.forVisionTasks(MEDIA_PIPE_WASM_BASE);
      state.faceLandmarker = await faceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: '/static/kahneman_game/mediapipe/face_landmarker.task',
          delegate: 'CPU',
        },
        runningMode: 'VIDEO',
        numFaces: 1,
      });
      return true;
    } catch (fallbackError) {
      console.error('Fallback face tracking initialization failed:', fallbackError);
      setMessage('Face tracking could not initialize. Please center your face in the camera and try again.', 'error');
      return false;
    }
  }
}

function stopFaceLoop() {
  if (state.animationFrameId) {
    cancelAnimationFrame(state.animationFrameId);
    state.animationFrameId = null;
  }
  if (state.detectionTimeoutId) {
    clearTimeout(state.detectionTimeoutId);
    state.detectionTimeoutId = null;
  }
  state.isTracking = false;
  state.detectionAttempts = 0;
}

function validateEyeTracking() {
  if (!state.faceLandmarker || !cameraPreview || !state.stream) {
    return false;
  }

  try {
    const result = state.faceLandmarker.detectForVideo(cameraPreview, performance.now());
    if (!result.landmarks || result.landmarks.length === 0) {
      return false;
    }

    const faceLandmarks = result.landmarks[0];
    const faceBounds = getFaceBounds(faceLandmarks);
    const leftRoi = getEyeRoi(faceLandmarks, 'left');
    const rightRoi = getEyeRoi(faceLandmarks, 'right');
    const metrics = getEyeMetrics(faceLandmarks);

    if (!faceBounds || !metrics) {
      return false;
    }

    const hasUsableEye = Boolean(leftRoi || rightRoi);
    const faceIsLargeEnough = faceBounds.width > 0.12 && faceBounds.height > 0.12;
    return hasUsableEye && faceIsLargeEnough;
  } catch (error) {
    console.warn('Eye validation failed:', error);
    return false;
  }
}

function startFaceLoop() {
  if (state.isTracking || !state.faceLandmarker || !cameraPreview.videoWidth) {
    return;
  }

  state.isTracking = true;

  const detectFrame = () => {
    if (!state.isTracking || !state.faceLandmarker || state.stream === null) {
      return;
    }

    const result = state.faceLandmarker.detectForVideo(cameraPreview, performance.now());
    if (result.landmarks && result.landmarks.length > 0) {
      const faceLandmarks = result.landmarks[0];
      const metrics = getEyeMetrics(faceLandmarks);
      const quality = getDetectionQuality(faceLandmarks);
      if (metrics) {
        drawEyeAnalysis(faceLandmarks);
        applyCameraZoom(faceLandmarks);

        const dilationSignal = computeDilationSignalFromLandmarks(faceLandmarks) ?? 0;
        const loadValue = getEyeLoadEstimate(faceLandmarks);
        const mappedLoad = 10 + state.level * 4 + loadValue * 0.3;
        const normalizedDilation = normalizeSignal(dilationSignal, -20, 20);

        loadIndex.textContent = `Load index: ${mappedLoad.toFixed(1)} • dilation ${normalizedDilation.toFixed(0)}%`;
        state.eyeValidationPassed = true;
        cameraStatus.textContent = `Tracking face and pupil • quality ${quality.label} (${quality.score}) • dilation ${dilationSignal.toFixed(1)}%`;

        const leftArea = metrics.leftEyeHeight * metrics.leftEyeWidth;
        const rightArea = metrics.rightEyeHeight * metrics.rightEyeWidth;
        const summary = {
          quality: quality.label,
          score: quality.score,
          leftArea: leftArea.toFixed(3),
          rightArea: rightArea.toFixed(3),
          dilation: dilationSignal.toFixed(1),
          normalizedDilation: normalizedDilation.toFixed(0),
          load: mappedLoad.toFixed(1),
        };

        appendAnalysisLog(
          `face=${summary.quality}/${summary.score} leftArea=${summary.leftArea} rightArea=${summary.rightArea} dilation=${summary.dilation}% normalized=${summary.normalizedDilation}% load=${summary.load}`
        );
      } else {
        const leftRoi = getEyeRoi(faceLandmarks, 'left');
        const rightRoi = getEyeRoi(faceLandmarks, 'right');
        drawEyeAnalysis(faceLandmarks);
        cameraStatus.textContent = leftRoi || rightRoi
          ? `Eye landmarks partial • quality ${quality.label} (${quality.score})`
          : `Adjusting camera focus • quality ${quality.label} (${quality.score})`;
        appendAnalysisLog(`partial face detection quality=${quality.label}/${quality.score} leftRoi=${Boolean(leftRoi)} rightRoi=${Boolean(rightRoi)}`);
      }
    } else {
      cameraPreview.style.transform = 'scale(1)';
      cameraPreview.style.transformOrigin = 'center center';
      cameraStatus.textContent = 'Searching for face • quality poor (0)';
      appendAnalysisLog('no face landmarks detected in current frame');
    }

    state.animationFrameId = requestAnimationFrame(detectFrame);
  };

  detectFrame();
}

async function enableCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    setMessage('This browser does not support webcam access.', 'error');
    appendAnalysisLog('This browser does not support navigator.mediaDevices.getUserMedia.');
    return;
  }

  try {
    if (navigator.permissions && navigator.permissions.query) {
      const cameraPermission = await navigator.permissions.query({ name: 'camera' }).catch(() => null);
      appendAnalysisLog(`Camera permission state=${cameraPermission ? cameraPermission.state : 'unknown'}`);
    }

    cameraStatus.textContent = 'Requesting camera access...';
    setMessage('Camera is being enabled for the current challenge cycle.', 'info');
    appendAnalysisLog('Requesting webcam access via getUserMedia().');

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false,
    });

    state.stream = stream;
    appendAnalysisLog('Webcam access granted. The browser is ready to record each challenge round.');
    cameraPreview.srcObject = stream;

    try {
      await cameraPreview.play();
      appendAnalysisLog('Video playback started.');
    } catch (playError) {
      console.warn('Video play() did not start automatically:', playError);
      appendAnalysisLog(`Video play() warning: ${playError && playError.message ? playError.message : String(playError)}`);
    }

    cameraToggle.textContent = 'Stop Camera';
    cameraStatus.textContent = 'Camera ready';
    setMessage('Camera enabled. The app will record and analyze each round automatically.', 'success');
    appendAnalysisLog('Current workflow: browser captures the webcam clip, Django analyzes the recording, and the UI shows the result.');

    if (!state.recording) {
      beginRoundRecording();
    }
  } catch (error) {
    console.error('Camera startup failed:', error);
    cameraStatus.textContent = 'Camera unavailable';
    setMessage('Camera permission was denied or no webcam is available.', 'error');
    appendAnalysisLog(`Camera startup failed: ${error && error.message ? error.message : String(error)}`);
    disableCamera();
  }
}

function disableCamera() {
  stopFaceLoop();
  state.eyeValidationPassed = false;
  cameraPreview.style.transform = 'scale(1)';
  cameraPreview.style.transformOrigin = 'center center';

  if (state.stream) {
    state.stream.getTracks().forEach((track) => track.stop());
    state.stream = null;
  }

  if (eyeAnalysisCanvas) {
    eyeAnalysisCanvas.style.display = 'none';
    const ctx = ensureAnalysisContext();
    if (ctx) {
      ctx.clearRect(0, 0, eyeAnalysisCanvas.width, eyeAnalysisCanvas.height);
    }
  }

  if (retinaPreview) {
    retinaPreview.style.display = 'none';
    const retinaCtx = ensureRetinaContext();
    if (retinaCtx) {
      retinaCtx.clearRect(0, 0, retinaPreview.width, retinaPreview.height);
    }
  }

  cameraPreview.srcObject = null;
  cameraStatus.textContent = state.demoMode ? 'Demo mode active' : 'Camera not active';
  cameraToggle.textContent = 'Enable Camera';
  loadIndex.textContent = state.demoMode ? 'Load index: 12.5 (demo)' : 'Load index: 0.0';
}

cameraToggle.addEventListener('click', async () => {
  if (state.stream) {
    disableCamera();
    return;
  }

  await enableCamera();
});

answerForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const answer = answerInput.value.trim();
  const expected = calculateExpectedAnswer();

  if (!/^[0-9]{4}$/.test(answer)) {
    setMessage('Please enter exactly four digits.', 'error');
    return;
  }

  const solvedRound = answer === expected;
  const attemptsThisLevel = state.levelAttemptIndex;
  const levelComplete = solvedRound || attemptsThisLevel >= 4;

  if (solvedRound) {
    state.score += 10 * state.level;
    setMessage(`Correct! You solved the ${state.level} level challenge.`, 'success');
    state.level += 1;
    resetLevelAttempts();
    updateHud();
  } else {
    state.lives -= 1;
    setMessage(`Incorrect. The correct answer was ${expected}.`, 'error');
    updateHud();

    if (state.lives <= 0) {
      setMessage(`Game over. Final score: ${state.score}. Press refresh to try again.`, 'error');
      answerInput.disabled = true;
      stopRoundRecording();
      disableCamera();
      return;
    }

    if (levelComplete) {
      setMessage(`Level ${state.level} complete. Moving to level ${state.level + 1}.`, 'info');
      state.level += 1;
      resetLevelAttempts();
      updateHud();
    }
  }

  stopRoundRecording();
  if (!levelComplete && !solvedRound) {
    startRound();
  } else if (state.lives > 0) {
    startRound();
  }
});

window.addEventListener('beforeunload', () => {
  disableCamera();
});

resetWorkflowLogs();
renderAttemptGrid();
drawDilationChart();
updateHud();
startRound();
