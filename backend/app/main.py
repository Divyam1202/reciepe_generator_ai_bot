import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .model_loader import preload_model_in_background
from .routes import router

logger = logging.getLogger(__name__)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

app = FastAPI(title="Recipe AI Backend", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    """Initialize on server startup."""
    logger.info("Starting Recipe AI server...")

    # Warm the model without blocking API startup.
    preload_model_in_background()
    logger.info("Background model preload started")


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "Recipe AI Backend"}


@app.get("/ready")
def ready_check():
    """Readiness check endpoint - waits for model to load."""
    try:
        from .model_loader import get_model
        get_model()  # Blocks until model is loaded
        return {"status": "ready", "service": "Recipe AI Backend"}
    except Exception as e:
        logger.error(f"Model not ready: {e}")
        raise HTTPException(
            status_code=503,
            detail={"status": "not_ready", "error": str(e)},
        )


@app.get("/")
def root():
    """Root endpoint."""
    return {
        "service": "Recipe AI Backend",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "generate": "/generate",
            "history": "/history",
        },
    }


app.include_router(router)
