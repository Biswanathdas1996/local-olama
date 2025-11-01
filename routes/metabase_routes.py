"""
Metabase Analytics API Routes
Separate routes for CSV/Excel upload and dashboard analytics.
Completely independent from existing RAG functionality.
"""

import asyncio
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query, status, Request
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel, Field

from services.metabase_dataset_service import get_metabase_dataset_service
from services.metabase_dashboard_service import get_metabase_dashboard_service
from utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/metabase", tags=["Metabase Analytics"])


# Request/Response Models
class DatasetInfo(BaseModel):
    """Dataset information model"""
    id: int
    name: str
    original_filename: str
    table_name: str
    upload_date: str
    row_count: int
    column_count: int
    file_size: int
    file_type: str
    description: Optional[str] = None
    status: str


class DatasetDetail(DatasetInfo):
    """Detailed dataset information including metadata and insights"""
    metadata: dict
    insights: List[dict]


class UploadResponse(BaseModel):
    """Upload response model"""
    success: bool
    dataset_id: int
    name: str
    table_name: str
    row_count: int
    column_count: int
    file_size: int
    metadata: dict
    status: str
    message: str


class InsightResponse(BaseModel):
    """AI-generated insight response"""
    dataset_id: int
    insights: List[dict]
    summary: str
    recommendations: List[str]


class DashboardResponse(BaseModel):
    """Dashboard generation response"""
    success: bool
    dataset_id: int
    dashboard_id: Optional[int] = None
    dashboard_url: Optional[str] = None
    message: str
    charts_created: int


# Dataset Upload Endpoints

@router.post(
    "/upload",
    response_model=UploadResponse,
    summary="Upload Excel/CSV dataset",
    description="Upload large Excel or CSV files for analytics. Supports automatic data analysis and insight generation."
)
async def upload_dataset(
    file: UploadFile = File(..., description="Excel (.xlsx, .xls) or CSV file"),
    name: Optional[str] = Form(None, description="Dataset name (optional, defaults to filename)"),
    description: Optional[str] = Form(None, description="Dataset description")
) -> UploadResponse:
    """
    Upload a dataset file for analytics.
    
    Features:
    - Supports CSV and Excel files (up to several GB)
    - Automatic data type detection
    - Missing data analysis
    - Statistical summary generation
    - Automatic insight generation
    
    The uploaded data is stored in a separate SQLite database
    and can be visualized using Metabase dashboards.
    """
    try:
        logger.info(f"Uploading dataset: {file.filename}")
        
        service = get_metabase_dataset_service()
        result = await service.upload_dataset(file, name, description)
        
        return UploadResponse(
            success=True,
            dataset_id=result['dataset_id'],
            name=result['name'],
            table_name=result['table_name'],
            row_count=result['row_count'],
            column_count=result['column_count'],
            file_size=result['file_size'],
            metadata=result['metadata'],
            status=result['status'],
            message="Dataset uploaded and processed successfully"
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to upload dataset: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload dataset: {str(e)}"
        )


@router.get(
    "/datasets",
    response_model=List[DatasetInfo],
    summary="List all datasets",
    description="Get a list of all uploaded datasets."
)
async def list_datasets() -> List[DatasetInfo]:
    """
    Get all uploaded datasets.
    
    Returns basic information about each dataset including:
    - Name and file info
    - Row and column counts
    - Upload date and status
    """
    try:
        service = get_metabase_dataset_service()
        datasets = await service.get_all_datasets()
        
        return [DatasetInfo(**dataset) for dataset in datasets]
        
    except Exception as e:
        logger.error(f"Failed to list datasets: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve datasets: {str(e)}"
        )


@router.get(
    "/datasets/{dataset_id}",
    response_model=DatasetDetail,
    summary="Get dataset details",
    description="Get detailed information about a specific dataset including metadata and insights."
)
async def get_dataset(dataset_id: int) -> DatasetDetail:
    """
    Get detailed dataset information.
    
    Includes:
    - Complete metadata (column types, statistics)
    - Automatically generated insights
    - Data quality assessments
    - Missing data analysis
    """
    try:
        service = get_metabase_dataset_service()
        dataset = await service.get_dataset(dataset_id)
        
        if not dataset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Dataset {dataset_id} not found"
            )
        
        return DatasetDetail(**dataset)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get dataset {dataset_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve dataset: {str(e)}"
        )


@router.get(
    "/datasets/{dataset_id}/preview",
    summary="Preview dataset data",
    description="Get a preview of the dataset (first 100 rows by default)."
)
async def preview_dataset(
    dataset_id: int,
    limit: int = Query(100, ge=10, le=1000, description="Number of rows to return")
):
    """
    Preview dataset data.
    
    Returns a sample of rows from the dataset for inspection.
    Useful for verifying data import and exploring structure.
    """
    try:
        service = get_metabase_dataset_service()
        result = await service.query_dataset(dataset_id, limit)
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Dataset {dataset_id} not found"
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to preview dataset {dataset_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to preview dataset: {str(e)}"
        )


@router.delete(
    "/datasets/{dataset_id}",
    summary="Delete dataset",
    description="Delete a dataset and all associated data."
)
async def delete_dataset(dataset_id: int):
    """
    Delete a dataset.
    
    This will:
    - Remove the dataset from the database
    - Delete all associated insights
    - Remove the uploaded file
    - Delete any associated dashboards in Metabase
    """
    try:
        service = get_metabase_dataset_service()
        success = await service.delete_dataset(dataset_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Dataset {dataset_id} not found"
            )
        
        return {
            "success": True,
            "message": f"Dataset {dataset_id} deleted successfully",
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete dataset {dataset_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete dataset: {str(e)}"
        )


# Dashboard & Insights Endpoints

@router.post(
    "/datasets/{dataset_id}/generate-insights",
    response_model=InsightResponse,
    summary="Generate AI insights",
    description="Generate AI-powered insights and recommendations from the dataset using local LLM."
)
async def generate_insights(dataset_id: int) -> InsightResponse:
    """
    Generate AI-powered insights from dataset.
    
    Uses local LLM to analyze:
    - Data patterns and trends
    - Correlations between columns
    - Anomalies and outliers
    - Business recommendations
    
    This is completely offline and uses your local Ollama models.
    """
    try:
        dashboard_service = get_metabase_dashboard_service()
        insights = await dashboard_service.generate_ai_insights(dataset_id)
        
        return InsightResponse(**insights)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to generate insights for dataset {dataset_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate insights: {str(e)}"
        )


@router.post(
    "/datasets/{dataset_id}/create-dashboard",
    response_model=DashboardResponse,
    summary="Create Metabase dashboard",
    description="Automatically create a Metabase dashboard with visualizations for the dataset."
)
async def create_dashboard(dataset_id: int) -> DashboardResponse:
    """
    Automatically create Metabase dashboard.
    
    This will:
    - Analyze dataset structure
    - Create appropriate visualizations (charts, tables, metrics)
    - Configure Metabase database connection
    - Generate interactive dashboard
    
    The dashboard URL will be returned for embedding in the UI.
    """
    try:
        dashboard_service = get_metabase_dashboard_service()
        result = await dashboard_service.create_dashboard(dataset_id)
        
        return DashboardResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create dashboard for dataset {dataset_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create dashboard: {str(e)}"
        )


@router.get(
    "/datasets/{dataset_id}/dashboard-url",
    summary="Get dashboard URL",
    description="Get the Metabase dashboard URL for a dataset."
)
async def get_dashboard_url(dataset_id: int):
    """
    Get the Metabase dashboard URL.
    
    Returns the URL to access or embed the dashboard.
    Returns direct Metabase URL instead of proxied URL for better compatibility.
    """
    try:
        dashboard_service = get_metabase_dashboard_service()
        url = await dashboard_service.get_dashboard_url(dataset_id)
        
        if not url:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No dashboard found for dataset {dataset_id}"
            )
        
        # Return direct Metabase URL instead of proxied version
        # This avoids issues with Metabase's internal routing
        return {
            "dataset_id": dataset_id,
            "dashboard_url": url,  # Direct Metabase URL: http://localhost:3001/dashboard/X
            "proxy_url": url.replace("http://localhost:3001", "http://localhost:5000/metabase/proxy"),
            "embed_url": url.replace("/dashboard/", "/embed/dashboard/") if "/dashboard/" in url else url,
            "use_direct": True  # Recommend using direct URL
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get dashboard URL for dataset {dataset_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get dashboard URL: {str(e)}"
        )


# Metabase Configuration Endpoints

@router.get(
    "/status",
    summary="Check Metabase status",
    description="Check if Metabase is running and accessible."
)
async def check_metabase_status():
    """
    Check Metabase server status.
    
    Returns:
    - Server status (running/stopped)
    - Version information
    - Database connection status
    """
    try:
        dashboard_service = get_metabase_dashboard_service()
        status_info = await dashboard_service.check_status()
        
        return status_info
        
    except Exception as e:
        logger.error(f"Failed to check Metabase status: {e}")
        return {
            "status": "error",
            "message": str(e),
            "running": False
        }


@router.post(
    "/configure",
    summary="Configure Metabase connection",
    description="Configure Metabase to connect to the datasets database."
)
async def configure_metabase(
    admin_email: str = Form(...),
    admin_password: str = Form(...)
):
    """
    Configure Metabase database connection.
    
    This sets up:
    - Admin user credentials
    - Database connection to datasets.db
    - Initial configuration
    
    Required for first-time setup.
    """
    try:
        dashboard_service = get_metabase_dashboard_service()
        result = await dashboard_service.configure_metabase(admin_email, admin_password)
        
        return result
        
    except Exception as e:
        logger.error(f"Failed to configure Metabase: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to configure Metabase: {str(e)}"
        )


@router.get(
    "/health",
    summary="Health check",
    description="Check health of Metabase analytics module."
)
async def health_check():
    """
    Health check endpoint.
    
    Verifies:
    - Service is running
    - Database is accessible
    - Metabase server status
    """
    try:
        dataset_service = get_metabase_dataset_service()
        dashboard_service = get_metabase_dashboard_service()
        
        # Check database connectivity
        datasets = await dataset_service.get_all_datasets()
        
        # Check Metabase status
        metabase_status = await dashboard_service.check_status()
        
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "datasets_count": len(datasets),
            "metabase_running": metabase_status.get("running", False),
            "database_path": str(dataset_service.datasets_db)
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unhealthy",
                "timestamp": datetime.now().isoformat(),
                "error": str(e)
            }
        )


@router.api_route("/proxy/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"])
async def proxy_metabase(path: str, request: Request):
    """
    Comprehensive proxy endpoint to forward all requests to Metabase and remove X-Frame-Options header.
    This allows embedding Metabase dashboards in iframes.
    Handles all HTTP methods and proxies all resources (HTML, CSS, JS, images, API calls).
    """
    import aiohttp
    from fastapi.responses import StreamingResponse, Response
    
    # Try multiple URLs for better offline compatibility
    base_urls = ["http://127.0.0.1:3001", "http://localhost:3001", "http://[::1]:3001"]
    
    # Get query parameters
    query_string = str(request.url.query)
    query_suffix = f"?{query_string}" if query_string else ""
    
    last_error = None
    
    for base_url in base_urls:
        metabase_url = f"{base_url}/{path}{query_suffix}"
        
        try:
            connector = aiohttp.TCPConnector(
                force_close=True,
                enable_cleanup_closed=True
            )
            async with aiohttp.ClientSession(connector=connector) as session:
                # Prepare request headers (exclude host)
                headers = {
                    key: value 
                    for key, value in request.headers.items() 
                    if key.lower() not in ['host']
                }
                
                # Get request body if present
                body = None
                if request.method in ["POST", "PUT", "PATCH"]:
                    body = await request.body()
                
                # Make the proxied request - disable auto-decompression
                async with session.request(
                    method=request.method,
                    url=metabase_url,
                    headers=headers,
                    data=body,
                    allow_redirects=False,
                    compress=False  # Disable automatic compression handling
                ) as response:
                    # Get all response headers except problematic ones
                    # Remove CSP and X-Frame-Options to allow iframe embedding
                    response_headers = {
                        key: value 
                        for key, value in response.headers.items() 
                        if key.lower() not in [
                            'x-frame-options',           # Blocks iframe embedding
                            'content-security-policy',   # CSP frame-ancestors blocks embedding
                            'content-length',            # Will be recalculated by browser
                            'transfer-encoding',         # Conflicts with content-length
                            'connection',                # Proxy connection handling
                            'content-encoding'           # Prevent double decompression
                        ]
                    }
                    
                    # Read content (aiohttp automatically decompresses)
                    content = await response.read()
                    
                    # Return response without encoding
                    return Response(
                        content=content,
                        status_code=response.status,
                        headers=response_headers,
                        media_type=response.headers.get('content-type', 'text/html')
                    )
        except (aiohttp.ClientConnectorError, asyncio.TimeoutError, OSError) as e:
            # Connection failed, try next URL
            last_error = e
            logger.debug(f"Failed to connect to {base_url}: {e}")
            continue
        except Exception as e:
            # Unexpected error
            last_error = e
            logger.error(f"Proxy error for {metabase_url}: {e}")
            continue
    
    # All URLs failed
    logger.error(f"Failed to proxy to Metabase on all addresses: {last_error}")
    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail=f"Failed to proxy request to Metabase: Cannot connect to host localhost:3001 ssl:default [{str(last_error)}]. Make sure Metabase is running."
    )
