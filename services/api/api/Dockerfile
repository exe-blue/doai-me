# DoAi.Me Backend API - FastAPI
# P1: Persona IDLE Search System
# M4: Multi-worker scaling support
FROM python:3.11-slim

WORKDIR /app

# 시스템 의존성 설치
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 의존성 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 소스코드 복사
COPY . .

# 환경 변수 기본값
ENV PYTHONPATH=/app
ENV API_HOST=0.0.0.0
ENV API_PORT=8000

# M4: Worker configuration (2-4 per CPU recommended)
ENV WORKERS=4

EXPOSE 8000

# M4: Use gunicorn with uvicorn workers for production
CMD ["sh", "-c", "gunicorn main:app -w ${WORKERS} -k uvicorn.workers.UvicornWorker -b ${API_HOST}:${API_PORT} --timeout 120"]
