"""
Main FastAPI application.
Configures and runs the Local LLM Platform with Ollama integration.
"""
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from datetime import datetime

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from utils.config import get_settings
from utils.logger import configure_logging, get_logger
from routes import models_router, generate_router
from routes.ingestion_routes import router as ingestion_router
from routes.training import router as training_router
from services import get_ollama_service, cleanup_ollama_service
from schemas import HealthResponse, ErrorResponse


# Configure logging before app initialization
configure_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    """
    Application lifespan manager.
    Handles startup and shutdown events.
    """
    # Startup
    settings = get_settings()
    logger.info(
        "application_startup",
        app_name=settings.app_name,
        version=settings.app_version,
        ollama_url=settings.ollama_base_url
    )
    
    # Verify Ollama connection
    ollama_service = get_ollama_service()
    is_healthy = await ollama_service.check_health()
    
    if is_healthy:
        logger.info("ollama_connection_verified")
    else:
        logger.warning(
            "ollama_connection_failed",
            message="Ollama is not accessible. Ensure it's running before making requests."
        )
    
    yield
    
    # Shutdown
    logger.info("application_shutdown")
    await cleanup_ollama_service()


# Initialize FastAPI app
settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="""
    ## Local LLM Platform with Ollama Integration
    
    A backend-only FastAPI platform for running local Large Language Models (LLMs) 
    completely offline using Ollama.
    
    ### Features
    - 🚀 **Fully Offline**: No internet required after setup
    - 🔄 **Multiple Models**: Manage and use multiple local LLM models
    - 📊 **Large Context**: Support for large prompts and context windows
    - ⚡ **Async Processing**: Handle multiple concurrent requests efficiently
    - 📝 **REST API**: Non-streaming responses with comprehensive documentation
    
    ### Getting Started
    1. Ensure Ollama is running locally
    2. Download models using `/models/download`
    3. List available models with `/models`
    4. Generate text using `/generate`
    
    ### Requirements
    - Ollama installed and running (default: http://localhost:11434)
    - Python 3.11+
    - Sufficient RAM for your chosen models
    """,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)


# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests."""
    start_time = datetime.utcnow()
    
    logger.info(
        "request_received",
        method=request.method,
        path=request.url.path,
        client=request.client.host if request.client else None
    )
    
    response = await call_next(request)
    
    duration = (datetime.utcnow() - start_time).total_seconds()
    
    logger.info(
        "request_completed",
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        duration_seconds=duration
    )
    
    return response


# Exception handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle request validation errors."""
    logger.warning(
        "validation_error",
        path=request.url.path,
        errors=exc.errors()
    )
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "ValidationError",
            "message": "Request validation failed",
            "detail": exc.errors()
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected errors."""
    logger.error(
        "unexpected_error",
        path=request.url.path,
        error=str(exc),
        exc_info=True
    )
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "InternalServerError",
            "message": "An unexpected error occurred",
            "detail": str(exc) if settings.debug else None
        }
    )


# Health check endpoint
@app.get(
    "/health",
    response_model=HealthResponse,
    tags=["Health"],
    summary="Health check",
    description="Check the health status of the API and Ollama connection."
)
async def health_check() -> HealthResponse:
    """
    Perform health check.
    
    Returns:
        HealthResponse with service status and Ollama connection info
    """
    ollama_service = get_ollama_service()
    ollama_connected = await ollama_service.check_health()
    
    return HealthResponse(
        status="healthy" if ollama_connected else "degraded",
        ollama_connected=ollama_connected,
        timestamp=datetime.utcnow(),
        version=settings.app_version
    )


# Server info endpoint
@app.get(
    "/server-info",
    tags=["Root"],
    summary="Server Information",
    description="Get server network information including IPv4 address."
)
async def server_info():
    """Get server network information."""
    import socket
    
    try:
        # Get the local IPv4 address
        hostname = socket.gethostname()
        ipv4_address = socket.gethostbyname(hostname)
        
        # Try to get the actual network IP if on local network
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            # Doesn't need to be reachable, just used to get the local IP
            s.connect(('10.255.255.255', 1))
            ipv4_address = s.getsockname()[0]
        except Exception:
            pass
        finally:
            s.close()
        
        server_url = f"http://{ipv4_address}:{settings.port}"
        
        return {
            "hostname": hostname,
            "ipv4": ipv4_address,
            "port": settings.port,
            "url": server_url
        }
    except Exception as e:
        logger.error("failed_to_get_server_info", error=str(e))
        return {
            "hostname": "localhost",
            "ipv4": "127.0.0.1",
            "port": settings.port,
            "url": f"http://127.0.0.1:{settings.port}"
        }


# Root endpoint
@app.get(
    "/",
    tags=["Root"],
    summary="API Information",
    description="Get basic information about the API."
)
async def root():
    """Root endpoint with API information."""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "status": "running",
        "docs": "/docs",
        "redoc": "/redoc",
        "health": "/health"
    }


# Register routers
app.include_router(models_router)
app.include_router(generate_router)
app.include_router(ingestion_router)
app.include_router(training_router)


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level=settings.log_level.lower()
    )
