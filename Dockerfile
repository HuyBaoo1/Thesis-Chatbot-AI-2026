FROM python:3.12-slim

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

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Fix import path cho src/
ENV PYTHONPATH=/app

# Non-root user
RUN useradd -m appuser
USER appuser

# Port
EXPOSE 8000

# Run database migrations then start FastAPI
CMD ["bash", "-c", "alembic upgrade head && uvicorn src.main:app --host 0.0.0.0 --port 8000 --workers 4"]