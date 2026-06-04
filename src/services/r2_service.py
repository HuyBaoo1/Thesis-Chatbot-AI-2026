import mimetypes
import uuid

from src.core.config import settings
from src.integrations.r2_client import get_r2_client

PRESIGNED_URL_EXPIRATION = 3600  # 1 hour

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
    client = get_r2_client()
    try:
        client.head_object(Bucket=settings.R2_BUCKET_NAME, Key=object_key)
        return True
    except Exception:
        return False

def download_file_bytes(object_key: str) -> bytes:
    client = get_r2_client()
    response = client.get_object(Bucket=settings.R2_BUCKET_NAME, Key=object_key)
    return response["Body"].read()

def generate_presigned_url(object_key: str, expiration: int = PRESIGNED_URL_EXPIRATION) -> str:
    """Generate a presigned URL for downloading a file from R2."""
    client = get_r2_client()
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.R2_BUCKET_NAME, "Key": object_key},
        ExpiresIn=expiration,
    )

def delete_file(object_key: str):
    client = get_r2_client()
    client.delete_object(
        Bucket=settings.R2_BUCKET_NAME,
        Key=object_key,
    )
