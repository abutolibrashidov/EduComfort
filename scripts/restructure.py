import os
import re
import shutil
from pathlib import Path

# Mapping of file base name (without .py) to its new domain
DOMAIN_MAPPING = {
    # Core
    "base": "core",
    "user": "core",
    "institution": "core",
    "subscription": "core",
    "platform_setting": "core",
    "branch": "core",
    "parent_student": "core",
    "auth": "core",
    "users": "core",
    "institutions": "core",
    "subscriptions": "core",
    "admin": "core",
    "platform_owner": "core",
    "dependencies": "core",
    "database": "core",
    "redis_client": "core",
    
    # Center
    "group": "center",
    "group_students": "center",
    "enrollment": "center",
    "enrollments": "center",
    "groups": "center",
    
    # School
    "academic_year": "school",
    "academic_years": "school",
    "grade_level": "school",
    "grade_levels": "school",
    "term": "school",
    "school_classes": "school",
    
    # Academic
    "subject": "academic",
    "subjects": "academic",
    "exam": "academic",
    "exams": "academic",
    "material": "academic",
    "materials": "academic",
    "lesson": "academic",
    "lessons": "academic",
    "gradebook": "academic",
    "grade": "academic",
    "course": "academic",
    "courses": "academic",
    "book_content": "academic",
    "student_book": "academic",
    "interactive_book": "academic",
    "interactive_workbook": "academic",
    "passage": "academic",
    "performance": "academic",
    "books": "academic",
    "ai": "academic",
    "student": "academic", 
    "teacher": "academic",
    "student_service": "academic",
    "teacher_service": "academic",
    "stats_service": "academic",
    "workbook": "academic",
    "ielts": "academic",
    "onlinecourse": "academic",
    "book_processing_job": "academic",
    "attendance": "academic", 
    
    # Billing
    "payment": "billing",
    "payments": "billing",
    "monthly_fee": "billing",
    "monthly_fees": "billing",
    "expense": "billing",
    "teacher_payment": "billing",
    "billing": "billing",
    
    # Engagement
    "leaderboard": "engagement",
    "leaderboards": "engagement",
    "messaging": "engagement",
    "achievement": "engagement",
    "conversation": "engagement",
    "feed": "engagement",
    "feedback": "engagement",
    "platform_notification": "engagement",
    "rating": "engagement",
    "telegram": "engagement",
    "gamification": "engagement",
    "announcement": "engagement",
}

def get_domain(filename):
    basename = filename.replace(".py", "")
    if basename == "__init__": return None
    return DOMAIN_MAPPING.get(basename, "shared")

# Create dirs
domains = set(DOMAIN_MAPPING.values()) | {"shared", "academic"}
for d in domains:
    for layer in ["models", "routers", "schemas", "services"]:
        Path(f"app/{d}/{layer}").mkdir(parents=True, exist_ok=True)
        init_file = Path(f"app/{d}/{layer}/__init__.py")
        if not init_file.exists():
            init_file.touch()
        init_layer = Path(f"app/{d}/__init__.py")
        if not init_layer.exists():
            init_layer.touch()

# Read all files to move
moves = []

def plan_moves(layer):
    layer_path = Path(f"app/{layer}")
    if not layer_path.exists(): return
    for f in layer_path.glob("*.py"):
        if f.name == "__init__.py": continue
        domain = get_domain(f.name)
        if domain is None: continue
        new_path = Path(f"app/{domain}/{layer}/{f.name}")
        # Only add to moves if file is effectively in the old location
        moves.append((f, new_path, layer, domain))

plan_moves("models")
plan_moves("routers")
plan_moves("schemas")
plan_moves("services")

# Execute shutil.move
for old, new, layer, domain in moves:
    if old.exists():
        print(f"Moving {old} -> {new}")
        shutil.move(str(old), str(new))

# Build replace dictionary for imports
# e.g. "app.models.user" -> "app.core.models.user"
replacements = {}
for old, new, layer, domain in moves:
    basename = old.name.replace(".py", "")
    old_import = f"app.{layer}.{basename}"
    new_import = f"app.{domain}.{layer}.{basename}"
    replacements[old_import] = new_import

# Replace in all .py files
all_py_files = list(Path("app").rglob("*.py"))
for py_file in all_py_files:
    content = py_file.read_text(encoding="utf-8")
    original_content = content
    
    # 1. Update absolute imports: from app.models.user import ...
    for old_imp, new_imp in replacements.items():
        # Match word boundaries to prevent part matches
        pattern = r"\b" + old_imp.replace(".", r"\.") + r"\b"
        content = re.sub(pattern, new_imp, content)
    
    # 2. Update relative imports in legacy __init__.py files
    if py_file.name == "__init__.py" and py_file.parent.name in ["models", "routers", "schemas", "services"] and py_file.parent.parent.name == "app":
        layer = py_file.parent.name
        # Match 'from .basename import'
        def replace_relative(match):
            basename = match.group(1)
            domain = DOMAIN_MAPPING.get(basename, "shared")
            if basename == "attendance": domain = "academic"
            if domain == "shared": return match.group(0) # Keep if unknown
            return f"from app.{domain}.{layer}.{basename} import"
            
        content = re.sub(r"from \.([a-zA-Z0-9_]+) import", replace_relative, content)
        
    if content != original_content:
        print(f"Updated imports in {py_file}")
        py_file.write_text(content, encoding="utf-8")

print("Restructuring Complete.")
