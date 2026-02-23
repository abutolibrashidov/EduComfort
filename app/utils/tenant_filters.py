"""
Tenant Filtering Utilities
Helper functions for filtering database queries by institution
"""
from fastapi import Request, Depends
from sqlalchemy.orm import Session, Query
from typing import TypeVar, Type
from app.core.database import get_db
from app.middleware.tenant_context import get_tenant_id


T = TypeVar('T')


def filter_by_institution(
    query: Query,
    model: Type[T],
    request: Request,
    institution_field: str = "institution_id"
) -> Query:
    """
    Automatically filter query by institution_id from request context
    
    Args:
        query: SQLAlchemy query object
        model: The model class being queried
        request: FastAPI request object (contains tenant context)
        institution_field: Name of the institution_id field (default: "institution_id")
    
    Returns:
        Filtered query object
        
    Usage:
        users = filter_by_institution(
            db.query(User),
            User,
            request
        ).all()
    """
    institution_id = get_tenant_id(request)
    
    # Platform admins bypass filtering (institution_id is None)
    if institution_id is None:
        return query
    
    # Apply institution filter
    if hasattr(model, institution_field):
        return query.filter(getattr(model, institution_field) == institution_id)
    
    # If model doesn't have institution field, return unfiltered
    # (for global models like subjects)
    return query


def get_institution_filter(request: Request, field_name: str = "institution_id"):
    """
    Get a filter condition for institution_id
    
    Usage:
        institution_filter = get_institution_filter(request)
        users = db.query(User).filter(institution_filter).all()
    """
    institution_id = get_tenant_id(request)
    
    if institution_id is None:
        # Platform admin - no filter needed
        return True
    
    # Return filter condition
    return f"{field_name} == {institution_id}"


class TenantQueryHelper:
    """
    Helper class for tenant-aware database queries
    
    Usage:
        tenant_helper = TenantQueryHelper(request, db)
        users = tenant_helper.query(User).all()
    """
    
    def __init__(self, request: Request, db: Session):
        self.request = request
        self.db = db
        self.institution_id = get_tenant_id(request)
    
    def query(self, model: Type[T], institution_field: str = "institution_id") -> Query:
        """
        Create a tenant-filtered query
        """
        query = self.db.query(model)
        
        # Platform admins bypass filtering
        if self.institution_id is None:
            return query
        
        # Apply institution filter if model has the field
        if hasattr(model, institution_field):
            return query.filter(getattr(model, institution_field) == self.institution_id)
        
        return query
    
    def get(self, model: Type[T], id: int, institution_field: str = "institution_id") -> T | None:
        """
        Get a single record by ID with tenant filtering
        """
        query = self.db.query(model).filter(model.id == id)
        
        # Apply institution filter
        if self.institution_id is not None and hasattr(model, institution_field):
            query = query.filter(getattr(model, institution_field) == self.institution_id)
        
        return query.first()
    
    def is_platform_admin(self) -> bool:
        """
        Check if current user is platform admin
        """
        return getattr(self.request.state, "is_platform_admin", False)
