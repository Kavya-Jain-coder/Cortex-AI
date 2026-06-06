FROM python:3.12-slim

WORKDIR /app

# System deps for sentence-transformers (needs build tools for tokenizers)
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc g++ && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Run database migrations on startup, then start the server
CMD alembic upgrade head && \
    uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
