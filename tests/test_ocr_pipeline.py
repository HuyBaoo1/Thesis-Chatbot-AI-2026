import shutil

import pytest
from PIL import Image, ImageDraw

from src.core.config import settings
from src.services import r2_service
from src.services.ocr_smart_extractor import LocalTesseractExtractor


def test_r2_service_uses_local_storage_when_r2_is_not_configured(monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "R2_ACCOUNT_ID", "")
    monkeypatch.setattr(settings, "R2_ACCESS_KEY_ID", "")
    monkeypatch.setattr(settings, "R2_SECRET_ACCESS_KEY", "")
    monkeypatch.setattr(settings, "R2_BUCKET_NAME", "")
    monkeypatch.setattr(settings, "R2_PUBLIC_BASE_URL", "")
    monkeypatch.setattr(settings, "OCR_TEMP_DIR", str(tmp_path))

    payload = b"# VGU OCR\n\nDATA_REQUIRED"

    result = r2_service.upload_file_bytes(
        file_bytes=payload,
        file_name="vgu-ocr.md",
        folder="ocr-output",
        content_type="text/markdown; charset=utf-8",
    )

    assert result["key"].startswith("local://")
    assert result["url"] == result["key"]
    assert r2_service.object_exists(result["key"])
    assert r2_service.download_file_bytes(result["key"]) == payload

    r2_service.delete_file(result["key"])
    assert not r2_service.object_exists(result["key"])


@pytest.mark.skipif(shutil.which("tesseract") is None, reason="Tesseract binary is not installed")
def test_local_tesseract_extractor_reads_real_image(monkeypatch):
    monkeypatch.setattr(settings, "OCR_TESSERACT_LANG", "eng")

    image = Image.new("RGB", (640, 180), "white")
    draw = ImageDraw.Draw(image)
    draw.text((40, 60), "VGU ADMISSIONS 2026", fill="black")

    import io

    buffer = io.BytesIO()
    image.save(buffer, format="PNG")

    markdown = LocalTesseractExtractor().extract([buffer.getvalue()])

    assert "Page 1" in markdown
    assert "VGU" in markdown.upper()
