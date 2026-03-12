from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.utils.storage import upload_file, delete_file

router = APIRouter(prefix="/upload", tags=["Upload"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload user avatar to cloud storage (S3 in production, local in dev)."""
    # Validate file type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only JPEG, PNG, GIF, and WEBP are allowed.",
        )

    # Validate file size (5 MB max)
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File is too large. Maximum allowed size is 5 MB.",
        )

    # Delete the old avatar if it's an S3 object
    if current_user.avatar and current_user.avatar.startswith("https://"):
        delete_file(current_user.avatar)

    # Upload to cloud storage
    try:
        avatar_url = upload_file(file, folder="avatars")
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )

    # Persist the new URL
    current_user.avatar = avatar_url
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update user profile: {e}",
        )

    return {"url": avatar_url}
