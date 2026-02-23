import re
import io
from typing import List, Dict, Optional
from pydantic import BaseModel

# Library imports (lazy loaded in function usually, but here global is fine if installed)
import pypdf
from docx import Document


class ParsedQuestion(BaseModel):
    question_text: str
    options: List[str] = []
    correct_answer: Optional[str] = None
    question_type: str = "multiple_choice"  # 'multiple_choice' or 'short_answer'


def extract_text_from_file(file_content: bytes, filename: str) -> str:
    """Extract raw text from PDF, DOCX, or TXT content"""
    text = ""
    filename = filename.lower()
    
    if filename.endswith(".pdf"):
        try:
            pdf_reader = pypdf.PdfReader(io.BytesIO(file_content))
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
        except Exception as e:
            print(f"Error parsing PDF: {e}")
            raise ValueError("Invalid PDF file")
            
    elif filename.endswith(".docx"):
        try:
            doc = Document(io.BytesIO(file_content))
            for para in doc.paragraphs:
                text += para.text + "\n"
        except Exception as e:
            print(f"Error parsing DOCX: {e}")
            raise ValueError("Invalid DOCX file")
            
    elif filename.endswith(".txt"):
        try:
            text = file_content.decode("utf-8", errors="ignore")
        except Exception as e:
             raise ValueError("Invalid Text file")
    
    else:
        raise ValueError("Unsupported file format. Please use .pdf, .docx, or .txt")
        
    return text


def parse_exam_text(text: str) -> List[ParsedQuestion]:
    """
    Parse generic exam text into structured questions.
    Supports formats like:
    1. What is 2+2?
    a) 3
    b) 4
    Answer: b
    """
    questions = []
    
    # Normalize newlines
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    
    current_question = None
    current_options = []
    
    # Regex patterns
    question_pattern = re.compile(r'^(\d+[\.)]|Q\d+[:\.]?)\s*(.*)', re.IGNORECASE)
    option_pattern = re.compile(r'^([a-d][\.)]|[A-D][0-9\.)]?)\s*(.*)', re.IGNORECASE)
    answer_pattern = re.compile(r'^(Answer|Ans|Correct)[:\-\s]*([a-d])', re.IGNORECASE)
    
    for line in lines:
        # Check for Question Start (e.g., "1. What is...")
        q_match = question_pattern.match(line)
        if q_match:
            # Save previous question if exists
            if current_question:
                questions.append(ParsedQuestion(
                    question_text=current_question,
                    options=current_options,
                    correct_answer=None  # Can be parsed later
                ))
            
            # Start new question
            current_question = q_match.group(2)
            current_options = []
            continue
            
        # Check for Answer Key lines
        ans_match = answer_pattern.match(line)
        if ans_match and current_question:
            # Found answer for the current/previous question?
            # Ideally answer is part of the block.
            # We'll save it contextually if we handle it properly, 
            # but usually answer key is at end or inline. 
            # For this simple parser, let's assume inline "Answer: a"
            pass
            
        # Check for Option (e.g., "a) 4")
        opt_match = option_pattern.match(line)
        if opt_match and current_question:
            opt_text = opt_match.group(2)
            current_options.append(opt_text)
            continue
            
        # Append to current question text if not a new Q or Option
        if current_question and not opt_match:
            # Heuristic: If line is short and looks like option without label?
            # Skip for now
            current_question += " " + line


    # Add last question
    if current_question:
        q_type = "multiple_choice" if len(current_options) > 0 else "short_answer"
        questions.append(ParsedQuestion(
            question_text=current_question,
            options=current_options,
            correct_answer=None,
            question_type=q_type
        ))
        
    return questions

