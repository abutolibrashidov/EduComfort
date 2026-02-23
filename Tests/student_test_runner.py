"""
Student Test Runner - Production Version
Features:
- No answer display during test
- Score tracking and percentage calculation
- Time limits with auto-submit
- Clean, student-friendly interface
"""

import json
import os
import time
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple

class TestSession:
    """Manages a single test-taking session."""
    
    def __init__(self, test_data: Dict, time_limit_minutes: Optional[int] = None):
        self.test_data = test_data
        self.time_limit = time_limit_minutes
        self.start_time = None
        self.end_time = None
        self.responses = {}
        self.score = 0
        self.total_questions = 0
        self.correct_answers = 0
        
    def start(self):
        """Start the test timer."""
        self.start_time = datetime.now()
        
    def time_remaining(self) -> Optional[int]:
        """Get remaining time in seconds."""
        if not self.time_limit or not self.start_time:
            return None
        
        elapsed = (datetime.now() - self.start_time).total_seconds()
        remaining = (self.time_limit * 60) - elapsed
        return max(0, int(remaining))
    
    def is_time_up(self) -> bool:
        """Check if time limit has been reached."""
        if not self.time_limit:
            return False
        
        remaining = self.time_remaining()
        return remaining is not None and remaining <= 0
    
    def add_response(self, question_id: str, response: str, is_correct: bool):
        """Record a student response."""
        self.responses[question_id] = {
            'answer': response,
            'correct': is_correct,
            'timestamp': datetime.now().isoformat()
        }
        
        self.total_questions += 1
        if is_correct:
            self.correct_answers += 1
    
    def get_percentage(self) -> float:
        """Calculate percentage score."""
        if self.total_questions == 0:
            return 0.0
        return (self.correct_answers / self.total_questions) * 100
    
    def submit(self):
        """Submit the test and finalize timing."""
        self.end_time = datetime.now()
        
    def get_summary(self) -> Dict:
        """Get test session summary."""
        return {
            'test_id': self.test_data.get('testId', 'Unknown'),
            'student_name': self.responses.get('student_name', 'Anonymous'),
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'total_questions': self.total_questions,
            'correct_answers': self.correct_answers,
            'percentage': round(self.get_percentage(), 2),
            'responses': self.responses
        }


def clear_screen():
    """Clear the terminal screen."""
    os.system('cls' if os.name == 'nt' else 'clear')


def print_header(text: str, char: str = "="):
    """Print a formatted header."""
    width = 70
    print(char * width)
    print(f" {text.center(width - 2)} ")
    print(char * width)


def print_time_remaining(session: TestSession):
    """Display remaining time if applicable."""
    if session.time_limit:
        remaining = session.time_remaining()
        if remaining is not None:
            minutes = remaining // 60
            seconds = remaining % 60
            print(f"\n⏱️  Time Remaining: {minutes:02d}:{seconds:02d}")


def normalize_answer(answer: str) -> str:
    """Normalize answer for comparison."""
    return answer.lower().strip()


def check_answer(user_answer: str, correct_answers: List[str]) -> bool:
    """Check if user answer matches any correct answer."""
    user_normalized = normalize_answer(user_answer)
    correct_normalized = [normalize_answer(ans) for ans in correct_answers]
    return user_normalized in correct_normalized


def get_student_input(prompt: str = "Your answer: ", allow_skip: bool = False) -> Optional[str]:
    """Get input from student."""
    if allow_skip:
        prompt = f"{prompt}(or type 'skip' to leave blank): "
    
    response = input(prompt).strip()
    
    if allow_skip and response.lower() == 'skip':
        return None
    
    return response


def run_fill_in_blanks_dialogue(question: Dict, session: TestSession) -> int:
    """Run dialogue fill-in-blanks without showing answers."""
    print(f"\n📝 {question.get('instructions', 'Complete the dialogue.')}")
    
    content = question.get('content', {})
    points_earned = 0
    
    for dialogue in content.get('dialogues', []):
        dialogue_id = dialogue.get('dialogueId', '')
        if dialogue_id:
            print(f"\n💬 Dialogue {dialogue_id}:")
        
        for exchange in dialogue.get('exchanges', []):
            speaker = exchange.get('speaker', 'Speaker')
            
            # Display line with blanks
            print(f"\n{speaker}: ", end="")
            for blank in exchange.get('blanks', []):
                before = blank.get('beforeText', '')
                prompt = blank.get('prompt', '')
                after = blank.get('afterText', '')
                
                print(f"{before}", end="")
                if prompt:
                    print(f" [{prompt}] ", end="")
                else:
                    print(" [___] ", end="")
                print(f"{after}", end=" ")
            print()
            
            # Get student answers
            for blank in exchange.get('blanks', []):
                blank_id = blank.get('blankId', '')
                prompt_text = blank.get('prompt', '')
                
                if prompt_text:
                    user_answer = get_student_input(f"  {blank_id} ({prompt_text}): ", allow_skip=True)
                else:
                    user_answer = get_student_input(f"  {blank_id}: ", allow_skip=True)
                
                if user_answer:
                    correct = blank.get('correctAnswers', [])
                    is_correct = check_answer(user_answer, correct)
                    
                    if is_correct:
                        print("  ✅")
                        points_earned += 1
                    else:
                        print("  ❌")
                    
                    session.add_response(f"{dialogue_id}_{blank_id}", user_answer, is_correct)
                else:
                    print("  ⏭️  Skipped")
                    session.add_response(f"{dialogue_id}_{blank_id}", "", False)
    
    return points_earned


def run_fill_in_blanks_simple(question: Dict, session: TestSession) -> int:
    """Run simple fill-in-blanks without showing answers."""
    print(f"\n📝 {question.get('instructions', 'Complete the sentences.')}")
    
    content = question.get('content', {})
    
    # Show word bank if available
    if 'providedWords' in content:
        print(f"\n📚 Word Bank: {', '.join(content['providedWords'])}")
    elif 'providedVerbs' in content:
        print(f"\n📚 Verbs: {', '.join(content['providedVerbs'])}")
    
    points_earned = 0
    
    for s in content.get('sentences', []):
        sentence_id = s.get('sentenceId', '')
        text = s.get('text', '')
        
        print(f"\n{sentence_id}. {text}")
        user_answer = get_student_input(allow_skip=True)
        
        if user_answer:
            correct = s.get('correctAnswers', [])
            is_correct = check_answer(user_answer, correct)
            
            if is_correct:
                print("  ✅ Correct!")
                points_earned += 1
            else:
                print("  ❌ Incorrect")
            
            session.add_response(sentence_id, user_answer, is_correct)
        else:
            print("  ⏭️  Skipped")
            session.add_response(sentence_id, "", False)
    
    return points_earned


def run_error_correction(question: Dict, session: TestSession) -> int:
    """Run error correction without showing answers."""
    print(f"\n📝 {question.get('instructions', 'Find and correct mistakes.')}")
    
    content = question.get('content', {})
    points_earned = 0
    
    for s in content.get('sentences', []):
        sentence_id = s.get('sentenceId', '')
        sentence = s.get('sentence', '')
        
        print(f"\n{sentence_id}. {sentence}")
        print("  Write the correction:")
        user_answer = get_student_input(allow_skip=True)
        
        if user_answer:
            correct = [s.get('correction', '')]
            variants = s.get('acceptableVariants', [])
            is_correct = check_answer(user_answer, correct + variants)
            
            if is_correct:
                print("  ✅ Correct!")
                points_earned += 1
            else:
                print("  ❌ Incorrect")
            
            session.add_response(sentence_id, user_answer, is_correct)
        else:
            print("  ⏭️  Skipped")
            session.add_response(sentence_id, "", False)
    
    return points_earned


def run_multiple_choice(question: Dict, session: TestSession) -> int:
    """Run multiple choice without showing answers."""
    print(f"\n📝 {question.get('instructions', 'Choose the correct answer.')}")
    
    content = question.get('content', {})
    points_earned = 0
    
    for q in content.get('questions', []):
        q_id = q.get('questionId', q.get('id', ''))
        question_text = q.get('question', q.get('sentence', ''))
        
        print(f"\n{q_id}. {question_text}")
        
        options = q.get('options', [])
        
        # Display options
        if options and isinstance(options[0], dict):
            for opt in options:
                print(f"   {opt['id']}) {opt['text']}")
        else:
            for idx, opt in enumerate(options):
                letter = chr(ord('a') + idx)
                print(f"   {letter}) {opt}")
        
        user_answer = get_student_input("  Select option: ", allow_skip=True)
        
        if user_answer:
            correct = q.get('correctAnswers', [])
            if not correct:
                correct = [q.get('correctAnswer', '')]
            
            is_correct = check_answer(user_answer, correct)
            
            if is_correct:
                print("  ✅ Correct!")
                points_earned += 1
            else:
                print("  ❌ Incorrect")
            
            session.add_response(q_id, user_answer, is_correct)
        else:
            print("  ⏭️  Skipped")
            session.add_response(q_id, "", False)
    
    return points_earned


def run_true_false(question: Dict, session: TestSession) -> int:
    """Run true/false questions without showing answers."""
    print(f"\n📝 {question.get('instructions', 'Answer True or False.')}")
    
    content = question.get('content', {})
    
    if 'audioFile' in content:
        print(f"🔊 Audio: {content['audioFile']}")
    
    points_earned = 0
    
    for stmt in content.get('statements', []):
        stmt_id = stmt.get('statementId', stmt.get('id', ''))
        text = stmt.get('text', '')
        
        print(f"\n{stmt_id}. {text}")
        user_answer = get_student_input("  T or F: ", allow_skip=True)
        
        if user_answer:
            correct = [stmt.get('correctAnswer', '')]
            is_correct = check_answer(user_answer, correct)
            
            if is_correct:
                print("  ✅ Correct!")
                points_earned += 1
            else:
                print("  ❌ Incorrect")
            
            session.add_response(stmt_id, user_answer, is_correct)
        else:
            print("  ⏭️  Skipped")
            session.add_response(stmt_id, "", False)
    
    return points_earned


def run_gap_fill_matching(question: Dict, session: TestSession) -> int:
    """Run gap-fill matching without showing answers."""
    print(f"\n📝 {question.get('instructions', 'Match sentences to gaps.')}")
    
    content = question.get('content', {})
    
    # Display text with gaps
    print("\n📄 Text:")
    for item in content.get('textWithGaps', []):
        if item['type'] == 'text':
            print(item['content'], end=" ")
        elif item['type'] == 'gap':
            print(f"[{item['gapNumber']}]", end=" ")
    print("\n")
    
    # Display sentences
    print("📋 Sentences:")
    for s in content.get('sentences', []):
        print(f"  {s['id']}) {s['text']}")
    
    points_earned = 0
    correct_matches = content.get('correctMatches', {})
    
    print("\n🎯 Match sentences to gaps:")
    for gap in sorted(correct_matches.keys()):
        user_answer = get_student_input(f"  Gap {gap}: ", allow_skip=True)
        
        if user_answer:
            is_correct = check_answer(user_answer, [correct_matches[gap]])
            
            if is_correct:
                print("  ✅ Correct!")
                points_earned += 1
            else:
                print("  ❌ Incorrect")
            
            session.add_response(f"gap_{gap}", user_answer, is_correct)
        else:
            print("  ⏭️  Skipped")
            session.add_response(f"gap_{gap}", "", False)
    
    return points_earned


def run_guided_writing(question: Dict, session: TestSession) -> int:
    """Run guided writing exercise."""
    print(f"\n📝 {question.get('instructions', 'Write according to the prompt.')}")
    
    content = question.get('content', {})
    print(f"\n✍️  {content.get('prompt', '')}")
    
    requirements = content.get('requirements', [])
    if requirements:
        print("\n📋 Requirements:")
        for req in requirements:
            print(f"   • {req}")
    
    print("\n💡 Write your answer (type 'DONE' on a new line when finished):")
    
    lines = []
    while True:
        line = input()
        if line.strip().upper() == 'DONE':
            break
        lines.append(line)
    
    writing = '\n'.join(lines)
    
    if writing.strip():
        print("\n✅ Writing submitted!")
        session.add_response('writing', writing, True)  # Writing is manually graded
        return 1  # Placeholder points
    else:
        print("\n⏭️  No writing submitted")
        session.add_response('writing', "", False)
        return 0


# Question type handlers mapping
STUDENT_HANDLERS = {
    'fill-in-blanks-dialogue': run_fill_in_blanks_dialogue,
    'fill-in-blanks-simple': run_fill_in_blanks_simple,
    'error-correction': run_error_correction,
    'multiple-choice': run_multiple_choice,
    'true-false': run_true_false,
    'true-false-listening': run_true_false,
    'gap-fill-matching': run_gap_fill_matching,
    'guided-writing': run_guided_writing,
}


def run_student_test(test_data: Dict, time_limit: Optional[int] = None):
    """Run a complete test for a student."""
    session = TestSession(test_data, time_limit)
    
    clear_screen()
    print_header("STUDENT TEST")
    
    metadata = test_data.get('metadata', {})
    print(f"\n📚 {metadata.get('title', 'Test')}")
    print(f"🆔 Test ID: {test_data.get('testId', 'Unknown')}")
    
    if time_limit:
        print(f"⏱️  Time Limit: {time_limit} minutes")
    
    # Get student name
    student_name = input("\n👤 Enter your name: ").strip()
    session.responses['student_name'] = student_name
    
    input("\n▶️  Press Enter to start the test...")
    session.start()
    
    # Run test sections
    for section in test_data.get('sections', []):
        if session.is_time_up():
            print("\n⏰ TIME'S UP! Auto-submitting...")
            break
        
        clear_screen()
        print_time_remaining(session)
        
        print(f"\n{'='*70}")
        print(f"📖 SECTION: {section.get('sectionName', 'Unknown')}")
        print(f"   Marks: {section.get('totalMarks', 0)}")
        print(f"{'='*70}")
        
        for question in section.get('questions', []):
            if session.is_time_up():
                print("\n⏰ TIME'S UP!")
                break
            
            q_type = question.get('type', 'unknown')
            handler = STUDENT_HANDLERS.get(q_type)
            
            if handler:
                try:
                    handler(question, session)
                except Exception as e:
                    print(f"\n❌ Error: {e}")
            else:
                print(f"\n⚠️  Question type '{q_type}' not supported in student mode")
            
            print("\n" + "-"*70)
            
            if not session.is_time_up():
                input("⏭️  Press Enter for next question...")
    
    # Submit test
    session.submit()
    
    # Show results
    clear_screen()
    print_header("TEST COMPLETE", "=")
    
    summary = session.get_summary()
    
    print(f"\n👤 Student: {student_name}")
    print(f"📊 Score: {summary['correct_answers']}/{summary['total_questions']}")
    print(f"📈 Percentage: {summary['percentage']}%")
    
    # Save results
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"result_{student_name.replace(' ', '_')}_{timestamp}.json"
    
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
    
    print(f"\n💾 Results saved to: {filename}")
    print("\n" + "="*70)


def main():
    """Main function for student test runner."""
    print_header("STUDENT TEST SYSTEM")
    
    test_file = input("\n📂 Enter test file path: ").strip()
    
    if not os.path.exists(test_file):
        print(f"❌ File not found: {test_file}")
        return
    
    try:
        with open(test_file, 'r', encoding='utf-8') as f:
            test_data = json.load(f)
    except Exception as e:
        print(f"❌ Error loading test: {e}")
        return
    
    # Ask for time limit
    time_input = input("\n⏱️  Set time limit in minutes (or press Enter for no limit): ").strip()
    
    time_limit = None
    if time_input:
        try:
            time_limit = int(time_input)
        except ValueError:
            print("⚠️  Invalid time, proceeding without limit")
    
    run_student_test(test_data, time_limit)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user")
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")