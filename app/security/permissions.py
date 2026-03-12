from fastapi import HTTPException, status
from typing import Iterable, Optional

from app.core.models.user import User
from app.constants.roles import Role


def is_platform_owner(user: User) -> bool:
    """
    Check if user has platform-level access (can access ALL institutions).

    ✅ Only true platform owners (is_platform_admin flag OR platform_owner role).

    ❌ super_admin is institution-scoped — they are the owner of THEIR institution,
       NOT a cross-institution admin. Do NOT add super_admin here.
    """
    # Check the is_platform_admin flag (set on EduComfort staff accounts)
    if getattr(user, "is_platform_admin", False):
        return True

    # Check role (handle both string and enum)
    user_role = user.role
    if hasattr(user_role, "value"):
        user_role = user_role.value

    return user_role in [
        Role.PLATFORM_OWNER.value,
        "platform_owner",
    ]


def is_super_admin(user: User) -> bool:
    """
    Check if user is institution-level super admin (owner of their institution).
    Note: This is different from platform-level super_admin.
    """
    # Check attribute first
    if getattr(user, "is_super_admin", False):
        return True
    
    # Check role
    user_role = user.role
    if hasattr(user_role, "value"):
        user_role = user_role.value
        
    return user_role in [
        "super_admin", Role.SUPER_ADMIN.value,
        "school_owner", Role.SCHOOL_OWNER.value
    ]


def is_institution_admin(user: User) -> bool:
    """Check if user is an institution-level admin (manager within institution)"""
    user_role = getattr(user.role, "value", user.role)
    return user_role in [
        Role.ADMIN.value, "admin", 
        Role.INSTITUTION_ADMIN.value, "institution_admin",
        Role.SCHOOL_PRINCIPAL.value, "school_principal",
        Role.SCHOOL_REGISTRAR.value, "school_registrar"
    ]


def is_admin_or_higher(user: User) -> bool:
    """Check if user is admin OR super_admin (both institution-scoped)"""
    return is_institution_admin(user) or is_super_admin(user)


def is_teacher(user: User) -> bool:
    """Check if user is a teacher"""
    user_role = getattr(user.role, "value", user.role)
    return user_role in [
        Role.TEACHER.value, "teacher",
        Role.SCHOOL_TEACHER.value, "school_teacher"
    ]


def is_student(user: User) -> bool:
    """Check if user is a student"""
    return user.role == Role.STUDENT or user.role == "student"


def is_school_leadership(user: User) -> bool:
    """Check if user is school owner or principal (authorized for high-level operations like Promotion)"""
    user_role = getattr(user.role, "value", user.role)
    return user_role in [
        Role.SCHOOL_OWNER.value, "school_owner",
        Role.SCHOOL_PRINCIPAL.value, "school_principal"
    ]


def require_platform_owner(user: User) -> None:
    """Require user to be platform owner (cross-institution access)"""
    if not is_platform_owner(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This action requires platform owner privileges"
        )


def require_super_admin(user: User) -> None:
    """Require user to be super_admin (institution owner) or platform_owner"""
    if not (is_super_admin(user) or is_platform_owner(user)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This action requires super admin privileges"
        )


def require_admin(user: User) -> None:
    """Require user to be admin, super_admin, or platform_owner"""
    if not (is_admin_or_higher(user) or is_platform_owner(user)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This action requires admin privileges"
        )


def require_role(user: User, allowed_roles: Iterable[Role]) -> None:
    """
    Enforce role-based access control.
    Platform owner always passes.
    """
    if is_platform_owner(user):
        return

    if user.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "This action requires one of the following roles: "
                + ", ".join(role.value for role in allowed_roles)
            ),
        )


def check_institution_access(user: User, institution_id: Optional[int]) -> bool:
    """
    Check if user can access data from a specific institution.
    
    Rules:
    - Platform owner: can access ALL institutions
    - Super admin: can only access their own institution
    - Admin: can only access their own institution
    - Others: can only access their own institution
    """
    if is_platform_owner(user):
        return True
    
    if institution_id is None:
        return False
    
    return user.institution_id == institution_id


def require_institution_access(user: User, institution_id: Optional[int]) -> None:
    """Raise exception if user cannot access the institution"""
    if not check_institution_access(user, institution_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this institution's data"
        )


def can_view_user(requester: User, target_user: User) -> bool:
    """
    Rules:
    - Platform owner: can view all users across all institutions
    - Super admin: can view users in their institution only
    - Admin: can view users in their institution only
    - Teacher: can view users in same institution
    - Student: can only view themselves
    """

    if is_platform_owner(requester):
        return True

    if is_super_admin(requester) or is_institution_admin(requester):
        # Both super_admin and admin can only view users in their institution
        return requester.institution_id == target_user.institution_id

    if is_teacher(requester):
        # Teacher can view users in same institution
        return requester.institution_id == target_user.institution_id

    if is_student(requester):
        return requester.id == target_user.id

    return False
