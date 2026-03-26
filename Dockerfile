# Stage 1: Build frontend
FROM node:20-slim AS frontend-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Python backend + Playwright
FROM python:3.12-slim

# Create non-root user (Workbench requirement)
RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /sbin/nologin appuser

WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright Chromium in a shared path accessible by appuser
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/playwright-browsers
RUN playwright install --with-deps chromium \
    && chmod -R 755 /opt/playwright-browsers

# Copy backend code
COPY backend/ ./backend/

# Copy templates
COPY templates/ ./templates/

# Copy built frontend
COPY --from=frontend-build /app/client/dist ./client/dist

# Create data directory for SQLite fallback (dev only)
RUN mkdir -p /app/data && chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Environment
ENV PORT=8000
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

# Healthcheck (Workbench requirement)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
