"""
Auto-checking engine for exercise validation
"""

import re
from difflib import SequenceMatcher
from typing import Tuple, Dict, List, Optional


class ExerciseValidator:
    """Validates student answers against correct answers"""

    @staticmethod
    def validate_answer(
        student_answer: str,
        correct_answer: str,
        exercise_type: str,
        case_sensitive: bool = False,
        accept_partial: bool = False,
        alternative_answers: Optional[List[str]] = None,
    ) -> Tuple[bool, str]:
        """
        Validate student answer and return (is_correct, feedback)
        
        Args:
            student_answer: What student submitted
            correct_answer: Expected correct answer
            exercise_type: Type of exercise (gap_fill, mcq, true_false, matching, short_answer)
            case_sensitive: Whether to match case exactly
            accept_partial: Accept partial or similar matches
            alternative_answers: List of alternative acceptable answers
        
        Returns:
            (is_correct, feedback)
        """
        
        # Clean answers
        student_answer_clean = student_answer.strip()
        correct_answer_clean = correct_answer.strip()
        
        # Handle different exercise types
        if exercise_type == "gap_fill":
            return ExerciseValidator._validate_gap_fill(
                student_answer_clean,
                correct_answer_clean,
                case_sensitive,
                accept_partial,
                alternative_answers
            )
        
        elif exercise_type == "mcq":
            return ExerciseValidator._validate_mcq(student_answer_clean, correct_answer_clean)
        
        elif exercise_type == "true_false":
            return ExerciseValidator._validate_true_false(student_answer_clean, correct_answer_clean)
        
        elif exercise_type == "matching":
            return ExerciseValidator._validate_matching(student_answer_clean, correct_answer_clean)
        
        elif exercise_type == "short_answer":
            return ExerciseValidator._validate_short_answer(
                student_answer_clean,
                correct_answer_clean,
                case_sensitive,
                accept_partial,
                alternative_answers
            )
        
        return False, "Unknown exercise type"

    @staticmethod
    def _validate_gap_fill(
        student_answer: str,
        correct_answer: str,
        case_sensitive: bool,
        accept_partial: bool,
        alternative_answers: Optional[List[str]]
    ) -> Tuple[bool, str]:
        """Validate gap-fill exercise"""
        
        # Normalize answers if not case sensitive
        if not case_sensitive:
            student_answer = student_answer.lower()
            correct_answer = correct_answer.lower()
        
        # Check exact match
        if student_answer == correct_answer:
            return True, "Correct! ✓"
        
        # Check alternative answers
        if alternative_answers:
            alt_answers = [a.lower() if not case_sensitive else a for a in alternative_answers]
            if student_answer in alt_answers:
                return True, "Correct! ✓"
        
        # Check partial match
        if accept_partial:
            similarity = ExerciseValidator._similarity(student_answer, correct_answer)
            if similarity >= 0.85:  # 85% similar
                return True, f"Correct! (Minor spelling variation accepted) ✓"
            elif similarity >= 0.70:  # 70% similar
                return False, f"Close, but not quite. Expected: {correct_answer}"
        
        return False, f"Incorrect. Expected: {correct_answer}"

    @staticmethod
    def _validate_mcq(student_answer: str, correct_answer: str) -> Tuple[bool, str]:
        """Validate MCQ (case-insensitive letter matching)"""
        
        student_ans_upper = student_answer.upper().strip()
        correct_ans_upper = correct_answer.upper().strip()
        
        # Accept just the letter or full option
        student_letter = student_ans_upper[0] if student_ans_upper else ""
        correct_letter = correct_ans_upper[0] if correct_ans_upper else ""
        
        if student_letter == correct_letter:
            return True, f"Correct! The answer is {correct_letter}. ✓"
        
        return False, f"Incorrect. The correct answer is {correct_letter}."

    @staticmethod
    def _validate_true_false(student_answer: str, correct_answer: str) -> Tuple[bool, str]:
        """Validate True/False exercise"""
        
        student_ans = student_answer.lower().strip()
        correct_ans = correct_answer.lower().strip()
        
        # Accept various formats
        true_variations = ["true", "t", "yes", "correct", "1"]
        false_variations = ["false", "f", "no", "incorrect", "0"]
        
        if student_ans in true_variations or student_ans in false_variations:
            if (student_ans in true_variations and correct_ans in true_variations) or \
               (student_ans in false_variations and correct_ans in false_variations):
                return True, f"Correct! ✓"
            else:
                correct_display = "True" if correct_ans in true_variations else "False"
                return False, f"Incorrect. The correct answer is {correct_display}."
        
        return False, "Please answer with True or False."

    @staticmethod
    def _validate_matching(student_answer: str, correct_answer: str) -> Tuple[bool, str]:
        """Validate matching exercise (expects JSON or comma-separated)"""
        
        # Simple string match for now
        if student_answer.lower() == correct_answer.lower():
            return True, "Correct! ✓"
        
        return False, f"Incorrect. Expected: {correct_answer}"

    @staticmethod
    def _validate_short_answer(
        student_answer: str,
        correct_answer: str,
        case_sensitive: bool,
        accept_partial: bool,
        alternative_answers: Optional[List[str]]
    ) -> Tuple[bool, str]:
        """Validate short answer (similar to gap-fill but more flexible)"""
        
        if not case_sensitive:
            student_answer = student_answer.lower()
            correct_answer = correct_answer.lower()
        
        # Check exact match
        if student_answer == correct_answer:
            return True, "Correct! ✓"
        
        # Check alternative answers
        if alternative_answers:
            alt_answers = [a.lower() if not case_sensitive else a for a in alternative_answers]
            if student_answer in alt_answers:
                return True, "Correct! ✓"
        
        # Check if answer contains key words
        student_words = set(student_answer.split())
        correct_words = set(correct_answer.split())
        
        # If student answer contains most words from correct answer
        common_words = len(student_words & correct_words)
        if common_words >= len(correct_words) * 0.8:  # 80% word match
            return True, "Correct! ✓"
        
        # Fuzzy match
        if accept_partial:
            similarity = ExerciseValidator._similarity(student_answer, correct_answer)
            if similarity >= 0.80:
                return True, "Correct! ✓"
            elif similarity >= 0.60:
                return False, f"Close, but not quite. Expected: {correct_answer}"
        
        return False, f"Incorrect. Expected: {correct_answer}"

    @staticmethod
    def _similarity(a: str, b: str) -> float:
        """Calculate similarity between two strings (0.0 to 1.0)"""
        return SequenceMatcher(None, a, b).ratio()


class PDFExtractor:
    """Extract text from PDF files"""
    
    @staticmethod
    def extract_text_from_pdf(file_path: str) -> Tuple[str, int]:
        """
        Extract text from PDF file
        
        Returns:
            (extracted_text, page_count)
        """
        try:
            import PyPDF2
            
            text = ""
            page_count = 0
            
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                page_count = len(pdf_reader.pages)
                
                for page_num in range(page_count):
                    page = pdf_reader.pages[page_num]
                    text += page.extract_text() + "\n"
            
            return text, page_count
        
        except ImportError:
            return "", 0  # PyPDF2 not installed
        except Exception as e:
            return "", 0

    @staticmethod
    def extract_text_from_docx(file_path: str) -> Tuple[str, int]:
        """Extract text from DOCX file"""
        try:
            from docx import Document
            
            doc = Document(file_path)
            text = ""
            
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            
            page_count = len(doc.element.body)
            return text, page_count
        
        except ImportError:
            return "", 0
        except Exception as e:
            return "", 0

    @staticmethod
    def parse_exercises_from_text(text: str) -> List[Dict]:
        """
        Parse exercises from extracted text
        This is a simple parser - can be enhanced based on format
        """
        
        exercises = []
        
        # Split by gap markers or exercise markers
        # This is a basic implementation - enhance based on your document format
        
        lines = text.split('\n')
        exercise_num = 0
        
        for line in lines:
            # Look for patterns like "[gap]", "Gap:", "___", or numbered patterns
            if re.search(r'\[gap\]|_____|gap\s*\d*|exercise\s*\d+|question\s*\d+', line, re.IGNORECASE):
                exercise_num += 1
                exercises.append({
                    "exercise_number": exercise_num,
                    "exercise_type": "gap_fill",
                    "exercise_text": line,
                    "instructions": "Fill in the gap",
                    "correct_answer": "[TO_BE_FILLED_BY_TEACHER]",
                    "points": 1
                })
        
        return exercises
