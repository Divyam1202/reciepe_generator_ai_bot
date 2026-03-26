import logging
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .model_loader import load_model
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
    
    # Try to preload the model for faster first request
    # But don't fail startup if model loading fails - it will load on first use
    try:
        load_model()
        logger.info("Model preloaded successfully")
    except Exception as exc:
        logger.warning("Model preloading skipped during startup: %s", exc)
        logger.info("Model will be loaded on first request")


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "Recipe AI Backend"}


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
