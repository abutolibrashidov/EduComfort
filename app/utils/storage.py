"""
Cloud storage utility for EduComfort.

Uses AWS S3 for file storage. Falls back to local disk storage in
development when AWS credentials are not configured.
"""
import os
import uuid
from pathlib import Path
from typing import Optional

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import UploadFile

from app.core.config import settings


def _get_s3_client():
    """Return an S3 client configured from settings."""
    return boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_S3_REGION,
    )


def _is_s3_configured() -> bool:
    """Return True if S3 credentials are present."""
    return bool(
        settings.AWS_ACCESS_KEY_ID
        and settings.AWS_SECRET_ACCESS_KEY
        and settings.AWS_S3_BUCKET_NAME
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def upload_file(file: UploadFile, folder: str = "uploads") -> str:
    """
    Upload a file to S3 (production) or local disk (dev fallback).

    Returns:
        A publicly accessible URL string for the uploaded file.
    """
    # Generate a unique filename to avoid collisions
    ext = Path(file.filename).suffix if file.filename else ".bin"
    filename = f"{uuid.uuid4()}{ext}"

    if _is_s3_configured():
        return _upload_to_s3(file, folder, filename)
    else:
        return _upload_to_local(file, folder, filename)


def delete_file(file_url: str) -> bool:
    """
    Delete a file given its public URL.

    Handles both S3 URLs and local paths gracefully.
    Returns True on success, False on failure.
    """
    if _is_s3_configured() and file_url.startswith("https://"):
        return _delete_from_s3(file_url)
    else:
        return _delete_from_local(file_url)


# ---------------------------------------------------------------------------
# S3 operations
# ---------------------------------------------------------------------------

def _upload_to_s3(file: UploadFile, folder: str, filename: str) -> str:
    """Upload to S3 and return the public URL."""
    s3 = _get_s3_client()
    key = f"{folder}/{filename}"
    try:
        file.file.seek(0)
        s3.upload_fileobj(
            file.file,
            settings.AWS_S3_BUCKET_NAME,
            key,
            ExtraArgs={
                "ContentType": file.content_type or "application/octet-stream",
                "ACL": "public-read",
            },
        )
        region = settings.AWS_S3_REGION
        bucket = settings.AWS_S3_BUCKET_NAME
        return f"https://{bucket}.s3.{region}.amazonaws.com/{key}"
    except (BotoCoreError, ClientError) as e:
        raise RuntimeError(f"S3 upload failed: {e}") from e


def _delete_from_s3(file_url: str) -> bool:
    """Extract the S3 key from the URL and delete the object."""
    try:
        s3 = _get_s3_client()
        # URL format: https://<bucket>.s3.<region>.amazonaws.com/<key>
        key = "/".join(file_url.split("/")[3:])
        s3.delete_object(Bucket=settings.AWS_S3_BUCKET_NAME, Key=key)
        return True
    except (BotoCoreError, ClientError):
        return False


# ---------------------------------------------------------------------------
# Local fallback operations (development only)
# ---------------------------------------------------------------------------

LOCAL_BASE = Path("uploads")


def _upload_to_local(file: UploadFile, folder: str, filename: str) -> str:
    """Save to local disk and return a relative URL path."""
    dest_dir = LOCAL_BASE / folder
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_path = dest_dir / filename

    import shutil
    file.file.seek(0)
    with open(dest_path, "wb") as buf:
        shutil.copyfileobj(file.file, buf)

    return f"/uploads/{folder}/{filename}"


def _delete_from_local(file_url: str) -> bool:
    """Delete a local file given its URL path."""
    try:
        # e.g. /uploads/avatars/abc.png -> uploads/avatars/abc.png
        rel_path = file_url.lstrip("/")
        Path(rel_path).unlink(missing_ok=True)
        return True
    except OSError:
        return False
