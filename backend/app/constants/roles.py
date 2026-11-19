from enum import Enum


class Role(str, Enum):
    # Center Roles
    STUDENT = "student"
    TEACHER = "teacher"
    STAFF = "staff"        # accountant, manager, receptionist
    ADMIN = "admin"        # learning center admin (deprecated, use INSTITUTION_ADMIN)
    
    # School Roles
    SCHOOL_OWNER = "school_owner"
    SCHOOL_PRINCIPAL = "school_principal"
    SCHOOL_TEACHER = "school_teacher"
    SCHOOL_REGISTRAR = "school_registrar"
    PARENT = "parent"

    # Multi-tenant Administration
    INSTITUTION_ADMIN = "institution_admin"  # Institution administrator
    PLATFORM_ADMIN = "platform_admin"  # EduComfort platform administrator
    PLATFORM_OWNER = "platform_owner"  # The One Owner (God Mode)
    SUPER_ADMIN = "super_admin"  # system super admin - full access