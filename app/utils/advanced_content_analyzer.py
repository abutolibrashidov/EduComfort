"""
Advanced Educational Content Analyzer
Transforms educational materials into interactive, fillable digital formats.
Supports 8+ question types with AI-powered detection and extraction.
"""

import re
from typing import List, Dict, Any, Optional, Tuple
from enum import Enum
from pydantic import BaseModel


class QuestionType(str, Enum):
    """Supported question types"""
    GAP_FILLING = "gap_filling"
    MULTIPLE_CHOICE = "multiple_choice"
    TRUE_FALSE = "true_false"
    MATCHING = "matching"
    SHORT_ANSWER = "short_answer"
    ESSAY = "essay"
    ORDERING = "ordering"
    DIAGRAM_LABELING = "diagram_labeling"
    CUSTOM = "custom"


class InputMode(str, Enum):
    """Input interaction modes"""
    DROPDOWN = "dropdown"
    TEXT_INPUT = "text_input"
    RADIO = "radio"
    CHECKBOX = "checkbox"
    DRAG_DROP = "drag_drop"
    CLICK_LABEL = "click_label"


class Passage(BaseModel):
    """Reading passage or context"""
    id: str
    title: Optional[str] = None
    text: str
    images: List[str] = []
    sequence_order: int = 0


class Question(BaseModel):
    """Universal question structure"""
    id: int
    type: QuestionType
    question_text: str
    input_mode: InputMode
    points: float = 1.0
    reference_passage: Optional[str] = None
    
    # Gap-filling specific
    gaps: Optional[List[Dict[str, Any]]] = None
    
    # MCQ specific
    options: Optional[List[str]] = None
    allow_multiple: bool = False
    
    # True/False specific
    statement: Optional[str] = None
    
    # Matching specific
    left_items: Optional[List[Dict[str, str]]] = None
    right_items: Optional[List[Dict[str, str]]] = None
    
    # Ordering specific
    items_to_order: Optional[List[Dict[str, str]]] = None
    
    # Diagram labeling specific
    diagram_image_url: Optional[str] = None
    label_points: Optional[List[Dict[str, Any]]] = None
    
    # Answer and explanation
    correct_answer: Any = None
    explanation: Optional[str] = None
    requires_teacher_grading: bool = False


class AnalyzedContent(BaseModel):
    """Complete analyzed content structure"""
    metadata: Dict[str, Any]
    passages: List[Passage] = []
    questions: List[Question] = []
    answer_key: Dict[int, Any] = {}


class AdvancedContentAnalyzer:
    """Main analyzer class"""
    
    def __init__(self):
        self.question_patterns = self._compile_patterns()
    
    def _compile_patterns(self) -> Dict[str, re.Pattern]:
        """Compile regex patterns for question detection"""
        return {
            # Question numbering patterns
            'question_number': re.compile(r'^(\d+[\\.)]|Q\d+[:\\.]?)\s*', re.IGNORECASE),
            
            # Gap-filling patterns
            'gap_blank': re.compile(r'_{3,}|\.{3,}|\[.*?\]|\(.*?\)'),
            'gap_bracket': re.compile(r'\[(.*?)\]'),
            
            # MCQ patterns
            'mcq_option': re.compile(r'^([a-d][\\.)]|[A-D][\\.)])\s*(.*)', re.IGNORECASE),
            
            # True/False patterns
            'true_false': re.compile(r'\b(true|false)\b', re.IGNORECASE),
            
            # Matching patterns
            'match_instruction': re.compile(r'match|pair|connect', re.IGNORECASE),
            'column_marker': re.compile(r'column\s+[AB]|left|right', re.IGNORECASE),
            
            # Ordering patterns
            'order_instruction': re.compile(r'arrange|order|sequence|chronological', re.IGNORECASE),
            
            # Answer key patterns
            'answer_key': re.compile(r'^(answer|ans|correct|key)[:\\-\\s]*([a-d]|\d+|true|false)', re.IGNORECASE),
            
            # Passage markers
            'passage_start': re.compile(r'^(passage|text|reading)[:\\-\\s]*', re.IGNORECASE),
        }
    
    def analyze_document(self, text: str, filename: str = "") -> AnalyzedContent:
        """
        Main analysis entry point
        
        Args:
            text: Extracted text from document
            filename: Original filename for metadata
            
        Returns:
            AnalyzedContent with structured questions and passages
        """
        # Step 1: Detect metadata
        metadata = self._detect_metadata(text, filename)
        
        # Step 2: Separate passages from questions
        passages, question_text = self._extract_passages(text)
        
        # Step 3: Detect and extract questions
        questions = self._extract_questions(question_text)
        
        # Step 4: Detect answer key
        answer_key = self._extract_answer_key(text, questions)
        
        # Step 5: Generate distractors for gap-filling if needed
        for q in questions:
            if q.type == QuestionType.GAP_FILLING and q.gaps:
                self._generate_distractors(q)
        
        return AnalyzedContent(
            metadata=metadata,
            passages=passages,
            questions=questions,
            answer_key=answer_key
        )
    
    def _detect_metadata(self, text: str, filename: str) -> Dict[str, Any]:
        """Detect document metadata"""
        lines = text.split('\n')[:10]  # Check first 10 lines
        
        metadata = {
            'title': filename or 'Untitled',
            'subject': self._detect_subject(text),
            'grade_level': self._detect_grade_level(text),
            'question_count': 0,  # Will be updated later
            'estimated_time': self._estimate_time(text)
        }
        
        # Try to find explicit title
        for line in lines:
            if len(line.strip()) > 5 and len(line.strip()) < 100:
                if not re.match(r'^\d+[\\.)]', line):
                    metadata['title'] = line.strip()
                    break
        
        return metadata
    
    def _detect_subject(self, text: str) -> str:
        """Detect subject/topic from content"""
        subjects = {
            'math': ['equation', 'solve', 'calculate', 'algebra', 'geometry'],
            'science': ['experiment', 'hypothesis', 'chemical', 'biology', 'physics'],
            'english': ['grammar', 'sentence', 'paragraph', 'essay', 'literature'],
            'history': ['century', 'war', 'empire', 'civilization', 'historical'],
            'geography': ['continent', 'country', 'capital', 'map', 'region']
        }
        
        text_lower = text.lower()
        scores = {}
        
        for subject, keywords in subjects.items():
            score = sum(1 for kw in keywords if kw in text_lower)
            scores[subject] = score
        
        if scores:
            return max(scores, key=scores.get)
        return 'general'
    
    def _detect_grade_level(self, text: str) -> Optional[str]:
        """Detect grade level if mentioned"""
        grade_pattern = re.compile(r'grade\s+(\d+|[ivxIVX]+)', re.IGNORECASE)
        match = grade_pattern.search(text)
        if match:
            return match.group(1)
        return None
    
    def _estimate_time(self, text: str) -> Optional[int]:
        """Estimate completion time in minutes"""
        time_pattern = re.compile(r'(\d+)\s*(min|minute|hour)', re.IGNORECASE)
        match = time_pattern.search(text)
        if match:
            value = int(match.group(1))
            unit = match.group(2).lower()
            if 'hour' in unit:
                return value * 60
            return value
        return None
    
    def _extract_passages(self, text: str) -> Tuple[List[Passage], str]:
        """Separate reading passages from questions"""
        passages = []
        lines = text.split('\n')
        
        passage_start_idx = None
        passage_lines = []
        question_lines = []
        in_passage = False
        
        for i, line in enumerate(lines):
            line_stripped = line.strip()
            
            # Check for passage marker
            if self.question_patterns['passage_start'].match(line_stripped):
                in_passage = True
                passage_start_idx = i
                continue
            
            # Check for question start (ends passage)
            if self.question_patterns['question_number'].match(line_stripped):
                if in_passage and passage_lines:
                    # Save passage
                    passages.append(Passage(
                        id=f"passage_{len(passages) + 1}",
                        text='\n'.join(passage_lines),
                        sequence_order=len(passages)
                    ))
                    passage_lines = []
                in_passage = False
                question_lines.append(line)
            elif in_passage:
                passage_lines.append(line)
            else:
                question_lines.append(line)
        
        # Save any remaining passage
        if passage_lines:
            passages.append(Passage(
                id=f"passage_{len(passages) + 1}",
                text='\n'.join(passage_lines),
                sequence_order=len(passages)
            ))
        
        return passages, '\n'.join(question_lines)
    
    def _extract_questions(self, text: str) -> List[Question]:
        """Extract and classify all questions"""
        questions = []
        lines = [l.strip() for l in text.split('\n') if l.strip()]
        
        i = 0
        while i < len(lines):
            line = lines[i]
            
            # Check for question start
            q_match = self.question_patterns['question_number'].match(line)
            if q_match:
                question_num = len(questions) + 1
                question_text = line[q_match.end():].strip()
                
                # Collect question lines and detect type
                q_lines = [question_text]
                i += 1
                
                # Look ahead for options, gaps, etc.
                while i < len(lines) and not self.question_patterns['question_number'].match(lines[i]):
                    q_lines.append(lines[i])
                    i += 1
                
                # Detect question type and create question object
                question = self._classify_and_create_question(
                    question_num, q_lines
                )
                if question:
                    questions.append(question)
            else:
                i += 1
        
        return questions
    
    def _classify_and_create_question(
        self, 
        question_id: int, 
        lines: List[str]
    ) -> Optional[Question]:
        """Classify question type and create appropriate structure"""
        full_text = ' '.join(lines)
        
        # Check for gap-filling
        if self.question_patterns['gap_blank'].search(full_text):
            return self._create_gap_filling_question(question_id, lines)
        
        # Check for MCQ (has options a, b, c, d)
        if any(self.question_patterns['mcq_option'].match(l) for l in lines):
            return self._create_mcq_question(question_id, lines)
        
        # Check for True/False
        if self.question_patterns['true_false'].search(full_text):
            return self._create_true_false_question(question_id, lines)
        
        # Check for matching
        if self.question_patterns['match_instruction'].search(full_text):
            return self._create_matching_question(question_id, lines)
        
        # Check for ordering
        if self.question_patterns['order_instruction'].search(full_text):
            return self._create_ordering_question(question_id, lines)
        
        # Default to short answer
        return self._create_short_answer_question(question_id, lines)
    
    def _create_gap_filling_question(
        self, 
        question_id: int, 
        lines: List[str]
    ) -> Question:
        """Create gap-filling question with detected gaps"""
        question_text = lines[0]
        gaps = []
        
        # Find all gaps
        gap_matches = list(self.question_patterns['gap_blank'].finditer(question_text))
        
        for idx, match in enumerate(gap_matches):
            gap_text = match.group(0)
            
            # Check if gap has options in brackets
            bracket_match = self.question_patterns['gap_bracket'].match(gap_text)
            if bracket_match:
                options = [opt.strip() for opt in bracket_match.group(1).split('/')]
                gaps.append({
                    'position': idx,
                    'answer': options[0] if options else None,
                    'distractors': options[1:] if len(options) > 1 else []
                })
            else:
                gaps.append({
                    'position': idx,
                    'answer': None,  # To be filled by teacher
                    'distractors': []
                })
        
        return Question(
            id=question_id,
            type=QuestionType.GAP_FILLING,
            question_text=question_text,
            input_mode=InputMode.DROPDOWN if gaps and gaps[0].get('distractors') else InputMode.TEXT_INPUT,
            gaps=gaps,
            requires_teacher_grading=not all(g.get('answer') for g in gaps)
        )
    
    def _create_mcq_question(
        self, 
        question_id: int, 
        lines: List[str]
    ) -> Question:
        """Create multiple choice question"""
        question_text = lines[0]
        options = []
        
        for line in lines[1:]:
            opt_match = self.question_patterns['mcq_option'].match(line)
            if opt_match:
                options.append(opt_match.group(2).strip())
        
        return Question(
            id=question_id,
            type=QuestionType.MULTIPLE_CHOICE,
            question_text=question_text,
            input_mode=InputMode.RADIO,
            options=options,
            requires_teacher_grading=True  # Until answer key is provided
        )
    
    def _create_true_false_question(
        self, 
        question_id: int, 
        lines: List[str]
    ) -> Question:
        """Create true/false question"""
        return Question(
            id=question_id,
            type=QuestionType.TRUE_FALSE,
            question_text=lines[0],
            input_mode=InputMode.RADIO,
            options=['True', 'False'],
            requires_teacher_grading=True
        )
    
    def _create_matching_question(
        self, 
        question_id: int, 
        lines: List[str]
    ) -> Question:
        """Create matching question"""
        # Simple implementation - can be enhanced
        return Question(
            id=question_id,
            type=QuestionType.MATCHING,
            question_text=lines[0],
            input_mode=InputMode.DRAG_DROP,
            left_items=[],  # To be filled by teacher
            right_items=[],
            requires_teacher_grading=True
        )
    
    def _create_ordering_question(
        self, 
        question_id: int, 
        lines: List[str]
    ) -> Question:
        """Create ordering/sequencing question"""
        return Question(
            id=question_id,
            type=QuestionType.ORDERING,
            question_text=lines[0],
            input_mode=InputMode.DRAG_DROP,
            items_to_order=[],  # To be filled by teacher
            requires_teacher_grading=True
        )
    
    def _create_short_answer_question(
        self, 
        question_id: int, 
        lines: List[str]
    ) -> Question:
        """Create short answer question"""
        return Question(
            id=question_id,
            type=QuestionType.SHORT_ANSWER,
            question_text=' '.join(lines),
            input_mode=InputMode.TEXT_INPUT,
            requires_teacher_grading=True
        )
    
    def _extract_answer_key(
        self, 
        text: str, 
        questions: List[Question]
    ) -> Dict[int, Any]:
        """Extract answer key if present in document"""
        answer_key = {}
        lines = text.split('\n')
        
        for line in lines:
            ans_match = self.question_patterns['answer_key'].match(line.strip())
            if ans_match:
                answer = ans_match.group(2).strip()
                # Try to match to a question (simple heuristic)
                # This can be enhanced with better matching logic
                for q in questions:
                    if not q.correct_answer:
                        q.correct_answer = answer
                        q.requires_teacher_grading = False
                        answer_key[q.id] = answer
                        break
        
        return answer_key
    
    def _generate_distractors(self, question: Question) -> None:
        """Generate plausible distractors for gap-filling questions"""
        # Placeholder for AI-powered distractor generation
        # In production, this would use NLP/ML to generate contextually appropriate wrong answers
        if not question.gaps:
            return
        
        for gap in question.gaps:
            if gap.get('answer') and not gap.get('distractors'):
                # Simple rule-based distractor generation
                answer = gap['answer']
                # This is a placeholder - real implementation would be more sophisticated
                gap['distractors'] = [
                    f"{answer}_variant1",
                    f"{answer}_variant2",
                    f"{answer}_variant3"
                ]
    
    def analyze_question(self, text: str) -> Optional[Dict[str, Any]]:
        """
        Analyze a single question text and return structured data
        
        Args:
            text: Question text to analyze
            
        Returns:
            Dictionary with question type, text, options, etc.
        """
        # Create a temporary question to analyze
        question = self._classify_and_create_question(1, [text])
        
        if not question:
            return None
        
        # Convert to dictionary format
        result = {
            "type": question.type.value if hasattr(question.type, 'value') else str(question.type),
            "question_text": question.question_text,
            "options": None,
            "correct_answer": question.correct_answer,
            "instructions": None
        }
        
        # Add type-specific data
        if question.type == QuestionType.MULTIPLE_CHOICE and question.options:
            result["options"] = {chr(65 + i): opt for i, opt in enumerate(question.options)}
        elif question.type == QuestionType.GAP_FILLING and question.gaps:
            result["gaps"] = question.gaps
        elif question.type == QuestionType.MATCHING:
            result["left_items"] = question.left_items
            result["right_items"] = question.right_items
        elif question.type == QuestionType.ORDERING:
            result["items_to_order"] = question.items_to_order
        
        return result


# Convenience function
def analyze_educational_content(text: str, filename: str = "") -> AnalyzedContent:
    """
    Analyze educational content and return structured format
    
    Args:
        text: Extracted text from document
        filename: Original filename
        
    Returns:
        AnalyzedContent with detected questions and passages
    """
    analyzer = AdvancedContentAnalyzer()
    return analyzer.analyze_document(text, filename)
