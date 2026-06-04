import logging

from sqlalchemy.exc import IntegrityError

from src.core.config import settings
from src.core.security import hash_password
from src.db.session import SessionLocal
from src.models.enums import StaffRole
from src.models.staff import Staff

logger = logging.getLogger(__name__)


def ensure_default_admin() -> Staff | None:
    if not settings.BOOTSTRAP_ADMIN_ENABLED:
        logger.info("Bootstrap admin is disabled")
        return None

    if not settings.BOOTSTRAP_ADMIN_EMAIL or not settings.BOOTSTRAP_ADMIN_PASSWORD:
        logger.error(
            "Bootstrap admin is enabled but BOOTSTRAP_ADMIN_EMAIL or "
            "BOOTSTRAP_ADMIN_PASSWORD is not configured"
        )
        return None

    db = SessionLocal()
    try:
        existing_admin = db.query(Staff).filter(Staff.role == StaffRole.ADMIN).first()
        if existing_admin:
            logger.info("Admin bootstrap skipped because an admin account already exists")
            return existing_admin

        existing_staff = (
            db.query(Staff)
            .filter(Staff.email == settings.BOOTSTRAP_ADMIN_EMAIL)
            .first()
        )
        if existing_staff:
            existing_staff.name = settings.BOOTSTRAP_ADMIN_NAME
            existing_staff.password = hash_password(settings.BOOTSTRAP_ADMIN_PASSWORD)
            existing_staff.role = StaffRole.ADMIN
            existing_staff.is_active = True
            db.commit()
            db.refresh(existing_staff)
            logger.warning(
                "Promoted existing staff account to initial admin with email=%s.",
                existing_staff.email,
            )
            return existing_staff

        admin = Staff(
            name=settings.BOOTSTRAP_ADMIN_NAME,
            email=settings.BOOTSTRAP_ADMIN_EMAIL,
            password=hash_password(settings.BOOTSTRAP_ADMIN_PASSWORD),
            role=StaffRole.ADMIN,
            is_active=True,
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)

        logger.warning(
            "Bootstrapped initial admin account with email=%s. Change the password after first login.",
            admin.email,
        )
        return admin
    except IntegrityError:
        db.rollback()
        logger.info("Admin bootstrap raced with another startup worker; reloading existing admin")
        return db.query(Staff).filter(Staff.role == StaffRole.ADMIN).first()
    finally:
        db.close()
