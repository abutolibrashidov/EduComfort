# 🧪 API Testing Guide (PowerShell) - Seven Plus Academy

Use these PowerShell examples to test the backend APIs. Replace placeholders like `{token}` and file paths before running.

> Note: On Windows PowerShell use `Invoke-RestMethod` or `curl` (alias to Invoke-WebRequest). Below examples use `Invoke-RestMethod` for JSON and `Invoke-WebRequest` for file uploads.

---

## 🔐 1. Authentication

### Register a New User
```powershell
$body = @{
    email = "teacher@example.com"
    password = "SecurePass123!"
    full_name = "John Smith"
    role = "teacher"
    branch_id = 1
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri http://localhost:8000/auth/register -Body $body -ContentType 'application/json'
```

### Login
```powershell
$body = @{
    email = "teacher@example.com"
    password = "SecurePass123!"
} | ConvertTo-Json

$response = Invoke-RestMethod -Method Post -Uri http://localhost:8000/auth/login -Body $body -ContentType 'application/json'
$response | Format-List
$token = $response.access_token
```

---

## 📝 2. Regular Exams

### Create Exam (Teacher)
```powershell
$exam = @{
    title = "English Grammar Quiz"
    description = "Test your grammar knowledge"
    subject_id = 1
    total_points = 50
    duration_minutes = 30
    passing_score = 70
    auto_grade = $true
    show_answers = $true
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri http://localhost:8000/exams -Headers @{ Authorization = "Bearer $token" } -Body $exam -ContentType 'application/json'
```

### Add Question to Exam
```powershell
$question = @{
    question_text = "What is the plural of 'child'?"
    question_type = "multiple_choice"
    points = 10
    sequence_order = 1
    option_a = "children"
    option_b = "childs"
    option_c = "childes"
    option_d = "childreen"
    correct_answer = "children"
    explanation = "The correct plural of 'child' is 'children'"
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri http://localhost:8000/exams/1/questions -Headers @{ Authorization = "Bearer $token" } -Body $question -ContentType 'application/json'
```

---

## 📖 3. Workbooks (File Uploads)

### Teacher Uploads Workbook (multipart/form-data)
```powershell
$uri = 'http://localhost:8000/workbooks'
$headers = @{ Authorization = "Bearer $token" }

# Use -Form parameter for file uploads
Invoke-WebRequest -Uri $uri -Method Post -Headers $headers -Form @{
    title = 'Solutions Intermediate Unit 5'
    subject_id = '1'
    description = 'English workbook for intermediate level'
    level = 'Intermediate'
    total_tasks = '10'
    max_points = '100'
    file = Get-Item 'C:\path\to\Solutions_Intermediate.pdf'
}
```

### Student Submits Workbook (JSON)
```powershell
$submission = @{
    submission_notes = "Gap 1: goes, Gap 2: are, Gap 3: playing..."
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri http://localhost:8000/workbooks/1/submit -Headers @{ Authorization = "Bearer $studentToken" } -Body $submission -ContentType 'application/json'
```

---

## 🎯 4. IELTS Mock Tests

### Create IELTS Exam
```powershell
$ielts = @{
    title = "IELTS Mock Test 1"
    description = "Full IELTS simulation exam"
    exam_type = "full"
    subject_id = 1
    duration_minutes = 180
    passing_band_score = 6.5
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri http://localhost:8000/ielts/exams -Headers @{ Authorization = "Bearer $token" } -Body $ielts -ContentType 'application/json'
```

### Add Reading Passage
```powershell
$passage = @{
    passage_number = 1
    title = "The Great Barrier Reef"
    passage_text = "The Great Barrier Reef is the world's largest coral reef system..."
    difficulty_level = "intermediate"
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri http://localhost:8000/ielts/exams/1/reading/passages -Headers @{ Authorization = "Bearer $token" } -Body $passage -ContentType 'application/json'
```

---

## 🎓 5. Online Courses

### Create Course
```powershell
$course = @{
    title = "Advanced English Grammar"
    description = "Master English grammar with comprehensive lessons"
    course_type = "self_paced"
    difficulty_level = "advanced"
    duration_weeks = 8
    max_students = 30
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri http://localhost:8000/online-courses -Headers @{ Authorization = "Bearer $token" } -Body $course -ContentType 'application/json'
```

### Enroll Student
```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:8000/online-courses/1/enroll -Headers @{ Authorization = "Bearer $studentToken" }
```

---

## 📊 6. Performance & Analytics

### View Student Performance
```powershell
Invoke-RestMethod -Method Get -Uri http://localhost:8000/exams/student/5/performance -Headers @{ Authorization = "Bearer $token" }
```

### View IELTS Performance
```powershell
Invoke-RestMethod -Method Get -Uri http://localhost:8000/ielts/student/5/performance -Headers @{ Authorization = "Bearer $token" }
```

---

## 🧪 Testing Tips

1. Use separate tokens for admin/teacher/student tests.
2. For file uploads, prefer `Invoke-WebRequest` with `-Form` for PowerShell.
3. Check `http://localhost:8000/docs` for full request/response schemas.
4. Use `ConvertTo-Json` when sending JSON bodies.

---

## ✅ What's Next

- Task 1 (Create PowerShell testing examples) will be marked complete.
- Optionally, I can replace "7Plus Learning Center" with "Seven Plus Academy" across API docs if you want consistent naming.

