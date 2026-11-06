# Chapter 2: Attention and Effort

This folder contains a small interactive demonstration inspired by Daniel Kahneman's discussion of effortful thinking and mental workload.

## Demo: Add-Overload

`addNoverload.py` simulates a short arithmetic task where each digit is increased by a running level value. The user is prompted to answer under time pressure, while the script also tries to estimate a rough eye-based "load index" using MediaPipe face landmarks.

## How to run

From the repo root:

```bash
poetry install
poetry run python ch2-attentionandeffort/addNoverload.py
```

Alternatively, the browser version lives in the repo root and can be run with:

```bash
poetry run python manage.py runserver 0.0.0.0:8000
```

If the Python environment does not support the webcam/MediaPipe path, the script automatically falls back to a terminal demo mode and still runs the game.

## Conceptual goal

This script is meant to make a psychological idea tangible:

- cognitive effort increases with mental demand
- performance degrades as the task becomes more taxing
- attention is a limited resource that can be strained by overload

It is designed as an educational toy, not a scientific instrument.
