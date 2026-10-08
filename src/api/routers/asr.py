import asyncio

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile

from src.core.config import settings
from src.schemas.asr import AsrTranscriptionResponse
from src.services.asr_service import (
    ASR_MODEL_NAME,
    AsrAudioTooLongError,
    AsrInvalidAudioError,
    AsrNoSpeechError,
    AsrService,
    AsrUnavailableError,
    get_asr_service,
)
from src.services.rate_limit_service import check_rate_limit


router = APIRouter(prefix="/asr", tags=["ASR"])

ALLOWED_AUDIO_CONTENT_TYPES = {
    "audio/m4a",
    "audio/mp4",
    "audio/mpeg",
    "audio/ogg",
    "audio/wav",
    "audio/webm",
    "audio/x-m4a",
    "audio/x-wav",
    "video/webm",
}


@router.post("/transcribe", response_model=AsrTranscriptionResponse)
async def transcribe_audio(
    request: Request,
    file: UploadFile = File(...),
    service: AsrService = Depends(get_asr_service),
):
    if not settings.ASR_ENABLED:
        raise HTTPException(status_code=503, detail="Speech-to-text is not enabled")

    check_rate_limit(
        request=request,
        scope="asr:transcribe",
        identifier=None,
        limit=settings.ASR_RATE_LIMIT_PER_MINUTE,
        window_seconds=60,
    )

    content_type = (file.content_type or "").split(";", 1)[0].strip().lower()
    if content_type not in ALLOWED_AUDIO_CONTENT_TYPES:
        raise HTTPException(status_code=415, detail="Unsupported audio format")

    max_bytes = settings.ASR_MAX_UPLOAD_BYTES
    audio_bytes = await file.read(max_bytes + 1)
    await file.close()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Audio file is empty")
    if len(audio_bytes) > max_bytes:
        raise HTTPException(status_code=413, detail="Audio file is too large")

    try:
        result = await asyncio.to_thread(service.transcribe, audio_bytes)
    except (AsrInvalidAudioError, AsrAudioTooLongError, AsrNoSpeechError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except AsrUnavailableError as exc:
        raise HTTPException(
            status_code=503,
            detail="Speech-to-text is temporarily unavailable",
        ) from exc

    return AsrTranscriptionResponse(
        transcript=result.transcript,
        language=result.language,
        duration_seconds=result.duration_seconds,
        model=ASR_MODEL_NAME,
        requires_user_review=True,
    )
