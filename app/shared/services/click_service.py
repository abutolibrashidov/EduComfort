import hashlib
from app.core.config import settings
from fastapi import HTTPException
from pydantic import BaseModel

class ClickPrepareRequest(BaseModel):
    click_trans_id: int
    service_id: int
    click_paydoc_id: int
    merchant_trans_id: str
    amount: float
    action: int
    error: int
    error_note: str
    sign_time: str
    sign_string: str

class ClickCompleteRequest(BaseModel):
    click_trans_id: int
    service_id: int
    click_paydoc_id: int
    merchant_trans_id: str
    merchant_prepare_id: int
    amount: float
    action: int
    error: int
    error_note: str
    sign_time: str
    sign_string: str

def generate_click_url(institution_id: int, amount_uzs: float):
    if not settings.CLICK_MERCHANT_ID or not settings.CLICK_SERVICE_ID:
        raise HTTPException(status_code=500, detail="Click konfiguratsiyasi o'rnatilmagan")
    
    # Simple transaction ID could be institution_id + timestamp, or just institution_id for simpler logic since one at a time.
    # We will use institution_id directly for now.
    merchant_trans_id = str(institution_id)
    url = f"https://my.click.uz/services/pay?service_id={settings.CLICK_SERVICE_ID}&merchant_id={settings.CLICK_MERCHANT_ID}&amount={amount_uzs}&transaction_param={merchant_trans_id}"
    return {"url": url}

def check_click_signature(data: dict) -> bool:
    """
    sign_string = MD5(click_trans_id + service_id + secret_key + merchant_trans_id + amount + action + sign_time)
    """
    if not settings.CLICK_SECRET_KEY:
        return False
        
    # The order MUST BE exact as Click docs specify:
    # 1: click_trans_id, 2: service_id, 3: secret_key, 4: merchant_trans_id, 
    # 5: merchant_prepare_id (ONLY for Complete req), 6: amount, 7: action, 8: sign_time
    
    sign_part1 = f"{data.get('click_trans_id', '')}{data.get('service_id', '')}{settings.CLICK_SECRET_KEY}{data.get('merchant_trans_id', '')}"
    
    if int(data.get('action', 0)) == 1: # Complete req
        sign_part1 += f"{data.get('merchant_prepare_id', '')}"
        
    sign_string_raw = f"{sign_part1}{data.get('amount', '')}{data.get('action', '')}{data.get('sign_time', '')}"
    
    generated_md5 = hashlib.md5(sign_string_raw.encode('utf-8')).hexdigest()
    
    return generated_md5 == data.get('sign_string', '')
