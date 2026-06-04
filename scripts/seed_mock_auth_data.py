"""
Seed mock staff accounts for local auth testing.

⚠️  SECURITY WARNING ⚠️
This script contains hardcoded passwords for testing purposes ONLY.
DO NOT run this script in staging or production environments.
DO NOT include this file in Docker containers or CI/CD pipelines.
The passwords below should be replaced with environment-specific values.

Run from repo root:

    python scripts/seed_mock_auth_data.py

This script is idempotent. It will create or update two staff users:
- admin.mock@vinuni.edu.vn
- counselor.mock@vinuni.edu.vn
"""

from pathlib import Path
import sys
import os

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

load_dotenv(ROOT_DIR / ".env")

from src.core.security import hash_password
from src.db.session import SessionLocal
from src.models.enums import StaffRole
from src.models.staff import Staff


def _get_password(env_var: str) -> str:
    """Get password from environment variable. Required - no fallback."""
    password = os.environ.get(env_var, "").strip()
    if not password:
        raise ValueError(
            f"ERROR: {env_var} environment variable is required.\n"
            "Set this environment variable before running the script."
        )
    return password


# Passwords MUST be set via environment variables
ADMIN_PASSWORD = _get_password("MOCK_ADMIN_PASSWORD")
COUNSELOR_PASSWORD = _get_password("MOCK_COUNSELOR_PASSWORD")

MOCK_STAFF_USERS = [
    {
        "name": "Mock Admin",
        "email": "admin.mock@vinuni.edu.vn",
        "password": ADMIN_PASSWORD,
        "role": StaffRole.ADMIN,
    },
    {
        "name": "Mock Counselor",
        "email": "counselor.mock@vinuni.edu.vn",
        "password": COUNSELOR_PASSWORD,
        "role": StaffRole.COUNSELOR,
    },
]


def upsert_staff(db, *, name: str, email: str, password: str, role: StaffRole) -> Staff:
    staff = db.query(Staff).filter(Staff.email == email).first()
    hashed_password = hash_password(password)

    if staff:
        staff.name = name
        staff.password = hashed_password
        staff.role = role
        staff.is_active = True
    else:
        staff = Staff(
            name=name,
            email=email,
            password=hashed_password,
            role=role,
            is_active=True,
        )
        db.add(staff)

    db.commit()
    db.refresh(staff)
    return staff


def main() -> None:
    db = SessionLocal()
    try:
        print("Seeding mock auth data...")
        for user in MOCK_STAFF_USERS:
            staff = upsert_staff(db, **user)
            print(f"- {staff.email} [{staff.role}]")
        print("Done.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
