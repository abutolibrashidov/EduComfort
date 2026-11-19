"""
JSON Test Migration Script
===========================

Migrates JSON test files from /Tests directory into the database exam system.

Usage:
    # Preview without committing
    python scripts/migrate_json_tests.py --dry-run --subject-id 1
    
    # Import all tests
    python scripts/migrate_json_tests.py --subject-id 1 --created-by-id 1
    
    # Import specific level/unit
    python scripts/migrate_json_tests.py --subject-id 1 --level elementary --unit 7
    
Arguments:
    --subject-id: Required. Subject ID to assign exams to
    --created-by-id: Required. User ID who created these exams (teacher/admin)
    --dry-run: Preview without committing to database
    --level: Filter by level (e.g., elementary, intermediate)
    --unit: Filter by unit number (e.g., 7)
"""

import sys
import os
import json
import argparse
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.database import SessionLocal
from app.models.exam import Exam, ExamQuestion, ExamStatus, QuestionType


# Question type mapping from JSON to database
QUESTION_TYPE_MAPPING = {
    "multiple-choice-circle": QuestionType.multiple_choice,
    "multiple-choice": QuestionType.multiple_choice,
    "fill-in-blanks": QuestionType.short_answer,
    "fill-in-blanks-text": QuestionType.short_answer,
    "fill-in-blanks-dropdown": QuestionType.short_answer,
    "error-correction": QuestionType.short_answer,
    "present-perfect-negative": QuestionType.short_answer,
    "dialogue-completion": QuestionType.short_answer,
    "matching": QuestionType.matching,
    "matching-paragraphs": QuestionType.matching,
    "ordering": QuestionType.ordering,
    "gap-filling": QuestionType.gap_filling,
    "true-false": QuestionType.true_false,
    "essay": QuestionType.essay,
}


class TestMigrator:
    """Handles migration of JSON tests to database"""
    
    def __init__(self, subject_id: int, created_by_id: int, dry_run: bool = False):
        self.subject_id = subject_id
        self.created_by_id = created_by_id
        self.dry_run = dry_run
        self.db = SessionLocal()
        self.stats = {"success": 0, "failed": 0, "skipped": 0}
        
    def __del__(self):
        """Close database connection"""
        if hasattr(self, 'db'):
            self.db.close()
    
    def find_test_files(self, base_path: str, level_filter: Optional[str] = None, 
                       unit_filter: Optional[int] = None) -> List[Path]:
        """Find all JSON test files matching filters"""
        base = Path(base_path)
        if not base.exists():
            print(f"❌ Tests directory not found: {base_path}")
            print(f"   Please create the directory and add your JSON test files.")
            return []
        
        # Recursively find all .json files
        all_files = list(base.rglob("*.json"))
        
        # Apply filters
        filtered_files = []
        for file_path in all_files:
            # Extract level from path (e.g., "Elementary test")
            path_parts = file_path.parts
            
            # Check level filter
            if level_filter:
                level_match = any(level_filter.lower() in part.lower() for part in path_parts)
                if not level_match:
                    continue
            
            # Check unit filter
            if unit_filter is not None:
                unit_match = any(f"UNIT {unit_filter}" in part.upper() or 
                               f"UNIT{unit_filter}" in part.upper() for part in path_parts)
                if not unit_match:
                    continue
            
            filtered_files.append(file_path)
        
        return filtered_files
    
    def parse_json_file(self, file_path: Path) -> Optional[Dict]:
        """Parse JSON test file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except json.JSONDecodeError as e:
            print(f"❌ Invalid JSON in {file_path.name}: {e}")
            return None
        except Exception as e:
            print(f"❌ Error reading {file_path.name}: {e}")
            return None
    
    def build_question_text(self, question_data: Dict) -> str:
        """Build question text from various JSON formats"""
        
        # Handle different question structures
        if "sentence" in question_data:
            # Format: "She didn't ___ / ___ the password."
            return question_data["sentence"]
        
        if "beforeBlank" in question_data and "afterBlank" in question_data:
            # Format: beforeBlank + _____ + afterBlank
            before = question_data.get("beforeBlank", "")
            after = question_data.get("afterBlank", "")
            return f"{before} _____ {after}"
        
        if "text" in question_data:
            return question_data["text"]
        
        if "question" in question_data:
            return question_data["question"]
        
        # Fallback: stringify the whole question
        return str(question_data)
    
    def extract_correct_answer(self, question_data: Dict, question_type: str) -> str:
        """Extract correct answer from question data"""
        
        # Try different field names
        if "correctAnswer" in question_data:
            answer = question_data["correctAnswer"]
        elif "correct_answer" in question_data:
            answer = question_data["correct_answer"]
        elif "answer" in question_data:
            answer = question_data["answer"]
        else:
            # For multiple choice, might be in options
            if question_type == "multiple-choice-circle" and "options" in question_data:
                # Return first option as default (should be overridden)
                return str(question_data["options"][0]) if question_data["options"] else ""
            return ""
        
        # Convert to string if needed
        if isinstance(answer, list):
            return ", ".join(str(a) for a in answer)
        return str(answer)
    
    def build_additional_data(self, question_data: Dict) -> Dict:
        """Build additional_data JSON from question metadata"""
        additional = {}
        
        # Acceptable variants
        if "acceptableVariants" in question_data:
            additional["acceptableVariants"] = question_data["acceptableVariants"]
        elif "acceptable_variants" in question_data:
            additional["acceptableVariants"] = question_data["acceptable_variants"]
        
        # Provided words (word bank)
        if "providedWords" in question_data:
            additional["providedWords"] = question_data["providedWords"]
        elif "provided_words" in question_data:
            additional["providedWords"] = question_data["provided_words"]
        elif "wordBank" in question_data:
            additional["providedWords"] = question_data["wordBank"]
        
        # Before/after blank (for fill-in-blanks)
        if "beforeBlank" in question_data:
            additional["beforeBlank"] = question_data["beforeBlank"]
        if "afterBlank" in question_data:
            additional["afterBlank"] = question_data["afterBlank"]
        
        # Options for multiple choice
        if "options" in question_data:
            additional["options"] = question_data["options"]
        
        # Distractors
        if "distractors" in question_data:
            additional["distractors"] = question_data["distractors"]
        
        return additional
    
    def create_exam_from_json(self, test_data: Dict, file_path: Path) -> Optional[Exam]:
        """Create Exam record from JSON test data"""
        
        metadata = test_data.get("metadata", {})
        
        # Build exam title
        level = metadata.get("level", "Unknown").title()
        unit = metadata.get("unit", "?")
        test_type = metadata.get("type", "test").title()
        variant = metadata.get("variant", "")
        
        title = f"{level} - Unit {unit} - {test_type} Test"
        if variant:
            title += f" {variant}"
        
        # Calculate passing score (60% of total marks)
        total_marks = metadata.get("totalMarks", 100)
        passing_score = total_marks * 0.6
        
        # Build custom_data JSON
        custom_data = json.dumps({
            "level": metadata.get("level"),
            "unit": metadata.get("unit"),
            "set": metadata.get("set"),
            "variant": metadata.get("variant"),
            "type": metadata.get("type"),
            "source": "json_import",
            "original_file": str(file_path.name)
        })
        
        # Create exam
        exam = Exam(
            title=title,
            description=f"Imported from {file_path.name}",
            subject_id=self.subject_id,
            created_by_id=self.created_by_id,
            total_points=float(total_marks),
            duration_minutes=metadata.get("estimatedTime", 45),
            passing_score=passing_score,
            status=ExamStatus.draft,  # Requires teacher review
            auto_grade=True,
            show_answers=False,
            custom_data=custom_data,
            is_imported=True
        )
        
        return exam
    
    def create_questions_from_section(self, section: Dict, exam: Exam, 
                                     sequence_start: int) -> List[ExamQuestion]:
        """Create ExamQuestion records from a section"""
        questions = []
        sequence = sequence_start
        
        for q_group in section.get("questions", []):
            question_type_str = q_group.get("type", "short_answer")
            marks = q_group.get("marks", 1)
            instructions = q_group.get("instructions", "")
            
            # Map to database question type
            db_question_type = QUESTION_TYPE_MAPPING.get(
                question_type_str, 
                QuestionType.short_answer
            )
            
            # Handle nested questions (e.g., multiple-choice with sub-questions)
            content = q_group.get("content", {})
            sub_questions = content.get("questions", [q_group])  # Fallback to q_group itself
            
            for sub_q in sub_questions:
                # Build question text
                question_text = self.build_question_text(sub_q)
                
                # Add instructions if present
                if instructions:
                    question_text = f"{instructions}\n\n{question_text}"
                
                # Extract correct answer
                correct_answer = self.extract_correct_answer(sub_q, question_type_str)
                
                # Build additional data
                additional_data_dict = self.build_additional_data(sub_q)
                additional_data_json = json.dumps(additional_data_dict) if additional_data_dict else None
                
                # Create question
                question = ExamQuestion(
                    exam_id=exam.id if hasattr(exam, 'id') else None,
                    question_text=question_text,
                    question_type=db_question_type,
                    points=float(marks),
                    sequence_order=sequence,
                    correct_answer=correct_answer,
                    additional_data=additional_data_json
                )
                
                # Handle multiple choice options
                if db_question_type == QuestionType.multiple_choice and "options" in sub_q:
                    options = sub_q["options"]
                    if len(options) >= 1:
                        question.option_a = str(options[0]) if len(options) > 0 else None
                    if len(options) >= 2:
                        question.option_b = str(options[1]) if len(options) > 1 else None
                    if len(options) >= 3:
                        question.option_c = str(options[2]) if len(options) > 2 else None
                    if len(options) >= 4:
                        question.option_d = str(options[3]) if len(options) > 3 else None
                
                questions.append(question)
                sequence += 1
        
        return questions
    
    def migrate_test_file(self, file_path: Path) -> bool:
        """Migrate a single test file to database"""
        
        print(f"\n📄 Processing: {file_path.name}")
        
        # Parse JSON
        test_data = self.parse_json_file(file_path)
        if not test_data:
            self.stats["failed"] += 1
            return False
        
        try:
            # Create exam
            exam = self.create_exam_from_json(test_data, file_path)
            
            if not self.dry_run:
                self.db.add(exam)
                self.db.flush()  # Get exam.id
            
            # Create questions
            all_questions = []
            sequence = 1
            
            for section in test_data.get("sections", []):
                section_questions = self.create_questions_from_section(section, exam, sequence)
                all_questions.extend(section_questions)
                sequence += len(section_questions)
            
            # Add questions to database
            if not self.dry_run:
                for question in all_questions:
                    question.exam_id = exam.id
                    self.db.add(question)
                
                self.db.commit()
                print(f"✅ Created Exam ID: {exam.id} with {len(all_questions)} questions")
            else:
                print(f"✅ [DRY RUN] Would create exam '{exam.title}' with {len(all_questions)} questions")
            
            self.stats["success"] += 1
            return True
            
        except Exception as e:
            print(f"❌ Error: {e}")
            if not self.dry_run:
                self.db.rollback()
            self.stats["failed"] += 1
            return False
    
    def migrate_all(self, tests_dir: str, level_filter: Optional[str] = None,
                   unit_filter: Optional[int] = None):
        """Migrate all test files"""
        
        print("=" * 60)
        print("JSON TEST MIGRATION")
        print("=" * 60)
        print(f"Tests Directory: {tests_dir}")
        print(f"Subject ID: {self.subject_id}")
        print(f"Created By ID: {self.created_by_id}")
        print(f"Dry Run: {self.dry_run}")
        if level_filter:
            print(f"Level Filter: {level_filter}")
        if unit_filter:
            print(f"Unit Filter: {unit_filter}")
        print("=" * 60)
        
        # Find test files
        files = self.find_test_files(tests_dir, level_filter, unit_filter)
        
        if not files:
            print("\n❌ No test files found matching criteria")
            return
        
        print(f"\n📁 Found {len(files)} test file(s)")
        
        # Migrate each file
        for file_path in files:
            self.migrate_test_file(file_path)
        
        # Print summary
        print("\n" + "=" * 60)
        print("MIGRATION SUMMARY")
        print("=" * 60)
        print(f"✅ Success: {self.stats['success']}")
        print(f"❌ Failed: {self.stats['failed']}")
        print(f"⏭️  Skipped: {self.stats['skipped']}")
        print("=" * 60)
        
        if self.dry_run:
            print("\n💡 This was a dry run. Use without --dry-run to actually import.")


def main():
    parser = argparse.ArgumentParser(description="Migrate JSON tests to database")
    parser.add_argument("--subject-id", type=int, required=True, help="Subject ID for exams")
    parser.add_argument("--created-by-id", type=int, required=True, help="User ID who created exams")
    parser.add_argument("--dry-run", action="store_true", help="Preview without committing")
    parser.add_argument("--level", type=str, help="Filter by level (e.g., elementary)")
    parser.add_argument("--unit", type=int, help="Filter by unit number")
    parser.add_argument("--tests-dir", type=str, default="Tests", help="Tests directory path")
    
    args = parser.parse_args()
    
    # Create migrator
    migrator = TestMigrator(
        subject_id=args.subject_id,
        created_by_id=args.created_by_id,
        dry_run=args.dry_run
    )
    
    # Run migration
    migrator.migrate_all(
        tests_dir=args.tests_dir,
        level_filter=args.level,
        unit_filter=args.unit
    )


if __name__ == "__main__":
    main()
