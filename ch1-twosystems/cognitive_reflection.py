"""
Thinking, Fast and Slow · Part I: Two Systems
Chapter 1 & 3: System 1 (Intuitive) vs System 2 (Deliberative)
Interactive Cognitive Reflection Test (CRT) with Reaction-Time Profiling
"""

import argparse
import sys
import time

CYAN = '\033[96m'
GREEN = '\033[92m'
YELLOW = '\033[93m'
RED = '\033[91m'
MAGENTA = '\033[95m'
BOLD = '\033[1m'
DIM = '\033[2m'
RESET = '\033[0m'

CRT_QUESTIONS = [
    {
        "id": "bat_and_ball",
        "chapter": "Chapter 1: The Two Systems & Chapter 3: The Lazy Controller",
        "question": "A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball.\nHow much does the ball cost in cents?",
        "intuitive": "10",
        "correct": "5",
        "explanation": "If the ball costs 5 cents, the bat costs $1.05 ($1.00 more), totaling $1.10.\nThe intuitive answer (10 cents) comes from System 1 automatically dividing 1.10 and 1.00.",
    },
    {
        "id": "five_machines",
        "chapter": "Chapter 3: The Lazy Controller",
        "question": "If it takes 5 machines 5 minutes to make 5 widgets,\nhow many minutes would it take 100 machines to make 100 widgets?",
        "intuitive": "100",
        "correct": "5",
        "explanation": "Each machine produces 1 widget in 5 minutes. 100 machines working in parallel take 5 minutes.\nSystem 1 seizes on the repeating pattern (5, 5, 5 -> 100, 100, 100).",
    },
    {
        "id": "lily_pads",
        "chapter": "Chapter 3: The Lazy Controller",
        "question": "In a lake, there is a patch of lily pads. Every day, the patch doubles in size.\nIf it takes 48 days to cover the entire lake, how many days does it take to cover HALF the lake?",
        "intuitive": "24",
        "correct": "47",
        "explanation": "Since the patch doubles daily, on day 47 it covers half the lake, and on day 48 it doubles to full.\nSystem 1 heuristically halves 48 to 24.",
    },
    {
        "id": "moses_illusion",
        "chapter": "Chapter 6: Norms, Surprises, and Causes",
        "question": "How many animals of each kind did Moses take onto the ark?\n(Enter a number, or 0 if a trick)",
        "intuitive": "2",
        "correct": "0",
        "explanation": "Noah built the ark, not Moses!\nSystem 1 matches 'biblical patriarch' and 'ark' into an associative norm, failing to notice the substitution.",
    },
    {
        "id": "roses_syllogism",
        "chapter": "Chapter 3: The Lazy Controller",
        "question": "Evaluate this syllogism:\n  - All roses are flowers.\n  - Some flowers fade quickly.\n  - Therefore, some roses fade quickly.\nIs this argument logically VALID or INVALID? (Enter valid or invalid)",
        "intuitive": "valid",
        "correct": "invalid",
        "explanation": "It is logically INVALID. The flowers that fade quickly might all be daisies or marigolds, not roses.\nSystem 1 mistakes 'empirically true in reality' for 'logically sound in deduction'.",
    },
]


def run_crt():
    print(f"\n{BOLD}{CYAN}=================================================================={RESET}")
    print(f"{BOLD}🧠 THE COGNITIVE REFLECTION TEST (CRT): SYSTEM 1 vs SYSTEM 2 🧠{RESET}")
    print(f"{BOLD}{CYAN}=================================================================={RESET}")
    print(f"{DIM}Inspired by Daniel Kahneman's Thinking, Fast and Slow (Ch. 1, 3 & 6){RESET}\n")
    print("These questions are designed so that an intuitive, compelling answer immediately")
    print("comes to mind (System 1). Only deliberate checking (System 2) can verify it.\n")

    input(f"Press {BOLD}[Enter]{RESET} to begin the test...")

    results = []
    total_time = 0

    for idx, item in enumerate(CRT_QUESTIONS, 1):
        print(f"\n{BOLD}{YELLOW}--- Question {idx}/{len(CRT_QUESTIONS)} ---{RESET}")
        print(f"{BOLD}{item['question']}{RESET}\n")

        start = time.time()
        try:
            user_raw = input(f"{CYAN}Your Answer: {RESET}").strip().lower()
        except (EOFError, KeyboardInterrupt):
            print("\nTest cancelled.")
            return
        elapsed = time.time() - start
        total_time += elapsed

        # Clean answer
        user_clean = user_raw.replace('$', '').replace('cents', '').replace('days', '').replace('minutes', '').strip()

        is_correct = (user_clean == item['correct'].lower())
        is_intuitive = (user_clean == item['intuitive'].lower())

        results.append({
            'id': item['id'],
            'elapsed': elapsed,
            'is_correct': is_correct,
            'is_intuitive': is_intuitive,
            'user': user_raw,
            'correct': item['correct'],
            'intuitive': item['intuitive'],
            'explanation': item['explanation'],
        })

        if is_correct:
            print(f"  {GREEN}✅ Correct!{RESET} Deliberation time: {elapsed:.2f}s")
            print(f"  {DIM}{item['explanation']}{RESET}")
        elif is_intuitive:
            print(f"  {RED}❌ System 1 Intuitive Trap!{RESET} (Answered in {elapsed:.2f}s)")
            print(f"  Your answer '{user_raw}' is the exact heuristic answer System 1 leaps to.")
            print(f"  Correct Answer: {BOLD}{item['correct']}{RESET}")
            print(f"  {DIM}{item['explanation']}{RESET}")
        else:
            print(f"  {RED}❌ Incorrect.{RESET} (Answered in {elapsed:.2f}s)")
            print(f"  Correct Answer: {BOLD}{item['correct']}{RESET}")
            print(f"  {DIM}{item['explanation']}{RESET}")

    # Summary analysis
    correct_count = sum(1 for r in results if r['is_correct'])
    intuitive_count = sum(1 for r in results if r['is_intuitive'])
    avg_latency = total_time / len(results)

    print(f"\n{BOLD}{CYAN}=================================================================={RESET}")
    print(f"{BOLD}📊 COGNITIVE REFLECTION ASSESSMENT RESULTS 📊{RESET}")
    print(f"{BOLD}{CYAN}=================================================================={RESET}")
    print(f"Score: {BOLD}{correct_count}/{len(CRT_QUESTIONS)}{RESET} ({correct_count/len(CRT_QUESTIONS)*100:.0f}%)")
    print(f"System 1 Heuristic Triggers: {BOLD}{intuitive_count}/{len(CRT_QUESTIONS)}{RESET}")
    print(f"Average Deliberation Latency: {avg_latency:.2f} seconds\n")

    print(f"{BOLD}Kahneman Diagnosis:{RESET}")
    if correct_count == len(CRT_QUESTIONS):
        print(f"{GREEN}Vigilant System 2 Controller:{RESET} You actively resisted the compelling initial intuitions")
        print("and mobilized analytical effort to verify logical validity.")
    elif intuitive_count >= 2:
        print(f"{YELLOW}The Lazy Controller in Action:{RESET} As Kahneman explains in Chapter 3, System 1 offered")
        print("a plausible, effortless answer, and System 2 endorsed it without doing the math.")
        print("'People are not accustomed to thinking hard, and are often content to trust a plausible judgment.'")
    else:
        print(f"{CYAN}Balanced Processing:{RESET} A mix of heuristic intuition and deliberate verification.")

    print(f"{BOLD}{CYAN}=================================================================={RESET}\n")


if __name__ == '__main__':
    run_crt()

