from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import shutil
from datetime import datetime
from pydantic import BaseModel

from app.core.database import get_db
from app.auth.dependencies import get_current_user
from app.core.models.user import User

from app.security.permissions import is_admin_or_higher, is_teacher
from app.engagement.models.feed import Post, PostLike, UserFollow, Comment


router = APIRouter(prefix="/feed", tags=["News Feed"])

# --- Schemas ---
class PostCreate(BaseModel):
    content: str
    image_url: Optional[str] = None
    institution_id: Optional[int] = None # Optional, defaults to user's institution

class PostResponse(BaseModel):
    id: int
    content: str
    image_url: Optional[str]
    author_name: str
    author_avatar: Optional[str]
    institution_name: Optional[str]
    institution_logo: Optional[str]
    created_at: datetime
    likes_count: int
    is_liked: bool = False
    is_following: bool = False
    author_id: int
    author_id: int
    author_role: Optional[str] = None
    comments_count: int = 0  # Add this

    class Config:
        from_attributes = True


class CommentCreate(BaseModel):
    content: str


class CommentResponse(BaseModel):
    id: int
    content: str
    created_at: datetime
    user_id: int
    user_name: str
    user_avatar: Optional[str]

    class Config:
        from_attributes = True

# --- Endpoints ---

@router.post("/posts", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
def create_post(
    post_data: PostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new post.
    Teachers/Admins can post on behalf of their institution.
    """
    # Authorization check

    if not (is_teacher(current_user) or is_admin_or_higher(current_user)):
        raise HTTPException(status_code=403, detail="Only staff can create posts")

    institution_id = post_data.institution_id or current_user.institution_id
    
    # If Super Admin, try to find their owned institution if not explicitly set
    if current_user.is_super_admin and not institution_id:
        # Check if user owns an institution (assuming logic/relationship exists, or via reverse lookup)
        # Assuming Institution model has owner_id? No, User has institution_id.
        # But if User.institution_id is None, maybe query Institution by some other means?
        # Actually User model has institution_id. If it's None, we can't link.
        # But user SAID "James Korsch Super Admin". He created the account.
        # If he didn't link the institution in DB, that's the issue.
        # I'll rely on current_user.institution_id.
        pass

    # Validation: Ensure user belongs to that institution (unless super_admin)
    if institution_id and not current_user.is_super_admin:
        if current_user.institution_id != institution_id:
             raise HTTPException(status_code=403, detail="Cannot post for another institution")

    new_post = Post(
        content=post_data.content,
        image_url=post_data.image_url,
        author_id=current_user.id,
        institution_id=institution_id,
        likes_count=0
    )
    db.add(new_post)
    db.commit()
    db.refresh(new_post)
    
    return format_post_response(new_post, current_user, db)

# ==================== Endpoints ====================

@router.post("/upload")
async def upload_media(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Upload media (image/video) for posts
    """
    if not (is_teacher(current_user) or is_admin_or_higher(current_user)):
        raise HTTPException(status_code=403, detail="Not authorized")

    upload_dir = "uploads/feed"
    os.makedirs(upload_dir, exist_ok=True)

    # Generate filename
    file_extension = os.path.splitext(file.filename)[1].lower()
    allowed_exts = {".jpg", ".jpeg", ".png", ".gif", ".mp4", ".mov", ".webm"}
    if file_extension not in allowed_exts:
        raise HTTPException(status_code=400, detail="Invalid file type")

    filename = f"feed_{current_user.id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}{file_extension}"
    file_path = os.path.join(upload_dir, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {"url": f"/uploads/feed/{filename}"}


@router.get("/", response_model=List[PostResponse])
def get_feed(
    institution_id: Optional[int] = None,
    user_id: Optional[int] = None,
    limit: int = 50,
    skip: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get the news feed.
    Institution-isolated: Platform owners see all, others only their own.
    """
    try:
        query = db.query(Post)

        # Enforce isolation
        from app.security.permissions import is_platform_owner
        if not is_platform_owner(current_user):
            # Non-platform owners are pinned to their own institution
            target_inst = current_user.institution_id
            if target_inst:
                query = query.filter(Post.institution_id == target_inst)
            else:
                # No institution -> see platform-wide only (null institution_id)
                query = query.filter(Post.institution_id.is_(None))
        else:
            # Platform owner can filter by institution if provided
            if institution_id:
                query = query.filter(Post.institution_id == institution_id)

        if user_id:
            query = query.filter(Post.author_id == user_id)

        posts = query.order_by(Post.created_at.desc()).offset(skip).limit(limit).all()
        return [format_post_response(p, current_user, db) for p in posts]
    except Exception:
        # DB table may not exist yet (migration pending) — return empty feed
        # instead of crashing, which would cause a CORS error in the browser.
        return []

def format_post_response(post: Post, current_user: User, db: Session) -> PostResponse:
    # Check if liked by current user
    is_liked = db.query(PostLike).filter(
        PostLike.post_id == post.id,
        PostLike.user_id == current_user.id
    ).first() is not None

    is_following = db.query(UserFollow).filter(
        UserFollow.follower_id == current_user.id,
        UserFollow.followed_id == post.author_id
    ).first() is not None

    # Determine display name and logo
    # If post has institution, use it. If Super Admin author, prioritize Institution.
    disp_name = post.author.first_name + " " + post.author.last_name
    disp_avatar = None # User avatar logic if exists
    
    inst_name = None
    inst_logo = None
    
    if post.institution:
        inst_name = post.institution.name
        inst_logo = post.institution.logo_url
        # If institution exists, we show Institution Name primarily in UI logic, or we can swap here?
        # PostResponse keeps them separate. Frontend decides.
    
    return PostResponse(
        id=post.id,
        content=post.content,
        image_url=post.image_url,
        author_name=disp_name,
        author_avatar=disp_avatar, 
        institution_name=inst_name,
        institution_logo=inst_logo,
        created_at=post.created_at,
        likes_count=post.likes_count,
        is_liked=is_liked,
        is_following=is_following,
        author_id=post.author_id,
        author_role=post.author.role,
        comments_count=len(post.comments)
    )


@router.post("/posts/{post_id}/comments", response_model=CommentResponse)
def add_comment(
    post_id: int,
    comment_data: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a comment to a post"""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    new_comment = Comment(
        post_id=post_id,
        user_id=current_user.id,
        content=comment_data.content
    )
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)

    return CommentResponse(
        id=new_comment.id,
        content=new_comment.content,
        created_at=new_comment.created_at,
        user_id=current_user.id,
        user_name=f"{current_user.first_name} {current_user.last_name}",
        user_avatar=None # user.avatar if exists
    )


@router.get("/posts/{post_id}/comments", response_model=List[CommentResponse])
def get_comments(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get comments for a post"""
    comments = db.query(Comment).filter(Comment.post_id == post_id).order_by(Comment.created_at.desc()).all()
    
    return [
        CommentResponse(
            id=c.id,
            content=c.content,
            created_at=c.created_at,
            user_id=c.user_id,
            user_name=f"{c.user.first_name} {c.user.last_name}",
            user_avatar=None
        )
        for c in comments
    ]


@router.post("/posts/{post_id}/like")
def toggle_like(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Toggle like on a post"""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
        
    existing_like = db.query(PostLike).filter(
        PostLike.post_id == post_id,
        PostLike.user_id == current_user.id
    ).first()
    
    if existing_like:
        db.delete(existing_like)
        post.likes_count = max(0, post.likes_count - 1)
        liked = False
    else:
        new_like = PostLike(post_id=post_id, user_id=current_user.id)
        db.add(new_like)
        post.likes_count += 1
        liked = True
        
    db.commit()
    return {"liked": liked, "likes_count": post.likes_count}


@router.post("/users/{user_id}/follow")
def toggle_follow(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Toggle follow a user"""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
        
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    existing_follow = db.query(UserFollow).filter(
        UserFollow.follower_id == current_user.id,
        UserFollow.followed_id == user_id
    ).first()
    
    if existing_follow:
        db.delete(existing_follow)
        followed = False
    else:
        new_follow = UserFollow(follower_id=current_user.id, followed_id=user_id)
        db.add(new_follow)
        followed = True
        
    db.commit()
    return {"followed": followed}


@router.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a post (Author or Admin only)"""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    # Authorization
    is_author = post.author_id == current_user.id
    is_admin = is_admin_or_higher(current_user)
    
    if not (is_author or is_admin):
        raise HTTPException(status_code=403, detail="Not authorized to delete this post")

    # Delete associated likes/comments? (Cascade usually handles this, or manual)
    # Assuming DB cascade, or we delete here.
    db.delete(post)
    db.commit()
    return None
