# Chapter 1 & 3: Two Systems & The Lazy Controller

This folder hosts the interactive Cognitive Reflection Test (CRT) demonstration inspired by Daniel Kahneman's *Thinking, Fast and Slow* (Part I: Chapters 1, 3, and 6).

## The Concept

Shane Frederick and Daniel Kahneman demonstrated that many reasoning errors occur not because people lack the intellectual capacity to solve problems, but because **System 2 is inherently lazy**.

System 1 impulsively produces a plausible, intuitive answer. Unless System 2 actively pauses, monitors, and verifies the intuition, the lazy controller blindly endorses the error.

## Included Classic Problems

1. **The Bat and the Ball Problem**:
   - Total cost: $1.10. Bat costs $1.00 more than ball.
   - System 1 answer: 10 cents (wrong).
   - System 2 answer: 5 cents (correct).
2. **The 5 Machines & 5 Widgets Problem**: Parallel work rate vs pattern matching.
3. **The Lily Pads in the Lake**: Exponential growth vs linear halving.
4. **The Moses Illusion**: Associative semantic matching vs rigorous verification.
5. **The Rose Syllogism**: Believability bias vs formal deductive validity.

## How to Run

```bash
poetry run python ch1-twosystems/cognitive_reflection.py
```

Tracks your deliberation latency (seconds spent before answering) and classifies your cognitive profile into Kahneman's diagnostic categories.

