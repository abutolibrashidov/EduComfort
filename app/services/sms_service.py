"""
Eskiz SMS Service — O'zbekiston uchun SMS yuborish xizmati
https://notify.eskiz.uz

Ishlatish:
    from app.services.sms_service import send_sms
    success = send_sms("+998901234567", "Xabar matni")
"""
import httpx
import logging
from typing import Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

ESKIZ_AUTH_URL = "https://notify.eskiz.uz/api/auth/login"
ESKIZ_SEND_URL = "https://notify.eskiz.uz/api/message/sms/send"

# Token cache (xotira ichida — production'da Redis ishlatish tavsiya etiladi)
_token_cache: dict = {"token": None}


def _get_token() -> Optional[str]:
    """Eskiz'dan JWT token olish"""
    email = settings.ESKIZ_EMAIL
    password = settings.ESKIZ_PASSWORD
    
    if not email or not password:
        logger.warning("ESKIZ_EMAIL yoki ESKIZ_PASSWORD sozlanmagan — SMS yuborilmaydi")
        return None
    
    try:
        resp = httpx.post(
            ESKIZ_AUTH_URL,
            data={"email": email, "password": password},
            timeout=10.0
        )
        resp.raise_for_status()
        data = resp.json()
        token = data.get("data", {}).get("token")
        if token:
            _token_cache["token"] = token
            logger.info("Eskiz SMS: token muvaffaqiyatli olindi")
        return token
    except Exception as e:
        logger.error(f"Eskiz token olishda xato: {e}")
        return None


def send_sms(phone: str, message: str) -> bool:
    """
    Eskiz orqali SMS yuborish.
    
    Args:
        phone:   Telefon raqami, masalan "+998901234567" yoki "998901234567"
        message: SMS matni (Uzbek tilida)
    
    Returns:
        True — muvaffaqiyatli, False — xato
    """
    if not phone:
        logger.warning("Telefon raqami ko'rsatilmagan — SMS yuborilmaydi")
        return False
    
    # Raqamni normallashtirish
    phone = phone.strip().replace(" ", "").replace("-", "")
    if phone.startswith("+"):
        phone = phone[1:]
    
    # Token olish
    token = _token_cache.get("token") or _get_token()
    if not token:
        logger.warning("Eskiz token yo'q — SMS simulyatsiya qilinadi (dev mode)")
        logger.info(f"[DEV SMS] → {phone}: {message}")
        return True  # Development'da "muvaffaqiyatli" deb qaytaramiz
    
    try:
        resp = httpx.post(
            ESKIZ_SEND_URL,
            headers={"Authorization": f"Bearer {token}"},
            data={
                "mobile_phone": phone,
                "message": message,
                "from": "4546",   # Eskiz standart sender ID
                "callback_url": ""
            },
            timeout=15.0
        )
        
        # Token eskirgan bo'lsa, yangilash
        if resp.status_code == 401:
            logger.info("Eskiz token eskirgan, yangilanmoqda...")
            token = _get_token()
            if not token:
                return False
            resp = httpx.post(
                ESKIZ_SEND_URL,
                headers={"Authorization": f"Bearer {token}"},
                data={
                    "mobile_phone": phone,
                    "message": message,
                    "from": "4546",
                    "callback_url": ""
                },
                timeout=15.0
            )
        
        resp.raise_for_status()
        result = resp.json()
        status_val = result.get("status", "")
        
        if status_val == "waiting":
            logger.info(f"SMS yuborildi → {phone}")
            return True
        else:
            logger.warning(f"Eskiz noma'lum holat qaytardi: {result}")
            return False
            
    except httpx.HTTPStatusError as e:
        logger.error(f"Eskiz HTTP xatosi ({e.response.status_code}): {e.response.text}")
        # Token eskirgan bo'lishi mumkin — tozalaymiz
        _token_cache["token"] = None
        return False
    except Exception as e:
        logger.error(f"SMS yuborishda xato: {e}")
        return False


# ──────────────────────────────────────────────────────────
# Tayyor xabar shablonlari (Uzbek tilida)
# ──────────────────────────────────────────────────────────

def send_payment_reminder(phone: str, institution_name: str, amount: float, due_date: str) -> bool:
    """1 kun oldin eslatma SMS"""
    message = (
        f"EduComfort: Hurmatli {institution_name}, "
        f"ertaga {due_date} sanasida oylik obuna to'lovi muddati tugaydi. "
        f"To'lov miqdori: {int(amount):,} so'm. "
        f"To'lovni o'z vaqtida amalga oshiring, aks holda tizim avtomatik bloklanadi. "
        f"Muammo bo'lsa: support@educomfort.uz"
    )
    return send_sms(phone, message)


def send_blocked_notification(phone: str, institution_name: str) -> bool:
    """Bloklash haqida SMS"""
    message = (
        f"EduComfort: Hurmatli {institution_name}, "
        f"oylik to'lov amalga oshirilmagani sababli tizimingiz vaqtincha bloklandi. "
        f"To'lovdan so'ng platforma egasiga murojaat qiling: support@educomfort.uz"
    )
    return send_sms(phone, message)


def send_unblocked_notification(phone: str, institution_name: str) -> bool:
    """Blok olib tashlanganligi haqida SMS"""
    message = (
        f"EduComfort: Hurmatli {institution_name}, "
        f"tizimingiz muvaffaqiyatli faollashtirildi. "
        f"EduComfort platformasidan foydalanishingiz mumkin. Rahmat!"
    )
    return send_sms(phone, message)


def send_payment_confirmed(phone: str, institution_name: str, amount: float, next_date: str) -> bool:
    """To'lov tasdiqlanganda SMS"""
    message = (
        f"EduComfort: Hurmatli {institution_name}, "
        f"{int(amount):,} so'mlik to'lovingiz qabul qilindi. "
        f"Keyingi to'lov sanasi: {next_date}. Rahmat!"
    )
    return send_sms(phone, message)
