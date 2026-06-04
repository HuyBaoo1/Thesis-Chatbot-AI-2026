from __future__ import annotations

import uuid
from pathlib import Path

from src.core.config import settings


LOCAL_PREFIX = "local://"


def _base_dir() -> Path:
    path = Path(settings.OCR_TEMP_DIR).expanduser()
    path.mkdir(parents=True, exist_ok=True)
    return path


def save_temp_file(*, file_bytes: bytes, file_name: str, folder: str) -> str:
    if not file_bytes:
        raise ValueError("file_bytes is empty")

    suffix = Path(file_name).suffix.lower()
    directory = _base_dir() / folder
    directory.mkdir(parents=True, exist_ok=True)
    temp_path = directory / f"{uuid.uuid4().hex}{suffix}"
    temp_path.write_bytes(file_bytes)
    return to_local_reference(temp_path)


def read_bytes(reference: str) -> bytes:
    return resolve_local_reference(reference).read_bytes()


def read_text(reference: str) -> str:
    return resolve_local_reference(reference).read_text(encoding="utf-8")


def delete_temp_file(reference: str | None) -> None:
    if not reference or not is_local_reference(reference):
        return
    path = resolve_local_reference(reference)
    if path.exists():
        path.unlink()


def is_local_reference(reference: str | None) -> bool:
    return bool(reference and reference.startswith(LOCAL_PREFIX))


def to_local_reference(path: Path | str) -> str:
    return f"{LOCAL_PREFIX}{Path(path).resolve()}"


def resolve_local_reference(reference: str) -> Path:
    if not is_local_reference(reference):
        raise ValueError(f"Not a local OCR temp reference: {reference}")
    return Path(reference[len(LOCAL_PREFIX):])
