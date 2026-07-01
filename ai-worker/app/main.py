"""
Smart Warehouse AI Worker — FastAPI Application
Handles expiry risk prediction and RAG-augmented mitigation generation.
"""

from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import predict, mitigate
from app.services.rag import initialize_rag
from app.utils.logger import get_logger

load_dotenv()

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — initialize RAG on startup."""
    logger.info("Starting AI Worker — initializing RAG pipeline...")
    try:
        initialize_rag()
        logger.info("RAG pipeline initialized successfully")
    except FileNotFoundError as exc:
        logger.error("Failed to initialize RAG: %s", str(exc))
    except Exception as exc:
        logger.warning("RAG initialization encountered an issue: %s", str(exc))
        logger.warning("Mitigation endpoints may return limited results")

    yield

    logger.info("AI Worker shutting down")


app = FastAPI(
    title="Smart Warehouse AI Worker",
    description="Expiry risk prediction and RAG-augmented mitigation engine",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(predict.router, tags=["Prediction"])
app.include_router(mitigate.router, tags=["Mitigation"])


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "ai-worker"}
