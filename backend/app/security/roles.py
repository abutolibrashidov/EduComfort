from constants.Roles import Role

ROLE_PERMISSIONS = {
    Role.ADMIN: [
        "manage_users",
        "manage_branches",
        "manage_teachers",
        "manage_students",
        "view_reports",
        "manage_exams",
        "manage_payments",
        "manage_materials",
    ],
    Role.TEACHER: [
        "view_own_groups",
        "upload_materials",
        "create_tasks",
        "view_students",
        "view_results",
    ],
    Role.STUDENT: [
        "view_materials",
        "take_exams",
        "view_own_results",
        "view_attendance",
    ],
}
