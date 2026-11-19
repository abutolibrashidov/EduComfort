"""
OCR Processing Utilities
Handles image preprocessing, OCR extraction, and text post-processing for scanned documents
"""
import os
import json
import logging
from typing import Dict, List, Any, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed

import cv2
import numpy as np
import pytesseract
from pdf2image import convert_from_path
from spellchecker import SpellChecker

logger = logging.getLogger(__name__)


class OCRProcessor:
    """
    Handles OCR processing for scanned PDFs and images
    """
    
    # OCR confidence thresholds
    HIGH_CONFIDENCE = 80
    MEDIUM_CONFIDENCE = 70
    LOW_CONFIDENCE = 60
    
    # Common OCR error mappings
    OCR_ERROR_CORRECTIONS = {
        'l': '1',  # lowercase L to 1 in numbers
        'O': '0',  # uppercase O to 0 in numbers
        'I': '1',  # uppercase I to 1 in numbers
        'S': '5',  # S to 5 in numbers (context-dependent)
        'B': '8',  # B to 8 in numbers (context-dependent)
    }
    
    def __init__(self, tesseract_cmd: Optional[str] = None):
        """
        Initialize OCR processor
        
        Args:
            tesseract_cmd: Path to tesseract executable (optional)
        """
        if tesseract_cmd:
            pytesseract.pytesseract.tesseract_cmd = tesseract_cmd
        else:
            # Auto-detect Tesseract on Windows typical paths
            # This is improved over default behavior which relies solely on PATH
            possible_paths = [
                r'C:\Program Files\Tesseract-OCR\tesseract.exe',
                r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe',
                os.path.join(os.getenv('LOCALAPPDATA', ''), r'Tesseract-OCR\tesseract.exe')
            ]
            
            for path in possible_paths:
                if os.path.exists(path):
                    logging.info(f"Found Tesseract at: {path}")
                    pytesseract.pytesseract.tesseract_cmd = path
                    break
        
        # Initialize spell checker with educational dictionary
        self.spell_checker = SpellChecker()
        
    def pdf_to_images(self, pdf_path: str, dpi: int = 300) -> List[np.ndarray]:
        """
        Convert PDF pages to images
        
        Args:
            pdf_path: Path to PDF file
            dpi: Resolution for conversion (default 300)
            
        Returns:
            List of numpy arrays (images)
        """
        try:
            logger.info(f"Converting PDF to images: {pdf_path}")
            
            # Convert PDF to PIL images
            pil_images = convert_from_path(pdf_path, dpi=dpi)
            
            # Convert PIL images to numpy arrays
            images = []
            for pil_img in pil_images:
                # Convert to RGB if needed
                if pil_img.mode != 'RGB':
                    pil_img = pil_img.convert('RGB')
                
                # Convert to numpy array
                img_array = np.array(pil_img)
                images.append(img_array)
            
            logger.info(f"Converted {len(images)} pages to images")
            return images
            
        except Exception as e:
            logger.error(f"Error converting PDF to images: {e}")
            raise
    
    def preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """
        Preprocess image for better OCR results
        
        Steps:
        1. Convert to grayscale
        2. Deskew
        3. Denoise
        4. Enhance contrast
        
        Args:
            image: Input image as numpy array
            
        Returns:
            Preprocessed image
        """
        try:
            # Convert to grayscale
            if len(image.shape) == 3:
                gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
            else:
                gray = image.copy()
            
            # Deskew
            gray = self._deskew(gray)
            
            # Denoise
            gray = cv2.fastNlMeansDenoising(gray, h=10)
            
            # Enhance contrast using adaptive histogram equalization
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            gray = clahe.apply(gray)
            
            # Apply binary thresholding
            _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            
            return binary
            
        except Exception as e:
            logger.error(f"Error preprocessing image: {e}")
            return image
    
    def _deskew(self, image: np.ndarray) -> np.ndarray:
        """
        Deskew image using Hough transform
        
        Args:
            image: Grayscale image
            
        Returns:
            Deskewed image
        """
        try:
            # Detect edges
            edges = cv2.Canny(image, 50, 150, apertureSize=3)
            
            # Detect lines using Hough transform
            lines = cv2.HoughLines(edges, 1, np.pi / 180, 200)
            
            if lines is None:
                return image
            
            # Calculate average angle
            angles = []
            for rho, theta in lines[:, 0]:
                angle = (theta * 180 / np.pi) - 90
                angles.append(angle)
            
            if not angles:
                return image
            
            median_angle = np.median(angles)
            
            # Only deskew if angle is significant (> 0.5 degrees)
            if abs(median_angle) < 0.5:
                return image
            
            # Rotate image
            (h, w) = image.shape[:2]
            center = (w // 2, h // 2)
            M = cv2.getRotationMatrix2D(center, median_angle, 1.0)
            rotated = cv2.warpAffine(image, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
            
            logger.debug(f"Deskewed image by {median_angle:.2f} degrees")
            return rotated
            
        except Exception as e:
            logger.warning(f"Deskew failed: {e}")
            return image
    
    def run_ocr(self, image: np.ndarray, lang: str = 'eng') -> Dict[str, Any]:
        """
        Run Tesseract OCR on preprocessed image
        
        Args:
            image: Preprocessed image
            lang: Language code (default 'eng')
            
        Returns:
            Dictionary with:
            - text: Extracted text
            - confidence: Average confidence score (0-100)
            - word_confidences: List of per-word confidences
            - bounding_boxes: List of bounding boxes for words
        """
        try:
            # Run OCR with detailed data
            data = pytesseract.image_to_data(image, lang=lang, output_type=pytesseract.Output.DICT)
            
            # Extract text
            text_parts = []
            confidences = []
            bounding_boxes = []
            
            n_boxes = len(data['text'])
            for i in range(n_boxes):
                # Filter out empty text and low confidence
                if int(data['conf'][i]) > 0:
                    word = data['text'][i].strip()
                    if word:
                        text_parts.append(word)
                        confidences.append(int(data['conf'][i]))
                        
                        # Store bounding box
                        bounding_boxes.append({
                            'word': word,
                            'x': data['left'][i],
                            'y': data['top'][i],
                            'width': data['width'][i],
                            'height': data['height'][i],
                            'confidence': int(data['conf'][i])
                        })
            
            # Combine text
            text = ' '.join(text_parts)
            
            # Calculate average confidence
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0
            
            return {
                'text': text,
                'confidence': round(avg_confidence, 2),
                'word_confidences': confidences,
                'bounding_boxes': bounding_boxes,
                'total_words': len(text_parts)
            }
            
        except Exception as e:
            logger.error(f"OCR failed: {e}")
            return {
                'text': '',
                'confidence': 0,
                'word_confidences': [],
                'bounding_boxes': [],
                'total_words': 0,
                'error': str(e)
            }
    
    def post_process_text(self, text: str, confidence: float) -> str:
        """
        Post-process OCR text to fix common errors
        
        Steps:
        1. Fix common OCR character errors
        2. Spell check (for medium/low confidence)
        3. Merge hyphenated words
        4. Fix spacing issues
        
        Args:
            text: Raw OCR text
            confidence: OCR confidence score
            
        Returns:
            Cleaned text
        """
        if not text:
            return text
        
        try:
            # Fix common OCR errors in numbers
            text = self._fix_number_errors(text)
            
            # Merge hyphenated words at line breaks
            text = self._merge_hyphenated_words(text)
            
            # Fix spacing issues
            text = self._fix_spacing(text)
            
            # Spell check for low/medium confidence text
            if confidence < self.HIGH_CONFIDENCE:
                text = self._spell_check(text)
            
            return text
            
        except Exception as e:
            logger.error(f"Post-processing failed: {e}")
            return text
    
    def _fix_number_errors(self, text: str) -> str:
        """Fix common OCR errors in numbers"""
        import re
        
        # Find number-like patterns and fix common errors
        def fix_number(match):
            num_str = match.group(0)
            # Replace common errors
            num_str = num_str.replace('O', '0').replace('o', '0')
            num_str = num_str.replace('I', '1').replace('l', '1')
            num_str = num_str.replace('S', '5').replace('B', '8')
            return num_str
        
        # Pattern for numbers (including decimals and commas)
        text = re.sub(r'\b\d+[OoIlSB\d.,]*\b', fix_number, text)
        
        return text
    
    def _merge_hyphenated_words(self, text: str) -> str:
        """Merge words split by hyphens at line breaks"""
        import re
        
        # Pattern: word- \n word
        text = re.sub(r'(\w+)-\s*\n\s*(\w+)', r'\1\2', text)
        
        return text
    
    def _fix_spacing(self, text: str) -> str:
        """Fix spacing issues"""
        import re
        
        # Remove multiple spaces
        text = re.sub(r' +', ' ', text)
        
        # Remove spaces before punctuation
        text = re.sub(r'\s+([.,;:!?])', r'\1', text)
        
        # Ensure space after punctuation
        text = re.sub(r'([.,;:!?])(\w)', r'\1 \2', text)
        
        return text.strip()
    
    def _spell_check(self, text: str) -> str:
        """
        Spell check text using educational dictionary
        
        Note: Only corrects words with high misspelling confidence
        to avoid over-correction
        """
        words = text.split()
        corrected_words = []
        
        for word in words:
            # Skip short words, numbers, and words with punctuation
            if len(word) < 3 or word.isdigit() or not word.isalpha():
                corrected_words.append(word)
                continue
            
            # Check if misspelled
            if word.lower() not in self.spell_checker:
                # Get correction
                correction = self.spell_checker.correction(word.lower())
                
                # Only apply if correction is confident
                if correction and correction != word.lower():
                    # Preserve original case
                    if word.isupper():
                        corrected_words.append(correction.upper())
                    elif word[0].isupper():
                        corrected_words.append(correction.capitalize())
                    else:
                        corrected_words.append(correction)
                else:
                    corrected_words.append(word)
            else:
                corrected_words.append(word)
        
        return ' '.join(corrected_words)
    
    def process_page(self, image: np.ndarray, page_num: int) -> Dict[str, Any]:
        """
        Process a single page: preprocess + OCR + post-process
        
        Args:
            image: Page image as numpy array
            page_num: Page number (for logging)
            
        Returns:
            Dictionary with processed results
        """
        try:
            logger.info(f"Processing page {page_num}")
            
            # Preprocess
            preprocessed = self.preprocess_image(image)
            
            # Run OCR
            ocr_result = self.run_ocr(preprocessed)
            
            # Post-process text
            cleaned_text = self.post_process_text(
                ocr_result['text'],
                ocr_result['confidence']
            )
            
            return {
                'page_number': page_num,
                'raw_text': ocr_result['text'],
                'cleaned_text': cleaned_text,
                'confidence': ocr_result['confidence'],
                'word_confidences': ocr_result['word_confidences'],
                'bounding_boxes': ocr_result['bounding_boxes'],
                'total_words': ocr_result['total_words'],
                'needs_review': ocr_result['confidence'] < self.MEDIUM_CONFIDENCE
            }
            
        except Exception as e:
            logger.error(f"Error processing page {page_num}: {e}")
            return {
                'page_number': page_num,
                'raw_text': '',
                'cleaned_text': '',
                'confidence': 0,
                'word_confidences': [],
                'bounding_boxes': [],
                'total_words': 0,
                'needs_review': True,
                'error': str(e)
            }
    
    def process_pdf_parallel(
        self,
        pdf_path: str,
        max_workers: int = 4
    ) -> List[Dict[str, Any]]:
        """
        Process all pages of a PDF in parallel
        
        Args:
            pdf_path: Path to PDF file
            max_workers: Number of parallel workers
            
        Returns:
            List of page results
        """
        try:
            # Convert PDF to images
            images = self.pdf_to_images(pdf_path)
            
            # Process pages in parallel
            results = []
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                # Submit all tasks
                future_to_page = {
                    executor.submit(self.process_page, img, i + 1): i + 1
                    for i, img in enumerate(images)
                }
                
                # Collect results as they complete
                for future in as_completed(future_to_page):
                    page_num = future_to_page[future]
                    try:
                        result = future.result()
                        results.append(result)
                    except Exception as e:
                        logger.error(f"Page {page_num} processing failed: {e}")
                        results.append({
                            'page_number': page_num,
                            'raw_text': '',
                            'cleaned_text': '',
                            'confidence': 0,
                            'needs_review': True,
                            'error': str(e)
                        })
            
            # Sort by page number
            results.sort(key=lambda x: x['page_number'])
            
            return results
            
        except Exception as e:
            logger.error(f"PDF processing failed: {e}")
            raise
    
    def save_ocr_results(
        self,
        results: List[Dict[str, Any]],
        output_dir: str
    ) -> None:
        """
        Save OCR results to files
        
        Args:
            results: List of page results
            output_dir: Directory to save results
        """
        try:
            # Create output directory
            os.makedirs(output_dir, exist_ok=True)
            
            for result in results:
                page_num = result['page_number']
                
                # Save raw OCR JSON
                raw_json_path = os.path.join(output_dir, f"page_{page_num:03d}_raw.json")
                with open(raw_json_path, 'w', encoding='utf-8') as f:
                    json.dump(result, f, indent=2, ensure_ascii=False)
                
                # Save cleaned text
                cleaned_txt_path = os.path.join(output_dir, f"page_{page_num:03d}_cleaned.txt")
                with open(cleaned_txt_path, 'w', encoding='utf-8') as f:
                    f.write(result['cleaned_text'])
            
            logger.info(f"Saved OCR results to {output_dir}")
            
        except Exception as e:
            logger.error(f"Error saving OCR results: {e}")
            raise
