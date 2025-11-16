"""
Main FastAPI application.
Configures and runs the LLM-365 with Ollama integration.
"""
import os
from pathlib import Path

# Smart offline mode: Check if Docling models are cached
# If models exist, use offline mode (faster, no network needed)
# If models missing, enable downloads (one-time setup)
def configure_huggingface_mode():
    """Configure HF Hub mode based on cached model availability"""
    hf_home = os.environ.get('HF_HOME', os.path.join(os.path.expanduser('~'), '.cache', 'huggingface'))
    hub_cache = Path(hf_home) / 'hub'
    
    # Check if Docling models are cached (look for model files)
    models_cached = hub_cache.exists() and any(hub_cache.glob('models--*'))
    
    if models_cached:
        # Models already downloaded - use offline mode
        os.environ['HF_HUB_OFFLINE'] = '1'
        os.environ['TRANSFORMERS_OFFLINE'] = '1'
        print(f"✅ Using OFFLINE mode - Docling models found in cache: {hub_cache}")
    else:
        # Models not cached - enable downloads (one-time)
        os.environ['HF_HUB_OFFLINE'] = '0'
        os.environ['TRANSFORMERS_OFFLINE'] = '0'
        print(f"📥 Using ONLINE mode - Will download Docling models to: {hub_cache}")
        print(f"   (This is a one-time download, ~500MB-1GB)")
    
    os.environ['HF_DATASETS_OFFLINE'] = '1'  # Datasets not needed

configure_huggingface_mode()

from contextlib import asynccontextmanager
from typing import AsyncGenerator
from datetime import datetime

from fastapi import FastAPI, Request, status, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.exceptions import RequestValidationError
from fastapi.staticfiles import StaticFiles

from utils.config import get_settings
from utils.logger import configure_logging, get_logger

# Configure logging early
configure_logging()
logger = get_logger(__name__)

from routes import models_router, generate_router
from routes.ingestion_routes import router as ingestion_router
from routes.analytics import router as analytics_router
from routes.metabase_routes import router as metabase_router
from routes.auth_routes import router as auth_router

# Make training optional (requires additional dependencies)
try:
    from routes.training import router as training_router
    TRAINING_AVAILABLE = True
except ImportError as e:
    logger.warning(f"Training module not available: {e}")
    logger.warning("Install training dependencies with: pip install datasets>=2.14.0 peft>=0.7.0")
    TRAINING_AVAILABLE = False
    training_router = None

from services import get_ollama_service, cleanup_ollama_service
from services.analytics_service import get_analytics_service, cleanup_analytics_service
from schemas import HealthResponse, ErrorResponse


# Configure logging before app initialization
logger.info("Starting application initialization")


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
    
    # Initialize authentication database
    try:
        from auth.database import init_db
        init_db()
        logger.info("authentication_database_initialized")
    except Exception as e:
        logger.warning(f"authentication_database_init_failed: {e}")
    
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
    await cleanup_analytics_service()


# Initialize FastAPI app
settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="""
    ## LLM-365 with Ollama Integration
    
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


# Analytics middleware for tracking usage
@app.middleware("http")
async def analytics_middleware(request: Request, call_next):
    """Track analytics data for all requests."""
    import uuid
    import json
    
    start_time = datetime.utcnow()
    session_id = str(uuid.uuid4())
    
    # Get or create session ID from headers
    session_id = request.headers.get("X-Session-ID", session_id)
    user_id = request.headers.get("X-User-ID")
    
    # Read request body for analytics (if needed)
    request_data = {}
    model_name = None
    prompt_length = 0
    rag_enabled = False
    indices_used = None
    search_type = None
    
    try:
        # For POST requests, try to extract relevant info
        if request.method == "POST" and request.url.path in ["/generate", "/rag/search"]:
            # Note: We can't read the body here as it's already consumed
            # This will be handled in the route handlers
            pass
    except Exception as e:
        logger.debug(f"Could not extract request data for analytics: {e}")
    
    # Process the request
    response = await call_next(request)
    
    # Calculate metrics
    end_time = datetime.utcnow()
    response_time = (end_time - start_time).total_seconds()
    
    # Skip analytics for static files and health checks
    skip_paths = ["/docs", "/redoc", "/openapi.json", "/favicon.ico", "/health"]
    should_track = not any(request.url.path.startswith(path) for path in skip_paths)
    
    if should_track:
        try:
            analytics_service = get_analytics_service()
            
            # Extract response length if possible
            response_length = 0
            tokens_generated = 0
            
            # Try to get response data from headers (if set by handlers)
            if hasattr(response, 'headers'):
                tokens_generated = int(response.headers.get("X-Tokens-Generated", 0))
                response_length = int(response.headers.get("X-Response-Length", 0))
                model_name = response.headers.get("X-Model-Name")
                rag_enabled = response.headers.get("X-RAG-Enabled", "false").lower() == "true"
                indices_str = response.headers.get("X-Indices-Used")
                if indices_str:
                    try:
                        indices_used = json.loads(indices_str)
                    except:
                        pass
                search_type = response.headers.get("X-Search-Type")
            
            # Log the request asynchronously
            await analytics_service.log_request_async(
                endpoint=request.url.path,
                method=request.method,
                model_name=model_name,
                prompt_length=prompt_length,
                response_length=response_length,
                response_time=response_time,
                tokens_generated=tokens_generated,
                status_code=response.status_code,
                user_id=user_id,
                session_id=session_id,
                rag_enabled=rag_enabled,
                indices_used=indices_used,
                search_type=search_type,
                error_message=None if response.status_code < 400 else "Request failed"
            )
            
        except Exception as e:
            # Don't let analytics failures affect the main request
            logger.debug(f"Analytics tracking failed: {e}")
    
    # Add session ID to response headers for client tracking
    response.headers["X-Session-ID"] = session_id
    
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
        
        server_url = f"http://{ipv4_address}:{settings.UI_port}"
        
        return {
            "hostname": hostname,
            "ipv4": ipv4_address,
            "port": settings.UI_port,
            "url": server_url
        }
    except Exception as e:
        logger.error("failed_to_get_server_info", error=str(e))
        return {
            "hostname": "localhost",
            "ipv4": "127.0.0.1",
            "port": settings.UI_port,
            "url": f"http://127.0.0.1:{settings.UI_port}"
        }


# Serve analytics page
@app.get(
    "/analytics.html",
    tags=["Frontend"],
    summary="Analytics Dashboard",
    description="Serve the Metabase analytics dashboard page."
)
async def analytics_page():
    """Serve the analytics dashboard HTML page."""
    import os
    analytics_path = os.path.join(os.path.dirname(__file__), "frontend", "analytics.html")
    if os.path.exists(analytics_path):
        return FileResponse(analytics_path)
    else:
        raise HTTPException(status_code=404, detail="Analytics page not found")


# Serve MCP connection page
@app.get(
    "/connect",
    tags=["Frontend"],
    summary="MCP Connection Guide",
    description="Serve the MCP (Model Context Protocol) connection guide page."
)
async def connect_page():
    """Serve the MCP connection guide HTML page."""
    import os
    connect_path = os.path.join(os.path.dirname(__file__), "frontend", "connect.html")
    if os.path.exists(connect_path):
        return FileResponse(connect_path)
    else:
        raise HTTPException(status_code=404, detail="Connect page not found")


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
        "health": "/health",
        "analytics": "/analytics.html",
        "mcp_connection": "/connect"
    }


# Register routers
app.include_router(auth_router)  # Authentication routes (no auth required)
app.include_router(models_router)
app.include_router(generate_router)
app.include_router(ingestion_router)
app.include_router(analytics_router)
app.include_router(metabase_router)

# Only include training router if available
if TRAINING_AVAILABLE and training_router:
    app.include_router(training_router)
    logger.info("Training routes registered")
else:
    logger.warning("Training routes not available - install dependencies to enable")

logger.info("Analytics routes registered")
logger.info("Metabase analytics routes registered")


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level=settings.log_level.lower()
    )
