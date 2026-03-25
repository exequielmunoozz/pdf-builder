import os
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from .database import run_migrations, async_session
from .services.seeder import seed_templates
from .services.pdf_generator import cleanup as cleanup_browser
from .routers import templates, fields, generate, pdfs


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🍋 Lemon PDF Builder (FastAPI) starting...")
    await run_migrations()

    # Seed templates
    templates_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'templates')
    templates_dir = os.path.abspath(templates_dir)
    async with async_session() as session:
        await seed_templates(session, templates_dir)
    print("✅ Templates seeded")

    yield

    # Shutdown
    await cleanup_browser()
    print("👋 Browser cleaned up")


app = FastAPI(title="Lemon PDF Builder", version="2.0.0", lifespan=lifespan, redirect_slashes=False)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routers
app.include_router(templates.router)
app.include_router(fields.router)
app.include_router(generate.router)
app.include_router(pdfs.router)


@app.get("/health")
async def health():
    """Workbench healthcheck endpoint."""
    return {"status": "ok", "engine": "FastAPI", "version": "2.0.0"}


@app.get("/api/health")
async def api_health():
    """API healthcheck (frontend uses this)."""
    return {"status": "ok", "engine": "FastAPI", "version": "2.0.0"}


# Serve frontend static files (in production)
client_dist = os.path.join(os.path.dirname(__file__), '..', '..', 'client', 'dist')
client_dist = os.path.abspath(client_dist)

if os.path.isdir(client_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(client_dist, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """SPA fallback: serve index.html for all non-API routes."""
        file_path = os.path.join(client_dist, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(client_dist, "index.html"))


# JSON error handler for HTTPException
@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"error": str(exc)},
    )
