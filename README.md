

**A comprehensive Learning Management System (LMS) backend built with FastAPI**

![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![Version](https://img.shields.io/badge/Version-1.0.0-blue)
![Python](https://img.shields.io/badge/Python-3.11%2B-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104%2B-009688)

---

## 🎯 Overview

A complete backend solution for managing educational institutions with features for students, teachers, and administrators. Built with modern technologies and best practices.

### ✨ Key Features

- 👥 **User Management** - Role-based access control (Admin, Teacher, Student)
- 🏫 **Branch Management** - Multiple learning centers support
- 📚 **Course Management** - Dynamic course and class creation
- 📖 **Learning Content** - Support for videos, PDFs, quizzes, assignments
- 📊 **Progress Tracking** - Real-time student progress monitoring
- 📝 **Attendance System** - Automated attendance tracking and reporting
- ✏️ **Assignment Management** - Create, submit, and grade assignments
- 💬 **Messaging System** - Direct messaging and notifications
- 💳 **Payment Management** - Track and manage payments
- 🔐 **Authentication** - JWT-based secure authentication

---

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- pip (Python package manager)

### Installation

```bash
# Clone and navigate to project
cd "c:\Users\KSM\Desktop\SEVEN PLUS ACADEMY"

# Create virtual environment
python -m venv venv

# Activate virtual environment
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file with
# DATABASE_URL=sqlite:///./learning_center.db
# SECRET_KEY=your-secret-key-here

# Start server
uvicorn app.main:app --reload

# Access API
# http://localhost:8000/docs
```

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [BACKEND_API_DOCUMENTATION.md](./BACKEND_API_DOCUMENTATION.md) | Complete API reference with all endpoints |
| [SETUP_GUIDE.md](./SETUP_GUIDE.md) | Detailed setup, deployment, and troubleshooting |
| [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) | Project overview and feature summary |

---

## 🏗️ Project Architecture

```
FastAPI Application
    ├── API Routers (10 modules)
    │   ├── Authentication
    │   ├── User Management
    │   ├── Course Management
    │   ├── Classroom Management
    │   ├── Learning Content
    │   ├── Attendance
    │   ├── Assignments
    │   ├── Messaging
    │   ├── Payments
    │   └── Progress Tracking
    │
    ├── Business Services (4 layers)
    │   ├── Course Service
    │   ├── Progress Service
    │   ├── Attendance Service
    │   └── Assignment Service
    │
    ├── Data Models (12 entities)
    │   ├── Users & Roles
    │   ├── Courses & Classes
    │   ├── Content & Progress
    │   ├── Attendance
    │   ├── Assignments
    │   ├── Messaging
    │   └── Payments
    │
    └── Database
        └── SQLite / PostgreSQL
```

---

## 📡 API Endpoints Summary

### Authentication (5)
- Register, Login, Refresh Token, Logout, Get Profile

### User Management (4)
- List Users, Get Details, Update, Delete

### Courses (5)
- CRUD operations with filtering

### Classes (7)
- Create, Read, Update, Assign Teachers/Students

### Learning Content (7)
- Upload, Manage, Track interactions

### Attendance (4)
- Mark, Report, Statistics

### Assignments (8)
- Create, Submit, Grade, View Submissions

### Messaging (15)
- Messages, Notifications, Announcements

### Payments (5)
- Track, Verify, Report

### Progress (6)
- Student Dashboard, Course Progress, Analytics

**Total: 80+ REST endpoints**

---

## 🔐 Security Features

- ✅ JWT Authentication with access & refresh tokens
- ✅ Bcrypt password hashing
- ✅ Role-based access control (RBAC)
- ✅ Input validation with Pydantic
- ✅ SQL injection prevention (ORM)
- ✅ CORS support
- ✅ Environment variable configuration

---

## 💾 Database Schema

### 15+ Tables with relationships:
- Users, Branches, Courses, Classes
- LearningContent, Attendance, Assignments
- Messages, Notifications, Announcements
- Payments, Progress tracking tables

All with proper indexing and constraints.

---

## 🎓 User Roles & Permissions

### Admin
- ✅ Full system control
- ✅ Manage all users and content
- ✅ Create courses and branches
- ✅ View analytics

### Teacher
- ✅ Manage classes
- ✅ Upload content
- ✅ Grade assignments
- ✅ Track student progress
- ✅ Message students

### Student
- ✅ Access courses
- ✅ View content
- ✅ Submit assignments
- ✅ Check progress
- ✅ Message teachers

---

## 📊 Technology Stack

| Technology | Purpose |
|-----------|---------|
| FastAPI | Web framework |
| SQLAlchemy | ORM |
| Pydantic | Data validation |
| JWT | Authentication |
| Bcrypt | Password hashing |
| SQLite/PostgreSQL | Database |
| Uvicorn | ASGI server |

---

## 🔧 Environment Variables

Create `.env` file:

```env
# Database
DATABASE_URL=sqlite:///./learning_center.db
# Or: postgresql://user:pass@localhost/dbname

# Security
SECRET_KEY=your-secret-key-min-32-chars

# Debug
DEBUG=True
```

---

## 📝 Example API Calls

### Register User
```bash
POST /api/auth/register
{
  "full_name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "role": "student"
}
```

### Login
```bash
POST /api/auth/login
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

### Create Course (Admin)
```bash
POST /api/courses
Headers: Authorization: Bearer {token}
{
  "name": "Mathematics 101",
  "course_code": "MATH101",
  "level": "Beginner",
  "branch_id": 1
}
```

### Submit Assignment (Student)
```bash
POST /api/assignments/1/submit
Headers: Authorization: Bearer {token}
{
  "assignment_id": 1,
  "submission_text": "My solution..."
}
```

---

## 🧪 Testing

Access interactive API documentation:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc
- **OpenAPI Schema:** http://localhost:8000/openapi.json

---

## 🚀 Deployment

### Docker
```bash
docker build -t 7plus-backend .
docker run -p 8000:8000 7plus-backend
```

### Production
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

---

## 📈 Performance

- Pagination support (skip/limit)
- Database indexing on key fields
- Connection pooling
- Query optimization
- Bulk operations support

---

## 🔍 Monitoring & Logging

- Structured logging
- Error tracking
- Performance monitoring hooks
- Health check endpoint: `/health`

---

## 📖 Code Structure

```
app/
├── main.py                 # FastAPI app initialization
├── models/                 # SQLAlchemy models
├── schemas/                # Pydantic validation schemas
├── routers/                # API route handlers
├── services/               # Business logic
├── security/               # Auth & permissions
├── core/                   # Core configuration
├── constants/              # Enum constants
└── utils/                  # Utility functions
```

---

## ✅ Features Implemented

### User Management
- [x] Registration & Login
- [x] Profile management
- [x] Role assignment
- [x] User deactivation

### Course Management
- [x] Create/Update/Delete courses
- [x] Class management
- [x] Teacher assignment
- [x] Student enrollment

### Learning Content
- [x] Upload multiple formats
- [x] Content sequencing
- [x] Publication control
- [x] Access tracking

### Assessment
- [x] Assignment creation
- [x] Submission tracking
- [x] Grading system
- [x] Late detection

### Communication
- [x] Direct messaging
- [x] Notifications
- [x] Announcements
- [x] Read tracking

### Analytics
- [x] Progress tracking
- [x] Attendance reports
- [x] Performance metrics
- [x] Student dashboards

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Module not found | Run `pip install -r requirements.txt` |
| Database error | Check DATABASE_URL in .env |
| Token invalid | Use fresh token from login |
| CORS error | Check allowed origins in main.py |
| Port in use | Change port: `--port 8001` |

See **SETUP_GUIDE.md** for detailed troubleshooting.

---

## 🔮 Future Enhancements

- [ ] Real-time notifications (WebSocket)
- [ ] Video streaming (HLS)
- [ ] AI-powered recommendations
- [ ] Advanced analytics
- [ ] Mobile notifications
- [ ] Gamification features
- [ ] Third-party integrations

---

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Test thoroughly
4. Submit pull request

---

## 📄 License

This project is part of 7Plus Learning Center Academy.

---

## 📧 Support

For issues and questions:
1. Check documentation files
2. Review error messages
3. Check API endpoint at `/docs`
4. Consult SETUP_GUIDE.md

---

## 🎯 Project Status

| Component | Status |
|-----------|--------|
| Backend API | ✅ Complete |
| Database Models | ✅ Complete |
| Authentication | ✅ Complete |
| Business Logic | ✅ Complete |
| Documentation | ✅ Complete |
| Testing Framework | ✅ Ready |
| Deployment | ✅ Ready |

**Overall Status: ✅ PRODUCTION READY**

---

## 📞 Quick Links

- **API Docs:** `/docs`
- **Health Check:** `/health`
- **Main File:** `app/main.py`
- **Setup Guide:** `SETUP_GUIDE.md`
- **API Documentation:** `BACKEND_API_DOCUMENTATION.md`

---

## 🎉 Getting Started

1. **Follow the Quick Start section** above
2. **Read SETUP_GUIDE.md** for detailed instructions
3. **Access `/docs`** to explore endpoints
4. **Start building** your frontend!

---

**Version:** 1.0.0  
**Last Updated:** December 18, 2024  
**Status:** Production Ready ✅

---

Made with ❤️ for 7Plus Learning Center Academy
