# 🎯 Seven Plus Academy Backend - Simple Explanation for Frontend Team

**For: Frontend Developers, Designers, Project Managers, Non-Technical Stakeholders**

---

## 🤝 What is the Backend?

Think of the backend as the **"brain and storage"** of Seven Plus Academy:

```
┌──────────────────────┐
│    FRONTEND          │  ← What users see & interact with
│  (Website/App)       │     (Buttons, Forms, Pages)
└──────────┬───────────┘
           │
           │ (Asks for data)
           │
           ▼
┌──────────────────────┐
│    BACKEND           │  ← What we just built
│  (Server + Database) │     (Stores & processes everything)
└──────────────────────┘
```

**Frontend** = "What you see"
**Backend** = "What powers what you see"

---

## ✅ What We've Already Built for You

Your backend is **complete and ready to use**. It has:

### **🗄️ Database (Storage)**
- **43 tables** that store:
  - All user information (students, teachers, admins)
  - All courses and lessons
  - All exam questions and answers
  - All workbooks and submissions
  - All grades and performance data
  - Attendance records
  - Payment records
  - Messages

Think of it as a giant **organized filing cabinet** where everything is stored safely.

### **🔌 API Endpoints (209+)**
- **209 different services** your frontend can request
- Each endpoint does one specific job
- Think of them as a **menu in a restaurant**:
  - "Get all courses" = One menu item
  - "Submit exam answer" = Another menu item
  - "Grade a workbook" = Another menu item

---

## 🎓 What Can the Backend Do?

### **1. Authentication (Login/Security)**
```
✅ Users can login with email & password
✅ System checks credentials securely
✅ Issues tokens so user stays logged in
✅ Different access levels (Admin/Teacher/Student)
```

### **2. Manage Exams**
```
✅ Teachers create exams
✅ Students take exams
✅ System auto-grades objective questions
✅ Stores grades & feedback
✅ Shows results to students
```

### **3. Manage Workbooks**
```
✅ Teachers upload PDF/DOCX files (textbooks, worksheets)
✅ Students submit their completed work
✅ Teachers manually grade the work
✅ Teachers provide feedback
✅ Students can view their grades
```

### **4. IELTS Mock Tests**
```
✅ Full IELTS exam simulations
✅ Reading section (passages + questions)
✅ Listening section (with audio)
✅ Writing section (essays)
✅ Auto-grades objective parts
✅ Calculates IELTS band scores (1-9)
✅ Shows detailed feedback
```

### **5. Online Courses**
```
✅ Teachers create courses with modules
✅ Teachers add lessons to modules
✅ Students enroll in courses
✅ Students access lessons & materials
✅ Teachers schedule live classes
✅ Students track their progress
✅ Teachers give assignments
✅ System calculates completion %
```

### **6. Track Performance**
```
✅ Stores all grades
✅ Calculates average scores
✅ Tracks completion percentages
✅ Shows trends over time
✅ Assigns letter grades (A+, A, B, etc.)
✅ Calculates IELTS band progression
```

### **7. Manage Users**
```
✅ Create students/teachers
✅ Assign users to classes/branches
✅ Set user roles & permissions
✅ Store user profiles
```

### **8. Other Systems**
```
✅ Track attendance
✅ Manage payments
✅ Send messages between users
✅ Track progress milestones
```

---

## 📱 How Frontend Uses the Backend

### **Example: Student Takes an Exam**

```
1. FRONTEND (What you build):
   - Student clicks "Start Exam" button
   - Shows exam questions on screen
   - Student selects answers
   - Student clicks "Submit Exam"

2. FRONTEND sends request to BACKEND:
   "Hey backend, I have a student's exam answers. Here they are:"
   {
     student_id: 5,
     exam_id: 12,
     answers: [
       {question_id: 1, answer: "B"},
       {question_id: 2, answer: "True"},
       ...
     ]
   }

3. BACKEND receives request:
   - Checks if student is logged in ✓
   - Checks if exam exists ✓
   - Validates all answers
   - Auto-grades objective questions
   - Calculates total score
   - Calculates percentage
   - Stores everything in database

4. BACKEND sends response back:
   {
     exam_id: 12,
     score: 78,
     percentage: 78%,
     status: "PASSED",
     feedback: "Good attempt! Work on..."
   }

5. FRONTEND displays result:
   - Shows score to student
   - Shows feedback
   - Shows grade
```

---

## 🔑 Key Things to Know

### **Authentication (Login)**
```
1. Student enters email & password
2. Frontend sends to backend
3. Backend checks database
4. If correct → Backend gives TOKEN
5. Frontend stores this token
6. Frontend includes token in ALL future requests
7. Backend validates token for security
```

**Backend handles**: Secure password storage, token generation, authentication

### **User Roles (Permissions)**
```
ADMIN can:
  ✅ See everything
  ✅ Manage users
  ✅ View all data

TEACHER can:
  ✅ Create exams
  ✅ Upload workbooks
  ✅ Create courses
  ✅ Grade student work
  ✅ See their students' progress

STUDENT can:
  ✅ Take exams
  ✅ Complete workbooks
  ✅ Enroll in courses
  ✅ See their own grades
  ✅ See their own progress
```

**Backend enforces** these permissions on every action.

### **File Uploads**
```
1. Teacher selects PDF/DOCX file to upload
2. Frontend sends file to backend
3. Backend:
   - Checks file type (PDF? DOCX? PPT?)
   - Checks file size (max 50MB)
   - Stores file on server
   - Saves file location in database
4. Backend sends back filename
5. Later, students can download or view this file
```

---

## 🗂️ Data Structure (Simple View)

### **Users Table**
```
user_id | name     | email              | role    | password_hash
1       | Ahmed    | ahmed@email.com    | Student | [encrypted]
2       | Fatima   | fatima@email.com   | Teacher | [encrypted]
3       | Admin    | admin@email.com    | Admin   | [encrypted]
```

### **Exams Table**
```
exam_id | title          | subject_id | teacher_id | questions_count
1       | English Quiz   | 1          | 2          | 10
2       | Math Test      | 2          | 2          | 15
```

### **Exam Submissions Table**
```
submission_id | exam_id | student_id | score | percentage | status
1             | 1       | 1          | 78    | 78%        | PASSED
2             | 1       | 3          | 65    | 65%        | FAILED
```

(And 40 more tables like this...)

---

## 🚀 How to Use the Backend

### **Step 1: Start the Server**
```bash
# Terminal command (we run this for you if needed)
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

The backend runs on: **http://localhost:8000**

### **Step 2: See All Available Endpoints**
Visit: **http://localhost:8000/docs**

You'll see:
- All 209+ available requests
- What data to send
- What data you'll receive back
- Try them out live!

### **Step 3: Frontend Makes Requests**

```javascript
// Example: Login
fetch('http://localhost:8000/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'student@email.com',
    password: 'password123'
  })
})
.then(response => response.json())
.then(data => {
  console.log('Token received:', data.access_token);
  // Store this token for future requests
})
```

### **Step 4: Frontend Includes Token in Requests**
```javascript
// Example: Get student's progress
fetch('http://localhost:8000/progress/my-progress', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ' + token  // Use the token from login
  }
})
.then(response => response.json())
.then(data => {
  console.log('Student progress:', data);
})
```

---

## 📋 Available Endpoints by Category

### **Authentication (5 endpoints)**
- Login
- Register
- Logout
- Refresh token
- Change password

### **Users (12+ endpoints)**
- Get all students
- Get all teachers
- Create user
- Update user
- Delete user
- Get user profile
- Update profile

### **Exams (15 endpoints)**
- Create exam
- Add questions
- Publish exam
- Student takes exam
- Submit exam
- View results
- Admin gives feedback

### **Workbooks (11 endpoints)**
- Upload workbook
- List workbooks
- Student submit workbook
- Teacher grade workbook
- View submissions
- Provide feedback

### **IELTS (40+ endpoints)**
- Create IELTS exam
- Add reading passages
- Add listening sections
- Add writing tasks
- Student takes mock test
- Get IELTS band scores
- View performance

### **Online Courses (50+ endpoints)**
- Create course
- Add modules
- Add lessons
- Create assignments
- Student enroll
- Submit assignment
- Track progress
- View live classes

### **And many more...**
Performance tracking, attendance, payments, messaging, etc.

---

## 💾 Data Flow Example: Complete Workflow

### **Scenario: Student Takes IELTS Reading Mock Test**

```
FRONTEND                          BACKEND                     DATABASE
─────────────────────────────────────────────────────────────────────

1. Student clicks
   "Start IELTS Test"
                    ──────────────────────────>
                    GET /ielts/12/reading
                    (With token)
                                            └─> Check if student
                                                can take this test
                                            └─> Get reading passages
                                                from database
                    <──────────────────────
                    Return: 3 passages,
                    40 questions
                    
2. Frontend displays
   passage 1
   
3. Student answers
   all questions
   
4. Student clicks
   "Submit Reading"
                    ──────────────────────────>
                    POST /ielts/12/submit-reading
                    {
                      answers: [...]
                    }
                                            └─> For each objective
                                                question: Check answer
                                            └─> Auto-grade
                                            └─> Calculate score
                                            └─> Store in database
                    <──────────────────────
                    Return: {
                      score: 32/40,
                      percentage: 80%,
                      feedback: "..."
                    }
                    
5. Frontend shows
   results to student
   
6. Teacher later
   reviews writing
                    ──────────────────────────>
                    GET /ielts/12/results
                    (Teacher access)
                                            └─> Get all results
                    <──────────────────────
                    Return: All student results
```

---

## 🎯 What You Need to Know for Frontend

### **1. Login First**
- Every user must login
- Every request needs a token
- Token expires in 60 minutes
- Refresh token to get new token (lasts 7 days)

### **2. Check Permissions**
- Don't show admin features to students
- Don't let students see other students' grades
- Teachers can only grade their own students' work
- Backend enforces this, but frontend can optimize UX

### **3. Handle Errors**
- Network errors (server unreachable)
- Invalid input (missing required fields)
- Permission errors (not authorized)
- Resource not found (exam doesn't exist)

Backend will return clear error messages.

### **4. Display Loading States**
- Network requests take time
- Show "Loading..." while waiting
- Disable buttons during submission
- Handle slow networks gracefully

### **5. Validate Inputs Client-Side Too**
- Check email format before sending
- Require password confirmation
- Validate file size before upload
- Show helpful error messages to user

---

## 🔒 Security Notes

### **Backend Handles:**
- ✅ Password encryption
- ✅ Token validation
- ✅ Permission checking
- ✅ Preventing unauthorized access

### **Frontend Should:**
- ✅ Store token securely
- ✅ Send token with every request
- ✅ Clear token on logout
- ✅ Don't expose sensitive info in URL
- ✅ Use HTTPS in production

---

## 📞 When Frontend Needs Backend Data

### **On Page Load**
```javascript
// Show student their courses
GET /onlinecourse/my-courses

// Show teacher their exams
GET /exams?teacher_id=5

// Show student dashboard
GET /progress/my-performance
```

### **On User Action**
```javascript
// Student submits exam
POST /exams/12/submit

// Teacher grades workbook
PUT /workbooks/submissions/5/grade

// Student enrolls in course
POST /onlinecourse/5/enroll
```

### **On Page Refresh**
```javascript
// Check if user still logged in
GET /auth/me  (or similar)

// Refresh expired token
POST /auth/refresh
```

---

## 🎨 Frontend Structure Suggestions

### **Typical Frontend Screens Needed**

```
1. LOGIN PAGE
   └─ Email & password input
   └─ Send to backend
   └─ Store token

2. STUDENT DASHBOARD
   └─ Show enrolled courses
   └─ Show pending assignments
   └─ Show progress stats
   └─ Show recent grades

3. EXAMS PAGE
   └─ List available exams
   └─ Start exam
   └─ Show questions
   └─ Submit answers
   └─ View results

4. WORKBOOKS PAGE
   └─ List available workbooks
   └─ Download/view workbook
   └─ Submit completed work
   └─ See teacher feedback

5. IELTS SECTION
   └─ List mock tests
   └─ Start mock test
   └─ Show reading/listening/writing
   └─ View band scores

6. COURSES PAGE
   └─ Browse courses
   └─ Enroll in courses
   └─ Access lessons
   └─ Submit assignments
   └─ Track progress

7. PROFILE PAGE
   └─ View profile info
   └─ Edit profile
   └─ Change password

8. ADMIN/TEACHER PANELS
   └─ Create courses/exams
   └─ Grade work
   └─ View analytics
```

---

## ✅ Ready to Go!

Your backend is:
- ✅ **Complete** - All features implemented
- ✅ **Secure** - Authentication & authorization working
- ✅ **Documented** - API docs at /docs
- ✅ **Tested** - All endpoints working
- ✅ **Running** - Server ready at http://localhost:8000

---

## 🤔 Common Questions

### **Q: How do I login?**
A: Send email & password to `/auth/login`. Backend returns token. Store token. Include token in all future requests.

### **Q: How do I show only this student's data?**
A: Backend checks the token and returns only data for that student. No need to filter on frontend.

### **Q: What if the user is not authorized?**
A: Backend returns error code 403. Show an error to user. Maybe redirect to login.

### **Q: How do I upload a file?**
A: Use FormData in JavaScript. Frontend sends file to backend. Backend stores it and returns filename.

### **Q: How often do I call the backend?**
A: Only when needed. Don't continuously poll. Use events/buttons to trigger requests.

### **Q: Can I test the backend without frontend?**
A: Yes! Visit http://localhost:8000/docs and test endpoints there. Or use Postman/curl.

---

## 📚 Resources for Frontend Team

All files in the project folder:
1. **COMPLETE_BACKEND_SUMMARY.md** - Full technical overview
2. **API_TESTING_EXAMPLES.md** - Example API calls
3. **BACKEND_API_DOCUMENTATION.md** - Detailed endpoint reference
4. **IELTS_ONLINE_COURSES_GUIDE.md** - IELTS/Courses details
5. **ACADEMY_INFORMATION.md** - True information about Academy

Visit Swagger at: **http://localhost:8000/docs**

---

## 🎉 You're All Set!

The backend is ready. Start building the frontend!

**Need help?** Refer to:
- Swagger documentation (/docs)
- Example API calls (API_TESTING_EXAMPLES.md)
- This guide (for understanding)

**Happy coding!** 🚀

