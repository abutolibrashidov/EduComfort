from sqlalchemy.orm import Session
from datetime import datetime
from app.engagement.models.messaging import Message


def send_message(db: Session, sender_id: int, receiver_id: int, content: str) -> Message:
    msg = Message(sender_id=sender_id, receiver_id=receiver_id, content=content, sent_at=datetime.utcnow(), is_read=False)
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


def get_inbox(db: Session, user_id: int) -> list[Message]:
    return db.query(Message).filter(Message.receiver_id == user_id).order_by(Message.sent_at.desc()).all()


def mark_as_read(db: Session, message: Message) -> Message:
    message.is_read = True
    message.read_at = datetime.utcnow()
    db.commit()
    db.refresh(message)
    return message
