"""Routes module initialization."""
from routes.models import router as models_router
from routes.generate import router as generate_router

__all__ = ["models_router", "generate_router"]
