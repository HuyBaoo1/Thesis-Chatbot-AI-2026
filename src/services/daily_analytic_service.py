from datetime import datetime
from zoneinfo import ZoneInfo

from src.models.daily_analytic import DailyAnalytic


APP_TIMEZONE = ZoneInfo("Asia/Ho_Chi_Minh")


def _get_or_create_today(db, *, auto_commit: bool = True) -> DailyAnalytic:
    today = datetime.now(APP_TIMEZONE).date()
    item = db.query(DailyAnalytic).filter(DailyAnalytic.date == today).first()
    if item:
        return item
    item = DailyAnalytic(date=today, total_chats=0, new_leads=0, fallbacks=0, top_intents={})
    db.add(item)
    if auto_commit:
        db.commit()
        db.refresh(item)
    else:
        db.flush()
    return item


def increment_total_chats(db, amount: int = 1, auto_commit: bool = True) -> DailyAnalytic:
    item = _get_or_create_today(db, auto_commit=auto_commit)
    item.total_chats = (item.total_chats or 0) + amount
    if auto_commit:
        db.commit()
        db.refresh(item)
    else:
        db.flush()
    return item


def increment_new_leads(db, amount: int = 1, auto_commit: bool = True) -> DailyAnalytic:
    item = _get_or_create_today(db, auto_commit=auto_commit)
    item.new_leads = (item.new_leads or 0) + amount
    if auto_commit:
        db.commit()
        db.refresh(item)
    else:
        db.flush()
    return item


def increment_fallbacks(db, amount: int = 1, auto_commit: bool = True) -> DailyAnalytic:
    item = _get_or_create_today(db, auto_commit=auto_commit)
    item.fallbacks = (item.fallbacks or 0) + amount
    if auto_commit:
        db.commit()
        db.refresh(item)
    else:
        db.flush()
    return item


def track_intent(db, intent: str, auto_commit: bool = True) -> DailyAnalytic:
    item = _get_or_create_today(db, auto_commit=auto_commit)
    top_intents = dict(item.top_intents or {})
    top_intents[intent] = int(top_intents.get(intent, 0)) + 1
    item.top_intents = top_intents
    if auto_commit:
        db.commit()
        db.refresh(item)
    else:
        db.flush()
    return item
