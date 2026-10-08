from types import SimpleNamespace

import pytest

from src.services.asr_service import (
    AsrAudioTooLongError,
    AsrNoSpeechError,
    AsrService,
    DecodedAudio,
    RuntimeTranscription,
)


class FakeRuntime:
    def __init__(self, *, duration_seconds=5.0, transcript="xin chào"):
        self.duration_seconds = duration_seconds
        self.transcript = transcript
        self.transcribe_calls = []

    def decode(self, audio_bytes: bytes):
        return DecodedAudio(samples=object(), duration_seconds=self.duration_seconds)

    def transcribe(self, samples):
        self.transcribe_calls.append(samples)
        return RuntimeTranscription(transcript=self.transcript, language="vi")


def _service(runtime, *, max_duration_seconds=15.0):
    return AsrService(
        runtime=runtime,
        config=SimpleNamespace(ASR_MAX_DURATION_SECONDS=max_duration_seconds),
    )


def test_service_returns_transcript_for_audio_within_duration_limit():
    runtime = FakeRuntime(duration_seconds=5.91)

    result = _service(runtime).transcribe(b"audio")

    assert result.transcript == "xin chào"
    assert result.language == "vi"
    assert result.duration_seconds == 5.91
    assert len(runtime.transcribe_calls) == 1


def test_service_rejects_long_audio_before_model_inference():
    runtime = FakeRuntime(duration_seconds=15.01)

    with pytest.raises(AsrAudioTooLongError, match="15 seconds"):
        _service(runtime).transcribe(b"audio")

    assert runtime.transcribe_calls == []


def test_service_rejects_blank_transcript():
    runtime = FakeRuntime(transcript="   ")

    with pytest.raises(AsrNoSpeechError, match="No speech detected"):
        _service(runtime).transcribe(b"audio")
