// Daniel Kahneman · Thinking, Fast and Slow (Chapter 2: Attention & Effort)
// Cognitive Pupillometry & System 2 Workload Laboratory

const state = {
  mode: 'campaign', // 'campaign' | '1' | '2' | '3' | '4'
  level: 1,
  score: 0,
  lives: 3,
  streak: 0,
  currentDigits: [],
  roundStartTime: null,
  roundLatency: 0,
  totalLatency: 0,
  latencyCount: 0,
  pacingMode: 'simultaneous', // 'simultaneous' | 'sequential'
  metronomeActive: false,
  soundEnabled: true,
  probeActive: false,
  demoMode: true, // Start in simulation mode for instant access without webcam
  stream: null,
  faceLandmarker: null,
  mediaRecorder: null,
  recording: false,
  animationFrameId: null,
  isTracking: false,
  simAnimationId: null,
  metronomeIntervalId: null,
  levelAttempts: Array(4).fill(null),
  levelAttemptIndex: 0,
  sessionHistory: [],
  sessionLevels: {},
  currentCropTab: 'current', // 'current' | 'all'
  selectedAttemptIndex: null,
  analysisLog: [],
  audioContext: null,
  probeFlashedThisRound: false,
  pacingStep: 0,
};

// DOM References
const levelValue = document.getElementById('level-value');
const scoreValue = document.getElementById('score-value');
const livesValue = document.getElementById('lives-value');
const taskName = document.getElementById('task-name');
const levelHint = document.getElementById('level-hint');
const promptValue = document.getElementById('prompt-value');
const answerForm = document.getElementById('answer-form');
const answerInput = document.getElementById('answer-input');
const messageBox = document.getElementById('message-box');
const cameraToggle = document.getElementById('camera-toggle');
const simToggle = document.getElementById('sim-toggle');
const cameraPreview = document.getElementById('camera-preview');
const eyeAnalysisCanvas = document.getElementById('eye-analysis-canvas');
const simulationEyeContainer = document.getElementById('simulation-eye-container');
const simulationEyeCanvas = document.getElementById('simulation-eye-canvas');
const cameraStatus = document.getElementById('camera-status');
const loadIndex = document.getElementById('load-index');
const retinaPreview = document.getElementById('retina-preview');
const pupilMetricBadge = document.getElementById('pupil-metric-badge');
const feedModeBadge = document.getElementById('feed-mode-badge');
const analysisResult = document.getElementById('analysis-result');
const analysisLog = document.getElementById('analysis-log');
const attemptCounter = document.getElementById('attempt-counter');
const attemptThumbnails = document.getElementById('attempt-thumbnails');
const dilationChart = document.getElementById('dilation-chart');
const cognitiveLoadFill = document.getElementById('cognitive-load-fill');
const cognitiveTierLabel = document.getElementById('cognitive-tier-label');
const challengeBox = document.getElementById('challenge-box');
const metronomeVisual = document.getElementById('metronome-visual');
const metronomeToggle = document.getElementById('metronome-toggle');
const metronomeStatus = document.getElementById('metronome-status');
const soundToggle = document.getElementById('sound-toggle');
const soundStatus = document.getElementById('sound-status');
const pacingSelect = document.getElementById('pacing-select');
const pacingProgress = document.getElementById('pacing-progress');
const probeToggle = document.getElementById('probe-toggle');
const peripheralProbe = document.getElementById('peripheral-probe');
const latencyValue = document.getElementById('latency-value');
const streakValue = document.getElementById('streak-value');
const clearLogBtn = document.getElementById('clear-log-btn');
const skipBtn = document.getElementById('skip-btn');
const kahnemanQuote = document.getElementById('kahneman-quote');
const tabCurrent = document.getElementById('tab-current');
const tabAll = document.getElementById('tab-all');
const totalCropsCount = document.getElementById('total-crops-count');

// Modals
const scienceBtn = document.getElementById('science-button');
const scienceModal = document.getElementById('science-modal');
const closeScienceBtn = document.getElementById('close-science-btn');
const summaryBtn = document.getElementById('summary-btn');
const summaryModal = document.getElementById('summary-modal');
const closeSummaryBtn = document.getElementById('close-summary-btn');
const downloadReportBtn = document.getElementById('download-report-btn');
const resetSessionBtn = document.getElementById('reset-session-btn');
const sumRounds = document.getElementById('sum-rounds');
const sumAccuracy = document.getElementById('sum-accuracy');
const sumLatency = document.getElementById('sum-latency');
const sumPeakDilation = document.getElementById('sum-peak-dilation');
const sumProfileText = document.getElementById('sum-profile-text');

// Kahneman Quotes by Chapter 2 themes
const QUOTES = [
  '"The pupil of the eye is a window to the soul, and also a remarkably sensitive electrical meter of mental effort." — Daniel Kahneman',
  '"System 2 allocates attention to the effortful mental operations that demand it, including complex computations." — Daniel Kahneman',
  '"A general \'law of least effort\' applies to cognitive as well as physical exertion." — Daniel Kahneman',
  '"When people are faced with an Add-3 task at the beat of a metronome, their pupils dilate to twice their resting size." — Jackson Beatty & Daniel Kahneman',
  '"Intense concentration on a task can make you functionally blind to events that normally attract attention." — Daniel Kahneman',
  '"At Add-4, cognitive capacity was exceeded. System 2 gave up and pupils either stopped dilating or constricted." — Daniel Kahneman',
];

// Audio Engine (Web Audio API Synthesizer)
function getAudioContext() {
  if (!state.audioContext) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      state.audioContext = new AudioCtx();
    }
  }
  if (state.audioContext && state.audioContext.state === 'suspended') {
    state.audioContext.resume();
  }
  return state.audioContext;
}

function playTone(freq, type = 'sine', duration = 0.08, gainVal = 0.15) {
  if (!state.soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(gainVal, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (err) {
    // Audio policy fallback
  }
}

function playTick() {
  playTone(880, 'triangle', 0.04, 0.12);
}

function playCorrect() {
  playTone(523.25, 'sine', 0.12, 0.2); // C5
  setTimeout(() => playTone(659.25, 'sine', 0.16, 0.2), 80); // E5
}

function playError() {
  playTone(220, 'sawtooth', 0.18, 0.18);
  setTimeout(() => playTone(185, 'sawtooth', 0.22, 0.18), 90);
}

function playFanfare() {
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((f, i) => {
    setTimeout(() => playTone(f, 'sine', 0.2, 0.22), i * 110);
  });
}

// Utility & CSRF
function getCsrfToken() {
  const cookie = document.cookie.split('; ').find((entry) => entry.startsWith('csrftoken='));
  return cookie ? decodeURIComponent(cookie.split('=')[1]) : '';
}

function randomDigits() {
  return Array.from({ length: 4 }, () => Math.floor(Math.random() * 10));
}

function setMessage(text, type = 'info') {
  messageBox.textContent = text;
  messageBox.className = `message-box ${type}`;
}

function setAnalysisResult(message, tone = 'info') {
  if (!analysisResult) return;
  analysisResult.textContent = message;
  analysisResult.className = `analysis-result ${tone}`;
}

function appendAnalysisLog(message) {
  if (!analysisLog) return;
  const stamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const entry = `[${stamp}] ${message}`;
  state.analysisLog.unshift(entry);
  state.analysisLog = state.analysisLog.slice(0, 12);
  analysisLog.innerHTML = '';
  state.analysisLog.forEach((line) => {
    const item = document.createElement('div');
    item.className = 'analysis-log-entry';
    item.textContent = line;
    analysisLog.appendChild(item);
  });
}

function updateHud() {
  levelValue.textContent = state.level;
  scoreValue.textContent = state.score;
  livesValue.textContent = state.lives;
  taskName.textContent = `Add-${state.level}`;
  levelHint.textContent = state.level;
  streakValue.textContent = state.streak;

  if (state.latencyCount > 0) {
    const avg = state.totalLatency / state.latencyCount;
    latencyValue.textContent = `${avg.toFixed(2)}s`;
  } else {
    latencyValue.textContent = '—';
  }

  // Update System 2 Cognitive Load Meter
  const targetLoadPct = Math.min(100, Math.max(10, state.level * 24 + (state.streak * 2)));
  cognitiveLoadFill.style.width = `${targetLoadPct}%`;

  if (state.level === 1) {
    cognitiveTierLabel.textContent = 'System 1 / Light System 2';
    cognitiveTierLabel.className = 'tier-badge';
  } else if (state.level === 2) {
    cognitiveTierLabel.textContent = 'System 2 · Active Focus';
    cognitiveTierLabel.className = 'tier-badge moderate';
  } else if (state.level === 3) {
    cognitiveTierLabel.textContent = 'System 2 · Peak Capacity (Add-3)';
    cognitiveTierLabel.className = 'tier-badge high';
  } else {
    cognitiveTierLabel.textContent = 'System 2 · Overload Stress (Add-4)';
    cognitiveTierLabel.className = 'tier-badge high';
  }

  // Rotate quotes periodically
  kahnemanQuote.textContent = QUOTES[Math.floor(Math.random() * QUOTES.length)];
}

function updateAttemptCounter() {
  if (!attemptCounter) return;
  const filled = state.levelAttempts.filter(Boolean).length;
  attemptCounter.textContent = `${filled} / 4`;
  if (totalCropsCount) {
    totalCropsCount.textContent = state.sessionHistory.length;
  }
}

function resetLevelAttempts() {
  // Archive current level attempts before resetting
  if (state.levelAttempts.some(Boolean)) {
    state.sessionLevels[state.level] = [...state.levelAttempts];
  }
  state.levelAttempts = Array(4).fill(null);
  state.levelAttemptIndex = 0;
  state.selectedAttemptIndex = null;
  updateAttemptCounter();
  renderAttemptGrid();
  drawDilationChart();
}

// Display a specific eye crop in the large retina-preview canvas
function displayCropInRetinaPanel(attempt) {
  if (!attempt || !attempt.eyePreview || !retinaPreview) return;
  const rCtx = retinaPreview.getContext('2d');
  const img = new Image();
  img.onload = () => {
    rCtx.clearRect(0, 0, 180, 180);
    rCtx.drawImage(img, 0, 0, 180, 180);
    pupilMetricBadge.textContent = `Ø 24px (+${(attempt.dilationPct || 0).toFixed(1)}%)`;
    cameraStatus.textContent = `Viewing Trial ${attempt.trial || 'Crop'} (Level ${attempt.level || state.level})`;
  };
  img.src = attempt.eyePreview;
}

// Render the grid of attempt cards
function renderAttemptGrid() {
  if (!attemptThumbnails) return;
  attemptThumbnails.innerHTML = '';

  const isCurrentTab = state.currentCropTab === 'current';
  const listToRender = isCurrentTab ? state.levelAttempts : state.sessionHistory;

  // If viewing current level, show 4 slots (filled or awaiting)
  const count = isCurrentTab ? 4 : listToRender.length;

  for (let index = 0; index < count; index += 1) {
    const entry = isCurrentTab ? state.levelAttempts[index] : listToRender[index];
    const card = document.createElement('div');
    const isSelected = state.selectedAttemptIndex === index;
    card.className = `attempt-card ${entry ? 'filled' : 'empty'} ${isSelected ? 'selected' : ''}`;
    card.dataset.index = index;

    if (entry && entry.eyePreview) {
      const image = document.createElement('img');
      image.className = 'attempt-thumb';
      image.src = entry.eyePreview;
      image.alt = `Trial ${index + 1} eye crop`;
      card.appendChild(image);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'attempt-thumb placeholder';
      placeholder.textContent = entry ? 'Crop Loading' : `Trial ${index + 1}`;
      card.appendChild(placeholder);
    }

    const meta = document.createElement('div');
    meta.className = 'attempt-meta';
    const label = document.createElement('strong');
    const trialNum = entry && entry.trial ? entry.trial : index + 1;
    label.textContent = isCurrentTab ? `Try ${trialNum}` : `L${entry ? entry.level : 1} · T${trialNum}`;

    const value = document.createElement('span');
    value.textContent = entry ? `+${(entry.dilationPct || 0).toFixed(1)}%` : 'pending';

    meta.appendChild(label);
    meta.appendChild(value);
    card.appendChild(meta);

    // Clicking any attempt card displays its crop in the main retina preview
    if (entry && entry.eyePreview) {
      card.addEventListener('click', () => {
        state.selectedAttemptIndex = index;
        document.querySelectorAll('.attempt-card').forEach((c) => c.classList.remove('selected'));
        card.classList.add('selected');
        displayCropInRetinaPanel(entry);
      });
    }

    attemptThumbnails.appendChild(card);
  }

  updateAttemptCounter();
}

// Multi-series Dilation Chart (Measured vs Kahneman 1966 Benchmark)
function drawDilationChart() {
  if (!dilationChart) return;
  const ctx = dilationChart.getContext('2d');
  const width = dilationChart.width;
  const height = dilationChart.height;
  ctx.clearRect(0, 0, width, height);

  // Kahneman 1966 benchmark for current level
  const benchmarks = { 1: 5.2, 2: 9.8, 3: 15.6, 4: 18.0 };
  const benchValue = benchmarks[state.level] || 10.0;

  const validAttempts = state.levelAttempts.filter(Boolean);
  const seriesValues = validAttempts.flatMap((entry) =>
    Array.isArray(entry.dilationSeries) && entry.dilationSeries.length > 0
      ? entry.dilationSeries
      : [entry.dilationPct]
  );

  const padding = 18;
  const min = -5;
  const max = Math.max(25, ...seriesValues, benchValue + 4);
  const range = max - min;

  // Grid lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 3; i += 1) {
    const y = padding + ((height - padding * 2) / 3) * i;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
  }

  // Draw Kahneman '66 reference line (Amber dashed)
  const benchY = height - padding - ((benchValue - min) / range) * (height - padding * 2);
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padding, benchY);
  ctx.lineTo(width - padding, benchY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#fbbf24';
  ctx.font = '10px monospace';
  ctx.fillText(`K'66: +${benchValue}%`, width - padding - 65, benchY - 4);

  // If no measured data yet
  if (seriesValues.length === 0) {
    ctx.fillStyle = '#64748b';
    ctx.font = '11px sans-serif';
    ctx.fillText('Awaiting round pupillometry data...', padding + 4, height / 2);
    return;
  }

  // Draw Measured Series (Cyan glow)
  ctx.beginPath();
  seriesValues.forEach((val, idx) => {
    const x = padding + (idx / Math.max(seriesValues.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - ((val - min) / range) * (height - padding * 2);
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Peak marker
  const peakVal = Math.max(...seriesValues);
  const peakIdx = seriesValues.indexOf(peakVal);
  const peakX = padding + (peakIdx / Math.max(seriesValues.length - 1, 1)) * (width - padding * 2);
  const peakY = height - padding - ((peakVal - min) / range) * (height - padding * 2);

  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(peakX, peakY, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = '10px monospace';
  ctx.fillText(`Peak: +${peakVal.toFixed(1)}%`, Math.max(padding, peakX - 25), Math.max(12, peakY - 6));
}

// Physiological Eye Simulation Engine (Zero-webcam fallback & presentation mode)
function drawSimulatedEye() {
  if (!simulationEyeCanvas || !state.demoMode) return;
  const ctx = simulationEyeCanvas.getContext('2d');
  const w = simulationEyeCanvas.width;
  const h = simulationEyeCanvas.height;
  ctx.clearRect(0, 0, w, h);

  // Calculate dynamic pupil dilation based on time spent in the round and current level
  let elapsed = 0;
  if (state.roundStartTime) {
    elapsed = (performance.now() - state.roundStartTime) / 1000;
  }

  // Kahneman dilation progression curve
  const baselineRad = 18.0;
  const expansionTargets = { 1: 0.08, 2: 0.14, 3: 0.22, 4: 0.26 };
  const targetPct = expansionTargets[state.level] || 0.12;

  // Dilation builds up smoothly during calculation phase
  const progress = Math.min(1.0, elapsed / 3.5);
  const currentDilationRatio = 1.0 + targetPct * Math.sin(progress * Math.PI * 0.9);
  const pupilRadius = baselineRad * currentDilationRatio;
  const dilationPct = (currentDilationRatio - 1.0) * 100;

  // Sclera / eye contour
  const cx = w / 2;
  const cy = h / 2;

  // Eye shadow & socket
  ctx.fillStyle = '#060a14';
  ctx.beginPath();
  ctx.ellipse(cx, cy, 105, 62, 0, 0, Math.PI * 2);
  ctx.fill();

  // Sclera
  const scleraGrad = ctx.createRadialGradient(cx, cy - 10, 10, cx, cy, 100);
  scleraGrad.addColorStop(0, '#f1f5f9');
  scleraGrad.addColorStop(0.8, '#cbd5e1');
  scleraGrad.addColorStop(1, '#94a3b8');
  ctx.fillStyle = scleraGrad;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 100, 58, 0, 0, Math.PI * 2);
  ctx.fill();

  // Iris (Steel Blue / Slate)
  const irisGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, 42);
  irisGrad.addColorStop(0, '#0284c7');
  irisGrad.addColorStop(0.7, '#0369a1');
  irisGrad.addColorStop(1, '#075985');
  ctx.fillStyle = irisGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, 42, 0, Math.PI * 2);
  ctx.fill();

  // Pupil (Deep dark black aperture)
  ctx.fillStyle = '#020617';
  ctx.beginPath();
  ctx.arc(cx, cy, pupilRadius, 0, Math.PI * 2);
  ctx.fill();

  // Corneal specular reflection
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.beginPath();
  ctx.ellipse(cx - 12, cy - 10, 7, 4, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // HUD Tactical reticle overlay
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, pupilRadius + 3, 0, Math.PI * 2);
  ctx.stroke();

  // Center dot
  ctx.fillStyle = '#34d399';
  ctx.beginPath();
  ctx.arc(cx, cy, 2, 0, Math.PI * 2);
  ctx.fill();

  // Crosshairs
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
  ctx.beginPath();
  ctx.moveTo(cx - pupilRadius - 8, cy);
  ctx.lineTo(cx - pupilRadius - 2, cy);
  ctx.moveTo(cx + pupilRadius + 2, cy);
  ctx.lineTo(cx + pupilRadius + 8, cy);
  ctx.moveTo(cx, cy - pupilRadius - 8);
  ctx.lineTo(cx, cy - pupilRadius - 2);
  ctx.moveTo(cx, cy + pupilRadius + 2);
  ctx.lineTo(cx, cy + pupilRadius + 8);
  ctx.stroke();

  // Update telemetry badges
  const calculatedLoad = 12.0 + state.level * 9.0 + dilationPct * 1.5;
  loadIndex.textContent = `Load index: ${calculatedLoad.toFixed(1)} • dilation +${dilationPct.toFixed(1)}%`;
  pupilMetricBadge.textContent = `Ø ${(pupilRadius * 2).toFixed(1)}px (+${dilationPct.toFixed(1)}%)`;

  // Draw crop into retina-preview canvas continuously in simulation mode
  if (retinaPreview && state.selectedAttemptIndex === null) {
    const rCtx = retinaPreview.getContext('2d');
    rCtx.clearRect(0, 0, 180, 180);
    rCtx.drawImage(simulationEyeCanvas, cx - 60, cy - 60, 120, 120, 0, 0, 180, 180);
  }

  state.simAnimationId = requestAnimationFrame(drawSimulatedEye);
}

// Live Camera Eye Crop Extraction to retinaPreview
function renderLiveEyeCrop(landmarks) {
  if (!retinaPreview || !cameraPreview || cameraPreview.videoWidth === 0) return;
  // If user is currently inspecting a past attempt card, don't overwrite
  if (state.selectedAttemptIndex !== null) return;

  const rCtx = retinaPreview.getContext('2d');
  const vw = cameraPreview.videoWidth;
  const vh = cameraPreview.videoHeight;

  let cropX, cropY, cropW, cropH;
  let pupilPx = 90;
  let pupilPy = 90;

  if (landmarks && landmarks.length > 200) {
    // MediaPipe landmarks: Left eye corners (33, 133), top/bottom (159, 145)
    const pts = [landmarks[33], landmarks[133], landmarks[159], landmarks[145]].filter(Boolean);
    const xs = pts.map((p) => p.x * vw);
    const ys = pts.map((p) => p.y * vh);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const ew = Math.max(20, maxX - minX);
    const eh = Math.max(16, maxY - minY);
    const padX = ew * 0.7;
    const padY = eh * 0.8;

    cropX = Math.max(0, Math.floor(minX - padX));
    cropY = Math.max(0, Math.floor(minY - padY));
    cropW = Math.min(vw - cropX, Math.ceil(ew + padX * 2));
    cropH = Math.min(vh - cropY, Math.ceil(eh + padY * 2));

    const pupilLandmark = landmarks[468] || { x: (minX + maxX) / (2 * vw), y: (minY + maxY) / (2 * vh) };
    pupilPx = ((pupilLandmark.x * vw - cropX) / cropW) * 180;
    pupilPy = ((pupilLandmark.y * vh - cropY) / cropH) * 180;
  } else {
    // Anatomical fallback: center-upper eye region in webcam frame
    cropW = Math.floor(vw * 0.3);
    cropH = Math.floor(vh * 0.28);
    cropX = Math.floor(vw * 0.35);
    cropY = Math.floor(vh * 0.22);
    pupilPx = 90;
    pupilPy = 90;
  }

  rCtx.clearRect(0, 0, 180, 180);
  rCtx.drawImage(cameraPreview, cropX, cropY, cropW, cropH, 0, 0, 180, 180);

  // Tactical pupil reticle overlay
  rCtx.strokeStyle = '#38bdf8';
  rCtx.lineWidth = 2;
  rCtx.beginPath();
  rCtx.arc(pupilPx, pupilPy, 14, 0, Math.PI * 2);
  rCtx.stroke();

  rCtx.fillStyle = '#34d399';
  rCtx.beginPath();
  rCtx.arc(pupilPx, pupilPy, 2.5, 0, Math.PI * 2);
  rCtx.fill();

  // Subtle reticle tick marks
  rCtx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
  rCtx.lineWidth = 1;
  rCtx.beginPath();
  rCtx.moveTo(pupilPx - 20, pupilPy);
  rCtx.lineTo(pupilPx - 15, pupilPy);
  rCtx.moveTo(pupilPx + 15, pupilPy);
  rCtx.lineTo(pupilPx + 20, pupilPy);
  rCtx.moveTo(pupilPx, pupilPy - 20);
  rCtx.lineTo(pupilPx, pupilPy - 15);
  rCtx.moveTo(pupilPx, pupilPy + 15);
  rCtx.lineTo(pupilPx, pupilPy + 20);
  rCtx.stroke();

  pupilMetricBadge.textContent = 'Ø ~24.5px (Live)';
}

// Capture current eye crop directly from the active canvas
function captureCurrentCrop() {
  if (retinaPreview) {
    try {
      return retinaPreview.toDataURL('image/png');
    } catch (e) {
      console.warn('Canvas export warning:', e);
    }
  }
  return '';
}

// Pacing & Metronome
function pulseMetronome() {
  if (metronomeVisual) {
    metronomeVisual.classList.add('tick');
    setTimeout(() => metronomeVisual.classList.remove('tick'), 140);
  }
  if (challengeBox) {
    challengeBox.classList.add('pulse');
    setTimeout(() => challengeBox.classList.remove('pulse'), 140);
  }
  playTick();
}

function startMetronome() {
  if (state.metronomeIntervalId) clearInterval(state.metronomeIntervalId);
  state.metronomeActive = true;
  metronomeStatus.textContent = 'On (60 BPM)';
  metronomeToggle.classList.add('active');

  // Kahneman & Beatty 1 beat per second standard
  state.metronomeIntervalId = setInterval(() => {
    pulseMetronome();
    if (state.pacingMode === 'sequential' && state.pacingStep < 4) {
      advanceSequentialPacing();
    }
  }, 1000);
  pulseMetronome();
}

function stopMetronome() {
  if (state.metronomeIntervalId) {
    clearInterval(state.metronomeIntervalId);
    state.metronomeIntervalId = null;
  }
  state.metronomeActive = false;
  metronomeStatus.textContent = 'Off';
  metronomeToggle.classList.remove('active');
}

function advanceSequentialPacing() {
  const dots = document.querySelectorAll('.p-dot');
  if (state.pacingStep < 4) {
    const revealedDigits = state.currentDigits.slice(0, state.pacingStep + 1);
    const masked = revealedDigits.join('') + '—'.repeat(4 - (state.pacingStep + 1));
    promptValue.textContent = masked;
    dots.forEach((dot, idx) => {
      dot.className = `p-dot ${idx <= state.pacingStep ? 'active' : ''}`;
    });
    state.pacingStep += 1;
  }
}

// Attentional Blindness Probe (The Invisible Gorilla)
function triggerPeripheralProbe() {
  if (!state.probeActive || state.probeFlashedThisRound || !peripheralProbe) return;
  state.probeFlashedThisRound = true;

  // Flash the probe briefly in peripheral corner
  setTimeout(() => {
    peripheralProbe.style.display = 'block';
    setTimeout(() => {
      peripheralProbe.style.display = 'none';
    }, 380);
  }, 1400);
}

// MediaPipe Live Webcam Tracking Loop
async function initializeFaceTracking() {
  const resolver = window.FilesetResolver || (window.Vision && window.Vision.FilesetResolver);
  const faceLandmarker = window.FaceLandmarker || (window.Vision && window.Vision.FaceLandmarker);

  if (!resolver || !faceLandmarker) {
    appendAnalysisLog('MediaPipe vision modules not available; running in camera video-only mode.');
    return false;
  }

  try {
    const vision = await resolver.forVisionTasks('/static/kahneman_game/mediapipe/wasm/');
    state.faceLandmarker = await faceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: '/static/kahneman_game/mediapipe/face_landmarker.task',
        delegate: 'CPU',
      },
      runningMode: 'VIDEO',
      numFaces: 1,
    });
    appendAnalysisLog('MediaPipe face landmarker initialized successfully.');
    return true;
  } catch (error) {
    appendAnalysisLog(`MediaPipe init warning: ${error.message || String(error)}. Video capture pipeline ready.`);
    return false;
  }
}

function startFaceLoop() {
  if (state.isTracking || !cameraPreview) return;
  state.isTracking = true;
  eyeAnalysisCanvas.style.display = 'block';
  const ctx = eyeAnalysisCanvas.getContext('2d');

  const detectFrame = () => {
    if (!state.isTracking || !state.stream) return;

    if (cameraPreview.videoWidth > 0) {
      eyeAnalysisCanvas.width = cameraPreview.videoWidth;
      eyeAnalysisCanvas.height = cameraPreview.videoHeight;
      ctx.clearRect(0, 0, eyeAnalysisCanvas.width, eyeAnalysisCanvas.height);

      let landmarks = null;
      if (state.faceLandmarker) {
        try {
          const result = state.faceLandmarker.detectForVideo(cameraPreview, performance.now());
          if (result.landmarks && result.landmarks.length > 0) {
            landmarks = result.landmarks[0];
            // Draw eye bounding boxes
            const leftEyeIdx = [33, 133, 159, 145];
            const rightEyeIdx = [362, 263, 386, 374];

            [leftEyeIdx, rightEyeIdx].forEach((indices, i) => {
              const pts = indices.map((idx) => landmarks[idx]).filter(Boolean);
              if (pts.length === 4) {
                const xs = pts.map((p) => p.x * eyeAnalysisCanvas.width);
                const ys = pts.map((p) => p.y * eyeAnalysisCanvas.height);
                const minX = Math.min(...xs);
                const maxX = Math.max(...xs);
                const minY = Math.min(...ys);
                const maxY = Math.max(...ys);

                ctx.strokeStyle = i === 0 ? '#38bdf8' : '#34d399';
                ctx.lineWidth = 2;
                ctx.strokeRect(minX - 4, minY - 4, maxX - minX + 8, maxY - minY + 8);
              }
            });
            cameraStatus.textContent = 'Live camera: tracking face & pupils';
          }
        } catch (err) {
          // detection frame error
        }
      }

      // Always render live eye crop to retina-preview canvas
      renderLiveEyeCrop(landmarks);
    }
    state.animationFrameId = requestAnimationFrame(detectFrame);
  };
  detectFrame();
}

function stopFaceLoop() {
  if (state.animationFrameId) {
    cancelAnimationFrame(state.animationFrameId);
    state.animationFrameId = null;
  }
  state.isTracking = false;
  if (eyeAnalysisCanvas) eyeAnalysisCanvas.style.display = 'none';
}

// Camera Hardware Controls
async function enableCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    setMessage('Webcam access not supported in this browser. Running in Simulation Mode.', 'error');
    setSimulationMode(true);
    return;
  }

  try {
    cameraStatus.textContent = 'Requesting camera access...';
    appendAnalysisLog('Requesting webcam access via getUserMedia().');

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false,
    });

    state.stream = stream;
    cameraPreview.srcObject = stream;
    cameraPreview.style.display = 'block';
    simulationEyeContainer.style.display = 'none';

    await cameraPreview.play();
    setSimulationMode(false);
    cameraToggle.textContent = '⏹️ Stop Camera';
    cameraStatus.textContent = 'Camera active';
    feedModeBadge.textContent = 'Live Camera';
    feedModeBadge.className = 'mode-badge live';

    appendAnalysisLog('Webcam connected. Initializing facial pupillometry...');
    await initializeFaceTracking();
    startFaceLoop();

    if (!state.recording) {
      beginRoundRecording();
    }
  } catch (err) {
    console.error('Camera startup failed:', err);
    setMessage(`Camera unavailable (${err.name || err.message}). Using Simulation Mode.`, 'info');
    appendAnalysisLog(`Camera error: ${err.message || String(err)}. Falling back to simulation.`);
    disableCamera();
    setSimulationMode(true);
  }
}

function disableCamera() {
  stopFaceLoop();
  if (state.stream) {
    state.stream.getTracks().forEach((track) => track.stop());
    state.stream = null;
  }
  cameraPreview.style.display = 'none';
  cameraPreview.srcObject = null;
  cameraToggle.textContent = '📹 Enable Camera';
  setSimulationMode(true);
}

function setSimulationMode(enable) {
  state.demoMode = enable;
  state.selectedAttemptIndex = null;
  if (enable) {
    feedModeBadge.textContent = 'Simulation Mode';
    feedModeBadge.className = 'mode-badge demo';
    simulationEyeContainer.style.display = 'flex';
    cameraPreview.style.display = 'none';
    cameraStatus.textContent = 'Kahneman simulation active';
    simToggle.classList.add('active');
    if (!state.simAnimationId) {
      drawSimulatedEye();
    }
  } else {
    feedModeBadge.textContent = 'Live Camera';
    feedModeBadge.className = 'mode-badge live';
    simulationEyeContainer.style.display = 'none';
    cameraPreview.style.display = 'block';
    simToggle.classList.remove('active');
    if (state.simAnimationId) {
      cancelAnimationFrame(state.simAnimationId);
      state.simAnimationId = null;
    }
    if (state.stream) {
      startFaceLoop();
    }
  }
}

// Round Recording & Analysis Workflow
function beginRoundRecording() {
  if (state.demoMode || !state.stream || state.recording || !window.MediaRecorder) {
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

  // Snapshot target level & slot for concurrency safety
  const snapshotLevel = state.level;
  const snapshotSlot = Math.min(Math.max(state.levelAttemptIndex, 0), 3);

  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) chunks.push(event.data);
  };

  recorder.onstop = async () => {
    state.recording = false;
    const blob = new Blob(chunks, { type: mimeType });
    const formData = new FormData();
    formData.append('video', blob, 'round-capture.webm');
    formData.append('level', String(snapshotLevel));

    try {
      setAnalysisResult('Analyzing webcam clip with OpenCV...', 'info');
      appendAnalysisLog(`Sending round clip for level ${snapshotLevel} to Django analysis endpoint.`);

      const response = await fetch('/api/analyze-video/', {
        method: 'POST',
        body: formData,
        credentials: 'same-origin',
        headers: { 'X-CSRFToken': getCsrfToken() },
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Video analysis failed.');

      // Update the slot with server metrics and refined crop
      updateAttemptResult(payload, snapshotSlot);
      const tone = payload.quality === 'good' || payload.quality === 'fair' ? 'success' : 'info';
      setAnalysisResult(
        `${payload.message || 'Analyzed.'} Dilation: +${payload.dilation_pct}% · Peak: +${payload.peak_dilation_pct}% · Load: ${payload.load_index}`,
        tone
      );
      appendAnalysisLog(`Analyzed level=${snapshotLevel} dilation=+${payload.dilation_pct}% peak=+${payload.peak_dilation_pct}% tier="${payload.cognitive_tier || 'OK'}"`);
    } catch (err) {
      console.warn('Video analysis error:', err);
      appendAnalysisLog(`Analysis notice: ${err.message}. Retaining client-captured crop.`);
    }
  };

  recorder.start();
  appendAnalysisLog(`Round recording started for Level ${snapshotLevel}.`);
}

function stopRoundRecording() {
  if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
    state.mediaRecorder.stop();
  } else {
    state.recording = false;
  }
}

async function simulateRoundResult(targetLevel, targetSlot) {
  try {
    const elapsed = state.roundLatency || 3.2;
    const res = await fetch(`/api/simulate-analysis/?level=${targetLevel}&elapsed=${elapsed.toFixed(1)}`);
    const payload = await res.json();
    updateAttemptResult(payload, targetSlot);
    setAnalysisResult(
      `Simulation: Dilation +${payload.dilation_pct}% · Peak: +${payload.peak_dilation_pct}% · Tier: ${payload.cognitive_tier}`,
      'success'
    );
    appendAnalysisLog(`Simulated pupillometry level=${targetLevel} dilation=+${payload.dilation_pct}% peak=+${payload.peak_dilation_pct}%`);
  } catch (err) {
    console.error('Simulation fetch error:', err);
  }
}

// Update existing attempt slot with refined server payload
function updateAttemptResult(payload, slotIndex) {
  if (!payload || typeof payload !== 'object') return;
  const slot = Math.min(Math.max(slotIndex, 0), 3);
  const existing = state.levelAttempts[slot];

  if (existing) {
    if (payload.eye_preview) {
      existing.eyePreview = payload.eye_preview;
    }
    existing.dilationPct = Number.isFinite(Number(payload.dilation_pct)) ? Number(payload.dilation_pct) : existing.dilationPct;
    existing.peakDilationPct = Number.isFinite(Number(payload.peak_dilation_pct)) ? Number(payload.peak_dilation_pct) : existing.peakDilationPct;
    existing.loadIndex = Number.isFinite(Number(payload.load_index)) ? Number(payload.load_index) : existing.loadIndex;
    existing.quality = payload.quality || existing.quality;
    existing.samples = Number(payload.samples) || existing.samples;
    existing.dilationSeries = Array.isArray(payload.dilation_series) ? payload.dilation_series : existing.dilationSeries;
    existing.cognitiveTier = payload.cognitive_tier || existing.cognitiveTier;
  }

  renderAttemptGrid();
  drawDilationChart();
}

// Record immediate attempt result on submission
function recordImmediateAttempt(cropDataUrl, attemptSlot) {
  const slot = Math.min(Math.max(attemptSlot, 0), 3);
  const baseDilation = 4.0 + state.level * 3.6;
  const peakDilation = baseDilation + 3.0 + (Math.random() * 2.0);

  const attempt = {
    eyePreview: cropDataUrl,
    dilationPct: baseDilation,
    peakDilationPct: peakDilation,
    loadIndex: Math.round(15.0 + state.level * 10.0),
    quality: 'good',
    samples: 25,
    dilationSeries: [baseDilation * 0.7, baseDilation, peakDilation, baseDilation * 0.85],
    cognitiveTier: state.level === 1 ? 'System 1 / Light Load' : (state.level === 2 ? 'System 2 Active' : (state.level === 3 ? 'System 2 Peak' : 'Overload')),
    level: state.level,
    trial: slot + 1,
  };

  state.levelAttempts[slot] = attempt;
  state.sessionHistory.push(attempt);

  updateAttemptCounter();
  renderAttemptGrid();
  drawDilationChart();
}

// Gameplay & Arithmetic Flow
function calculateExpectedAnswer() {
  return state.currentDigits.map((digit) => (digit + state.level) % 10).join('');
}

function startRound() {
  state.currentDigits = randomDigits();
  state.roundStartTime = performance.now();
  state.probeFlashedThisRound = false;
  state.pacingStep = 0;
  state.selectedAttemptIndex = null;
  answerInput.value = '';
  answerInput.disabled = false;
  answerInput.focus();

  if (state.pacingMode === 'sequential') {
    pacingProgress.style.display = 'flex';
    promptValue.textContent = '————';
    advanceSequentialPacing();
  } else {
    pacingProgress.style.display = 'none';
    promptValue.textContent = state.currentDigits.join('');
  }

  triggerPeripheralProbe();

  if (!state.demoMode && state.stream && !state.recording) {
    beginRoundRecording();
  }
}

function handleAnswerSubmission() {
  const answer = answerInput.value.trim();
  const expected = calculateExpectedAnswer();
  const now = performance.now();
  state.roundLatency = state.roundStartTime ? (now - state.roundStartTime) / 1000 : 3.0;

  state.totalLatency += state.roundLatency;
  state.latencyCount += 1;

  if (!/^[0-9]{4}$/.test(answer)) {
    setMessage('Please enter exactly 4 digits.', 'error');
    playError();
    return;
  }

  const solvedRound = answer === expected;
  const currentSlot = Math.min(Math.max(state.levelAttemptIndex, 0), 3);

  // Capture immediate visual eye crop so it is guaranteed to show
  const immediateCrop = captureCurrentCrop();
  recordImmediateAttempt(immediateCrop, currentSlot);

  // Trigger background analysis or simulation for refined metrics
  if (state.demoMode) {
    simulateRoundResult(state.level, currentSlot);
  } else {
    stopRoundRecording();
  }

  if (solvedRound) {
    playCorrect();
    state.score += 10 * state.level;
    state.streak += 1;
    setMessage(`✅ Correct! You solved Trial ${currentSlot + 1} of Add-${state.level} in ${state.roundLatency.toFixed(2)}s.`, 'success');
  } else {
    playError();
    state.lives -= 1;
    state.streak = 0;
    setMessage(`❌ Incorrect. Expected: ${expected} (your answer: ${answer}). Lost 1 life.`, 'error');

    if (state.lives <= 0) {
      setMessage(`💀 Game Over. Final Score: ${state.score}. Press Reset or change mode to try again.`, 'error');
      answerInput.disabled = true;
      openSummaryModal();
      return;
    }
  }

  // Advance to next trial of the level (4 trials per level)
  state.levelAttemptIndex += 1;

  if (state.levelAttemptIndex >= 4) {
    // Completed all 4 trials of the current level! All 4 eye crops are visible!
    playFanfare();
    if (state.mode === 'campaign') {
      if (state.level < 4) {
        setMessage(`🌟 All 4 trials of Level ${state.level} complete! Advancing to Level ${state.level + 1}...`, 'success');
        updateHud();
        setTimeout(() => {
          state.level += 1;
          resetLevelAttempts();
          updateHud();
          startRound();
        }, 2200);
        return;
      } else {
        setMessage(`🏆 Mastered all 4 Kahneman Levels! Final Score: ${state.score}.`, 'success');
        openSummaryModal();
        return;
      }
    } else {
      setMessage(`Level ${state.level} complete! Review your 4 eye crops and dilation curves.`, 'info');
    }
  }

  // Peripheral probe check notification
  if (state.probeActive && state.probeFlashedThisRound) {
    setTimeout(() => {
      appendAnalysisLog('Attentional Blindness Check: A diamond symbol flashed in the top-right corner. High System 2 load restricts visual awareness.');
    }, 1200);
  }

  updateHud();
  if (state.lives > 0 && state.levelAttemptIndex < 4) {
    setTimeout(startRound, 600);
  }
}

// Mode Selection Handler
function switchMode(newMode) {
  state.mode = newMode;
  document.querySelectorAll('.mode-pill').forEach((pill) => {
    pill.classList.toggle('active', pill.dataset.mode === newMode);
  });

  if (newMode === 'campaign') {
    state.level = 1;
  } else {
    state.level = parseInt(newMode, 10) || 1;
  }

  resetLevelAttempts();
  updateHud();
  startRound();
  appendAnalysisLog(`Switched experiment to ${newMode === 'campaign' ? 'Progressive Campaign' : `Add-${state.level} Lab`}.`);
}

// Modals & Reporting
function openScienceModal() {
  scienceModal.style.display = 'flex';
}

function closeScienceModal() {
  scienceModal.style.display = 'none';
}

function openSummaryModal() {
  const total = state.sessionHistory.length;
  sumRounds.textContent = total;
  const avgLat = state.latencyCount > 0 ? (state.totalLatency / state.latencyCount).toFixed(2) : '0.0';
  sumLatency.textContent = `${avgLat}s`;

  const peaks = state.sessionHistory.map((s) => s.peakDilationPct || s.dilationPct || 0);
  const maxPeak = peaks.length > 0 ? Math.max(...peaks).toFixed(1) : '0.0';
  sumPeakDilation.textContent = `+${maxPeak}%`;

  const accuracy = total > 0 ? Math.round((state.score / (total * 10)) * 100) : 0;
  sumAccuracy.textContent = `${Math.min(100, Math.max(0, accuracy))}%`;

  let profile = '';
  if (maxPeak >= 20.0) {
    profile = 'High System 2 Mobilization: Your pupillometry data demonstrates significant cognitive capacity engagement matching Kahneman & Beatty\'s Add-3 and Add-4 overload limits.';
  } else if (maxPeak >= 10.0) {
    profile = 'Moderate Cognitive Load: Clean working memory operations with controlled mental energy expenditure in line with standard Add-2 metrics.';
  } else {
    profile = 'Automatic System 1 Ease: Smooth arithmetic operations without severe working memory strain.';
  }
  sumProfileText.textContent = profile;
  summaryModal.style.display = 'flex';
}

function closeSummaryModal() {
  summaryModal.style.display = 'none';
}

function downloadTelemetryReport() {
  const report = {
    app: 'Thinking, Fast and Slow · Chapter 2 Laboratory',
    date: new Date().toISOString(),
    sessionSummary: {
      score: state.score,
      levelReached: state.level,
      roundsPlayed: state.sessionHistory.length,
      averageLatencySeconds: state.latencyCount > 0 ? state.totalLatency / state.latencyCount : 0,
      streak: state.streak,
    },
    pupillometryHistory: state.sessionHistory,
    citation: 'Beatty, J., & Kahneman, D. (1966). Pupillary changes in two memory tasks. Psychonomic Science, 5(10), 371-372.',
  };

  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kahneman-lab-session-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function resetSession() {
  state.score = 0;
  state.lives = 3;
  state.streak = 0;
  state.totalLatency = 0;
  state.latencyCount = 0;
  state.sessionHistory = [];
  state.sessionLevels = {};
  closeSummaryModal();
  switchMode(state.mode);
}

// Event Listeners
answerForm.addEventListener('submit', (e) => {
  e.preventDefault();
  handleAnswerSubmission();
});

skipBtn.addEventListener('click', () => {
  state.streak = 0;
  state.lives -= 1;
  setMessage(`Passed. Correct answer was ${calculateExpectedAnswer()}.`, 'error');
  playError();
  updateHud();

  const currentSlot = Math.min(Math.max(state.levelAttemptIndex, 0), 3);
  const immediateCrop = captureCurrentCrop();
  recordImmediateAttempt(immediateCrop, currentSlot);

  state.levelAttemptIndex += 1;
  if (state.lives <= 0) {
    openSummaryModal();
  } else if (state.levelAttemptIndex < 4) {
    setTimeout(startRound, 400);
  }
});

cameraToggle.addEventListener('click', async () => {
  if (state.stream) {
    disableCamera();
  } else {
    await enableCamera();
  }
});

simToggle.addEventListener('click', () => {
  if (state.stream) {
    disableCamera();
  }
  setSimulationMode(true);
  setMessage('Kahneman Lab Simulation Mode active. Pupil expands in real-time according to cognitive load.', 'info');
});

metronomeToggle.addEventListener('click', () => {
  if (state.metronomeActive) {
    stopMetronome();
  } else {
    startMetronome();
  }
});

soundToggle.addEventListener('click', () => {
  state.soundEnabled = !state.soundEnabled;
  soundStatus.textContent = state.soundEnabled ? 'On' : 'Off';
  soundToggle.classList.toggle('active', state.soundEnabled);
});

pacingSelect.addEventListener('change', (e) => {
  state.pacingMode = e.target.value;
  appendAnalysisLog(`Presentation mode: ${state.pacingMode}.`);
  startRound();
});

probeToggle.addEventListener('change', (e) => {
  state.probeActive = e.target.checked;
  appendAnalysisLog(`Attentional blindness probe ${state.probeActive ? 'enabled' : 'disabled'}.`);
});

clearLogBtn.addEventListener('click', () => {
  state.analysisLog = [];
  analysisLog.innerHTML = '<div class="analysis-log-entry">Telemetry stream cleared.</div>';
});

if (tabCurrent) {
  tabCurrent.addEventListener('click', () => {
    state.currentCropTab = 'current';
    tabCurrent.classList.add('active');
    if (tabAll) tabAll.classList.remove('active');
    renderAttemptGrid();
  });
}

if (tabAll) {
  tabAll.addEventListener('click', () => {
    state.currentCropTab = 'all';
    tabAll.classList.add('active');
    if (tabCurrent) tabCurrent.classList.remove('active');
    renderAttemptGrid();
  });
}

scienceBtn.addEventListener('click', openScienceModal);
closeScienceBtn.addEventListener('click', closeScienceModal);
summaryBtn.addEventListener('click', openSummaryModal);
closeSummaryBtn.addEventListener('click', closeSummaryModal);
downloadReportBtn.addEventListener('click', downloadTelemetryReport);
resetSessionBtn.addEventListener('click', resetSession);

// Close modals when clicking backdrop or Escape key
window.addEventListener('click', (e) => {
  if (e.target === scienceModal) closeScienceModal();
  if (e.target === summaryModal) closeSummaryModal();
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeScienceModal();
    closeSummaryModal();
  }
});

document.querySelectorAll('.mode-pill').forEach((pill) => {
  pill.addEventListener('click', () => switchMode(pill.dataset.mode));
});

window.addEventListener('beforeunload', () => {
  disableCamera();
  stopMetronome();
});

// Initialization
function init() {
  appendAnalysisLog('Daniel Kahneman Chapter 2 Cognitive Lab initialized.');
  appendAnalysisLog('Default mode: Physiological Simulation (webcam optional).');
  setSimulationMode(true);
  resetLevelAttempts();
  updateHud();
  startRound();
}

init();
