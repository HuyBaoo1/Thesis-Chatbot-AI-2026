import io
import logging
import threading
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Protocol

from src.core.config import settings


logger = logging.getLogger(__name__)

ASR_MODEL_NAME = "vinai/PhoWhisper-small"
ASR_SAMPLE_RATE = 16000


class AsrError(RuntimeError):
    pass


class AsrUnavailableError(AsrError):
    pass


class AsrInvalidAudioError(AsrError):
    pass


class AsrAudioTooLongError(AsrError):
    pass


class AsrNoSpeechError(AsrError):
    pass


@dataclass(frozen=True)
class DecodedAudio:
    samples: Any
    duration_seconds: float


@dataclass(frozen=True)
class RuntimeTranscription:
    transcript: str
    language: str


@dataclass(frozen=True)
class AsrTranscription:
    transcript: str
    language: str
    duration_seconds: float


class AsrRuntime(Protocol):
    def decode(self, audio_bytes: bytes) -> DecodedAudio: ...

    def transcribe(self, samples: Any) -> RuntimeTranscription: ...


class FasterWhisperRuntime:
    def __init__(self, config) -> None:
        self._config = config
        self._model = None
        self._model_lock = threading.Lock()
        self._inference_lock = threading.Lock()

    def decode(self, audio_bytes: bytes) -> DecodedAudio:
        try:
            from faster_whisper import decode_audio
        except ImportError as exc:
            raise AsrUnavailableError("ASR runtime is not installed") from exc

        try:
            samples = decode_audio(
                io.BytesIO(audio_bytes),
                sampling_rate=ASR_SAMPLE_RATE,
            )
        except Exception as exc:
            raise AsrInvalidAudioError("Audio could not be decoded") from exc

        duration_seconds = len(samples) / ASR_SAMPLE_RATE
        return DecodedAudio(
            samples=samples,
            duration_seconds=duration_seconds,
        )

    def transcribe(self, samples: Any) -> RuntimeTranscription:
        model = self._get_model()
        try:
            with self._inference_lock:
                segments, info = model.transcribe(
                    samples,
                    language="vi",
                    task="transcribe",
                    beam_size=5,
                    condition_on_previous_text=False,
                    vad_filter=False,
                )
                transcript = "".join(segment.text for segment in segments).strip()
        except Exception as exc:
            logger.exception("asr_transcription_failed")
            raise AsrUnavailableError("ASR inference failed") from exc

        return RuntimeTranscription(
            transcript=transcript,
            language=getattr(info, "language", None) or "vi",
        )

    def _get_model(self):
        if self._model is not None:
            return self._model

        with self._model_lock:
            if self._model is not None:
                return self._model

            model_path = Path(str(self._config.ASR_MODEL_PATH).strip())
            if not str(self._config.ASR_MODEL_PATH).strip():
                raise AsrUnavailableError("ASR model path is not configured")
            if not model_path.is_dir() or not (model_path / "model.bin").is_file():
                raise AsrUnavailableError("Converted ASR model is not available")

            try:
                from faster_whisper import WhisperModel
            except ImportError as exc:
                raise AsrUnavailableError("ASR runtime is not installed") from exc

            try:
                self._model = WhisperModel(
                    str(model_path),
                    device="cpu",
                    compute_type="int8",
                    cpu_threads=self._config.ASR_CPU_THREADS,
                    num_workers=1,
                )
            except Exception as exc:
                logger.exception("asr_model_load_failed")
                raise AsrUnavailableError("ASR model could not be loaded") from exc

        return self._model


class AsrService:
    def __init__(self, *, runtime: AsrRuntime | None = None, config=None) -> None:
        self._config = config or settings
        self._runtime = runtime or FasterWhisperRuntime(self._config)

    def transcribe(self, audio_bytes: bytes) -> AsrTranscription:
        if not audio_bytes:
            raise AsrInvalidAudioError("Audio file is empty")

        decoded = self._runtime.decode(audio_bytes)
        max_duration = float(self._config.ASR_MAX_DURATION_SECONDS)
        if decoded.duration_seconds > max_duration:
            raise AsrAudioTooLongError(
                f"Audio exceeds {max_duration:g} seconds"
            )

        result = self._runtime.transcribe(decoded.samples)
        transcript = result.transcript.strip()
        if not transcript:
            raise AsrNoSpeechError("No speech detected in audio")

        return AsrTranscription(
            transcript=transcript,
            language=result.language or "vi",
            duration_seconds=round(decoded.duration_seconds, 2),
        )


_asr_service: AsrService | None = None
_asr_service_lock = threading.Lock()


def get_asr_service() -> AsrService:
    global _asr_service
    if _asr_service is not None:
        return _asr_service

    with _asr_service_lock:
        if _asr_service is None:
            _asr_service = AsrService()
    return _asr_service
