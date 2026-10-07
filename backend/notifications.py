from sqlalchemy.orm import Session
import models


def create_notification(db: Session, user_id: str, deal_id: str, notification_type: str, message: str):
    notif = models.Notification(
        user_id=user_id,
        deal_id=deal_id,
        notification_type=notification_type,
        message=message,
    )
    db.add(notif)
