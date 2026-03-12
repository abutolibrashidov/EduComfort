from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.exceptions import ResponseValidationError, RequestValidationError
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from loguru import logger
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
import os

from app.academic.models.subject import Subject
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

# ========================= Model Imports =========================

# ── New domain model imports (Phase 1 Architecture Redesign) ──────────────
# These imports ensure Alembic can detect the new tables.

from app.data.seed_super_admin import seed_super_admin

# ========================= Schedulers =========================
# NOTE: APScheduler has been replaced by Celery Beat (Phase 5 scalability plan).
# Periodic jobs (billing, rating cycles, leaderboard warmup) now run as
# Celery tasks. Start Celery Beat separately:
#   celery -A app.core.celery_app beat --loglevel=info
# DO NOT re-add start_scheduler/start_billing_scheduler() here — they are
# not safe under multi-worker Gunicorn (each worker would run its own scheduler).

# ========================= Router Imports =========================
# ✅ FIX 1: Removed duplicate imports of `public` and `messaging_v2`.
#    They were imported BOTH in the bulk `from app.academic.routers import attendance
from app.academic.routers import books
from app.academic.routers import courses
from app.academic.routers import exams
from app.academic.routers import gradebook
from app.academic.routers import ielts
from app.academic.routers import interactive_workbook
from app.academic.routers import onlinecourse
from app.academic.routers import student
from app.academic.routers import subject
from app.academic.routers import teacher
from app.billing.routers import billing
from app.billing.routers import monthly_fees
from app.billing.routers import payments
from app.center.routers import enrollments
from app.center.routers import groups
from app.core.routers import admin
from app.core.routers import auth
from app.core.routers import institutions
from app.core.routers import users
from app.engagement.routers import feed
from app.engagement.routers import gamification
from app.engagement.routers import leaderboards
from app.engagement.routers import telegram
from app.school.routers import academic_years
from app.school.routers import grade_levels
from app.school.routers import school_classes
from app.school.routers import timetables
from app.shared.routers import ai_billing
from app.shared.routers import announcements
from app.shared.routers import book_jobs
from app.shared.routers import book_reader
from app.shared.routers import book_review
from app.shared.routers import branches
from app.shared.routers import distractors
from app.shared.routers import expenses
from app.shared.routers import feedbacks
from app.shared.routers import interactive_books
from app.shared.routers import learners
from app.shared.routers import platform
from app.shared.routers import staff
from app.shared.routers import upload
from app.shared.routers import workbooks

from app.learning_engine import routers as learning_engine_routers

# Optional routers — loaded with fallback
try:
    from app.shared.routers import public
    logger.info("Public router loaded")
except ImportError:
    logger.warning("public.py not found — public routes not available")
    public = None

try:
    from app.shared.routers import messaging_v2
    logger.info("Messaging router loaded")
except Exception as e:
    logger.warning(f"Could not load messaging_v2: {e}")
    messaging_v2 = None


# ========================= Lifespan (replaces deprecated @app.on_event) =========================
# ✅ FIX 2: Replaced deprecated @app.on_event("startup"/"shutdown") with lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── STARTUP ──
    logger.info("Starting backend initialization...")

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

    logger.info("Backend initialization completed")

    # Log Redis status
    from app.core.redis_client import get_redis_client
    redis = get_redis_client()
    if redis:
        logger.info("Redis connected — leaderboard caching and XP daily caps active")
    else:
        logger.warning(
            "Redis not configured (REDIS_URL not set) — "
            "leaderboard queries will hit DB directly, daily XP caps will not be enforced"
        )

    yield  # ← app runs here

    # ── SHUTDOWN ──
    logger.info("Shutting down backend...")


# =========================
# FastAPI App
# =========================
app = FastAPI(
    title="EduComfort API",
    version="1.0.0",
    description="Learning Management System API",
    docs_url=None if settings.ENVIRONMENT == "production" else "/docs",
    redoc_url=None if settings.ENVIRONMENT == "production" else "/redoc",
    redirect_slashes=False,  # ✅ Keeps this — eliminates all 307/308 redirects globally
    lifespan=lifespan,       # ✅ FIX 2: Use new lifespan instead of deprecated on_event
)

# ========================= Rate Limiting =========================
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ========================= Global Exception Handlers =========================
def _add_cors_headers(response: JSONResponse, request: Request) -> JSONResponse:
    """Manually add CORS headers to exception handler responses.
    
    Starlette's CORS middleware does NOT wrap exception handler responses,
    so browsers see CORS errors on 422/500 responses. We add the headers
    manually here as a workaround.
    """
    origin = request.headers.get("origin", "")
    if origin:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Always return a CORS-friendly JSON response for unhandled exceptions.
    
    In dev mode: returns full error details for debugging.
    In production: hides stack trace, returns generic message.
    
    NOTE: We do NOT re-raise in dev mode — re-raising bypasses CORS middleware,
    making 500s appear to the browser as CORS errors instead of 500s.
    """
    import traceback as tb
    error_detail = tb.format_exc()
    logger.exception(f"Unhandled exception on {request.method} {request.url}: {exc}")
    
    if settings.ENVIRONMENT == "production":
        content = {"detail": "Internal server error"}
    else:
        # Dev mode: include full traceback so we can see what's actually wrong
        content = {
            "detail": str(exc),
            "type": type(exc).__name__,
            "traceback": error_detail,
        }
    
    return _add_cors_headers(
        JSONResponse(status_code=500, content=content),
        request,
    )


@app.exception_handler(ResponseValidationError)
async def validation_exception_handler(request: Request, exc: ResponseValidationError):
    logger.error(f"ResponseValidationError on {request.url}:")
    for err in exc.errors():
        logger.error(str(err))
    return _add_cors_headers(
        JSONResponse(status_code=500, content={"message": "Internal Server Error"}),
        request,
    )


@app.exception_handler(RequestValidationError)
async def request_validation_exception_handler(request: Request, exc: RequestValidationError):
    body = await request.body()
    logger.error(f"RequestValidationError on {request.method} {request.url}")
    logger.error(f"Body: {body.decode(errors='ignore')}")
    logger.error(f"Errors: {exc.errors()}")
    return _add_cors_headers(
        JSONResponse(status_code=422, content={"detail": exc.errors()}),
        request,
    )


# =========================
# CORS Configuration
# =========================
raw_origins = settings.CORS_ORIGINS.split(",")
origins = [o.strip() for o in raw_origins if o.strip()]

if settings.ENVIRONMENT != "production":
    if "http://localhost:5173" not in origins:
        origins.append("http://localhost:5173")
    if "http://127.0.0.1:5173" not in origins:
        origins.append("http://127.0.0.1:5173")

logger.info(f"CORS origins: {origins} [Env: {settings.ENVIRONMENT}]")

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

# ========================= Static Files =========================
# ✅ FIX 4: In production, uploads are served from the VPS nginx or S3.
#    Never mount local disk in production — path may not exist or be ephemeral.
if settings.ENVIRONMENT != "production":
    from pathlib import Path
    media_path = Path(settings.MEDIA_ROOT)
    os.makedirs(media_path, exist_ok=True)
    mount_name = media_path.name
    app.mount(f"/{mount_name}", StaticFiles(directory=settings.MEDIA_ROOT), name=mount_name)
    logger.info(f"Serving static files from local /{mount_name} (dev mode)")
else:
    logger.info("Production mode: static files served from VPS nginx or S3 — not mounted here")


# =========================
# API Routes
# =========================

# Public (optional)
if public:
    app.include_router(public.router)
    logger.info("Public routes registered")

# Auth
app.include_router(auth.router)

# Institutions (multi-tenancy)
app.include_router(institutions.router)
logger.info("Institutions routes registered")

# Learners
app.include_router(learners.router)
logger.info("Learners routes registered")

# Courses / Marketplace
app.include_router(courses.router)
logger.info("Course Marketplace routes registered")

# Users
app.include_router(users.router, prefix="/admin/users", tags=["Users"])

# Groups
app.include_router(groups.router)

# Branches
app.include_router(branches.router)

# Payments
app.include_router(payments.router, prefix="/payments", tags=["Payments"])

# Subjects
app.include_router(subject.router, prefix="/subjects", tags=["Subjects"])

# Enrollments
app.include_router(enrollments.router)
logger.info("Enrollments routes registered")

# Academic Years (School)
app.include_router(academic_years.router)
logger.info("Academic Years routes registered")

# Grade Levels (School)
app.include_router(grade_levels.router)
logger.info("Grade Levels routes registered")

# School Classes (Sinflar)
app.include_router(school_classes.router)
logger.info("School Classes routes registered")

# Timetables (Dars jadvali)
app.include_router(timetables.router)
logger.info("Timetables routes registered")

# Monthly Fees (Payment Obligation System)
app.include_router(monthly_fees.router)
logger.info("Monthly Fees routes registered")

# Exams
app.include_router(exams.router, prefix="/exams", tags=["Exams"])

# Workbooks
app.include_router(workbooks.router, prefix="/workbooks", tags=["Workbooks"])

# Interactive Workbook
app.include_router(interactive_workbook.router, prefix="/interactive-workbook", tags=["Interactive Workbook"])

# IELTS
app.include_router(ielts.router, prefix="/ielts", tags=["IELTS"])

# Online Course
app.include_router(onlinecourse.router, prefix="/online-course", tags=["Online Course"])

# Role Dashboards
app.include_router(student.router)
app.include_router(teacher.router)
app.include_router(staff.router)
logger.info("Role dashboards registered")

# Messaging (optional)
if messaging_v2:
    app.include_router(messaging_v2.router)
    logger.info("Messaging routes registered")
else:
    logger.warning("Messaging routes not available")

# Gamification & Leaderboards
app.include_router(gamification.router)
app.include_router(leaderboards.router)
logger.info("Gamification & Leaderboards registered")

# Social Feed
app.include_router(feed.router)
logger.info("Feed routes registered")

# Platform Owner & Admin
app.include_router(admin.router)
app.include_router(platform.router)
logger.info("Platform Owner routes registered")

# Billing
app.include_router(billing.router)
logger.info("Billing routes registered")

# Announcements
app.include_router(announcements.router, prefix="/announcements", tags=["Announcements"])
logger.info("Announcement routes registered")

# Expenses
app.include_router(expenses.router)
logger.info("Expense routes registered")

# Avatar Upload
app.include_router(upload.router, prefix="/api")
logger.info("Upload routes registered")

# Books
app.include_router(books.router)
app.include_router(book_reader.router)
app.include_router(book_jobs.router)
app.include_router(book_review.router)
app.include_router(interactive_books.router)
logger.info("Books routes registered")

# AI Billing
app.include_router(ai_billing.router)
logger.info("AI Billing routes registered")

# Gradebook
app.include_router(gradebook.router)
logger.info("Gradebook routes registered")

# Feedback
app.include_router(feedbacks.router, prefix="/feedbacks", tags=["Feedback"])
logger.info("Feedback routes registered")

# Attendance
from app.academic.routers import attendance
app.include_router(attendance.router)
logger.info("Attendance routes registered")

# Misc
app.include_router(distractors.router)

# Learning Engine
app.include_router(learning_engine_routers.router)

# Telegram Webhook
from app.engagement.routers import telegram
app.include_router(telegram.router, prefix="/telegram", tags=["Telegram"])

# =========================
# Root & Health Endpoints
# =========================
@app.get("/", tags=["Root"])
def root():
    return {
        "message": "EduComfort API",
        "version": "1.0.0",
        "docs": "/docs" if settings.ENVIRONMENT != "production" else "disabled",
        "health": "/health"
    }


@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": "EduComfort API",
        "environment": settings.ENVIRONMENT,
    }