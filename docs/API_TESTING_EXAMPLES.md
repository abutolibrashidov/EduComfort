# 🧪 API Testing Guide - 7Plus Learning Center

Complete examples to test all major features of the backend.

---

## 🔐 1. Authentication

### **Register a New User**
```bash
POST http://localhost:8000/auth/register
Content-Type: application/json

{
    "email": "teacher@example.com",
    "password": "SecurePass123!",
    "full_name": "John Smith",
    "role": "teacher",
    "branch_id": 1
}

Response (201):
{
    "id": 1,
    "email": "teacher@example.com",
    "full_name": "John Smith",
    "role": "teacher",
    "is_active": true,
    "created_at": "2025-12-18T10:00:00"
}
```

### **Login**
```bash
POST http://localhost:8000/auth/login
Content-Type: application/json

{
    "email": "teacher@example.com",
    "password": "SecurePass123!"
}

Response (200):
{
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "user": {
        "id": 1,
        "email": "teacher@example.com",
        "role": "teacher"
    }
}
```

**Use token for all subsequent requests:**
```
Authorization: Bearer {access_token}
```

---

## 📝 2. Regular Exams

### **Create Exam**
```bash
POST http://localhost:8000/exams
Authorization: Bearer {token}
Content-Type: application/json

{
    "title": "English Grammar Quiz",
    "description": "Test your grammar knowledge",
    "subject_id": 1,
    "total_points": 50,
    "duration_minutes": 30,
    "passing_score": 70,
    "auto_grade": true,
    "show_answers": true
}

Response (201):
{
    "id": 1,
    "title": "English Grammar Quiz",
    "status": "draft",
    "created_by_id": 1,
    "created_at": "2025-12-18T10:00:00"
}
```

### **Add Question to Exam**
```bash
POST http://localhost:8000/exams/1/questions
Authorization: Bearer {token}
Content-Type: application/json

{
    "question_text": "What is the plural of 'child'?",
    "question_type": "multiple_choice",
    "points": 10,
    "sequence_order": 1,
    "option_a": "children",
    "option_b": "childs",
    "option_c": "childes",
    "option_d": "childreen",
    "correct_answer": "children",
    "explanation": "The correct plural of 'child' is 'children'"
}

Response (201):
{
    "id": 1,
    "exam_id": 1,
    "question_text": "What is the plural of 'child'?",
    "question_type": "multiple_choice",
    "correct_answer": "children"
}
```

### **Publish Exam**
```bash
PUT http://localhost:8000/exams/1/publish
Authorization: Bearer {token}

Response (200):
{
    "id": 1,
    "title": "English Grammar Quiz",
    "status": "published",
    "published_at": "2025-12-18T10:30:00"
}
```

### **Student Starts Exam**
```bash
POST http://localhost:8000/exams/1/start-submission
Authorization: Bearer {student_token}

Response (201):
{
    "id": 1,
    "exam_id": 1,
    "student_id": 5,
    "status": "in_progress",
    "started_at": "2025-12-18T10:45:00"
}
```

### **Student Submits Answer**
```bash
POST http://localhost:8000/exams/1/submit-answer
Authorization: Bearer {student_token}
Content-Type: application/json

{
    "submission_id": 1,
    "question_id": 1,
    "answer_text": "children"
}

Response (200):
{
    "status": "success",
    "is_correct": true,
    "points_earned": 10
}
```

### **Student Submits Exam**
```bash
POST http://localhost:8000/exams/1/submit
Authorization: Bearer {student_token}
{
    "submission_id": 1
}

Response (200):
{
    "id": 1,
    "exam_id": 1,
    "student_id": 5,
    "score_obtained": 45,
    "total_score": 50,
    "percentage": 90,
    "is_passed": true,
    "status": "graded",
    "submitted_at": "2025-12-18T11:00:00"
}
```

### **View Exam Results**
```bash
GET http://localhost:8000/exams/1/submission/1
Authorization: Bearer {student_token}

Response (200):
{
    "id": 1,
    "exam_id": 1,
    "student_id": 5,
    "score_obtained": 45,
    "percentage": 90,
    "is_passed": true,
    "submitted_to_admin": true,
    "admin_notified_at": "2025-12-18T11:00:00"
}
```

---

## 📖 3. Workbooks (Gap-Filling)

### **Teacher Uploads Workbook**
```bash
POST http://localhost:8000/workbooks
Authorization: Bearer {teacher_token}
Content-Type: multipart/form-data

Form Data:
- title: "Solutions Intermediate Unit 5"
- subject_id: 1
- description: "English workbook for intermediate level"
- level: "Intermediate"
- total_tasks: 10
- max_points: 100
- file: (PDF file)

Response (201):
{
    "id": 1,
    "title": "Solutions Intermediate Unit 5",
    "status": "draft",
    "file_name": "Solutions_Intermediate.pdf",
    "file_type": ".pdf",
    "created_by_id": 2
}
```

### **Publish Workbook**
```bash
PUT http://localhost:8000/workbooks/1
Authorization: Bearer {teacher_token}
Content-Type: application/json

{
    "status": "published"
}

Response (200):
{
    "id": 1,
    "title": "Solutions Intermediate Unit 5",
    "status": "published",
    "published_at": "2025-12-18T11:00:00"
}
```

### **Student Submits Workbook**
```bash
POST http://localhost:8000/workbooks/1/submit
Authorization: Bearer {student_token}
Content-Type: application/json

{
    "submission_notes": "Gap 1: goes, Gap 2: are, Gap 3: playing..."
}

Response (201):
{
    "id": 1,
    "workbook_id": 1,
    "student_id": 5,
    "status": "submitted",
    "submission_notes": "...",
    "submitted_to_teacher": true,
    "submitted_at": "2025-12-18T11:30:00"
}
```

### **Teacher Grades Submission**
```bash
PUT http://localhost:8000/workbooks/submissions/1/grade
Authorization: Bearer {teacher_token}
Content-Type: application/json

{
    "score_obtained": 85,
    "teacher_feedback": "Great work! Only a few minor errors."
}

Response (200):
{
    "submission_id": 1,
    "student_id": 5,
    "score_obtained": 85,
    "max_score": 100,
    "percentage": 85,
    "teacher_feedback": "Great work! Only a few minor errors.",
    "graded_at": "2025-12-18T11:45:00"
}
```

---

## 🎯 4. IELTS Mock Tests

### **Create IELTS Exam**
```bash
POST http://localhost:8000/ielts/exams
Authorization: Bearer {teacher_token}
Content-Type: application/json

{
    "title": "IELTS Mock Test 1",
    "description": "Full IELTS simulation exam",
    "exam_type": "full",
    "subject_id": 1,
    "duration_minutes": 180,
    "passing_band_score": 6.5
}

Response (201):
{
    "id": 1,
    "title": "IELTS Mock Test 1",
    "exam_type": "full",
    "status": "draft",
    "created_by_id": 2
}
```

### **Add Reading Passage**
```bash
POST http://localhost:8000/ielts/exams/1/reading/passages
Authorization: Bearer {teacher_token}
Content-Type: application/json

{
    "passage_number": 1,
    "title": "The Great Barrier Reef",
    "passage_text": "The Great Barrier Reef is the world's largest coral reef system...",
    "difficulty_level": "intermediate"
}

Response (201):
{
    "id": 1,
    "passage_number": 1,
    "title": "The Great Barrier Reef",
    "word_count": 450
}
```

### **Add Reading Question**
```bash
POST http://localhost:8000/ielts/reading/passages/1/questions
Authorization: Bearer {teacher_token}
Content-Type: application/json

{
    "question_number": 1,
    "question_text": "What is the Great Barrier Reef made of?",
    "question_type": "mcq",
    "option_a": "Stone",
    "option_b": "Coral",
    "option_c": "Sand",
    "option_d": "Plastic",
    "correct_answer": "Coral",
    "points": 1
}

Response (201):
{
    "id": 1,
    "question_number": 1,
    "question_text": "What is the Great Barrier Reef made of?"
}
```

### **Student Starts Reading**
```bash
POST http://localhost:8000/ielts/exams/1/reading/start
Authorization: Bearer {student_token}

Response (201):
{
    "submission_id": 1,
    "exam_id": 1,
    "student_id": 5,
    "status": "in_progress"
}
```

### **Student Submits Reading Answer**
```bash
POST http://localhost:8000/ielts/exams/1/reading/submit-answer
Authorization: Bearer {student_token}
Content-Type: application/json

{
    "question_id": 1,
    "student_answer": "Coral"
}

Response (200):
{
    "is_correct": true,
    "points_earned": 1
}
```

### **Student Views IELTS Results**
```bash
GET http://localhost:8000/ielts/1/results
Authorization: Bearer {student_token}

Response (200):
{
    "submission_id": 1,
    "exam_title": "IELTS Mock Test 1",
    "reading_score": 32,
    "reading_band": 7.0,
    "listening_score": 30,
    "listening_band": 6.5,
    "writing_task1_band": 7.0,
    "writing_task2_band": 6.5,
    "overall_band_score": 6.8,
    "status": "graded"
}
```

---

## 🎓 5. Online Courses

### **Create Course**
```bash
POST http://localhost:8000/online-courses
Authorization: Bearer {teacher_token}
Content-Type: application/json

{
    "title": "Advanced English Grammar",
    "description": "Master English grammar with comprehensive lessons",
    "course_type": "self_paced",
    "difficulty_level": "advanced",
    "duration_weeks": 8,
    "max_students": 30
}

Response (201):
{
    "id": 1,
    "title": "Advanced English Grammar",
    "status": "draft",
    "instructor_id": 2,
    "created_at": "2025-12-18T10:00:00"
}
```

### **Create Module**
```bash
POST http://localhost:8000/online-courses/1/modules
Authorization: Bearer {teacher_token}
Content-Type: application/json

{
    "module_number": 1,
    "title": "Basic Tenses",
    "description": "Learn present, past, and future tenses",
    "order_sequence": 1
}

Response (201):
{
    "id": 1,
    "course_id": 1,
    "module_number": 1,
    "title": "Basic Tenses"
}
```

### **Create Lesson**
```bash
POST http://localhost:8000/online-courses/1/modules/1/lessons
Authorization: Bearer {teacher_token}
Content-Type: application/json

{
    "lesson_number": 1,
    "title": "Simple Present Tense",
    "lesson_content": "The simple present tense is used for habits and facts...",
    "video_url": "https://youtube.com/watch?v=...",
    "duration_minutes": 30
}

Response (201):
{
    "id": 1,
    "module_id": 1,
    "lesson_number": 1,
    "title": "Simple Present Tense"
}
```

### **Create Assignment**
```bash
POST http://localhost:8000/online-courses/1/assignments
Authorization: Bearer {teacher_token}
Content-Type: application/json

{
    "lesson_id": 1,
    "title": "Simple Present Exercises",
    "description": "Complete 20 exercises using simple present",
    "due_date": "2025-12-25T23:59:59",
    "points": 50
}

Response (201):
{
    "id": 1,
    "lesson_id": 1,
    "title": "Simple Present Exercises",
    "points": 50
}
```

### **Publish Course**
```bash
PUT http://localhost:8000/online-courses/1/publish
Authorization: Bearer {teacher_token}

Response (200):
{
    "id": 1,
    "title": "Advanced English Grammar",
    "status": "active",
    "published_at": "2025-12-18T11:00:00"
}
```

### **Student Enrolls in Course**
```bash
POST http://localhost:8000/online-courses/1/enroll
Authorization: Bearer {student_token}

Response (201):
{
    "enrollment_id": 1,
    "course_id": 1,
    "student_id": 5,
    "status": "active",
    "enrollment_date": "2025-12-18T11:30:00"
}
```

### **Student Views Progress**
```bash
GET http://localhost:8000/online-courses/1/my-progress
Authorization: Bearer {student_token}

Response (200):
{
    "course_id": 1,
    "course_title": "Advanced English Grammar",
    "total_lessons": 24,
    "lessons_completed": 8,
    "completion_percentage": 33.3,
    "total_assignments": 8,
    "assignments_submitted": 3,
    "grade": "A",
    "time_spent_hours": 12.5
}
```

### **Student Submits Assignment**
```bash
POST http://localhost:8000/online-courses/1/assignments/1/submit
Authorization: Bearer {student_token}
Content-Type: application/json

{
    "submission_text": "1. She goes to school. 2. They work here..."
}

Response (201):
{
    "submission_id": 1,
    "assignment_id": 1,
    "student_id": 5,
    "status": "submitted",
    "submitted_at": "2025-12-22T15:30:00"
}
```

### **Teacher Grades Assignment**
```bash
PUT http://localhost:8000/online-courses/1/assignments/1/grade
Authorization: Bearer {teacher_token}
Content-Type: application/json

{
    "grade": 45,
    "feedback": "Great work! Only a few minor errors."
}

Response (200):
{
    "submission_id": 1,
    "grade": 45,
    "max_grade": 50,
    "percentage": 90,
    "graded_at": "2025-12-23T10:00:00"
}
```

---

## 📊 6. Performance & Analytics

### **View Student Performance**
```bash
GET http://localhost:8000/exams/student/5/performance
Authorization: Bearer {token}

Response (200):
{
    "student_id": 5,
    "total_exams_taken": 5,
    "exams_passed": 4,
    "exams_failed": 1,
    "average_exam_score": 82.5,
    "best_exam_score": 95,
    "worst_exam_score": 65
}
```

### **View IELTS Performance**
```bash
GET http://localhost:8000/ielts/student/5/performance
Authorization: Bearer {token}

Response (200):
{
    "student_id": 5,
    "total_exams_taken": 2,
    "average_overall_band": 6.8,
    "best_overall_band": 7.2,
    "latest_band_score": 6.8,
    "reading_average": 7.0,
    "listening_average": 6.5,
    "writing_average": 6.8
}
```

### **View Dashboard**
```bash
GET http://localhost:8000/exams/dashboard
Authorization: Bearer {student_token}

Response (200):
{
    "total_exams": 5,
    "completed_exams": 4,
    "pending_exams": 1,
    "passed_exams": 4,
    "failed_exams": 1,
    "average_score": 82.5,
    "recent_exams": [...]
}
```

---

## 🧑‍💼 7. User Management

### **List Users**
```bash
GET http://localhost:8000/users?role=student
Authorization: Bearer {admin_token}

Response (200):
{
    "total": 45,
    "page": 1,
    "users": [
        {
            "id": 5,
            "email": "student1@example.com",
            "full_name": "Ali Ahmed",
            "role": "student",
            "branch_id": 1,
            "is_active": true
        },
        ...
    ]
}
```

### **Get User Details**
```bash
GET http://localhost:8000/users/5
Authorization: Bearer {token}

Response (200):
{
    "id": 5,
    "email": "student1@example.com",
    "full_name": "Ali Ahmed",
    "role": "student",
    "branch_id": 1,
    "is_active": true,
    "created_at": "2025-12-01T08:00:00"
}
```

---

## 🔄 8. Common Patterns

### **Pagination**
```bash
GET http://localhost:8000/exams?page=1&limit=10
```

### **Filtering**
```bash
GET http://localhost:8000/online-courses?status=active&difficulty_level=intermediate
```

### **Error Response**
```json
{
    "detail": "Invalid credentials",
    "status_code": 401,
    "error_type": "Unauthorized"
}
```

### **Success Response with List**
```json
{
    "total": 10,
    "page": 1,
    "limit": 10,
    "items": [...]
}
```

---

## 🧪 Testing Tips

1. **Use Postman or Insomnia** for testing
2. **Save tokens** in environment variables
3. **Test with different roles** (admin, teacher, student)
4. **Check permissions** on each endpoint
5. **Verify timestamps** are in UTC
6. **Test error cases** (wrong ID, unauthorized, etc.)

---

## 📝 Notes

- All endpoints return UTC timestamps
- Dates are in ISO 8601 format
- Scores are out of 100 (percentage) unless specified otherwise
- IELTS bands are on 9.0 scale
- All list endpoints support pagination
- File uploads support: PDF, DOCX, DOC, TXT, PPTX (max 50MB)

