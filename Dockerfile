FROM python:3.12-slim

# Install Node.js 20
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Install Node deps
COPY frontend/package.json frontend/package-lock.json* /app/frontend/
RUN cd /app/frontend && npm install

# Copy source
COPY frontend/ /app/frontend/
COPY backend/ /app/backend/

# Build frontend → backend/static
RUN cd /app/frontend && npx vite build && \
    rm -rf /app/backend/static && \
    cp -r /app/frontend/dist /app/backend/static

# Start script
RUN echo '#!/bin/bash\ncd /app/backend && python -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}' > /app/start.sh && chmod +x /app/start.sh

EXPOSE 8000
ENTRYPOINT ["/bin/bash", "/app/start.sh"]
