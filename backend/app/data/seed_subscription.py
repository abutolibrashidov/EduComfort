from datetime import datetime, timedelta
from app.core.database import SessionLocal
from app.core.models.institution import Institution
from app.core.models.subscription import InstitutionSubscription, SubscriptionPlan, SubscriptionStatus

def seed_subscriptions():
    db = SessionLocal()
    try:
        print("=== SEEDING SUBSCRIPTIONS ===")
        
        # Get all institutions
        institutions = db.query(Institution).all()
        
        for inst in institutions:
            print(f"Checking subscription for: {inst.name} (ID: {inst.id})")
            
            # Check if subscription exists
            existing = db.query(InstitutionSubscription).filter(
                InstitutionSubscription.institution_id == inst.id
            ).first()
            
            if not existing:
                print(f" -> Creating Default BRONZE subscription for {inst.name}")
                sub = InstitutionSubscription(
                    institution_id=inst.id,
                    plan=SubscriptionPlan.BRONZE,
                    status=SubscriptionStatus.ACTIVE,
                    start_date=datetime.utcnow(),
                    next_billing_date=datetime.utcnow() + timedelta(days=30),
                    auto_renew=True
                )
                db.add(sub)
            else:
                print(f" -> Subscription already exists: {existing.plan}")
                
        db.commit()
        print("✅ Subscription seeding complete")
        
    except Exception as e:
        print(f"❌ Error seeding subscriptions: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_subscriptions()
