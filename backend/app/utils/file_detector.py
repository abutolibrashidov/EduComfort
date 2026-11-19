"""
File Detection and Routing Utilities
Analyzes uploaded files to determine processing pipeline (text extraction vs OCR)
"""
import os
from typing import Tuple, Dict, Any
from pypdf import PdfReader
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class FileDetector:
    """
    Detects file characteristics to route to appropriate processing pipeline
    """
    
    # Text density thresholds (characters per page)
    TEXT_BASED_THRESHOLD = 100  # >= 100 chars/page = text-based
    SCANNED_THRESHOLD = 50      # < 50 chars/page = scanned
    # Between 50-100 = mixed content
    
    @staticmethod
    def detect_file_type(file_path: str) -> str:
        """
        Detect file type from extension
        
        Returns:
            'pdf', 'docx', 'doc', 'image', or 'unknown'
        """
        extension = Path(file_path).suffix.lower()
        
        type_mapping = {
            '.pdf': 'pdf',
            '.docx': 'docx',
            '.doc': 'doc',
            '.png': 'image',
            '.jpg': 'image',
            '.jpeg': 'image',
            '.tiff': 'image',
            '.bmp': 'image',
        }
        
        return type_mapping.get(extension, 'unknown')
    
    @staticmethod
    def analyze_text_density(file_path: str, max_pages: int = 3) -> Dict[str, Any]:
        """
        Analyze text density of first N pages to determine if file is text-based or scanned
        
        Args:
            file_path: Path to PDF file
            max_pages: Number of pages to analyze (default: 3)
            
        Returns:
            Dictionary with analysis results:
            {
                'avg_chars_per_page': float,
                'total_chars': int,
                'pages_analyzed': int,
                'classification': 'text_based' | 'scanned' | 'mixed',
                'confidence': float (0-1)
            }
        """
        try:
            file_type = FileDetector.detect_file_type(file_path)
            
            if file_type != 'pdf':
                # For non-PDF files, assume text-based for now
                # (DOCX extraction will be handled in Phase 2)
                return {
                    'avg_chars_per_page': 500,  # Estimate
                    'total_chars': 500,
                    'pages_analyzed': 1,
                    'classification': 'text_based',
                    'confidence': 0.7
                }
            
            # Analyze PDF
            reader = PdfReader(file_path)
            total_pages = len(reader.pages)
            pages_to_analyze = min(max_pages, total_pages)
            
            total_chars = 0
            page_char_counts = []
            
            for i in range(pages_to_analyze):
                try:
                    text = reader.pages[i].extract_text()
                    char_count = len(text.strip())
                    total_chars += char_count
                    page_char_counts.append(char_count)
                except Exception as e:
                    logger.warning(f"Failed to extract text from page {i+1}: {e}")
                    page_char_counts.append(0)
            
            avg_chars = total_chars / pages_to_analyze if pages_to_analyze > 0 else 0
            
            # Classify based on thresholds
            if avg_chars >= FileDetector.TEXT_BASED_THRESHOLD:
                classification = 'text_based'
                confidence = min(1.0, avg_chars / 500)  # Higher chars = higher confidence
            elif avg_chars < FileDetector.SCANNED_THRESHOLD:
                classification = 'scanned'
                confidence = 1.0 - min(1.0, avg_chars / FileDetector.SCANNED_THRESHOLD)
            else:
                classification = 'mixed'
                confidence = 0.5  # Medium confidence for mixed content
            
            return {
                'avg_chars_per_page': round(avg_chars, 2),
                'total_chars': total_chars,
                'pages_analyzed': pages_to_analyze,
                'total_pages': total_pages,
                'classification': classification,
                'confidence': round(confidence, 2),
                'page_char_counts': page_char_counts
            }
            
        except Exception as e:
            logger.error(f"Error analyzing text density for {file_path}: {e}")
            return {
                'avg_chars_per_page': 0,
                'total_chars': 0,
                'pages_analyzed': 0,
                'total_pages': 0,
                'classification': 'unknown',
                'confidence': 0,
                'error': str(e)
            }
    
    @staticmethod
    def route_to_pipeline(file_path: str) -> Tuple[str, Dict[str, Any]]:
        """
        Determine which processing pipeline to use
        
        Returns:
            Tuple of (pipeline_type, analysis_data)
            pipeline_type: 'text_extraction' | 'ocr_tesseract' | 'ocr_cloud'
        """
        file_type = FileDetector.detect_file_type(file_path)
        
        # Images always go to OCR
        if file_type == 'image':
            return 'ocr_tesseract', {
                'file_type': file_type,
                'classification': 'image',
                'reason': 'Image file requires OCR'
            }
        
        # Analyze text density for PDFs
        if file_type == 'pdf':
            analysis = FileDetector.analyze_text_density(file_path)
            
            if analysis['classification'] == 'text_based':
                return 'text_extraction', analysis
            elif analysis['classification'] == 'scanned':
                return 'ocr_tesseract', analysis
            else:  # mixed
                # For mixed content, use OCR (safer choice)
                return 'ocr_tesseract', analysis
        
        # DOCX/DOC files use text extraction
        if file_type in ['docx', 'doc']:
            return 'text_extraction', {
                'file_type': file_type,
                'classification': 'text_based',
                'reason': 'Document file supports direct text extraction'
            }
        
        # Unknown file types default to text extraction (will fail gracefully)
        return 'text_extraction', {
            'file_type': file_type,
            'classification': 'unknown',
            'reason': 'Unknown file type, attempting text extraction'
        }
    
    @staticmethod
    def validate_file(file_path: str, max_size_mb: int = 100) -> Tuple[bool, str]:
        """
        Validate uploaded file
        
        Args:
            file_path: Path to file
            max_size_mb: Maximum file size in MB
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        # Check if file exists
        if not os.path.exists(file_path):
            return False, "File does not exist"
        
        # Check file size
        file_size = os.path.getsize(file_path)
        max_size_bytes = max_size_mb * 1024 * 1024
        
        if file_size > max_size_bytes:
            return False, f"File size ({file_size / 1024 / 1024:.1f} MB) exceeds maximum ({max_size_mb} MB)"
        
        if file_size == 0:
            return False, "File is empty"
        
        # Check file type
        file_type = FileDetector.detect_file_type(file_path)
        allowed_types = ['pdf', 'docx', 'doc', 'image']
        
        if file_type not in allowed_types:
            return False, f"File type '{file_type}' not supported. Allowed: {', '.join(allowed_types)}"
        
        return True, ""


# Convenience functions
def detect_and_route(file_path: str) -> Tuple[str, Dict[str, Any]]:
    """
    Convenience function to detect file characteristics and route to pipeline
    
    Returns:
        Tuple of (pipeline_type, analysis_data)
    """
    return FileDetector.route_to_pipeline(file_path)


def validate_upload(file_path: str, max_size_mb: int = 100) -> Tuple[bool, str]:
    """
    Convenience function to validate uploaded file
    
    Returns:
        Tuple of (is_valid, error_message)
    """
    return FileDetector.validate_file(file_path, max_size_mb)
