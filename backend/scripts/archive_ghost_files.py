import os
import shutil
from pathlib import Path

def archive_ghost_items():
    # Base paths
    project_root = Path(__file__).resolve().parent.parent
    archive_dir = project_root / "archive"
    
    # Define directories and files to archive relative to project root
    ghost_items = [
        "app/gamification",
        "app/marketplace",
        "app/individual",
        "EduComfort frontend/src/pages/students/games",
        "EduComfort frontend/src/pages/students/Achievements.jsx",
        "EduComfort frontend/src/pages/Marketplace.jsx"
    ]
    
    # Create archive directory if it doesn't exist
    archive_dir.mkdir(exist_ok=True)
    
    print(f"Archiving ghost items to: {archive_dir}")
    print("-" * 50)
    
    success_count = 0
    fail_count = 0
    
    for item_path_str in ghost_items:
        source_path = project_root / item_path_str
        
        # Calculate destination path preserving relative structure
        # (e.g., archive/app/gamification)
        rel_path = source_path.relative_to(project_root)
        dest_path = archive_dir / rel_path
        
        if source_path.exists():
            try:
                # Ensure parent directories exist in archive
                dest_path.parent.mkdir(parents=True, exist_ok=True)
                
                if source_path.is_dir():
                    shutil.move(str(source_path), str(dest_path))
                    print(f"[SUCCESS] Moved directory: {rel_path} -> archive/{rel_path}")
                else:
                    shutil.move(str(source_path), str(dest_path))
                    print(f"[SUCCESS] Moved file: {rel_path} -> archive/{rel_path}")
                
                success_count += 1
            except Exception as e:
                print(f"[ERROR] Failed to move {rel_path}: {e}")
                fail_count += 1
        else:
            print(f"[SKIP] Source not found (already archived?): {rel_path}")
            
    print("-" * 50)
    print(f"Archive complete. Success: {success_count}, Failed: {fail_count}")

if __name__ == "__main__":
    archive_ghost_items()
