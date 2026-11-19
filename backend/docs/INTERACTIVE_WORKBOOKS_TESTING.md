# 🧪 Interactive Workbooks - PowerShell Testing Examples

Testing the auto-checked interactive workbook system using PowerShell.

---

## 🔐 Step 1: Login and Get Token

```powershell
# Login as Teacher
$loginBody = @{
    email = "teacher@example.com"
    password = "password123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "http://localhost:8000/auth/login" `
    -Method Post `
    -Body $loginBody `
    -ContentType "application/json"

$teacherToken = $loginResponse.access_token
Write-Host "Teacher Token: $teacherToken"

# Login as Student
$studentLoginBody = @{
    email = "student@example.com"
    password = "password123"
} | ConvertTo-Json

$studentLoginResponse = Invoke-RestMethod -Uri "http://localhost:8000/auth/login" `
    -Method Post `
    -Body $studentLoginBody `
    -ContentType "application/json"

$studentToken = $studentLoginResponse.access_token
Write-Host "Student Token: $studentToken"
```

---

## 📚 Step 2: Create Interactive Workbook

```powershell
# Create workbook
$workbookBody = @{
    title = "Solutions Intermediate Unit 5"
    description = "Interactive English workbook with auto-checked exercises"
    subject_id = 1
    level = "Intermediate"
    difficulty_level = "intermediate"
} | ConvertTo-Json

$workbookResponse = Invoke-RestMethod -Uri "http://localhost:8000/interactive-workbooks" `
    -Method Post `
    -Headers @{ Authorization = "Bearer $teacherToken" } `
    -Body $workbookBody `
    -ContentType "application/json"

$workbookId = $workbookResponse.id
Write-Host "Created Workbook ID: $workbookId"
Write-Host "Status: $($workbookResponse.status)"
```

---

## 📄 Step 3: Upload File (Optional)

```powershell
# If you have a PDF file to upload
$filePath = "C:\path\to\textbook.pdf"

if (Test-Path $filePath) {
    $fileUploadResponse = Invoke-WebRequest `
        -Uri "http://localhost:8000/interactive-workbooks/$workbookId/upload" `
        -Method Post `
        -Headers @{ Authorization = "Bearer $teacherToken" } `
        -Form @{
            file = Get-Item $filePath
        }
    
    Write-Host "File uploaded successfully"
}
```

---

## ✏️ Step 4: Create Exercises

### **Exercise 1: Gap-Fill**

```powershell
$gapFillExercise = @{
    exercise_number = 1
    exercise_type = "gap_fill"
    exercise_text = "The capital of France is ___"
    instructions = "Fill in the blank with the correct city name"
    correct_answer = "Paris"
    correct_answers_list = @("Paris", "PARIS", "paris")
    case_sensitive = $false
    accept_partial = $false
    points = 1
} | ConvertTo-Json

$gapFillResponse = Invoke-RestMethod `
    -Uri "http://localhost:8000/interactive-workbooks/$workbookId/exercises" `
    -Method Post `
    -Headers @{ Authorization = "Bearer $teacherToken" } `
    -Body $gapFillExercise `
    -ContentType "application/json"

$exercise1Id = $gapFillResponse.id
Write-Host "Created Gap-Fill Exercise ID: $exercise1Id"
```

### **Exercise 2: Multiple Choice**

```powershell
$mcqExercise = @{
    exercise_number = 2
    exercise_type = "mcq"
    exercise_text = "What is 2 + 2?"
    instructions = "Select the correct answer"
    options = @{
        "a" = "1"
        "b" = "4"
        "c" = "5"
        "d" = "7"
    }
    correct_answer = "B"
    points = 1
} | ConvertTo-Json

$mcqResponse = Invoke-RestMethod `
    -Uri "http://localhost:8000/interactive-workbooks/$workbookId/exercises" `
    -Method Post `
    -Headers @{ Authorization = "Bearer $teacherToken" } `
    -Body $mcqExercise `
    -ContentType "application/json"

$exercise2Id = $mcqResponse.id
Write-Host "Created MCQ Exercise ID: $exercise2Id"
```

### **Exercise 3: True/False**

```powershell
$tfExercise = @{
    exercise_number = 3
    exercise_type = "true_false"
    exercise_text = "London is in France. True or False?"
    correct_answer = "False"
    points = 1
} | ConvertTo-Json

$tfResponse = Invoke-RestMethod `
    -Uri "http://localhost:8000/interactive-workbooks/$workbookId/exercises" `
    -Method Post `
    -Headers @{ Authorization = "Bearer $teacherToken" } `
    -Body $tfExercise `
    -ContentType "application/json"

$exercise3Id = $tfResponse.id
Write-Host "Created True/False Exercise ID: $exercise3Id"
```

### **Exercise 4: Short Answer**

```powershell
$shortAnswerExercise = @{
    exercise_number = 4
    exercise_type = "short_answer"
    exercise_text = "Describe the water cycle briefly (1-2 sentences)"
    correct_answer = "Water evaporates from oceans, condenses into clouds, and falls as rain"
    correct_answers_list = @(
        "Water rises from ocean to sky then falls as rain",
        "Evaporation, condensation, precipitation"
    )
    accept_partial = $true
    points = 2
} | ConvertTo-Json

$shortAnswerResponse = Invoke-RestMethod `
    -Uri "http://localhost:8000/interactive-workbooks/$workbookId/exercises" `
    -Method Post `
    -Headers @{ Authorization = "Bearer $teacherToken" } `
    -Body $shortAnswerExercise `
    -ContentType "application/json"

$exercise4Id = $shortAnswerResponse.id
Write-Host "Created Short Answer Exercise ID: $exercise4Id"
```

---

## 🚀 Step 5: Publish Workbook

```powershell
$publishBody = @{
    status = "published"
} | ConvertTo-Json

$publishResponse = Invoke-RestMethod `
    -Uri "http://localhost:8000/interactive-workbooks/$workbookId" `
    -Method Put `
    -Headers @{ Authorization = "Bearer $teacherToken" } `
    -Body $publishBody `
    -ContentType "application/json"

Write-Host "Workbook published!"
Write-Host "Status: $($publishResponse.status)"
Write-Host "Published at: $($publishResponse.published_at)"
```

---

## 👨‍🎓 Step 6: Student Submits Answers (AUTO-CHECKED)

### **Submit Gap-Fill Answer - CORRECT**

```powershell
$gapFillSubmission = @{
    student_answer = "Paris"
} | ConvertTo-Json

$gapFillResult = Invoke-RestMethod `
    -Uri "http://localhost:8000/interactive-workbooks/$workbookId/exercises/$exercise1Id/submit" `
    -Method Post `
    -Headers @{ Authorization = "Bearer $studentToken" } `
    -Body $gapFillSubmission `
    -ContentType "application/json"

Write-Host "Gap-Fill Submission Result:"
Write-Host "  Answer: $($gapFillResult.student_answer)"
Write-Host "  Correct: $($gapFillResult.is_correct)"
Write-Host "  Points: $($gapFillResult.points_earned)"
Write-Host "  Feedback: $($gapFillResult.feedback)"
```

### **Submit Gap-Fill Answer - WRONG**

```powershell
$wrongSubmission = @{
    student_answer = "London"
} | ConvertTo-Json

$wrongResult = Invoke-RestMethod `
    -Uri "http://localhost:8000/interactive-workbooks/$workbookId/exercises/$exercise1Id/submit" `
    -Method Post `
    -Headers @{ Authorization = "Bearer $studentToken" } `
    -Body $wrongSubmission `
    -ContentType "application/json"

Write-Host "Wrong Answer Result:"
Write-Host "  Answer: $($wrongResult.student_answer)"
Write-Host "  Correct: $($wrongResult.is_correct)"
Write-Host "  Points: $($wrongResult.points_earned)"
Write-Host "  Feedback: $($wrongResult.feedback)"
```

### **Submit MCQ Answer**

```powershell
$mcqSubmission = @{
    student_answer = "B"
} | ConvertTo-Json

$mcqResult = Invoke-RestMethod `
    -Uri "http://localhost:8000/interactive-workbooks/$workbookId/exercises/$exercise2Id/submit" `
    -Method Post `
    -Headers @{ Authorization = "Bearer $studentToken" } `
    -Body $mcqSubmission `
    -ContentType "application/json"

Write-Host "MCQ Submission Result:"
Write-Host "  Answer: $($mcqResult.student_answer)"
Write-Host "  Correct: $($mcqResult.is_correct)"
Write-Host "  Points: $($mcqResult.points_earned)"
Write-Host "  Feedback: $($mcqResult.feedback)"
```

### **Submit True/False Answer**

```powershell
$tfSubmission = @{
    student_answer = "false"
} | ConvertTo-Json

$tfResult = Invoke-RestMethod `
    -Uri "http://localhost:8000/interactive-workbooks/$workbookId/exercises/$exercise3Id/submit" `
    -Method Post `
    -Headers @{ Authorization = "Bearer $studentToken" } `
    -Body $tfSubmission `
    -ContentType "application/json"

Write-Host "True/False Submission Result:"
Write-Host "  Answer: $($tfResult.student_answer)"
Write-Host "  Correct: $($tfResult.is_correct)"
Write-Host "  Feedback: $($tfResult.feedback)"
```

### **Submit Short Answer**

```powershell
$shortAnswerSubmission = @{
    student_answer = "Water rises from ocean to sky then falls as rain"
} | ConvertTo-Json

$shortAnswerResult = Invoke-RestMethod `
    -Uri "http://localhost:8000/interactive-workbooks/$workbookId/exercises/$exercise4Id/submit" `
    -Method Post `
    -Headers @{ Authorization = "Bearer $studentToken" } `
    -Body $shortAnswerSubmission `
    -ContentType "application/json"

Write-Host "Short Answer Submission Result:"
Write-Host "  Correct: $($shortAnswerResult.is_correct)"
Write-Host "  Points: $($shortAnswerResult.points_earned)"
Write-Host "  Feedback: $($shortAnswerResult.feedback)"
```

---

## 📊 Step 7: View Progress

### **Get My Submissions**

```powershell
$submissionsResponse = Invoke-RestMethod `
    -Uri "http://localhost:8000/interactive-workbooks/$workbookId/my-submissions" `
    -Method Get `
    -Headers @{ Authorization = "Bearer $studentToken" }

Write-Host "My Submissions:"
foreach ($submission in $submissionsResponse) {
    Write-Host "  Exercise $($submission.exercise_id): $($submission.student_answer) - $($submission.is_correct)"
}
```

### **Get My Progress**

```powershell
$progressResponse = Invoke-RestMethod `
    -Uri "http://localhost:8000/interactive-workbooks/$workbookId/my-progress" `
    -Method Get `
    -Headers @{ Authorization = "Bearer $studentToken" }

Write-Host "My Progress:"
Write-Host "  Total Exercises: $($progressResponse.total_exercises)"
Write-Host "  Completed: $($progressResponse.exercises_completed)"
Write-Host "  Correct: $($progressResponse.exercises_correct)"
Write-Host "  Points: $($progressResponse.points_earned)/$($progressResponse.total_points)"
Write-Host "  Completion: $($progressResponse.completion_percentage)%"
```

### **Get Dashboard**

```powershell
$dashboardResponse = Invoke-RestMethod `
    -Uri "http://localhost:8000/interactive-workbooks/$workbookId/dashboard" `
    -Method Get `
    -Headers @{ Authorization = "Bearer $studentToken" }

Write-Host "Workbook Dashboard:"
Write-Host "  Title: $($dashboardResponse.workbook.title)"
Write-Host "  Total Exercises: $($dashboardResponse.exercises.Count)"
Write-Host "  Your Progress: $($dashboardResponse.progress.completion_percentage)%"
Write-Host "  Your Score: $($dashboardResponse.progress.points_earned)/$($dashboardResponse.progress.total_points)"
```

---

## 📈 Step 8: Teacher Views Statistics

```powershell
$statsResponse = Invoke-RestMethod `
    -Uri "http://localhost:8000/interactive-workbooks/$workbookId/statistics" `
    -Method Get `
    -Headers @{ Authorization = "Bearer $teacherToken" }

Write-Host "Workbook Statistics:"
Write-Host "  Total Submissions: $($statsResponse.total_submissions)"
Write-Host "  Correct Answers: $($statsResponse.correct_answers)"
Write-Host "  Success Rate: $($statsResponse.success_rate)%"
Write-Host "  Average Score: $($statsResponse.average_score)"
```

---

## 🎯 Complete Test Script

```powershell
# Copy and run this to test everything at once

# 1. Login
$teacherToken = (Invoke-RestMethod -Uri "http://localhost:8000/auth/login" `
    -Method Post `
    -Body (@{ email = "teacher@example.com"; password = "password123" } | ConvertTo-Json) `
    -ContentType "application/json").access_token

$studentToken = (Invoke-RestMethod -Uri "http://localhost:8000/auth/login" `
    -Method Post `
    -Body (@{ email = "student@example.com"; password = "password123" } | ConvertTo-Json) `
    -ContentType "application/json").access_token

# 2. Create workbook
$wb = Invoke-RestMethod -Uri "http://localhost:8000/interactive-workbooks" `
    -Method Post `
    -Headers @{ Authorization = "Bearer $teacherToken" } `
    -Body (@{ title = "Test Workbook"; subject_id = 1; level = "Intermediate" } | ConvertTo-Json) `
    -ContentType "application/json"

Write-Host "✅ Created workbook: $($wb.id)"

# 3. Add exercise
$ex = Invoke-RestMethod -Uri "http://localhost:8000/interactive-workbooks/$($wb.id)/exercises" `
    -Method Post `
    -Headers @{ Authorization = "Bearer $teacherToken" } `
    -Body (@{ 
        exercise_number = 1
        exercise_type = "gap_fill"
        exercise_text = "The capital of France is ___"
        correct_answer = "Paris"
        points = 1
    } | ConvertTo-Json) `
    -ContentType "application/json"

Write-Host "✅ Created exercise: $($ex.id)"

# 4. Publish workbook
Invoke-RestMethod -Uri "http://localhost:8000/interactive-workbooks/$($wb.id)" `
    -Method Put `
    -Headers @{ Authorization = "Bearer $teacherToken" } `
    -Body (@{ status = "published" } | ConvertTo-Json) `
    -ContentType "application/json" | Out-Null

Write-Host "✅ Published workbook"

# 5. Student submits correct answer
$result = Invoke-RestMethod -Uri "http://localhost:8000/interactive-workbooks/$($wb.id)/exercises/$($ex.id)/submit" `
    -Method Post `
    -Headers @{ Authorization = "Bearer $studentToken" } `
    -Body (@{ student_answer = "Paris" } | ConvertTo-Json) `
    -ContentType "application/json"

Write-Host "✅ Student answer: $($result.is_correct) - $($result.feedback)"

# 6. Get progress
$progress = Invoke-RestMethod -Uri "http://localhost:8000/interactive-workbooks/$($wb.id)/my-progress" `
    -Method Get `
    -Headers @{ Authorization = "Bearer $studentToken" }

Write-Host "✅ Progress: $($progress.completion_percentage)% ($($progress.points_earned)/$($progress.total_points))"

Write-Host ""
Write-Host "🎉 All tests passed!"
```

---

## 💡 Tips

1. **Save tokens in variables** for multiple requests
2. **Use ForEach loops** for batch operations
3. **Check response content** with `| Format-List`
4. **Convert to JSON** with `ConvertTo-Json`
5. **Test wrong answers** to see feedback system
6. **Try fuzzy matching** by typing wrong spelling

---

**Status**: ✅ All interactive workbook endpoints ready to test!

