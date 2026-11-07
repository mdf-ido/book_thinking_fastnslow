# Chapter 2: Attention and Effort · Terminal Experiment

This folder hosts the terminal-based cognitive effort simulation inspired by Daniel Kahneman's *Thinking, Fast and Slow* (Chapter 2).

## Features

- **Add-N Working Memory Challenge**: Hold 4 digits in memory and transform each by adding $N$ (with modulo 10 wrapping).
- **Pupillometric Load Estimation**:
  - Live webcam tracking with MediaPipe and OpenCV (when webcam is connected).
  - Physiological simulation mode based on Jackson Beatty & Daniel Kahneman's 1966 empirical research.
- **Cognitive Diagnostics**: Categorizes your effort into Kahneman's cognitive tiers:
  - *System 1 / Light Load* (<7% dilation)
  - *System 2 · Active Focus* (7–13% dilation)
  - *System 2 · Near Max Capacity* (13–20% dilation)
  - *System 2 · Cognitive Overload* (>20% dilation or performance drop)

## Usage

```bash
# Run interactive experiment
poetry run python ch2-attentionandeffort/addNoverload.py

# Run in simulation mode (no camera needed)
poetry run python ch2-attentionandeffort/addNoverload.py --demo

# View the 1966 Kahneman & Beatty empirical benchmark table
poetry run python ch2-attentionandeffort/addNoverload.py --benchmark

# Start directly at Level 3 (Add-3 peak effort) with 5 rounds
poetry run python ch2-attentionandeffort/addNoverload.py --level 3 --rounds 5
```

## Options

| Flag | Description |
|---|---|
| `--demo` / `--no-cam` | Run in pure simulation mode without initializing webcam |
| `--level [1-4]` | Choose starting level (1: Add-1, 2: Add-2, 3: Add-3, 4: Add-4) |
| `--rounds N` | Number of challenges per level (default: 3) |
| `--benchmark` | Display Daniel Kahneman & Jackson Beatty's 1966 pupillometry table and exit |
