import mimetypes
import uuid

from src.core.config import settings
from src.integrations.r2_client import get_r2_client
from src.services.ocr_temp_storage import (
    delete_temp_file,
    is_local_reference,
    read_bytes,
    resolve_local_reference,
    save_temp_file,
)

PRESIGNED_URL_EXPIRATION = 3600  # 1 hour


def _is_placeholder(value: str | None) -> bool:
    if value is None:
        return True
    normalized = value.strip()
    if not normalized:
        return True
    lowered = normalized.lower()
    placeholder_values = {
        "...",
        "data_required",
        "your-r2-account-id",
        "your-r2-access-key-id",
        "your-r2-secret-access-key",
    }
    return (
        lowered in placeholder_values
        or normalized.startswith("<")
        or normalized.endswith(">")
    )


def is_r2_configured() -> bool:
    return not any(
        _is_placeholder(value)
        for value in (
            settings.R2_ACCOUNT_ID,
            settings.R2_ACCESS_KEY_ID,
            settings.R2_SECRET_ACCESS_KEY,
            settings.R2_BUCKET_NAME,
            settings.R2_PUBLIC_BASE_URL,
        )
    )

def upload_file_bytes(
    file_bytes: bytes,
    file_name: str,
    folder: str = "knowledge-chunks",
    content_type: str | None = None,
    object_key: str | None = None,
) -> dict:
    if not file_bytes:
        raise ValueError("file_bytes is empty")

    ext = ""
    if "." in file_name:
        ext = "." + file_name.rsplit(".", 1)[-1].lower()

    object_key = object_key or f"{folder}/{uuid.uuid4().hex}{ext}"
    detected_content_type = content_type or mimetypes.guess_type(file_name)[0] or "application/octet-stream"

    if not is_r2_configured():
        local_ref = save_temp_file(
            file_bytes=file_bytes,
            file_name=file_name,
            folder=folder,
        )
        return {
            "key": local_ref,
            "url": local_ref,
            "content_type": detected_content_type,
            "size": len(file_bytes),
        }

    client = get_r2_client()
    client.put_object(
        Bucket=settings.R2_BUCKET_NAME,
        Key=object_key,
        Body=file_bytes,
        ContentType=detected_content_type,
    )

    public_url = f"{settings.R2_PUBLIC_BASE_URL.rstrip('/')}/{object_key}"
    return {
        "key": object_key,
        "url": public_url,
        "content_type": detected_content_type,
        "size": len(file_bytes),
    }

def object_exists(object_key: str) -> bool:
    if is_local_reference(object_key):
        return resolve_local_reference(object_key).exists()
    if not is_r2_configured():
        return False
    client = get_r2_client()
    try:
        client.head_object(Bucket=settings.R2_BUCKET_NAME, Key=object_key)
        return True
    except Exception:
        return False

def download_file_bytes(object_key: str) -> bytes:
    if is_local_reference(object_key):
        return read_bytes(object_key)
    client = get_r2_client()
    response = client.get_object(Bucket=settings.R2_BUCKET_NAME, Key=object_key)
    return response["Body"].read()

def generate_presigned_url(object_key: str, expiration: int = PRESIGNED_URL_EXPIRATION) -> str:
    """Generate a presigned URL for downloading a file from R2."""
    if is_local_reference(object_key):
        return object_key
    client = get_r2_client()
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.R2_BUCKET_NAME, "Key": object_key},
        ExpiresIn=expiration,
    )

def delete_file(object_key: str):
    if is_local_reference(object_key):
        delete_temp_file(object_key)
        return
    if not is_r2_configured():
        return
    client = get_r2_client()
    client.delete_object(
        Bucket=settings.R2_BUCKET_NAME,
        Key=object_key,
    )
