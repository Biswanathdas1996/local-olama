"""
Helper script to add authentication dependencies to existing routes.
This file documents the authentication requirements for each route.
"""

# Route protection mapping
# Format: {route_file: {endpoint_path: (resource, action)}}

ROUTE_PROTECTION = {
    "generate.py": {
        # All generation endpoints require generate permissions
        "/generate": ("generate", "write"),
        "/rag/search": ("generate", "read"),
    },
    "ingestion_routes.py": {
        # Document ingestion endpoints
        "/ingest/upload-file": ("documents", "write"),
        "/ingest/upload-url": ("documents", "write"),
        "/ingest/list-processed": ("documents", "read"),
        "/ingest/list-indices": ("documents", "read"),
        "/ingest/search": ("documents", "read"),
        "/ingest/delete": ("documents", "delete"),
        "/ingest/image": ("documents", "write"),
    },
    "analytics.py": {
        # Analytics endpoints
        "/analytics/*": ("analytics", "read"),
    },
    "metabase_routes.py": {
        # Metabase endpoints
        "/metabase/*": ("metabase", "read"),
    },
    "training.py": {
        # Training endpoints
        "/training/*": ("training", "write"),
        "/training/*/status": ("training", "read"),
        "/training/*/delete": ("training", "delete"),
    }
}

# Instructions for manual update:
# 1. Add imports to each route file:
#    from fastapi import Depends
#    from core.auth_models import User
#    from core.auth_dependencies import get_current_user, ResourcePermissionChecker
#
# 2. Add dependencies to each endpoint:
#    dependencies=[Depends(ResourcePermissionChecker("resource", "action"))]
#    current_user: User = Depends(get_current_user)
#
# 3. For health check and public endpoints, no authentication required
