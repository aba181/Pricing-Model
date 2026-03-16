# Stage 1: Build dependencies
FROM python:3.12-slim AS builder

WORKDIR /app

COPY fastapi-project/requirements.txt .

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

RUN pip install --no-cache-dir -r requirements.txt gunicorn

# Stage 2: Runtime
FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH"

COPY --from=builder /opt/venv /opt/venv

COPY fastapi-project/app/ ./app/
COPY fastapi-project/migrations/ ./migrations/
COPY fastapi-project/scripts/ ./scripts/

EXPOSE 8000

RUN chmod +x scripts/start.sh

CMD ["scripts/start.sh"]
