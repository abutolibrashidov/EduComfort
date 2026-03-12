"""
Billing Scheduler — Oylik hisob-kitob va SMS eslatmalar
Har kuni soat 09:00 (Toshkent) da ishlaydi:
  1. Ertaga to'lov muddati bo'lganlar → SMS eslatma
  2. Muddati o'tib, to'lov olmagan → avtomatik bloklash
"""
import logging
from datetime import datetime, timedelta

import pytz
from apscheduler.schedulers.background import BackgroundScheduler

from app.core.database import SessionLocal
from app.core.models.institution import Institution
from app.core.models.subscription import InstitutionSubscription, SubscriptionStatus

logger = logging.getLogger(__name__)

TASHKENT_TZ = pytz.timezone("Asia/Tashkent")


def check_upcoming_payments():
    """
    Ertaga to'lov muddati bo'lgan barcha obunalarga SMS yuboradi.
    Bir kunlik ogohlantirish. Bir kun ichida qayta yubormaslik uchun
    last_notified_at tekshiriladi.
    """
    # Import lazily to avoid circular at module load time
    from app.shared.services.sms_service import send_payment_reminder

    db = SessionLocal()
    try:
        now_tashkent = datetime.now(TASHKENT_TZ)
        tomorrow = (now_tashkent + timedelta(days=1)).date()

        # Faol obunalar, to'lov sanasi ertaga
        subscriptions = db.query(InstitutionSubscription).filter(
            InstitutionSubscription.status == SubscriptionStatus.ACTIVE,
            InstitutionSubscription.next_billing_date is not None,
        ).all()

        notified = 0
        for sub in subscriptions:
            if not sub.next_billing_date:
                continue

            billing_date = sub.next_billing_date
            # Make timezone-aware for comparison
            if billing_date.tzinfo is None:
                billing_date_local = TASHKENT_TZ.localize(billing_date)
            else:
                billing_date_local = billing_date.astimezone(TASHKENT_TZ)

            if billing_date_local.date() != tomorrow:
                continue

            # Bugun allaqachon xabar bergansiz?
            if sub.last_notified_at:
                last_notif = sub.last_notified_at
                if last_notif.tzinfo is None:
                    last_notif = TASHKENT_TZ.localize(last_notif)
                if last_notif.date() == now_tashkent.date():
                    logger.info(f"Subscription {sub.id}: bugun SMS allaqachon yuborilgan, o'tkazilmoqda")
                    continue

            if not sub.contact_phone:
                logger.warning(f"Subscription {sub.id}: telefon raqam yo'q, SMS yuborib bo'lmaydi")
                continue

            # Muassasa nomini olish
            institution = db.query(Institution).filter(
                Institution.id == sub.institution_id
            ).first()
            inst_name = institution.name if institution else f"Muassasa #{sub.institution_id}"

            due_str = billing_date_local.strftime("%d.%m.%Y")
            success = send_payment_reminder(
                phone=sub.contact_phone,
                institution_name=inst_name,
                amount=sub.monthly_price or 0,
                due_date=due_str,
            )

            if success:
                sub.last_notified_at = datetime.utcnow()
                db.commit()
                notified += 1
                logger.info(f"SMS eslatma yuborildi: {inst_name} → {sub.contact_phone}")
            else:
                logger.error(f"SMS yuborishda xato: {inst_name}")

        logger.info(f"check_upcoming_payments: {notified} ta SMS yuborildi")

    except Exception as e:
        logger.error(f"check_upcoming_payments xatosi: {e}", exc_info=True)
        db.rollback()
    finally:
        db.close()


def check_overdue_payments():
    """
    Muddati o'tib ketgan va to'lov olmagan obunalarni bloklaydi.
    Bloklash = Institution.is_active = False
    """
    from app.shared.services.sms_service import send_blocked_notification

    db = SessionLocal()
    try:
        now_utc = datetime.utcnow()

        # Faol obunalar, to'lov sanasi o'tib ketgan
        overdue_subs = db.query(InstitutionSubscription).filter(
            InstitutionSubscription.status == SubscriptionStatus.ACTIVE,
            InstitutionSubscription.next_billing_date is not None,
            InstitutionSubscription.next_billing_date < now_utc,
        ).all()

        blocked_count = 0
        for sub in overdue_subs:
            # To'lov qabul qilinganmi? (next_billing_date dan keyin)
            if sub.payment_received_at:
                pr = sub.payment_received_at
                nb = sub.next_billing_date
                if pr >= nb:
                    # To'langan, bloklamaymiz
                    continue

            institution = db.query(Institution).filter(
                Institution.id == sub.institution_id
            ).first()
            if not institution:
                continue

            # Allaqachon bloklangan?
            if not institution.is_active:
                continue

            # Bloklash
            institution.is_active = False
            sub.status = SubscriptionStatus.EXPIRED
            sub.blocked_at = now_utc
            db.commit()
            blocked_count += 1

            inst_name = institution.name
            logger.warning(f"BLOKLANDI: {inst_name} (subscription_id={sub.id})")

            # SMS yuborish
            if sub.contact_phone:
                send_blocked_notification(
                    phone=sub.contact_phone,
                    institution_name=inst_name
                )

        logger.info(f"check_overdue_payments: {blocked_count} ta muassasa bloklandi")

    except Exception as e:
        logger.error(f"check_overdue_payments xatosi: {e}", exc_info=True)
        db.rollback()
    finally:
        db.close()


def start_billing_scheduler():
    """
    Billing schedulerni ishga tushirish.
    Har kuni soat 09:00 Toshkent vaqtida ishlaydi.
    """
    scheduler = BackgroundScheduler(timezone=TASHKENT_TZ)

    # 1-topshiriq: 1 kun oldin SMS eslatma
    scheduler.add_job(
        check_upcoming_payments,
        trigger="cron",
        hour=9,
        minute=0,
        id="billing_reminders",
        replace_existing=True,
    )

    # 2-topshiriq: Muddati o'tganlarni bloklash
    scheduler.add_job(
        check_overdue_payments,
        trigger="cron",
        hour=9,
        minute=5,
        id="billing_block_overdue",
        replace_existing=True,
    )

    scheduler.start()
    logger.info("Billing scheduler ishga tushirildi (har kuni 09:00 va 09:05 Toshkent)")
