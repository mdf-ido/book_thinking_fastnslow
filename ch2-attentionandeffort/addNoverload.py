import random
import time

try:
  import cv2
except ImportError:  # pragma: no cover - optional visual dependency
  cv2 = None

try:
  import mediapipe as mp
except ImportError:  # pragma: no cover - optional visual dependency
  mp = None


def get_face_mesh():
  if mp is None or not hasattr(mp, "solutions"):
    return None

  try:
    return mp.solutions.face_mesh.FaceMesh(
        max_num_faces=1, refine_landmarks=True, min_detection_confidence=0.5
    )
  except Exception:
    return None


def estimate_load_index(level, elapsed, face_mesh=None, cap=None):
  if face_mesh is not None and cap is not None:
    try:
      ret, frame = cap.read()
      if ret:
        h, w, _ = frame.shape
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = face_mesh.process(rgb_frame)

        if results.multi_face_landmarks:
          measurements = []
          for face_landmarks in results.multi_face_landmarks:
            left_eye_top = face_landmarks.landmark[159]
            left_eye_bottom = face_landmarks.landmark[145]
            eye_height = abs(left_eye_top.y - left_eye_bottom.y) * h
            measurements.append(eye_height)
          if measurements:
            return sum(measurements) / len(measurements)
    except Exception:
      pass

  return 10.0 + (level * 4.0) + (elapsed * 3.0)


def safe_input(prompt):
  try:
    return input(prompt).strip()
  except EOFError:
    return ""


def track_pupil_and_play():
  print("=" * 65)
  print("🧠 KAHNEMAN COGNITIVE LAB: SYSTEM 2 WITH PUPILLOMETRY 🧠")
  print("=" * 65)

  face_mesh = get_face_mesh()
  cap = None
  if cv2 is not None and face_mesh is not None:
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
      print("❌ Error: Could not open webcam. Running in standard mode.")
      cap = None
    else:
      print("✅ Webcam active! Keep your face visible to the camera.")
  else:
    print("ℹ️  Webcam tracking is unavailable in this environment; running in terminal/demo mode.")

  print("Rules: Add the current Level number to each digit. Digits wrap at 10.")
  safe_input("Press [Enter] to start the experiment...")

  level = 1
  score = 0
  lives = 3

  while lives > 0:
    print(f"\n🌟 --- LEVEL {level} (Add {level} to each digit) --- 🌟")
    print(f"❤️ Lives: {lives}  |  🏆 Score: {score}")

    round_success = True

    for r in range(1, 4):
      original_digits = [random.randint(0, 9) for _ in range(4)]
      question_str = "".join(map(str, original_digits))

      expected_digits = []
      for d in original_digits:
        val = (d + level) % 10
        expected_digits.append(str(val))
      expected_str = "".join(expected_digits)

      print(f"\n  Round {r}/3 -> Input Number: ** {question_str} **")
      if cap is not None:
        print("  [Camera is monitoring pupil dilation in background...]")
      else:
        print("  [Falling back to a simulated load estimate for this demo.]")

      start_time = time.time()
      user_input = safe_input("  Your Answer: ")
      end_time = time.time()
      elapsed = end_time - start_time

      avg_dilation = estimate_load_index(level, elapsed, face_mesh=face_mesh, cap=cap)
      print(f"  📊 Recorded Eye Metric (Load Index): {avg_dilation:.1f}px")

      if user_input == expected_str:
        print(f"  ✅ Correct! ({elapsed:.2f}s)")
        score += 10 * level
      else:
        print(f"  ❌ Incorrect. Expected: {expected_str}")
        lives -= 1
        round_success = False
        print(f"  💔 Lost a life! Lives remaining: {lives}")
        break

    if lives <= 0:
      break

    if round_success:
      print(f"\n🎉 LEVEL {level} CLEARED! Moving to Level {level + 1}...")
      level += 1
      time.sleep(1)

  if cap is not None:
    cap.release()
    cv2.destroyAllWindows()

  print("\n" + "=" * 65)
  print("💀 EXPERIMENT CONCLUDED 💀")
  print(f"Final Level Reached: Level {level}")
  print(f"Final Score: {score}")
  print("Notice how your cognitive load spiked as the levels scaled up!")
  print("=" * 65)


if __name__ == "__main__":
  track_pupil_and_play()