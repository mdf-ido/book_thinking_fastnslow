# Thinking, Fast and Slow

This repository hosts small Python experiments and explanations inspired by Daniel Kahneman's book, Thinking, Fast and Slow.

The goal is to make the book's ideas concrete through code, examples, and interactive demos that connect cognitive psychology concepts to practical programming exercises.

## Structure

- `ch2-attentionandeffort/` – the original terminal experiment and companion notes
- `kahneman_game/` – the Django browser app for an interactive Chapter 2 demo
- `book_project/` – Django project configuration
- `k8s/` – Kubernetes deployment starter manifests

## Browser app

The repo now includes a lightweight Django site that lets you play the Chapter 2 arithmetic challenge in a browser and optionally enable a webcam preview for the experience.

The face and eye pipeline is intentionally browser-first, but the more reliable workflow is now a capture-and-analyze pattern:

- the browser requests the webcam and lets the user record a short clip
- the user uploads the captured clip to Django
- the Python pipeline analyzes the saved video with OpenCV and estimates a pupil-dilation signal
- the Django app serves the page and keeps the backend lightweight for deployment

This is the right boundary for Kubernetes: the pod should host the web app, not the webcam stream. The actual camera access remains on the user device/browser, while the analysis runs after capture for more reliable detection.

Run it locally with Poetry:

```bash
poetry install
poetry run python manage.py runserver 0.0.0.0:8000
```

Open `http://localhost:8000` in a browser.

## Containerized deployment

Build and run with Docker Compose:

```bash
docker compose up --build
```

The app is exposed on port `8000` and is designed to be a straightforward base for later Kubernetes deployment.

## Original terminal experiment

The first project is a terminal-based working-memory and effort simulation inspired by the chapter's idea that effortful thinking is costly and can be measured by increased load.

```bash
poetry run python ch2-attentionandeffort/addNoverload.py
```

## Notes

This repo is meant for learning and demonstration. It is not a formal research tool or a scientifically validated cognitive assessment.

## License

This project is intentionally minimal and intended for learning and experimentation.
