import re
import io
from typing import List, Dict
from PyPDF2 import PdfReader

def extract_questions_from_pdf(file_content: bytes) -> List[Dict[str, str]]:
    """
    Extracts potential questions from a PDF file content.
    Looks for numbered lines or lines with underscores (blanks).
    """
    
    try:
        reader = PdfReader(io.BytesIO(file_content))
        full_text = ""
        
        for page in reader.pages:
            text = page.extract_text()
            if text:
                full_text += text + "\n"
        
        # Heuristic 1: Look for lines starting with a number followed by a dot, and containing underscores
        # Example: "1. The capital of France is ______."
        # Regex explanation:
        # ^\s*(\d+)\.\s+  -> Starts with optional space, then number, then dot, then space
        # (.*_+.*)       -> Capture group 2: content containing at least one underscore
        
        # We will split by newlines first to handle line-by-line processing
        lines = full_text.split('\n')
        
        # Regex for finding questions with blanks
        # Matches "1. Question text _____" or just "Question text _____"
        # We want to capture the question text.
        
        candidate_questions = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Check if line has underscores (indicating a blank)
            if "_" in line:
                # If it starts with a number, strip it
                clean_line = re.sub(r'^\d+[\.)]\s*', '', line)
                
                # Check for reasonable length (avoid simple separator lines like "_______")
                # A question should usually have some text logic
                text_part = re.sub(r'_+', '', clean_line).strip()
                if len(text_part) > 5:
                    candidate_questions.append({
                        "question_text": clean_line,
                        "question_type": "short_answer", # Default to short answer for fill-in-blanks
                        "original_text": line
                    })
        
        # Deduplication logic
        # We use a set of seen question texts to avoid exact duplicates
        seen_texts = set()
        unique_questions = []
        
        for q in candidate_questions:
            # Normalize text for deduplication (lowercase, remove extra spaces)
            norm_text = re.sub(r'\s+', ' ', q['question_text'].lower())
            
            if norm_text not in seen_texts:
                seen_texts.add(norm_text)
                unique_questions.append(q)
                
        return unique_questions

    except Exception as e:
        print(f"Error parsing PDF: {e}")
        return []
