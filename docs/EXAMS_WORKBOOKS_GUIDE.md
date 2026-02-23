# Exams & Workbooks System Documentation

## Overview

The 7Plus Learning Center Academy backend now includes a comprehensive **Exams & Workbooks** system with:

- **Auto-Grading**: Exams automatically grade objective questions (MCQ, T/F, etc.)
- **Workbooks**: Interactive gap-filling, multiple-choice, and other exercise types
- **3 Core Subjects**: English, Mathematics, Mother Tongue (auto-seeded on startup)
- **Performance Tracking**: Detailed student performance analytics and scores
- **Admin Notifications**: Automatic submission notifications to admin (not teacher)
- **Student Dashboard**: Track progress and performance across subjects

---

## Key Features

### 1. Exams System

#### Models
- **Exam**: Main exam entity with auto-grading settings
- **ExamQuestion**: Individual questions with multiple question types
- **ExamSubmission**: Student exam attempts with scoring
- **ExamAnswer**: Student answers to individual questions
- **ExamPerformanceDetail**: Detailed exam performance analytics

#### Question Types
- Multiple Choice (MCQ)
- True/False
- Short Answer
- Essay (manual grading)

#### Auto-Grading
When a student submits an exam:
1. System automatically compares answers to correct answers
2. Calculates score and percentage
3. Marks as pass/fail based on passing score
4. Notifies admin (not teacher) of submission
5. Shows results to student immediately (if enabled)

#### Exam Features
- **Duration**: Optional time limits for exams
- **Passing Score**: Configurable pass threshold
- **Show Answers**: Toggle to reveal correct answers after submission
- **Auto-Grade**: Toggle automatic grading on/off
- **Status Tracking**: Draft → Published → Archived

#### API Endpoints

```
POST /exams                           # Create new exam
GET /exams                            # List exams (filtered by published status for students)
GET /exams/{exam_id}                  # Get exam details
PUT /exams/{exam_id}                  # Update exam
DELETE /exams/{exam_id}               # Delete exam

POST /exams/{exam_id}/start-submission        # Student starts exam
POST /exams/{submission_id}/submit-answer     # Student submits individual answer
POST /exams/{submission_id}/submit            # Student submits completed exam (triggers grading)

GET /exams/{submission_id}                    # Get submission details
GET /exams/student/{student_id}/submissions   # Get all submissions for student
GET /exams/student/{student_id}/performance   # Get performance summary

GET /exams/admin/pending-submissions          # Admin: Get pending submissions
POST /exams/{submission_id}/admin-feedback    # Admin: Add feedback
```

---

### 2. Workbooks System

#### Models
- **Workbook**: Main workbook entity
- **WorkbookSection**: Sections within a workbook (e.g., Part A, Part B)
- **WorkbookQuestion**: Individual questions/activities
- **WorkbookSubmission**: Student workbook attempts
- **WorkbookAnswer**: Student answers to workbook questions
- **WorkbookPerformanceDetail**: Detailed workbook performance

#### Activity Types
- **Gap Filling**: Fill in blanks (text input)
- **Multiple Choice**: Select from options
- **True/False**: Boolean questions
- **Matching**: Match items
- **Short Answer**: Text responses
- **Essay**: Long-form responses

#### Workbook Features
- **Sections**: Organize questions into parts
- **Auto-Grading**: Automatically grade objective questions
- **Show Answers**: Toggle to reveal answers after submission
- **Attempts**: Track number of attempts per student
- **Levels**: Beginner, Intermediate, Advanced
- **Status**: Draft, Published, Archived

#### API Endpoints

```
POST /workbooks                            # Create workbook
GET /workbooks                             # List workbooks
GET /workbooks/{workbook_id}               # Get workbook details
PUT /workbooks/{workbook_id}               # Update workbook
DELETE /workbooks/{workbook_id}            # Delete workbook

POST /workbooks/{workbook_id}/start        # Student starts workbook
POST /workbooks/{submission_id}/submit-answer   # Student answers question
POST /workbooks/{submission_id}/submit     # Student submits workbook (triggers grading)

GET /workbooks/{submission_id}             # Get submission details
GET /workbooks/student/{student_id}/submissions  # Student's submissions
GET /workbooks/student/{student_id}/performance  # Performance summary

GET /workbooks/admin/pending-submissions   # Admin: Pending submissions
POST /workbooks/{submission_id}/admin-feedback   # Admin: Add feedback
```

---

### 3. Performance Tracking

#### Models
- **StudentPerformance**: Overall performance metrics per subject
- **ExamPerformanceDetail**: Exam-specific performance breakdown
- **WorkbookPerformanceDetail**: Workbook-specific performance breakdown

#### Metrics Tracked
- **Exams**: Total taken, passed, failed, average score, best/worst scores
- **Workbooks**: Total completed, average score, best/worst scores
- **Overall**: Combined percentage, letter grade (A+, A, B+, B, C, D, F)
- **Trends**: Improving, declining, or stable performance
- **Questions**: Correct/wrong/skipped counts
- **Time**: Time spent on exams and workbooks

#### Performance Dashboard
- Shows student's exam and workbook performance
- Displays trends and analytics
- Shows performance by subject
- Lists recent activity

#### Admin Dashboard
- View all students' performance
- Performance distribution (grade counts)
- Top performers
- Students needing improvement
- Class-wide analytics

---

### 4. The 3 Core Subjects

Automatically seeded on first startup:

#### English
- Grammar exercises
- Vocabulary
- Comprehension
- Sample exams with MCQ questions
- Workbooks with gap-filling and vocabulary exercises

#### Mathematics
- Arithmetic
- Percentage calculations
- Basic algebra
- Sample exams with calculations
- Workbooks with math problems

#### Mother Tongue
- Language basics
- Cultural literacy
- Writing exercises
- Sample exams and workbooks (Swahili example)
- Customizable for different languages

---

## Data Seeding

### Automatic Seeding
On first startup, the system automatically creates:
1. **3 Subjects**: English, Math, Mother Tongue
2. **Sample Exams**: One basic quiz per subject with 5 questions each
3. **Sample Workbooks**: One workbook per subject with practice questions

### Manual Seeding
```python
from app.data.seed_exams_workbooks import seed_all

seed_all()
```

### Seed Data Details

**Subjects Created:**
```
ID: 1 - English
ID: 2 - Mathematics  
ID: 3 - Mother Tongue
```

**Sample Exams:**
- English Basic Quiz (5 MCQ questions, 50 points)
- Math Basic Quiz (5 MCQ questions, 50 points)
- Mother Tongue Quiz (5 mixed questions, 50 points)

**Sample Workbooks:**
- English Workbook (2 sections with gap-filling and MCQ)
- Math Workbook (2 sections with calculations)
- Mother Tongue Workbook (gap-filling and true/false)

---

## Auto-Grading Algorithm

### Step 1: Answer Validation
```python
is_correct = student_answer.lower() == correct_answer.lower()
```

### Step 2: Point Calculation
```python
points_earned = question.points if is_correct else 0
```

### Step 3: Score Calculation
```python
total_score = sum(question.points for all questions)
percentage = (earned_points / total_score) * 100
is_passed = percentage >= exam.passing_score
```

### Step 4: Admin Notification
```python
submission.submitted_to_admin = True
submission.admin_notified_at = datetime.utcnow()
```

---

## Admin Submissions Flow

### Exam Submission Flow
1. Student takes exam
2. Student clicks "Submit"
3. System auto-grades (if enabled)
4. **Submission automatically sent to Admin** (NOT teacher)
5. Admin sees in `/exams/admin/pending-submissions`
6. Admin can add feedback via `/exams/{submission_id}/admin-feedback`

### Notification
- Email notifications (if configured)
- Admin dashboard shows pending submissions
- Submission timestamp and student details

---

## API Usage Examples

### Student: Start and Submit Exam

```bash
# 1. Start exam
curl -X POST http://localhost:8000/exams/1/start-submission \
  -H "Authorization: Bearer {token}"

# Response:
{
  "id": 1,
  "exam_id": 1,
  "student_id": 5,
  "status": "in_progress",
  "started_at": "2024-12-18T10:00:00",
  "answers": []
}

# 2. Answer questions
curl -X POST http://localhost:8000/exams/1/submit-answer \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"question_id": 1, "answer_text": "children"}'

# 3. Submit exam
curl -X POST http://localhost:8000/exams/1/submit \
  -H "Authorization: Bearer {token}"

# Response (after auto-grading):
{
  "id": 1,
  "exam_id": 1,
  "student_id": 5,
  "score_obtained": 45.0,
  "total_score": 50.0,
  "percentage": 90.0,
  "is_passed": true,
  "status": "graded",
  "submitted_to_admin": true,
  "submitted_at": "2024-12-18T10:15:00",
  "graded_at": "2024-12-18T10:15:01"
}
```

### Student: Complete Workbook

```bash
# 1. Start workbook
curl -X POST http://localhost:8000/workbooks/1/start \
  -H "Authorization: Bearer {token}"

# 2. Answer questions
curl -X POST http://localhost:8000/workbooks/1/submit-answer \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"question_id": 1, "answer_text": "goes"}'

# 3. Submit workbook
curl -X POST http://localhost:8000/workbooks/1/submit \
  -H "Authorization: Bearer {token}"

# Auto-grades and submits to admin
```

### Admin: View Pending Submissions

```bash
curl -X GET http://localhost:8000/exams/admin/pending-submissions \
  -H "Authorization: Bearer {admin_token}"

# Response:
[
  {
    "id": 1,
    "exam_id": 1,
    "student_id": 5,
    "score_obtained": 45.0,
    "percentage": 90.0,
    "is_passed": true,
    "status": "graded",
    "submitted_to_admin": true,
    "submitted_at": "2024-12-18T10:15:00"
  }
]
```

### Admin: Add Feedback

```bash
curl -X POST http://localhost:8000/exams/1/admin-feedback \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{"feedback": "Great work! Keep practicing these areas: X, Y, Z"}'
```

### Student: View Performance

```bash
curl -X GET http://localhost:8000/exams/student/5/performance \
  -H "Authorization: Bearer {token}"

# Response:
{
  "total_exams": 3,
  "average_score": 85.5,
  "exams_passed": 3,
  "exams_failed": 0,
  "best_score": 95.0,
  "worst_score": 75.0
}
```

---

## Database Schema

### Exams Tables
```
exams
├── id (PK)
├── title
├── subject_id (FK)
├── created_by_id (FK - User)
├── total_points
├── passing_score
├── auto_grade (boolean)
├── status (ENUM)
└── timestamps

exam_questions
├── id (PK)
├── exam_id (FK)
├── question_text
├── question_type (ENUM)
├── correct_answer
└── options (A, B, C, D)

exam_submissions
├── id (PK)
├── exam_id (FK)
├── student_id (FK - User)
├── score_obtained
├── percentage
├── is_passed
├── status (ENUM)
├── submitted_to_admin (boolean)
└── timestamps

exam_answers
├── id (PK)
├── submission_id (FK)
├── question_id (FK)
├── answer_text
├── is_correct
├── points_earned
```

### Workbooks Tables
```
workbooks
├── id (PK)
├── title
├── subject_id (FK)
├── created_by_id (FK - User)
├── auto_grade
├── status (ENUM)
└── timestamps

workbook_sections
├── id (PK)
├── workbook_id (FK)
├── title
└── section_order

workbook_questions
├── id (PK)
├── section_id (FK)
├── question_text
├── question_type (ENUM)
├── correct_answer
└── options (A, B, C, D)

workbook_submissions
├── id (PK)
├── workbook_id (FK)
├── student_id (FK - User)
├── score_obtained
├── percentage
├── attempts
├── submitted_to_admin
└── timestamps

workbook_answers
├── id (PK)
├── submission_id (FK)
├── question_id (FK)
├── answer_text
├── is_correct
└── points_earned
```

### Performance Tables
```
student_performance
├── id (PK)
├── student_id (FK - User)
├── subject_id (FK)
├── total_exams_taken
├── average_exam_score
├── total_workbooks_completed
├── average_workbook_score
├── overall_percentage
├── grade (A+, A, B+, B, C, D, F)
└── last_assessed_at

exam_performance_detail
├── id (PK)
├── student_id (FK)
├── exam_id (FK)
├── total_questions
├── correct_answers
├── weak_topics
└── time_taken

workbook_performance_detail
├── id (PK)
├── student_id (FK)
├── workbook_id (FK)
├── total_questions
├── correct_answers
├── strong_topics
└── time_spent
```

---

## Grading System

### Letter Grades
```
A+  : 90% - 100%
A   : 85% - 89%
B+  : 80% - 84%
B   : 75% - 79%
C   : 70% - 74%
D   : 60% - 69%
F   : Below 60%
```

### Performance Trends
- **Improving**: Recent scores > previous scores
- **Declining**: Recent scores < previous scores
- **Stable**: Consistent performance

---

## Integration with Frontend

### Frontend Flow for Exams

```javascript
// 1. List exams
const exams = await fetch('http://localhost:8000/exams', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());

// 2. Start exam
const submission = await fetch(`http://localhost:8000/exams/${examId}/start-submission`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());

// 3. Answer questions
for (let answer of answers) {
  await fetch(`http://localhost:8000/exams/${submission.id}/submit-answer`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(answer)
  });
}

// 4. Submit exam
const result = await fetch(`http://localhost:8000/exams/${submission.id}/submit`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());

// 5. Show results
console.log(`Score: ${result.percentage}% (${result.score_obtained}/${result.total_score})`);
console.log(`Status: ${result.is_passed ? 'PASSED' : 'FAILED'}`);
```

### Frontend Flow for Workbooks

Similar to exams:
```javascript
1. GET /workbooks - List workbooks
2. POST /workbooks/{id}/start - Start workbook
3. POST /workbooks/{id}/submit-answer - Answer questions
4. POST /workbooks/{id}/submit - Submit workbook
5. GET /workbooks/{id} - View results
```

---

## Security

### Permission Checks
- **Teachers/Admins**: Can create exams and workbooks
- **Students**: Can only take published exams and workbooks
- **Admins**: Can view all submissions and add feedback
- **Teachers**: Cannot see submissions (only admins can)

### Auto-Submit Security
- Submissions automatically marked as submitted_to_admin
- Prevents teachers from accessing student submissions
- Only admin can view and grade
- Audit trail maintained with timestamps

---

## Future Enhancements

1. **AI-Powered Analysis**: Identify weak areas across the class
2. **Adaptive Learning**: Adjust difficulty based on performance
3. **Timed Exams**: Implement countdown timers
4. **Proctoring**: Video monitoring for exams
5. **Certificate Generation**: Auto-generate certificates on passing
6. **Email Notifications**: Send admin alerts on submissions
7. **Bulk Question Import**: CSV upload for questions
8. **Question Bank**: Randomized questions from a pool
9. **Answer Key Management**: Versioning and amendments
10. **Analytics Dashboard**: Comprehensive reporting for admin

---

## Troubleshooting

### Exam not showing for students
- Check exam status: Must be `published`
- Check start_date and end_date
- Verify subject exists

### Auto-grading not working
- Check exam.auto_grade = True
- Verify correct_answer field in questions
- Ensure student submitted before checking

### Admin not receiving submissions
- Check submission.submitted_to_admin = True
- Verify submission.admin_notified_at timestamp
- Check admin user exists and is active

---

## Support

For issues or questions about the Exams & Workbooks system, refer to:
- BACKEND_API_DOCUMENTATION.md
- SETUP_GUIDE.md
- API endpoints documentation at http://localhost:8000/docs

