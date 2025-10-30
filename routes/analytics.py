"""
Analytics API Routes
Provides endpoints for analytics data retrieval and business intelligence.
"""

from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from services.analytics_service import get_analytics_service
from utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/analytics", tags=["Analytics"])

# Response Models
class UsageSummaryResponse(BaseModel):
    """Usage summary response model"""
    period_days: int
    total_requests: int
    total_tokens: int
    avg_response_time: float
    success_rate: float
    rag_usage_rate: float
    estimated_cost_savings: float
    top_models: List[Dict[str, Any]]

class ModelStatistics(BaseModel):
    """Model statistics response model"""
    model_name: str
    total_requests: int
    total_tokens: int
    avg_response_time: float
    success_rate: float
    last_used: Optional[str]
    total_errors: int
    avg_prompt_length: float
    avg_response_length: float
    tokens_per_second: float
    efficiency_score: float

class DocumentInsight(BaseModel):
    """Document insight response model"""
    document_id: str
    filename: str
    index_name: str
    query_count: int
    total_retrievals: int
    avg_relevance_score: float
    last_accessed: Optional[str]
    upload_date: Optional[str]
    chunk_count: int
    avg_chunk_retrieval: float
    retrieval_rate: float
    queries_per_day: float

class UsageTrends(BaseModel):
    """Usage trends response model"""
    daily_requests: List[Dict[str, Any]]
    hourly_pattern: List[Dict[str, Any]]
    weekly_growth_rate: float
    peak_hour: int
    peak_hour_requests: int

class BusinessReport(BaseModel):
    """Comprehensive business report model"""
    report_period_days: int
    generated_at: str
    executive_summary: Dict[str, Any]
    cost_analysis: Dict[str, Any]
    usage_metrics: Dict[str, Any]
    model_performance: List[Dict[str, Any]]
    document_insights: List[Dict[str, Any]]
    trends: Dict[str, Any]
    business_insights: List[str]
    recommendations: List[str]

class SystemHealth(BaseModel):
    """System health metrics"""
    cpu_usage: float
    memory_usage: float
    disk_usage: float
    gpu_usage: float
    gpu_memory: float
    active_requests: int
    status: str

# API Endpoints

@router.get(
    "/summary",
    response_model=UsageSummaryResponse,
    summary="Get usage summary",
    description="Get comprehensive usage summary for the specified time period."
)
async def get_usage_summary(
    days: int = Query(7, ge=1, le=365, description="Number of days to analyze")
) -> UsageSummaryResponse:
    """
    Get usage summary for the last N days.
    
    Includes:
    - Total requests and tokens
    - Average response time and success rate
    - RAG usage statistics
    - Cost savings estimation
    - Top performing models
    """
    try:
        analytics = get_analytics_service()
        summary = await analytics.get_usage_summary(days)
        
        if not summary:
            # Return empty summary if no data
            return UsageSummaryResponse(
                period_days=days,
                total_requests=0,
                total_tokens=0,
                avg_response_time=0.0,
                success_rate=100.0,
                rag_usage_rate=0.0,
                estimated_cost_savings=0.0,
                top_models=[]
            )
        
        return UsageSummaryResponse(**summary)
        
    except Exception as e:
        logger.error(f"Failed to get usage summary: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve usage summary: {str(e)}"
        )

@router.get(
    "/models",
    response_model=List[ModelStatistics],
    summary="Get model statistics",
    description="Get comprehensive statistics for all models including performance metrics."
)
async def get_model_statistics() -> List[ModelStatistics]:
    """
    Get detailed statistics for all models.
    
    Includes:
    - Usage counts and token statistics
    - Performance metrics (response time, success rate)
    - Efficiency scores and tokens per second
    - Error counts and reliability metrics
    """
    try:
        analytics = get_analytics_service()
        stats = await analytics.get_model_statistics()
        
        return [ModelStatistics(**stat) for stat in stats]
        
    except Exception as e:
        logger.error(f"Failed to get model statistics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve model statistics: {str(e)}"
        )

@router.get(
    "/documents",
    response_model=List[DocumentInsight],
    summary="Get document insights",
    description="Get usage insights for documents including popularity and engagement metrics."
)
async def get_document_insights(
    limit: int = Query(20, ge=1, le=100, description="Maximum number of documents to return")
) -> List[DocumentInsight]:
    """
    Get document usage insights.
    
    Includes:
    - Query frequency and retrieval statistics
    - Relevance scores and engagement metrics
    - Popularity trends and usage patterns
    """
    try:
        analytics = get_analytics_service()
        insights = await analytics.get_document_insights(limit)
        
        return [DocumentInsight(**insight) for insight in insights]
        
    except Exception as e:
        logger.error(f"Failed to get document insights: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve document insights: {str(e)}"
        )

@router.get(
    "/trends",
    response_model=UsageTrends,
    summary="Get usage trends",
    description="Get usage trends and patterns over time including growth analysis."
)
async def get_usage_trends(
    days: int = Query(30, ge=7, le=365, description="Number of days to analyze")
) -> UsageTrends:
    """
    Get usage trends and patterns.
    
    Includes:
    - Daily request patterns
    - Hourly usage distribution
    - Growth rate analysis
    - Peak usage identification
    """
    try:
        analytics = get_analytics_service()
        trends = await analytics.get_usage_trends(days)
        
        if not trends:
            return UsageTrends(
                daily_requests=[],
                hourly_pattern=[],
                weekly_growth_rate=0.0,
                peak_hour=12,
                peak_hour_requests=0
            )
        
        return UsageTrends(**trends)
        
    except Exception as e:
        logger.error(f"Failed to get usage trends: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve usage trends: {str(e)}"
        )

@router.get(
    "/business-report",
    response_model=BusinessReport,
    summary="Generate business report",
    description="Generate comprehensive business intelligence report with ROI analysis."
)
async def generate_business_report(
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze")
) -> BusinessReport:
    """
    Generate comprehensive business intelligence report.
    
    Includes:
    - Executive summary with key metrics
    - Cost analysis and ROI calculations
    - Performance insights and recommendations
    - Growth trends and usage patterns
    """
    try:
        analytics = get_analytics_service()
        report = await analytics.generate_business_report(days)
        
        if not report:
            # Return minimal report if no data
            return BusinessReport(
                report_period_days=days,
                generated_at=datetime.now().isoformat(),
                executive_summary={},
                cost_analysis={},
                usage_metrics={},
                model_performance=[],
                document_insights=[],
                trends={},
                business_insights=[],
                recommendations=["Start using the platform to generate analytics data"]
            )
        
        return BusinessReport(**report)
        
    except Exception as e:
        logger.error(f"Failed to generate business report: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate business report: {str(e)}"
        )

@router.get(
    "/health",
    response_model=SystemHealth,
    summary="Get system health",
    description="Get current system health and performance metrics."
)
async def get_system_health() -> SystemHealth:
    """
    Get current system health metrics.
    
    Includes:
    - CPU, memory, and disk usage
    - GPU utilization (if available)
    - Active request count
    - Overall system status
    """
    try:
        analytics = get_analytics_service()
        
        # Get metrics directly without the expensive collect_system_metrics call
        import psutil
        
        # Use non-blocking CPU measurement
        cpu_percent = psutil.cpu_percent(interval=None)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # Determine system status
        status = "healthy"
        if cpu_percent > 80 or memory.percent > 85 or (disk.used / disk.total * 100) > 90:
            status = "warning"
        if cpu_percent > 95 or memory.percent > 95 or (disk.used / disk.total * 100) > 95:
            status = "critical"
        
        return SystemHealth(
            cpu_usage=round(cpu_percent, 2),
            memory_usage=round(memory.percent, 2),
            disk_usage=round((disk.used / disk.total * 100), 2),
            gpu_usage=0.0,  # Would need GPUtil for actual GPU metrics
            gpu_memory=0.0,
            active_requests=len(analytics._active_sessions),
            status=status
        )
        
    except Exception as e:
        logger.error(f"Failed to get system health: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve system health: {str(e)}"
        )

@router.get(
    "/export",
    summary="Export analytics data",
    description="Export analytics data in JSON or CSV format."
)
async def export_analytics_data(
    format: str = Query("json", regex="^(json|csv)$", description="Export format: json or csv"),
    days: int = Query(30, ge=1, le=365, description="Number of days to export")
):
    """
    Export analytics data in specified format.
    
    Supports:
    - JSON format: Complete structured data
    - CSV format: Simplified tabular data
    """
    try:
        analytics = get_analytics_service()
        data = await analytics.export_data(format, days)
        
        if data is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported export format: {format}"
            )
        
        # Set appropriate content type
        media_type = "application/json" if format == "json" else "text/csv"
        filename = f"analytics_{datetime.now().strftime('%Y%m%d')}_{days}days.{format}"
        
        from fastapi.responses import Response
        
        return Response(
            content=data,
            media_type=media_type,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to export analytics data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to export data: {str(e)}"
        )

@router.post(
    "/cleanup",
    summary="Cleanup old data",
    description="Remove analytics data older than specified days to manage database size."
)
async def cleanup_analytics_data(
    days_to_keep: int = Query(90, ge=7, le=365, description="Days of data to keep")
):
    """
    Clean up old analytics data.
    
    Removes:
    - Request logs older than specified days
    - System metrics older than specified days
    - Maintains model and document statistics
    """
    try:
        analytics = get_analytics_service()
        await analytics.cleanup_old_data(days_to_keep)
        
        return {
            "success": True,
            "message": f"Cleaned up analytics data older than {days_to_keep} days",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to cleanup analytics data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cleanup data: {str(e)}"
        )

@router.get(
    "/realtime",
    summary="Get real-time metrics",
    description="Get real-time system and usage metrics for dashboard updates."
)
async def get_realtime_metrics():
    """
    Get real-time metrics for live dashboard updates.
    
    Returns:
    - Current system performance
    - Active session count
    - Recent request statistics
    """
    try:
        analytics = get_analytics_service()
        
        # Get summary for last hour
        summary = await analytics.get_usage_summary(days=1)  # Last 24 hours
        
        # Get system metrics
        health = await get_system_health()
        
        # Recent activity (last hour)
        recent_requests = summary.get('total_requests', 0)
        
        return {
            "timestamp": datetime.now().isoformat(),
            "requests_last_24h": recent_requests,
            "tokens_last_24h": summary.get('total_tokens', 0),
            "avg_response_time": summary.get('avg_response_time', 0.0),
            "success_rate": summary.get('success_rate', 100.0),
            "active_sessions": len(analytics._active_sessions),
            "system_health": {
                "cpu_usage": health.cpu_usage,
                "memory_usage": health.memory_usage,
                "disk_usage": health.disk_usage,
                "status": health.status
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to get realtime metrics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve realtime metrics: {str(e)}"
        )