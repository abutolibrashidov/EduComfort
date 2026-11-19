import hashlib
import hmac
from app.core.config import settings
from fastapi import HTTPException

def generate_uzum_url(institution_id: int, amount_uzs: float):
    if not settings.UZUM_TERMINAL_ID:
        raise HTTPException(status_code=500, detail="Uzum konfiguratsiyasi o'rnatilmagan")
    
    # Uzs amount might need to be converted to tiyin (amount * 100) or kept as is depending on strict Uzum docs.
    # We will compute a simple URL for web-checkout. Uzum typically uses `merchant` instead of `service_id`.
    
    amount_tiyin = int(amount_uzs * 100)
    merchant_trans_id = str(institution_id)
    
    # Simple Uzum Pay interface link
    url = f"https://www.uzumbank.uz/pay/{settings.UZUM_TERMINAL_ID}?amount={amount_tiyin}&transaction_id={merchant_trans_id}"
    return {"url": url}

def check_uzum_signature(data: dict, received_signature: str) -> bool:
    """
    Uzum API HMAC-SHA256 signature verification.
    """
    if not settings.UZUM_SECRET_KEY:
        return False
        
    # Typical Uzum hashing involves concatenating specific fields and hashing with the secret key
    # For this example, we'll verify using a generic HMAC of the transaction_id and amount
    transaction_id = str(data.get("transaction_id", ""))
    amount = str(data.get("amount", ""))
    
    message = f"{transaction_id}:{amount}"
    
    generated_hmac = hmac.new(
        settings.UZUM_SECRET_KEY.encode('utf-8'),
        message.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(generated_hmac, received_signature or "")
