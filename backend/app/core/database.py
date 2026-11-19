from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,      # Tests connection before using it (fixes "server closed connection" errors)
    pool_recycle=300         # Recycles connections every 5 minutes so Neon doesn't kill them
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


def get_db():
    """Yield a database session (dependency-compatible)."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
