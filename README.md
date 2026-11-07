# Thinking, Fast and Slow · Cognitive Psychology Laboratory

This repository hosts interactive experiments and computational demonstrations inspired by Daniel Kahneman's seminal book, *Thinking, Fast and Slow*.

The focus is **Chapter 2: Attention and Effort**, bringing Jackson Beatty and Daniel Kahneman's foundational 1966 pupillometry research to life through code, real-time computer vision, and cognitive simulation.

---

## What's New & Enhanced

- 🧠 **Dual Pupillometry Engine**:
  - **Live Webcam Mode**: Real-time facial landmark tracking (MediaPipe) combined with OpenCV video analysis of pupil dilation and autonomic nervous system arousal.
  - **Kahneman Lab Simulation Mode**: Physiological simulation driven by Kahneman & Beatty's 1966 empirical equations (works anywhere, without webcam hardware or permissions).
- ⏱️ **Audio-Visual 60 BPM Pacing Metronome**: Ticking at 1 beat per second, matching the exact rhythm used in Beatty & Kahneman's laboratory experiments (synthesized locally via the Web Audio API).
- 🎯 **Kahneman Task Selector**:
  - Progressive Campaign (Add-1 $\to$ Add-2 $\to$ Add-3 $\to$ Add-4).
  - Direct Task Selector: Add-1 (System 2 warmup), Add-2 (active focus), Add-3 (peak working memory capacity), Add-4 (cognitive overload stress test).
  - Paced sequential digit presentation (1 digit/sec) vs instant simultaneous display.
- 🦍 **Attentional Blindness Probe ("The Invisible Gorilla")**: Demonstrates how high System 2 cognitive load induces sensory narrowing and peripheral inattentional blindness.
- 📈 **Telemetry & Scientific Dilation Curve**: Real-time chart comparing measured pupil dilation against Jackson Beatty & Daniel Kahneman's 1966 published empirical baselines (+5.2%, +9.8%, +15.6%, +18.0%).
- 🔬 **OpenCV Pupillometry Pipeline**: Adaptive dark-percentile thresholding, circularity filtering, reticle annotation, and multi-tier cognitive classifications.
- 📊 **Session Assessment & Telemetry Export**: Download full session cognitive telemetry as JSON, complete with reaction times, error rates, and peak dilation series.
- 🏥 **Health Checks & Kubernetes Ready**: Added `/api/health/` and `/api/benchmark/` endpoints for reliable container orchestration and liveness/readiness probes.
- 💻 **Upgraded Terminal CLI**: Rich ANSI terminal formatting, `--benchmark` tables, `--demo` mode, and custom rounds.

---

## Structure

- `kahneman_game/` – Django web app for the interactive Chapter 2 Cognitive Lab (HTML/CSS/JS + OpenCV)
- `book_project/` – Django project configuration, routes, and settings
- `ch1-twosystems/` – The Cognitive Reflection Test (System 1 intuitive traps vs System 2 verification)
- `ch2-attentionandeffort/` – Terminal-based working memory experiment with CLI arguments
- `k8s/` – Kubernetes deployment manifests with `/api/health/` readiness probes
- `Dockerfile` & `docker-compose.yml` – Container configurations

---

## Running Locally

### 1. Browser Cognitive Lab (Django)

Run with Poetry or Python:

```bash
poetry install
poetry run python manage.py runserver 0.0.0.0:8000
```

Open `http://localhost:8000` in your browser.

- The app starts in **Simulation Mode** by default so you can experiment immediately without granting camera permissions.
- Click **"Enable Camera"** anytime to switch to live webcam pupillometry with OpenCV backend analysis.
- Click **"Metronome"** to enable the 1-second audio-visual pacer.
- Click **"Science"** in the top navigation to read Kahneman's original theory and data tables.

### 2. Terminal Experiment (`addNoverload.py`)

Run the enhanced CLI version:

```bash
# Standard interactive run
poetry run python ch2-attentionandeffort/addNoverload.py

# Run in simulation mode (no webcam needed)
poetry run python ch2-attentionandeffort/addNoverload.py --demo

# Inspect Kahneman & Beatty (1966) empirical research benchmarks
poetry run python ch2-attentionandeffort/addNoverload.py --benchmark

# Start directly at Level 3 (Add-3 peak capacity)
poetry run python ch2-attentionandeffort/addNoverload.py --level 3 --rounds 2
```

---

## Containerized Deployment

Run with Docker Compose:

```bash
docker compose up --build
```

Access the application at `http://localhost:8000`.

To verify health:

```bash
curl http://localhost:8000/api/health/
```

---

## Running Tests

Run the Django automated test suite:

```bash
poetry run python manage.py test kahneman_game
```

All 15 unit and integration tests covering vision pipelines, synthetic pupils, video upload endpoints, and Add-N math rules will execute.

---

## Notes & Attribution

This project is an educational demonstration inspired by:
- Daniel Kahneman, *Thinking, Fast and Slow* (Farrar, Straus and Giroux, 2011), specifically Chapter 2: "Attention and Effort".
- Beatty, J., & Kahneman, D. (1966). *Pupillary changes in two memory tasks*. Psychonomic Science, 5(10), 371-372.

It is designed for learning, demonstration, and exploring cognitive computing.
