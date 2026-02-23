"""
Distractor generation endpoint for gap-filling questions
Generates plausible wrong answers based on context
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import random

router = APIRouter()


class DistractorRequest(BaseModel):
    """Request for distractor generation"""
    correct_answer: str
    context: str
    question_text: str
    num_distractors: int = 3


class DistractorResponse(BaseModel):
    """Response with generated distractors"""
    correct_answer: str
    distractors: List[str]


@router.post("/generate-distractors", response_model=DistractorResponse)
def generate_distractors(request: DistractorRequest):
    """
    Generate plausible distractors for gap-filling questions
    
    This is a basic implementation. In production, this would use:
    - NLP models (spaCy, transformers)
    - Word embeddings for semantic similarity
    - Context-aware generation
    """
    
    correct = request.correct_answer.strip()
    distractors = []
    
    # Strategy 1: Capitalization variants
    if correct.islower():
        distractors.append(correct.capitalize())
    elif correct.isupper():
        distractors.append(correct.lower())
    
    # Strategy 2: Common substitutions based on word type
    common_substitutions = {
        # Numbers
        "one": ["two", "three", "first"],
        "two": ["one", "three", "second"],
        "first": ["second", "third", "last"],
        
        # Time periods
        "18th": ["17th", "19th", "20th"],
        "19th": ["18th", "20th", "21st"],
        
        # Common words
        "agricultural": ["industrial", "commercial", "urban"],
        "industrial": ["agricultural", "commercial", "technological"],
        "Britain": ["France", "Germany", "America"],
        "France": ["Britain", "Germany", "Spain"],
        
        # Science terms
        "oxygen": ["nitrogen", "carbon dioxide", "hydrogen"],
        "photosynthesis": ["respiration", "transpiration", "germination"],
        "chlorophyll": ["carotene", "xanthophyll", "anthocyanin"],
    }
    
    # Check if we have predefined substitutions
    correct_lower = correct.lower()
    if correct_lower in common_substitutions:
        distractors.extend(common_substitutions[correct_lower][:request.num_distractors - len(distractors)])
    
    # Strategy 3: If still need more, generate based on patterns
    while len(distractors) < request.num_distractors:
        if correct.isdigit():
            # For numbers, generate nearby numbers
            num = int(correct)
            distractor = str(num + random.choice([-2, -1, 1, 2]))
            if distractor not in distractors and distractor != correct:
                distractors.append(distractor)
        elif len(correct) > 3:
            # For longer words, create slight variations
            # This is a placeholder - real implementation would be smarter
            variations = [
                correct + "s",
                correct[:-1] if len(correct) > 4 else correct + "ed",
                "non-" + correct if not correct.startswith("non-") else correct[4:]
            ]
            for var in variations:
                if var not in distractors and var != correct and len(distractors) < request.num_distractors:
                    distractors.append(var)
        else:
            # Fallback: generic distractors
            generic = ["option", "answer", "choice"]
            for g in generic:
                if len(distractors) < request.num_distractors:
                    distractors.append(g)
    
    # Ensure we have exactly the requested number
    distractors = distractors[:request.num_distractors]
    
    # Remove duplicates and the correct answer
    distractors = [d for d in distractors if d != correct]
    distractors = list(dict.fromkeys(distractors))  # Remove duplicates while preserving order
    
    # If we still don't have enough, add generic ones
    while len(distractors) < request.num_distractors:
        distractors.append(f"Option {len(distractors) + 1}")
    
    return DistractorResponse(
        correct_answer=correct,
        distractors=distractors[:request.num_distractors]
    )
