FROM python:3.12-slim

RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

COPY frontend/package.json frontend/package-lock.json* /app/frontend/
RUN cd /app/frontend && npm install

COPY frontend/ /app/frontend/
COPY backend/ /app/backend/
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

RUN cd /app/frontend && npx vite build && \
    rm -rf /app/backend/static && \
    cp -r /app/frontend/dist /app/backend/static

EXPOSE 8000
ENTRYPOINT ["/bin/bash", "/app/start.sh"]
