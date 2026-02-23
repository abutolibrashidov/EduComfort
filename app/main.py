from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from loguru import logger
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
import os

from app.models.base import Base
from app.models.subject import Subject
from app.core.config import settings
from app.core.database import SessionLocal

# ========================= Sentry (before app creation) =========================
if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        integrations=[FastApiIntegration()],
        environment=settings.ENVIRONMENT,
        traces_sample_rate=0.2,
    )
    logger.info("Sentry initialized")

# ========================= Rate Limiter =========================
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])

# Import new models for database creation
from app.models.group_students import GroupStudent
from app.models.conversation import Conversation, ConversationParticipant, Message
from app.models.achievement import Achievement, UserAchievement # New Gamification Models
from app.models.subscription import InstitutionSubscription # Billing Models
from app.models.announcement import Announcement
from app.models.teacher_payment import TeacherPayment
from app.models.leaderboard import LeaderboardEvent, StudentRatingLog, LeaderboardWinner # New Leaderboard Models
from app.models.expense import Expense

from app.data.seed_super_admin import seed_super_admin
from app.data.seed_subjects import seed_subjects

# Import Scheduler
from app.services.rating_cycle_scheduler import start_scheduler

# Import all routers
from app.routers import (
    admin, # New Admin Dashboard Router
    platform, # New Platform Owner Router
    billing, # New Billing Router
    announcements, # New Announcements Router
    attendance, # New Attendance Router

    messaging_v2, # New Messaging V2 Router

    progress, # New Progress Router
    public, # New Public Router
    distractors, # New Distractors Router
    books, # New Books Router
    book_reader, # New Book Reader Router
    book_jobs, # New Book Processing Jobs Router
    book_review, # New Book Review Router (Phase 3)
    auth, # Auth Router
    institutions, # Institutions Router
    learners, # Learners Router
    teacher, # Teacher Router
    student, # Student Router
    staff, # Staff Router
    exams, # Exams Router
    subject, # Subjects Router (note: file is subject.py not subjects.py)
    groups, # Groups Router
    branches, # Branches Router
    onlinecourse, # Online Course Router
    ielts, # IELTS Router
    workbooks, # Workbooks Router
    courses, # Courses Router
    users, # Users Router
    payments, # Payments Router
    interactive_workbook, # Interactive Workbook Router
    interactive_books, # Interactive Books Router (AI-powered)
    gamification, # Gamification Router
    feed, # Feed Router
    ai_billing, # AI Billing Router
    leaderboards, # Leaderboards Router
    expenses, # New Expenses Router
    upload # Avatar Upload Router
)

# Import public router separately to handle if it doesn't exist yet
try:
    from app.routers import public
    print("[INFO] Public router loaded")
except ImportError:
    print("⚠️ Warning: public.py not found - public routes not available")
    public = None

# Import messaging_v2 separately to avoid circular imports
try:
    from app.routers import messaging_v2
    print("[INFO] Messaging router loaded")
except Exception as e:
    print(f"⚠️ Warning: Could not load messaging_v2: {e}")
    messaging_v2 = None

# =========================
# FastAPI app
# =========================
app = FastAPI(
    title="EduComfort API",
    version="1.0.0",
    description="Learning Management System API",
    # Hide docs in production
    docs_url=None if settings.ENVIRONMENT == "production" else "/docs",
    redoc_url=None if settings.ENVIRONMENT == "production" else "/redoc",
)

# ========================= Rate Limiting =========================
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ========================= Global Exception Handler =========================
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Hide stack traces in production. Log the real error server-side."""
    logger.exception(f"Unhandled exception on {request.method} {request.url}: {exc}")
    if settings.ENVIRONMENT == "production":
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"},
        )
    # In development, let FastAPI's default error handler show the traceback
    raise exc


# =========================
# Multi-Tenant Middleware - Add FIRST (Inner execution)
# =========================
# from app.middleware.tenant_context import TenantContextMiddleware
# app.add_middleware(TenantContextMiddleware)
# print("[INFO] Tenant context middleware registered (Inner)")


# =========================
# CORS Configuration
# =========================
origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",")]

# In production only allow explicit origins; in dev also allow localhost wildcard
if settings.ENVIRONMENT == "production":
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:[0-9]+)?",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
    )
logger.info("CORS middleware configured")

# Static files — only mount local /uploads in development
# In production, all files are served from S3/CDN
if settings.ENVIRONMENT != "production":
    os.makedirs("uploads", exist_ok=True)
    app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
    logger.info("Serving static files from local /uploads (dev mode)")
else:
    logger.info("Production mode: static files served from S3")

# =========================
# Database Initialization
# =========================
@app.on_event("startup")
def on_startup():
    logger.info("Starting backend initialization...")
    # NOTE: In production, schema is managed by Alembic migrations.
    # Do NOT call Base.metadata.create_all() here in production.

    # Seed initial data
    db = SessionLocal()
    try:
        try:
            seed_super_admin(db)
            logger.info("Super admin ready")
        except Exception as e:
            logger.warning(f"Super admin seeding skipped: {e}")

        try:
            subject_count = db.query(Subject).count()
            logger.info(f"Subjects in database: {subject_count}")
        except Exception as e:
            logger.warning(f"Subject check skipped: {e}")

    except Exception as e:
        logger.error(f"Seeding error: {e}")
    finally:
        db.close()

    # Start the rating cycle scheduler
    try:
        start_scheduler()
    except Exception as e:
        logger.error(f"Failed to start rating scheduler: {e}")

    logger.info("Backend initialization completed")


@app.on_event("shutdown")
def on_shutdown():
    logger.info("Shutting down backend...")


# =========================
# API Routes
# =========================

# Public routes (no authentication required)
if public:
    app.include_router(public.router)
    print("[INFO] Public routes registered")

# Authentication
app.include_router(auth.router)

# Institutions (multi-tenancy)
app.include_router(institutions.router)
print("[INFO] Institutions routes registered")

# Learners (public registration and browsing)
app.include_router(learners.router)
print("[INFO] Learners routes registered")

# Marketplace / Public Courses
app.include_router(courses.router)
print("[INFO] Course Marketplace routes registered")

# Users management
app.include_router(users.router, prefix="/admin/users", tags=["Users"])

# Groups management
app.include_router(groups.router)

# Branches
app.include_router(branches.router)

# Payments
app.include_router(payments.router, prefix="/payments", tags=["Payments"])

# Subjects
app.include_router(subject.router, prefix="/subjects", tags=["Subjects"])

# Exams
app.include_router(exams.router, prefix="/exams", tags=["Exams"])

# Workbooks
app.include_router(workbooks.router, prefix="/workbooks", tags=["Workbooks"])

# Interactive Workbook
app.include_router(
    interactive_workbook.router,
    prefix="/interactive-workbook",
    tags=["Interactive Workbook"]
)

# IELTS
app.include_router(ielts.router, prefix="/ielts", tags=["IELTS"])

# Online Course
app.include_router(onlinecourse.router, prefix="/online-course", tags=["Online Course"])

# Student Dashboard
app.include_router(student.router)

# Teacher Dashboard
app.include_router(teacher.router)

# Staff Dashboard
app.include_router(staff.router)
print("[INFO] Staff routes registered")

# Messaging (NEW: Updated system with group and private chats)
if messaging_v2:
    app.include_router(messaging_v2.router)
    print("[INFO] Messaging routes registered")
else:
    print("⚠️ Messaging routes not available")

# Gamification
app.include_router(gamification.router)
print("[INFO] Gamification routes registered")

# Leaderboards
app.include_router(leaderboards.router)
print("[INFO] Leaderboard routes registered")

"""
Main FastAPI application entry point
# Diagnostic reload: 2026-02-19 22:36
"""

# Social Feed
app.include_router(feed.router)
print("[INFO] Feed routes registered")

# Platform Owner
app.include_router(admin.router)
app.include_router(platform.router)
print("[INFO] Platform Owner routes registered")

# Billing
app.include_router(billing.router)
print("[INFO] Billing routes registered")

# Announcements
app.include_router(announcements.router, prefix="/announcements", tags=["Announcements"])
print("[INFO] Announcement routes registered")

# Expenses
app.include_router(expenses.router)
print("[INFO] Expense routes registered")

# Avatar Upload
app.include_router(upload.router, prefix="/api")
print("[INFO] Upload routes registered")

# Books
app.include_router(books.router)
print("[INFO] Books routes registered")

# Book Reader
app.include_router(book_reader.router)
print("[INFO] Book Reader routes registered")

# Book Processing Jobs
app.include_router(book_jobs.router)
print("[INFO] Book Processing Jobs routes registered")

# Book Review (Phase 3)
app.include_router(book_review.router)
print("[INFO] Book Review routes registered")

# Interactive Books (AI-powered subsystem)
app.include_router(interactive_books.router)
print("[INFO] Interactive Books routes registered")

# AI Billing
app.include_router(ai_billing.router)
print("[INFO] AI Billing routes registered")


# =========================
# Root & Health Endpoints
# =========================
@app.get("/", tags=["Root"])
def root():
    return {
        "message": "EduComfort API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": "EduComfort API"
    }