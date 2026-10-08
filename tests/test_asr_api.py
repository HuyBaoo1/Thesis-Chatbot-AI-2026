from types import SimpleNamespace

from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.api.routers import asr
from src.services.asr_service import (
    AsrAudioTooLongError,
    AsrTranscription,
    AsrUnavailableError,
)


class FakeAsrService:
    def __init__(self, result=None, error=None):
        self.result = result
        self.error = error
        self.calls = []

    def transcribe(self, audio_bytes: bytes):
        self.calls.append(audio_bytes)
        if self.error:
            raise self.error
        return self.result


def _client(monkeypatch, service, *, enabled=True, max_upload_bytes=5 * 1024 * 1024):
    monkeypatch.setattr(
        asr,
        "settings",
        SimpleNamespace(
            ASR_ENABLED=enabled,
            ASR_MAX_UPLOAD_BYTES=max_upload_bytes,
            ASR_RATE_LIMIT_PER_MINUTE=6,
        ),
    )
    monkeypatch.setattr(asr, "check_rate_limit", lambda **kwargs: None)

    app = FastAPI()
    app.include_router(asr.router, prefix="/api")
    app.dependency_overrides[asr.get_asr_service] = lambda: service
    return TestClient(app)


def test_transcribe_returns_an_editable_draft_without_sending_chat(monkeypatch):
    service = FakeAsrService(
        result=AsrTranscription(
            transcript="học phí của ngành computer science of engineering.",
            language="vi",
            duration_seconds=5.91,
        )
    )
    client = _client(monkeypatch, service)

    response = client.post(
        "/api/asr/transcribe",
        files={"file": ("question.webm", b"audio-bytes", "audio/webm")},
    )

    assert response.status_code == 200
    assert response.json() == {
        "transcript": "học phí của ngành computer science of engineering.",
        "language": "vi",
        "duration_seconds": 5.91,
        "model": "vinai/PhoWhisper-small",
        "requires_user_review": True,
    }
    assert service.calls == [b"audio-bytes"]


def test_transcribe_is_closed_when_feature_is_disabled(monkeypatch):
    service = FakeAsrService()
    client = _client(monkeypatch, service, enabled=False)

    response = client.post(
        "/api/asr/transcribe",
        files={"file": ("question.webm", b"audio-bytes", "audio/webm")},
    )

    assert response.status_code == 503
    assert response.json()["detail"] == "Speech-to-text is not enabled"
    assert service.calls == []


def test_transcribe_rejects_unsupported_media_type(monkeypatch):
    service = FakeAsrService()
    client = _client(monkeypatch, service)

    response = client.post(
        "/api/asr/transcribe",
        files={"file": ("question.txt", b"not-audio", "text/plain")},
    )

    assert response.status_code == 415
    assert service.calls == []


def test_transcribe_rejects_empty_or_oversized_uploads(monkeypatch):
    service = FakeAsrService()
    client = _client(monkeypatch, service, max_upload_bytes=4)

    empty = client.post(
        "/api/asr/transcribe",
        files={"file": ("question.webm", b"", "audio/webm")},
    )
    oversized = client.post(
        "/api/asr/transcribe",
        files={"file": ("question.webm", b"12345", "audio/webm")},
    )

    assert empty.status_code == 400
    assert oversized.status_code == 413
    assert service.calls == []


def test_transcribe_maps_duration_and_runtime_failures(monkeypatch):
    too_long = _client(
        monkeypatch,
        FakeAsrService(error=AsrAudioTooLongError("Audio exceeds 15 seconds")),
    ).post(
        "/api/asr/transcribe",
        files={"file": ("question.m4a", b"audio", "audio/mp4")},
    )

    unavailable = _client(
        monkeypatch,
        FakeAsrService(error=AsrUnavailableError("runtime details")),
    ).post(
        "/api/asr/transcribe",
        files={"file": ("question.wav", b"audio", "audio/wav")},
    )

    assert too_long.status_code == 422
    assert too_long.json()["detail"] == "Audio exceeds 15 seconds"
    assert unavailable.status_code == 503
    assert unavailable.json()["detail"] == "Speech-to-text is temporarily unavailable"
