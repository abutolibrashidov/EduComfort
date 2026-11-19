from datetime import datetime, timedelta
from app.core.database import SessionLocal
from app.core.models.subscription import InstitutionSubscription, SubscriptionStatus

def check_subscriptions():
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        print(f"🕒 Running Billing Check at {now}")

        # Find subscriptions expiring today or past due
        expiring = db.query(InstitutionSubscription).filter(
            InstitutionSubscription.status == SubscriptionStatus.ACTIVE,
            InstitutionSubscription.next_billing_date <= now
        ).all()

        for sub in expiring:
            print(f" -> Processing subscription for Institution {sub.institution_id} (Plan: {sub.plan})")
            
            if sub.auto_renew:
                # Mock payment processing
                payment_success = True 
                
                if payment_success:
                    # Extend for 30 days
                    sub.next_billing_date = now + timedelta(days=30)
                    print(f"    ✅ Auto-renewed until {sub.next_billing_date}")
                    # In real app: create invoice record
                else:
                    sub.status = SubscriptionStatus.EXPIRED
                    print("    ❌ Payment failed. Subscription expired.")
            else:
                sub.status = SubscriptionStatus.EXPIRED
                print("    ⚠️ Auto-renew disabled. Subscription expired.")

        db.commit()
        print("✅ Billing Check Complete")

    except Exception as e:
        print(f"❌ Error in billing cron: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    check_subscriptions()
