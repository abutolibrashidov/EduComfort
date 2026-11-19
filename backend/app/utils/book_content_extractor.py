"""
Book Content Extractor
Extracts structured content from PDF/DOCX books including chapters, pages, and exercises
"""
import re
import json
from typing import List, Dict, Any
import os


class BookContentExtractor:
    """Extract structured content from educational books"""
    
    def __init__(self, file_path: str):
        self.file_path = file_path
        self.file_type = os.path.splitext(file_path)[1].lower()
        
    def extract(self) -> Dict[str, Any]:
        """Main extraction method"""
        if self.file_type == '.pdf':
            return self._extract_from_pdf()
        elif self.file_type in ['.docx', '.doc']:
            return self._extract_from_docx()
        else:
            raise ValueError(f"Unsupported file type: {self.file_type}")
    
    def _extract_from_pdf(self) -> Dict[str, Any]:
        """Extract content from PDF"""
        try:
            from pypdf import PdfReader
        except ImportError:
            raise ImportError("pypdf is required for PDF extraction. Run: pip install pypdf")
        reader = PdfReader(self.file_path)
        
        # Extract all text
        full_text = ""
        pages_raw = []
        
        for page_num, page in enumerate(reader.pages, 1):
            page_text = page.extract_text()
            pages_raw.append({
                "page_number": page_num,
                "text": page_text
            })
            full_text += f"\n--- PAGE {page_num} ---\n{page_text}"
        
        # Detect chapters
        chapters = self._detect_chapters(pages_raw)
        
        # Check text density to determine if scanned
        total_chars = len(full_text)
        avg_chars_per_page = total_chars / len(pages_raw) if pages_raw else 0
        is_scanned = avg_chars_per_page < 50  # Threshold: fewer than 50 chars per page likely scanned
        
        # Structure content
        structured_content = {
            "total_pages": len(pages_raw),
            "chapters": chapters,
            "full_text": full_text[:50000],  # Limit for storage
            "is_scanned": is_scanned
        }
        
        return structured_content
    
    def _extract_from_docx(self) -> Dict[str, Any]:
        """Extract content from DOCX"""
        try:
            from docx import Document
            doc = Document(self.file_path)
            
            full_text = ""
            pages_raw = []
            page_num = 1
            current_page_text = ""
            
            for para in doc.paragraphs:
                current_page_text += para.text + "\n"
                # Approximate page breaks (every ~500 chars)
                if len(current_page_text) > 500:
                    pages_raw.append({
                        "page_number": page_num,
                        "text": current_page_text
                    })
                    full_text += f"\n--- PAGE {page_num} ---\n{current_page_text}"
                    current_page_text = ""
                    page_num += 1
            
            # Add last page
            if current_page_text:
                pages_raw.append({
                    "page_number": page_num,
                    "text": current_page_text
                })
                full_text += f"\n--- PAGE {page_num} ---\n{current_page_text}"
            
            chapters = self._detect_chapters(pages_raw)
            
            return {
                "total_pages": len(pages_raw),
                "chapters": chapters,
                "full_text": full_text[:50000]
            }
        except ImportError:
            raise ImportError("python-docx is required for DOCX extraction")
    
    def _detect_chapters(self, pages: List[Dict]) -> List[Dict]:
        """Detect chapter boundaries and structure"""
        chapters = []
        current_chapter = None
        chapter_num = 0
        
        for page in pages:
            text = page["text"]
            page_num = page["page_number"]
            
            # Detect chapter headings
            chapter_match = re.search(
                r'^(UNIT|Chapter|Lesson|Section)\s+(\d+[A-Za-z]?):?\s*(.+?)$',
                text,
                re.MULTILINE | re.IGNORECASE
            )
            
            if chapter_match:
                # Save previous chapter
                if current_chapter:
                    chapters.append(current_chapter)
                
                # Start new chapter
                chapter_num += 1
                current_chapter = {
                    "chapter_number": chapter_num,
                    "title": chapter_match.group(3).strip(),
                    "start_page": page_num,
                    "pages": []
                }
            
            # Add page to current chapter
            if current_chapter:
                # Detect exercises on this page
                exercises = self._detect_exercises(text, page_num)
                
                current_chapter["pages"].append({
                    "page_number": page_num,
                    "content": text,
                    "exercises": exercises
                })
            else:
                # No chapter yet, create default
                if not chapters:
                    current_chapter = {
                        "chapter_number": 1,
                        "title": "Introduction",
                        "start_page": 1,
                        "pages": []
                    }
                    current_chapter["pages"].append({
                        "page_number": page_num,
                        "content": text,
                        "exercises": self._detect_exercises(text, page_num)
                    })
        
        # Add last chapter
        if current_chapter:
            chapters.append(current_chapter)
        
        return chapters
    
    def _detect_exercises(self, text: str, page_num: int) -> List[Dict]:
        """Detect exercises/questions in text using advanced content analyzer"""
        exercises = []
        
        # Import advanced analyzer
        from app.utils.advanced_content_analyzer import AdvancedContentAnalyzer
        
        # Use advanced analyzer to detect ALL questions on the page
        analyzer = AdvancedContentAnalyzer()
        
        try:
            # Analyze the entire page content
            analyzed_content = analyzer.analyze_document(text, filename=f"page_{page_num}")
            
            # Convert detected questions to exercise format
            for question in analyzed_content.questions:
                exercise_data = {
                    "exercise_number": question.id,
                    "exercise_type": question.type.value if hasattr(question.type, 'value') else str(question.type),
                    "text": question.question_text,
                    "correct_answer": question.correct_answer,
                    "page_number": page_num
                }
                
                # Add type-specific data
                if question.options:
                    exercise_data["options"] = {chr(65 + i): opt for i, opt in enumerate(question.options)}
                if question.gaps:
                    exercise_data["gaps"] = question.gaps
                if question.explanation:
                    exercise_data["explanation"] = question.explanation
                if question.input_mode:
                    exercise_data["input_mode"] = question.input_mode.value if hasattr(question.input_mode, 'value') else str(question.input_mode)
                    
                exercises.append(exercise_data)
        except Exception as e:
            # Log error but don't fail the entire extraction
            print(f"Warning: Failed to analyze exercises on page {page_num}: {e}")
        
        return exercises[:20]  # Limit to 20 exercises per page
    
    def _analyze_exercise(self, text: str) -> tuple:
        """Analyze exercise text to determine type and extract options - LEGACY METHOD"""
        
        # Check for multiple choice (A. B. C. D. or a) b) c) d))
        mcq_pattern = r'(?:^|\n)\s*([A-Da-d])[\.)]\s*(.+?)(?=(?:\n\s*[A-Da-d][\.)]|\Z))'
        mcq_matches = re.findall(mcq_pattern, text, re.MULTILINE)
        
        if len(mcq_matches) >= 2:
            options = {match[0].upper(): match[1].strip() for match in mcq_matches}
            return ("multiple_choice", options, None)
        
        # Check for gap filling (______ or ___)
        if re.search(r'_{3,}', text):
            re.findall(r'_{3,}', text)
            return ("gap_filling", None, None)
        
        # Check for True/False
        if re.search(r'\b(true|false)\b', text, re.IGNORECASE):
            return ("true_false", None, None)
        
        # Check for matching (Match ... with ...)
        if re.search(r'\bmatch\b', text, re.IGNORECASE):
            return ("matching", None, None)
        
        # Default to short answer
        if len(text) > 10:
            return ("short_answer", None, None)
        
        return (None, None, None)


def extract_book_content(file_path: str) -> Dict[str, Any]:
    """
    Convenience function to extract content from a book
    
    Args:
        file_path: Path to PDF or DOCX file
        
    Returns:
        Structured content dictionary
    """
    extractor = BookContentExtractor(file_path)
    return extractor.extract()


# Example usage
if __name__ == "__main__":
    # Test with a sample file
    import sys
    
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
        print(f"Extracting content from: {file_path}")
        
        content = extract_book_content(file_path)
        
        print(f"\nExtracted {content['total_pages']} pages")
        print(f"Found {len(content['chapters'])} chapters")
        
        for chapter in content['chapters']:
            print(f"\nChapter {chapter['chapter_number']}: {chapter['title']}")
            print(f"  Pages: {chapter['start_page']}-{chapter['start_page'] + len(chapter['pages']) - 1}")
            
            total_exercises = sum(len(page['exercises']) for page in chapter['pages'])
            print(f"  Exercises: {total_exercises}")
        
        # Save to JSON
        output_file = file_path.replace('.pdf', '_extracted.json')
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(content, f, indent=2, ensure_ascii=False)
        
        print(f"\nSaved to: {output_file}")
    else:
        print("Usage: python book_content_extractor.py <path_to_book.pdf>")
