from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from .base import Base

class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    image_url = Column(String(500), nullable=True)
    
    author_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=True)
    
    likes_count = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    author = relationship("User", backref="posts")
    institution = relationship("Institution", backref="posts")
    author = relationship("User", backref="posts")
    institution = relationship("Institution", backref="posts")
    likes = relationship("PostLike", back_populates="post", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Post id={self.id} author={self.author_id}>"


class PostLike(Base):
    __tablename__ = "post_likes"
    
    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    post = relationship("Post", back_populates="likes")
    user = relationship("User", backref="liked_posts")


class UserFollow(Base):
    __tablename__ = "user_follows"
    
    id = Column(Integer, primary_key=True, index=True)
    follower_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    followed_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    follower = relationship("User", foreign_keys=[follower_id], backref="following")
    followed = relationship("User", foreign_keys=[followed_id], backref="followers")


class Comment(Base):
    __tablename__ = "comments"
    
    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    post = relationship("Post", back_populates="comments")
    user = relationship("User", backref="comments")
