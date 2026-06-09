FROM python:3.12-slim

WORKDIR /app

# System deps for sentence-transformers (needs build tools for tokenizers)
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc g++ && \
    rm -rf /var/lib/apt/lists/*

# Install CPU-only PyTorch first (saves ~2GB vs CUDA version)
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Run migrations (allow failure on first deploy) then start server
CMD (alembic upgrade head || echo "Migration skipped — will retry next deploy") && \
    uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
