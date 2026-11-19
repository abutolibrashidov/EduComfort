from sqlalchemy.orm import Session
from app.academic.models.subject import Subject


def seed_subjects(db: Session, institution_id: int = None):
    """
    Seed initial subjects for an institution.
    If institution_id is None, creates global subjects (for platform use).
    If institution_id is provided, creates subjects for that specific institution.
    """
    subjects_data = [
        {
            "name": "English",
            "description": "English language courses including IELTS, General English, Business English",
            "is_active": True,
            "institution_id": institution_id
        },
        {
            "name": "Math",
            "description": "Mathematics courses for all levels",
            "is_active": True,
            "institution_id": institution_id
        },
        {
            "name": "Mother Tongue",
            "description": "Native language improvement courses",
            "is_active": True,
            "institution_id": institution_id
        }
    ]
    
    for subject_data in subjects_data:
        # Check if subject already exists for this institution
        existing = db.query(Subject).filter(
            Subject.name == subject_data["name"],
            Subject.institution_id == institution_id
        ).first()
        
        if not existing:
            subject = Subject(**subject_data)
            db.add(subject)
            institution_label = f"Institution {institution_id}" if institution_id else "Global"
            print(f"✅ Added subject: {subject_data['name']} ({institution_label})")
        else:
            print(f"⚠️ Subject already exists: {subject_data['name']}")
    
    db.commit()
    print(f"✅ Subjects seeding completed for {'Institution ' + str(institution_id) if institution_id else 'Global'}")