"""
Billing Router — Haqiqiy oylik obuna va hisob-kitob tizimi
Barcha xabarlar Uzbek tilida.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel

from app.core.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.institution import Institution
from app.models.subscription import InstitutionSubscription, SubscriptionPlan, SubscriptionStatus
from app.constants.roles import Role

router = APIRouter(prefix="/billing", tags=["Billing"])


# ──────────────────────────────────────────────────────────
# Yordamchi funksiyalar
# ──────────────────────────────────────────────────────────

def verify_platform_owner(current_user: User = Depends(get_current_user)):
    """Platforma egasi yoki Super Admin ekanligini tekshirish"""
    user_role = current_user.role
    if hasattr(user_role, "value"):
        user_role = user_role.value

    allowed_roles = [
        Role.PLATFORM_OWNER.value,
        Role.PLATFORM_OWNER,
        Role.SUPER_ADMIN.value,
        Role.SUPER_ADMIN,
        "platform_owner",
        "super_admin",
    ]

    if user_role not in allowed_roles:
        raise HTTPException(
            status_code=403,
            detail="Ruxsat berilmagan: Faqat Platforma Egasi uchun"
        )
    return current_user


# ──────────────────────────────────────────────────────────
# Pydantic sxemalar
# ──────────────────────────────────────────────────────────

class SubscribeRequest(BaseModel):
    plan: str
    monthly_price: float          # So'mda, masalan 200000
    contact_phone: str            # SMS uchun, masalan "+998901234567"
    billing_day: Optional[int] = None  # Oyning qaysi kunida, default: bugun


class RecordPaymentRequest(BaseModel):
    note: Optional[str] = None


# ──────────────────────────────────────────────────────────
# ENDPOINT'LAR
# ──────────────────────────────────────────────────────────

@router.get("/plans")
def get_plans():
    """Mavjud obuna rejalari"""
    return [
        {
            "id": "bronze",
            "name": "🥉 Bronza",
            "price_example": 100_000,
            "features": ["Boshqaruv tizimi"],
            "description": "Kichik o'quv markazlari uchun"
        },
        {
            "id": "silver",
            "name": "🥈 Kumush",
            "price_example": 200_000,
            "features": ["Boshqaruv", "Gamifikatsiya"],
            "description": "O'rta o'quv markazlari uchun"
        },
        {
            "id": "gold",
            "name": "🥇 Oltin",
            "price_example": 500_000,
            "features": ["Barcha imkoniyatlar", "Bozor", "Ustuvor yordam"],
            "description": "Yirik o'quv markazlari uchun"
        },
    ]


@router.get("/subscriptions")
def get_all_subscriptions(
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_platform_owner),
):
    """Barcha muassasalar obunasini ko'rish (Platforma egasi)"""
    subscriptions = db.query(InstitutionSubscription).all()
    result = []
    for sub in subscriptions:
        inst = db.query(Institution).filter(Institution.id == sub.institution_id).first()
        if inst:
            result.append({
                "institution_id": inst.id,
                "institution_name": inst.name,
                "is_active": inst.is_active,
                "plan": sub.plan,
                "status": sub.status,
                "monthly_price": sub.monthly_price,
                "contact_phone": sub.contact_phone,
                "start_date": sub.start_date,
                "next_billing_date": sub.next_billing_date,
                "payment_received_at": sub.payment_received_at,
                "last_notified_at": sub.last_notified_at,
                "blocked_at": sub.blocked_at,
                "auto_renew": sub.auto_renew,
            })
    return result


@router.post("/institutions/{institution_id}/subscribe")
def assign_subscription(
    institution_id: int,
    body: SubscribeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_platform_owner),
):
    """
    Muassasaga obuna tayinlash (yoki yangilash).
    To'lov sanasi, narxi va SMS raqami belgilanadi.
    """
    # Plan tekshirish
    try:
        plan_enum = SubscriptionPlan(body.plan.lower())
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Noto'g'ri reja. Qabul qilinadiganlar: bronze, silver, gold"
        )

    # Muassasa mavjudligini tekshirish
    inst = db.query(Institution).filter(Institution.id == institution_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Muassasa topilmadi")

    now = datetime.utcnow()

    # Keyingi to'lov sanasi hisoblash
    if body.billing_day:
        # Kelasi oyning belgilangan kuniga
        target_day = min(body.billing_day, 28)
        next_month = now.replace(day=1) + timedelta(days=32)
        next_billing = next_month.replace(day=target_day)
    else:
        next_billing = now + timedelta(days=30)

    sub = db.query(InstitutionSubscription).filter(
        InstitutionSubscription.institution_id == institution_id
    ).first()

    if sub:
        sub.plan = plan_enum
        sub.status = SubscriptionStatus.ACTIVE
        sub.monthly_price = body.monthly_price
        sub.contact_phone = body.contact_phone
        sub.next_billing_date = next_billing
        sub.blocked_at = None
    else:
        sub = InstitutionSubscription(
            institution_id=institution_id,
            plan=plan_enum,
            status=SubscriptionStatus.ACTIVE,
            monthly_price=body.monthly_price,
            contact_phone=body.contact_phone,
            start_date=now,
            next_billing_date=next_billing,
        )
        db.add(sub)

    # Muassasani faollashtirish (agar bloklangan bo'lsa)
    inst.is_active = True
    db.commit()

    return {
        "xabar": f"'{inst.name}' muassasasiga {plan_enum.value} rejasi tayinlandi",
        "institution_id": inst.id,
        "plan": plan_enum,
        "monthly_price": body.monthly_price,
        "next_billing_date": next_billing.strftime("%d.%m.%Y"),
    }


@router.post("/institutions/{institution_id}/record-payment")
def record_payment(
    institution_id: int,
    body: RecordPaymentRequest = RecordPaymentRequest(),
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_platform_owner),
):
    """
    To'lov qabul qilindi deb belgilash.
    Keyingi to'lov sanasi +30 kun bo'ladi, muassasa faollashtiriladi.
    """
    from app.services.sms_service import send_payment_confirmed

    sub = db.query(InstitutionSubscription).filter(
        InstitutionSubscription.institution_id == institution_id
    ).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Bu muassasaning obunasi topilmadi")

    inst = db.query(Institution).filter(Institution.id == institution_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Muassasa topilmadi")

    now = datetime.utcnow()
    next_billing = now + timedelta(days=30)

    sub.payment_received_at = now
    sub.next_billing_date = next_billing
    sub.status = SubscriptionStatus.ACTIVE
    sub.blocked_at = None

    # Muassasani faollashtirish
    inst.is_active = True
    db.commit()

    # SMS yuborish
    if sub.contact_phone:
        send_payment_confirmed(
            phone=sub.contact_phone,
            institution_name=inst.name,
            amount=sub.monthly_price or 0,
            next_date=next_billing.strftime("%d.%m.%Y"),
        )

    return {
        "xabar": f"'{inst.name}' muassasasining to'lovi qabul qilindi",
        "payment_received_at": now.isoformat(),
        "next_billing_date": next_billing.strftime("%d.%m.%Y"),
        "sms_yuborildi": bool(sub.contact_phone),
    }


@router.post("/institutions/{institution_id}/unblock")
def unblock_institution(
    institution_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_platform_owner),
):
    """
    Muassasani qo'lda faollashtirish (blokni olib tashlash).
    To'lov shart emas — platforma egasi qaror qiladi.
    """
    from app.services.sms_service import send_unblocked_notification

    inst = db.query(Institution).filter(Institution.id == institution_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Muassasa topilmadi")

    sub = db.query(InstitutionSubscription).filter(
        InstitutionSubscription.institution_id == institution_id
    ).first()

    inst.is_active = True

    if sub:
        sub.status = SubscriptionStatus.ACTIVE
        sub.blocked_at = None

    db.commit()

    # SMS yuborish
    if sub and sub.contact_phone:
        send_unblocked_notification(
            phone=sub.contact_phone,
            institution_name=inst.name
        )

    return {
        "xabar": f"'{inst.name}' muassasasi muvaffaqiyatli faollashtirildi",
        "sms_yuborildi": bool(sub and sub.contact_phone),
    }


@router.post("/institutions/{institution_id}/block")
def manual_block_institution(
    institution_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_platform_owner),
):
    """Muassasani qo'lda bloklash"""
    from app.services.sms_service import send_blocked_notification

    inst = db.query(Institution).filter(Institution.id == institution_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Muassasa topilmadi")

    sub = db.query(InstitutionSubscription).filter(
        InstitutionSubscription.institution_id == institution_id
    ).first()

    inst.is_active = False
    now = datetime.utcnow()

    if sub:
        sub.status = SubscriptionStatus.EXPIRED
        sub.blocked_at = now

    db.commit()

    if sub and sub.contact_phone:
        send_blocked_notification(
            phone=sub.contact_phone,
            institution_name=inst.name
        )

    return {"xabar": f"'{inst.name}' muassasasi bloklandi"}


@router.get("/my-subscription")
def get_my_subscription(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Muassasa admini o'z obuna holatini ko'radi.
    """
    if not current_user.institution_id:
        raise HTTPException(status_code=400, detail="Siz biron muassasaga biriktirilmagansiz")

    sub = db.query(InstitutionSubscription).filter(
        InstitutionSubscription.institution_id == current_user.institution_id
    ).first()

    inst = db.query(Institution).filter(
        Institution.id == current_user.institution_id
    ).first()

    if not sub:
        return {
            "holat": "Obuna topilmadi",
            "is_active": inst.is_active if inst else False,
        }

    now = datetime.utcnow()
    days_left = None
    if sub.next_billing_date:
        delta = sub.next_billing_date - now
        days_left = max(0, delta.days)

    return {
        "muassasa_nomi": inst.name if inst else "",
        "reja": sub.plan,
        "holat": sub.status,
        "is_active": inst.is_active if inst else False,
        "oylik_narx": sub.monthly_price,
        "keyingi_tolov": sub.next_billing_date.strftime("%d.%m.%Y") if sub.next_billing_date else None,
        "qolgan_kunlar": days_left,
        "oxirgi_tolov": sub.payment_received_at.strftime("%d.%m.%Y") if sub.payment_received_at else None,
        "bloklangan_vaqt": sub.blocked_at.strftime("%d.%m.%Y %H:%M") if sub.blocked_at else None,
    }


@router.post("/institutions/{institution_id}/send-test-sms")
def send_test_sms(
    institution_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_platform_owner),
):
    """Test SMS yuborish (Eskiz integratsiyasini tekshirish uchun)"""
    from app.services.sms_service import send_sms

    sub = db.query(InstitutionSubscription).filter(
        InstitutionSubscription.institution_id == institution_id
    ).first()
    inst = db.query(Institution).filter(Institution.id == institution_id).first()

    if not inst:
        raise HTTPException(status_code=404, detail="Muassasa topilmadi")

    phone = sub.contact_phone if sub else None
    if not phone:
        raise HTTPException(
            status_code=400,
            detail="Ushbu muassasaning SMS raqami belgilanmagan. Avval obuna tayinlang."
        )

    success = send_sms(
        phone=phone,
        message=f"EduComfort: Bu test SMS xabari. Muassasa: {inst.name}. Tizim ishlayapti ✅"
    )

    return {
        "muvaffaqiyat": success,
        "telefon": phone,
        "xabar": "SMS yuborildi" if success else "SMS yuborishda xato (loglarga qarang)"
    }

# ──────────────────────────────────────────────────────────
# CLICK INTEGRATION
# ──────────────────────────────────────────────────────────

from fastapi import Request
from app.core.config import settings
from app.services.click_service import generate_click_url, check_click_signature

@router.post("/institutions/{institution_id}/create-click-link")
def create_click_link(
    institution_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Click to'lov havolasini generatsiya qilish.
    """
    sub = db.query(InstitutionSubscription).filter(
        InstitutionSubscription.institution_id == institution_id
    ).first()
    
    if not sub:
        raise HTTPException(status_code=404, detail="Ushbu muassasaga obuna tayinlanmagan. Avval reja tanlang.")

    price_uzs = sub.monthly_price or 0
    if price_uzs <= 0:
        raise HTTPException(status_code=400, detail="Obuna narxi 0 dan katta bo'lishi kerak")

    # Call click_service
    result = generate_click_url(
        institution_id=institution_id,
        amount_uzs=price_uzs
    )
    return result

@router.post("/click-webhook")
async def click_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Click dagi to'lov hodisalarini (Prepare, Complete) qabul qiluvchi Webhook.
    """
    try:
        data = await request.form()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid form data")
        
    data_dict = dict(data)
    
    # Valida signature
    is_valid = check_click_signature(data_dict)
    
    # Note: A proper implementation would return specific Click error codes (e.g., {"error": -1, "error_note": ...}).
    # For brevity in this implementation, we return basic FastAPI HTTP exceptions if invalid.
    
    if not is_valid:
        return {
            "error": -1,
            "error_note": "Sign check error"
        }
        
    action = int(data_dict.get("action", 0))
    institution_id_str = data_dict.get("merchant_trans_id", "0")
    
    try:
        institution_id = int(institution_id_str)
    except:
        return {"error": -5, "error_note": "User does not exist"}

    # Prepare (action=0)
    if action == 0:
        # Tekshirish
        sub = db.query(InstitutionSubscription).filter(
            InstitutionSubscription.institution_id == institution_id
        ).first()
        inst = db.query(Institution).filter(Institution.id == institution_id).first()
        
        if not sub or not inst:
            return {"error": -5, "error_note": "User does not exist"}
            
        if float(data_dict.get("amount", 0)) != float(sub.monthly_price or 0):
            return {"error": -2, "error_note": "Incorrect parameter amount"}
            
        return {
            "click_trans_id": data_dict.get("click_trans_id"),
            "merchant_trans_id": institution_id_str,
            "merchant_prepare_id": data_dict.get("click_trans_id"), # Simply mapping for this example
            "error": 0,
            "error_note": "Success"
        }
    
    # Complete (action=1)
    elif action == 1:
        # Obunani avtomat uzaytirish
        sub = db.query(InstitutionSubscription).filter(
            InstitutionSubscription.institution_id == institution_id
        ).first()
        inst = db.query(Institution).filter(Institution.id == institution_id).first()
        
        if not sub or not inst:
            return {"error": -5, "error_note": "User does not exist"}
            
        now = datetime.utcnow()
        next_billing = now + timedelta(days=30)
        
        sub.payment_received_at = now
        sub.next_billing_date = next_billing
        sub.status = SubscriptionStatus.ACTIVE
        sub.blocked_at = None
        
        inst.is_active = True
        db.commit()

        # SMS yuborish
        from app.services.sms_service import send_payment_confirmed
        if sub.contact_phone:
            send_payment_confirmed(
                phone=sub.contact_phone,
                institution_name=inst.name,
                amount=sub.monthly_price or 0,
                next_date=next_billing.strftime("%d.%m.%Y"),
            )
            
        return {
            "click_trans_id": data_dict.get("click_trans_id"),
            "merchant_trans_id": institution_id_str,
            "merchant_confirm_id": data_dict.get("click_trans_id"),
            "error": 0,
            "error_note": "Success"
        }
        
    return {"error": -3, "error_note": "Action not found"}


# ──────────────────────────────────────────────────────────
# UZUM PAY INTEGRATION
# ──────────────────────────────────────────────────────────

from app.services.uzum_service import generate_uzum_url, check_uzum_signature

@router.post("/institutions/{institution_id}/create-uzum-link")
def create_uzum_link(
    institution_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Uzum Pay to'lov havolasini generatsiya qilish.
    """
    sub = db.query(InstitutionSubscription).filter(
        InstitutionSubscription.institution_id == institution_id
    ).first()
    
    if not sub:
        raise HTTPException(status_code=404, detail="Ushbu muassasaga obuna tayinlanmagan.")

    price_uzs = sub.monthly_price or 0
    if price_uzs <= 0:
        raise HTTPException(status_code=400, detail="Obuna narxi noldan katta bo'lishi kerak")

    result = generate_uzum_url(
        institution_id=institution_id,
        amount_uzs=price_uzs
    )
    return result

@router.post("/uzum-webhook")
async def uzum_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Uzum API to'lov tasdiqlash webxo'ngi.
    """
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="JSON parse error")
        
    # Signature verification (assuming passed in headers or body depending on exact integration)
    signature = request.headers.get("X-Uzum-Signature", "")
    
    is_valid = check_uzum_signature(data, signature)
    
    if not is_valid:
        raise HTTPException(status_code=403, detail="Invalid signature")
        
    # "transaction_id" here was set to our institution_id in generate_uzum_url
    institution_id_str = str(data.get("transaction_id", "0"))
    
    try:
        institution_id = int(institution_id_str)
    except:
        return {"status": "error", "message": "Invalid transaction ID"}

    # Process Successful Payment
    status_field = data.get("status")
    
    if status_field == "COMPLETED":
        sub = db.query(InstitutionSubscription).filter(
            InstitutionSubscription.institution_id == institution_id
        ).first()
        inst = db.query(Institution).filter(Institution.id == institution_id).first()
        
        if not sub or not inst:
            return {"status": "error", "message": "Institution not found"}
            
        now = datetime.utcnow()
        next_billing = now + timedelta(days=30)
        
        sub.payment_received_at = now
        sub.next_billing_date = next_billing
        sub.status = SubscriptionStatus.ACTIVE
        sub.blocked_at = None
        
        inst.is_active = True
        db.commit()

        # O'zbekistonda SMS jo'natish
        from app.services.sms_service import send_payment_confirmed
        if sub.contact_phone:
            send_payment_confirmed(
                phone=sub.contact_phone,
                institution_name=inst.name,
                amount=sub.monthly_price or 0,
                next_date=next_billing.strftime("%d.%m.%Y"),
            )
            
        return {"status": "success", "message": "Payment recorded"}
    
    return {"status": "ignored", "message": "Status not completed"}
