from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy.orm import Session
import hmac
import httpx
import logging
import os
import re

from app.core.dependencies import get_db
from app.core.models.user import User
from app.core.models.parent_student import ParentStudent
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

# Basic request using httpx
async def send_telegram_request(method: str, data: dict):
    token = settings.TELEGRAM_BOT_TOKEN
    if not token:
        logger.error("Missing TELEGRAM_BOT_TOKEN in settings. Cannot send message to Telegram.")
        return None
    url = f"https://api.telegram.org/bot{token}/{method}"
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=data)
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"Error communicating with Telegram: {e}")
        return None

def normalize_phone(phone: str) -> str:
    """Strip everything except numbers and plus sign, ensure it matches +998... format"""
    if not phone:
        return ""
    clean = re.sub(r'[^\d+]', '', phone)
    if clean.startswith("998") and len(clean) == 12:
        return "+" + clean
    # Regional codes etc could be parsed here, but we'll stick to simple prepending if it's 9 digits.
    if len(clean) == 9 and not clean.startswith("+"):
        return "+998" + clean
    if not clean.startswith("+"):
        return "+" + clean
    return clean

from app.core.redis_client import get_redis_client

@router.post("/webhook")
async def telegram_webhook(request: Request, bg_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Receives updates from Telegram via webhook"""
    # Telegram echoes the secret given to setWebhook(secret_token=...) in this header
    expected = settings.TELEGRAM_WEBHOOK_SECRET
    received = request.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
    if not expected or not hmac.compare_digest(received, expected):
        raise HTTPException(status_code=403, detail="Forbidden")
    update = await request.json()
    return await process_telegram_update(update, db)

async def process_telegram_update(update: dict, db: Session):
    """Core logic to process a Telegram update (reused by webhook and poller)"""
    # Process only if there's a message
    if "message" not in update:
        return {"ok": True}
        
    message = update["message"]
    chat_id = message.get("chat", {}).get("id")
    
    if not chat_id:
        return {"ok": True}

    text = message.get("text", "")
    redis = get_redis_client()
    
    # 1. Handle /start command with optional payload (e.g., /start inst_5)
    if text.startswith("/start"):
        parts = text.split()
        if len(parts) > 1 and parts[1].startswith("inst_"):
            try:
                inst_id = int(parts[1].split("_")[1])
                # Save session in redis for 1 hour
                if redis:
                    redis.setex(f"tg_session:{chat_id}", 3600, inst_id)
                else:
                    logger.warning("Redis is not available. Telegram linking will not be isolated.")
            except (ValueError, IndexError):
                pass
                
        await send_telegram_request("sendMessage", {
            "chat_id": chat_id,
            "text": "EduComfort tizimiga xush kelibsiz! O'z farzandingizga oid ma'lumotlarni qabul qilish uchun telefon raqamingizni yuboring:",
            "reply_markup": {
                "keyboard": [
                    [{"text": "📱 Raqamni yuborish", "request_contact": True}]
                ],
                "resize_keyboard": True,
                "one_time_keyboard": True
            }
        })
        return {"ok": True}
        
    # 2. Handle Contact sharing
    if "contact" in message:
        contact = message["contact"]
        phone_number = contact.get("phone_number")
        if not phone_number:
            return {"ok": True}

        # Only accept the sender's own contact; a forwarded contact card would let
        # anyone subscribe to another parent's child notifications.
        sender_id = message.get("from", {}).get("id")
        if not sender_id or contact.get("user_id") != sender_id:
            await send_telegram_request("sendMessage", {
                "chat_id": chat_id,
                "text": "Iltimos, \"📱 Raqamni yuborish\" tugmasi orqali o'z raqamingizni yuboring.",
            })
            return {"ok": True}
            
        normalized_phone = normalize_phone(phone_number)
        logger.info(f"Received Telegram contact: {phone_number} -> {normalized_phone} for chat {chat_id}")
        
        # Determine institution scope
        inst_id = None
        if redis:
            val = redis.get(f"tg_session:{chat_id}")
            if val:
                inst_id = int(val)
                
        if redis and not inst_id:
            await send_telegram_request("sendMessage", {
                "chat_id": chat_id,
                "text": "Sessiya tugagan yoki noto'g'ri havola orqali kirdingiz. Iltimos, o'quv markazingiz taqdim etgan maxsus havola orqali qaytadan kiring.",
                "reply_markup": {"remove_keyboard": True}
            })
            return {"ok": True}

        # Secure DB search
        query = db.query(User).filter(User.role == "student", User.parent_phone_number.isnot(None), User.is_active == True)
        if inst_id:
            query = query.filter(User.institution_id == inst_id)
            
        students = query.all()
        matched_students = []
        for student in students:
            db_phone = normalize_phone(student.parent_phone_number)
            if db_phone == normalized_phone or db_phone.endswith(normalized_phone[-9:]):
                matched_students.append(student)
                
        if matched_students:
            for student in matched_students:
                student.parent_telegram_chat_id = str(chat_id)
            db.commit()
            
            names = [f"{s.first_name} {s.last_name or ''}".strip() for s in matched_students]
            success_text = f"Muvaffaqiyatli! Siz {', '.join(names)} uchun Telegram xabarnomalar qabul qilasiz."
            await send_telegram_request("sendMessage", {
                "chat_id": chat_id,
                "text": success_text,
                "reply_markup": {"remove_keyboard": True}
            })
        else:
            await send_telegram_request("sendMessage", {
                "chat_id": chat_id,
                "text": "Kechirasiz, ushbu telefon raqamga biriktirilgan o'quvchi bu o'quv markazidan topilmadi. Iltimos, telefon raqamingizni tekshiring.",
                "reply_markup": {"remove_keyboard": True}
            })
            
    return {"ok": True}

async def send_payment_reminder(db: Session, user_id: int):
    """
    Sends a payment reminder to the student or their parent via Telegram.
    Looks up links in ParentStudent table.
    """
    student = db.query(User).filter(User.id == user_id).first()
    if not student:
        logger.error(f"Student {user_id} not found for payment reminder.")
        return False
        
    # 1. Identify recipients
    # Check parent links
    parent_links = db.query(ParentStudent).filter(ParentStudent.student_id == user_id).all()
    chat_ids = set()
    
    for link in parent_links:
        parent = db.query(User).filter(User.id == link.parent_id).first()
        if parent and parent.parent_telegram_chat_id:
            chat_ids.add(parent.parent_telegram_chat_id)
            
    # Fallback to student's own chat_id if no parents found
    if not chat_ids and student.parent_telegram_chat_id:
        chat_ids.add(student.parent_telegram_chat_id)
        
    if not chat_ids:
        logger.warning(f"No Telegram chat ID found for student {user_id} or their parents.")
        return False
        
    # 2. Format message
    message_text = f"🚨 {student.first_name} {student.last_name or ''} uchun to'lov muddati keldi. Iltimos, o'z vaqtida to'lovni amalga oshiring."
    
    # 3. Send messages
    for cid in chat_ids:
        await send_telegram_request("sendMessage", {
            "chat_id": cid,
            "text": message_text
        })
        
    return True
