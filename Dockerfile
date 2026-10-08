# syntax=docker/dockerfile:1.7

ARG INSTALL_ASR=false
ARG ASR_MODEL_ID=vinai/PhoWhisper-small
ARG ASR_MODEL_REVISION=a86b604c346caf7148c37512eafe783a16420adb
ARG ASR_MODEL_SOURCE=asr-model-builder

FROM python:3.12-slim AS asr-model-builder

ARG INSTALL_ASR
ARG ASR_MODEL_ID
ARG ASR_MODEL_REVISION

RUN test "$INSTALL_ASR" = "true" || test "$INSTALL_ASR" = "false"
RUN if [ "$INSTALL_ASR" = "true" ]; then \
        pip install --no-cache-dir \
            --index-url https://download.pytorch.org/whl/cpu \
            torch==2.7.1 \
        && pip install --no-cache-dir \
            accelerate==1.12.0 \
            ctranslate2==4.8.2 \
            transformers==4.57.6 \
        && python -c "import os; from huggingface_hub import snapshot_download; snapshot_download(repo_id=os.environ['ASR_MODEL_ID'], revision=os.environ['ASR_MODEL_REVISION'], local_dir='/tmp/asr-source')" \
        && ct2-transformers-converter \
            --model /tmp/asr-source \
            --output_dir /opt/asr-model \
            --quantization int8 \
            --copy_files tokenizer.json preprocessor_config.json \
        && test -s /opt/asr-model/model.bin \
        && test -s /opt/asr-model/config.json \
        && test -s /opt/asr-model/tokenizer.json \
        && test -s /opt/asr-model/preprocessor_config.json \
        && rm -rf /tmp/asr-source /root/.cache/huggingface; \
    else \
        mkdir -p /opt/asr-model; \
    fi

FROM ${ASR_MODEL_SOURCE} AS asr-model-source

FROM python:3.12-slim AS application

ARG INSTALL_ASR=false

# Env
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# System deps
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-vie \
    && rm -rf /var/lib/apt/lists/*

# Workdir
WORKDIR /app

# Install dependencies. ASR remains opt-in so the existing production image is
# unchanged unless INSTALL_ASR=true is explicitly set at build time.
COPY requirements.txt requirements-asr.txt ./
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt \
    && if [ "$INSTALL_ASR" = "true" ]; then \
        pip install --no-cache-dir -r requirements-asr.txt; \
    fi

COPY --from=asr-model-source /opt/asr-model /opt/asr-model
RUN if [ "$INSTALL_ASR" = "true" ]; then \
        test -s /opt/asr-model/model.bin \
        && test -s /opt/asr-model/config.json \
        && test -s /opt/asr-model/tokenizer.json \
        && test -s /opt/asr-model/preprocessor_config.json \
        && chmod -R a+rX /opt/asr-model; \
    else \
        rm -rf /opt/asr-model; \
    fi

# Copy source code
COPY . .

# Fix import path cho src/
ENV PYTHONPATH=/app

# Non-root user
RUN useradd -m appuser
USER appuser

# Port
EXPOSE 8000

# Start FastAPI. Run Alembic as a separate deploy step so a migration issue
# cannot block the web process from serving health checks on managed platforms.
CMD ["bash", "-c", "exec uvicorn src.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers ${UVICORN_WORKERS:-1}"]
