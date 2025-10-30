"""
Analytics Service
Handles data collection, processing, and business intelligence for the platform.
"""

import asyncio
import json
import psutil
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from uuid import uuid4
import threading
from concurrent.futures import ThreadPoolExecutor
from functools import lru_cache

from core.analytics_db import (
    AnalyticsDatabase, 
    RequestLog, 
    DocumentAnalytics, 
    ModelUsage, 
    UserSession, 
    SystemMetrics,
    get_analytics_db
)
from utils.logger import get_logger
from utils.config import get_settings

logger = get_logger(__name__)

class AnalyticsService:
    """
    Main analytics service for data collection and business intelligence.
    Provides non-blocking data collection and comprehensive reporting.
    """
    
    def __init__(self):
        self.db = get_analytics_db()
        self.settings = get_settings()
        self._active_sessions: Dict[str, UserSession] = {}
        self._system_metrics_task: Optional[asyncio.Task] = None
        self._executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="analytics")
        
        # Cache for frequently accessed data
        self._cache = {}
        self._cache_timestamps = {}
        self._cache_ttl = 30  # 30 seconds cache TTL
        
        # Start background tasks
        asyncio.create_task(self._start_background_tasks())
    
    async def _start_background_tasks(self):
        """Start background monitoring tasks"""
        try:
            # Start system metrics collection every 5 minutes
            self._system_metrics_task = asyncio.create_task(
                self._collect_system_metrics_periodically()
            )
            logger.info("Analytics background tasks started")
        except Exception as e:
            logger.error(f"Failed to start analytics background tasks: {e}")
    
    async def _collect_system_metrics_periodically(self):
        """Collect system metrics every 5 minutes"""
        while True:
            try:
                await asyncio.sleep(300)  # 5 minutes
                await self.collect_system_metrics()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in periodic system metrics collection: {e}")
                await asyncio.sleep(60)  # Wait 1 minute before retrying
    
    def _is_cache_valid(self, key: str) -> bool:
        """Check if cached data is still valid"""
        if key not in self._cache_timestamps:
            return False
        return (time.time() - self._cache_timestamps[key]) < self._cache_ttl
    
    def _get_cached(self, key: str) -> Optional[Any]:
        """Get cached data if valid"""
        if self._is_cache_valid(key):
            return self._cache.get(key)
        return None
    
    def _set_cache(self, key: str, data: Any):
        """Set cached data with timestamp"""
        self._cache[key] = data
        self._cache_timestamps[key] = time.time()
    
    async def log_request_async(self, 
                               endpoint: str,
                               method: str = "POST",
                               model_name: Optional[str] = None,
                               prompt_length: int = 0,
                               response_length: int = 0,
                               response_time: float = 0.0,
                               tokens_generated: int = 0,
                               status_code: int = 200,
                               user_id: Optional[str] = None,
                               session_id: Optional[str] = None,
                               rag_enabled: bool = False,
                               indices_used: Optional[List[str]] = None,
                               search_type: Optional[str] = None,
                               error_message: Optional[str] = None,
                               guardrails_applied: bool = False,
                               input_filtered: bool = False,
                               output_filtered: bool = False) -> int:
        """
        Log a request asynchronously (non-blocking).
        Returns request ID or -1 if failed.
        """
        try:
            log_entry = RequestLog(
                timestamp=datetime.now(),
                endpoint=endpoint,
                method=method,
                model_name=model_name,
                prompt_length=prompt_length,
                response_length=response_length,
                response_time=response_time,
                tokens_generated=tokens_generated,
                status_code=status_code,
                user_id=user_id,
                session_id=session_id,
                rag_enabled=rag_enabled,
                indices_used=json.dumps(indices_used) if indices_used else None,
                search_type=search_type,
                error_message=error_message,
                guardrails_applied=guardrails_applied,
                input_filtered=input_filtered,
                output_filtered=output_filtered
            )
            
            # Run database operation in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            request_id = await loop.run_in_executor(
                self._executor, 
                self.db.log_request, 
                log_entry
            )
            
            # Update session if session_id provided
            if session_id:
                await self._update_session_stats(session_id, tokens_generated, response_time)
            
            return request_id
            
        except Exception as e:
            logger.error(f"Failed to log request asynchronously: {e}")
            return -1
    
    async def _update_session_stats(self, session_id: str, tokens: int, response_time: float):
        """Update session statistics"""
        try:
            if session_id not in self._active_sessions:
                self._active_sessions[session_id] = UserSession(
                    session_id=session_id,
                    start_time=datetime.now(),
                    total_requests=0,
                    total_tokens=0,
                    avg_response_time=0.0
                )
            
            session = self._active_sessions[session_id]
            session.total_requests += 1
            session.total_tokens += tokens
            session.avg_response_time = (
                (session.avg_response_time * (session.total_requests - 1) + response_time) 
                / session.total_requests
            )
            session.end_time = datetime.now()
            
        except Exception as e:
            logger.error(f"Failed to update session stats: {e}")
    
    async def track_document_query(self, 
                                  document_id: str,
                                  filename: str,
                                  index_name: str,
                                  relevance_score: float = 0.0,
                                  chunks_retrieved: int = 0):
        """Track document query for analytics"""
        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                self._executor,
                self.db.update_document_analytics,
                document_id, filename, index_name, relevance_score, chunks_retrieved
            )
        except Exception as e:
            logger.error(f"Failed to track document query: {e}")
    
    async def collect_system_metrics(self) -> Optional[int]:
        """Collect current system metrics"""
        try:
            # Get CPU usage (non-blocking, returns last cached value)
            cpu_percent = psutil.cpu_percent(interval=None)
            
            # Get memory usage
            memory = psutil.virtual_memory()
            memory_percent = memory.percent
            
            # Get disk usage
            disk = psutil.disk_usage('/')
            disk_percent = (disk.used / disk.total) * 100
            
            # Try to get GPU metrics (if available)
            gpu_usage = 0.0
            gpu_memory = 0.0
            try:
                import GPUtil
                gpus = GPUtil.getGPUs()
                if gpus:
                    gpu = gpus[0]  # Use first GPU
                    gpu_usage = gpu.load * 100
                    gpu_memory = gpu.memoryUtil * 100
            except ImportError:
                pass  # GPU monitoring not available
            
            # Create metrics object
            metrics = SystemMetrics(
                timestamp=datetime.now(),
                cpu_usage=cpu_percent,
                memory_usage=memory_percent,
                disk_usage=disk_percent,
                gpu_usage=gpu_usage,
                gpu_memory=gpu_memory,
                active_requests=len(self._active_sessions),  # Approximate
                queue_length=0,  # Would need to be tracked separately
                embedder_cache_size=0,  # Would need to be tracked separately
                vector_store_size=0  # Would need to be tracked separately
            )
            
            # Log metrics asynchronously
            loop = asyncio.get_event_loop()
            metrics_id = await loop.run_in_executor(
                self._executor,
                self.db.log_system_metrics,
                metrics
            )
            
            return metrics_id
            
        except Exception as e:
            logger.error(f"Failed to collect system metrics: {e}")
            return None
    
    async def get_usage_summary(self, days: int = 7) -> Dict[str, Any]:
        """Get comprehensive usage summary with caching"""
        cache_key = f"usage_summary_{days}"
        
        # Check cache first
        cached_data = self._get_cached(cache_key)
        if cached_data is not None:
            return cached_data
        
        try:
            loop = asyncio.get_event_loop()
            summary = await loop.run_in_executor(
                self._executor,
                self.db.get_usage_summary,
                days
            )
            
            # Add cost savings calculation
            if summary.get('total_tokens', 0) > 0:
                # Estimate cost savings vs cloud APIs
                # Assuming $0.002 per 1K tokens (GPT-3.5 pricing)
                estimated_cloud_cost = (summary['total_tokens'] / 1000) * 0.002
                summary['estimated_cost_savings'] = round(estimated_cloud_cost, 2)
            else:
                summary['estimated_cost_savings'] = 0.0
            
            # Cache the result
            self._set_cache(cache_key, summary)
            return summary
            
        except Exception as e:
            logger.error(f"Failed to get usage summary: {e}")
            return {}
    
    async def get_model_statistics(self) -> List[Dict[str, Any]]:
        """Get comprehensive model statistics with caching"""
        cache_key = "model_statistics"
        
        # Check cache first
        cached_data = self._get_cached(cache_key)
        if cached_data is not None:
            return cached_data
        
        try:
            loop = asyncio.get_event_loop()
            stats = await loop.run_in_executor(
                self._executor,
                self.db.get_model_stats
            )
            
            # Add efficiency metrics
            for model_stat in stats:
                if model_stat['total_requests'] > 0:
                    # Tokens per second
                    total_time = model_stat['avg_response_time'] * model_stat['total_requests']
                    if total_time > 0:
                        model_stat['tokens_per_second'] = round(
                            model_stat['total_tokens'] / total_time, 2
                        )
                    else:
                        model_stat['tokens_per_second'] = 0.0
                    
                    # Efficiency score (tokens per second per response time)
                    if model_stat['avg_response_time'] > 0:
                        model_stat['efficiency_score'] = round(
                            model_stat['tokens_per_second'] / model_stat['avg_response_time'], 2
                        )
                    else:
                        model_stat['efficiency_score'] = 0.0
                else:
                    model_stat['tokens_per_second'] = 0.0
                    model_stat['efficiency_score'] = 0.0
            
            # Cache the result
            self._set_cache(cache_key, stats)
            return stats
            
        except Exception as e:
            logger.error(f"Failed to get model statistics: {e}")
            return []
    
    async def get_document_insights(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Get document usage insights"""
        try:
            loop = asyncio.get_event_loop()
            insights = await loop.run_in_executor(
                self._executor,
                self.db.get_document_stats,
                limit
            )
            
            # Add engagement metrics
            for doc in insights:
                if doc['chunk_count'] > 0:
                    doc['retrieval_rate'] = round(
                        (doc['total_retrievals'] / doc['chunk_count']) * 100, 2
                    )
                else:
                    doc['retrieval_rate'] = 0.0
                
                # Popularity score (queries per day since upload)
                if doc['upload_date']:
                    try:
                        upload_date = datetime.fromisoformat(doc['upload_date'])
                        days_since_upload = (datetime.now() - upload_date).days + 1
                        doc['queries_per_day'] = round(doc['query_count'] / days_since_upload, 2)
                    except:
                        doc['queries_per_day'] = 0.0
                else:
                    doc['queries_per_day'] = 0.0
            
            return insights
            
        except Exception as e:
            logger.error(f"Failed to get document insights: {e}")
            return []
    
    async def get_usage_trends(self, days: int = 30) -> Dict[str, Any]:
        """Get usage trends and patterns"""
        try:
            loop = asyncio.get_event_loop()
            trends = await loop.run_in_executor(
                self._executor,
                self.db.get_usage_trends,
                days
            )
            
            # Add trend analysis
            daily_requests = trends.get('daily_requests', [])
            if len(daily_requests) >= 2:
                # Calculate growth rate
                recent_avg = sum(d['requests'] for d in daily_requests[-7:]) / 7
                older_avg = sum(d['requests'] for d in daily_requests[-14:-7]) / 7 if len(daily_requests) >= 14 else recent_avg
                
                if older_avg > 0:
                    growth_rate = ((recent_avg - older_avg) / older_avg) * 100
                    trends['weekly_growth_rate'] = round(growth_rate, 2)
                else:
                    trends['weekly_growth_rate'] = 0.0
            else:
                trends['weekly_growth_rate'] = 0.0
            
            # Find peak usage hours
            hourly_pattern = trends.get('hourly_pattern', [])
            if hourly_pattern:
                peak_hour = max(hourly_pattern, key=lambda x: x['requests'])
                trends['peak_hour'] = peak_hour['hour']
                trends['peak_hour_requests'] = peak_hour['requests']
            else:
                trends['peak_hour'] = 12  # Default noon
                trends['peak_hour_requests'] = 0
            
            return trends
            
        except Exception as e:
            logger.error(f"Failed to get usage trends: {e}")
            return {}
    
    async def generate_business_report(self, days: int = 30) -> Dict[str, Any]:
        """Generate comprehensive business intelligence report"""
        try:
            # Gather all data concurrently
            summary_task = self.get_usage_summary(days)
            models_task = self.get_model_statistics()
            documents_task = self.get_document_insights(10)
            trends_task = self.get_usage_trends(days)
            
            summary, models, documents, trends = await asyncio.gather(
                summary_task, models_task, documents_task, trends_task
            )
            
            # Calculate business metrics
            total_tokens = summary.get('total_tokens', 0)
            total_requests = summary.get('total_requests', 0)
            
            # Productivity metrics
            avg_tokens_per_request = (total_tokens / total_requests) if total_requests > 0 else 0
            
            # Cost savings (vs different cloud providers)
            cost_comparisons = {
                'openai_gpt35': (total_tokens / 1000) * 0.002,  # $0.002/1K tokens
                'openai_gpt4': (total_tokens / 1000) * 0.03,    # $0.03/1K tokens
                'anthropic_claude': (total_tokens / 1000) * 0.008,  # $0.008/1K tokens
                'google_palm': (total_tokens / 1000) * 0.0005,  # $0.0005/1K tokens
            }
            
            # Calculate total potential savings
            total_savings = sum(cost_comparisons.values())
            
            # ROI calculation (assuming local hosting costs $500/month)
            monthly_hosting_cost = 500
            monthly_savings = total_savings * (30 / days) if days > 0 else 0
            roi_percentage = ((monthly_savings - monthly_hosting_cost) / monthly_hosting_cost * 100) if monthly_hosting_cost > 0 else 0
            
            # Generate insights and recommendations
            insights = []
            recommendations = []
            
            # Usage insights
            if total_requests > 0:
                if summary.get('rag_usage_rate', 0) > 50:
                    insights.append("High RAG usage indicates strong document intelligence adoption")
                else:
                    recommendations.append("Consider training users on document upload and RAG features")
                
                if summary.get('success_rate', 100) < 95:
                    recommendations.append("Investigate and address API errors to improve success rate")
                
                if avg_tokens_per_request < 100:
                    insights.append("Users are making short queries - consider prompt templates for more detailed responses")
                elif avg_tokens_per_request > 1000:
                    insights.append("Users are generating long-form content - ensure adequate compute resources")
            
            # Model performance insights
            if models:
                fastest_model = min(models, key=lambda x: x['avg_response_time'])
                most_used = max(models, key=lambda x: x['total_requests'])
                
                if fastest_model['model_name'] != most_used['model_name']:
                    recommendations.append(f"Consider promoting {fastest_model['model_name']} for faster responses")
            
            # Document insights
            if documents:
                popular_docs = [d for d in documents if d['query_count'] > 5]
                if len(popular_docs) < len(documents) / 2:
                    recommendations.append("Many documents are underutilized - consider content curation or search improvements")
            
            return {
                'report_period_days': days,
                'generated_at': datetime.now().isoformat(),
                'executive_summary': {
                    'total_requests': total_requests,
                    'total_tokens': total_tokens,
                    'avg_tokens_per_request': round(avg_tokens_per_request, 1),
                    'success_rate': summary.get('success_rate', 100),
                    'total_cost_savings': round(total_savings, 2),
                    'monthly_projected_savings': round(monthly_savings, 2),
                    'roi_percentage': round(roi_percentage, 1)
                },
                'cost_analysis': {
                    'local_hosting_cost_monthly': monthly_hosting_cost,
                    'cloud_cost_comparisons': {
                        k: round(v, 2) for k, v in cost_comparisons.items()
                    },
                    'total_potential_cloud_cost': round(total_savings, 2),
                    'savings_percentage': round((total_savings / (total_savings + monthly_hosting_cost) * 100), 1) if total_savings > 0 else 0
                },
                'usage_metrics': summary,
                'model_performance': models[:5],  # Top 5 models
                'document_insights': documents[:5],  # Top 5 documents
                'trends': trends,
                'business_insights': insights,
                'recommendations': recommendations
            }
            
        except Exception as e:
            logger.error(f"Failed to generate business report: {e}")
            return {}
    
    async def export_data(self, format: str = 'json', days: int = 30) -> Optional[str]:
        """Export analytics data in specified format"""
        try:
            report = await self.generate_business_report(days)
            
            if format.lower() == 'json':
                return json.dumps(report, indent=2, default=str)
            elif format.lower() == 'csv':
                # Simplified CSV export
                import csv
                import io
                
                output = io.StringIO()
                writer = csv.writer(output)
                
                # Write headers
                writer.writerow(['Metric', 'Value'])
                
                # Write executive summary
                summary = report.get('executive_summary', {})
                for key, value in summary.items():
                    writer.writerow([key.replace('_', ' ').title(), value])
                
                return output.getvalue()
            else:
                return None
                
        except Exception as e:
            logger.error(f"Failed to export data: {e}")
            return None
    
    async def cleanup_old_data(self, days_to_keep: int = 90):
        """Clean up old analytics data"""
        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                self._executor,
                self.db.cleanup_old_data,
                days_to_keep
            )
            logger.info(f"Cleaned up analytics data older than {days_to_keep} days")
        except Exception as e:
            logger.error(f"Failed to cleanup analytics data: {e}")
    
    def generate_session_id(self) -> str:
        """Generate a unique session ID"""
        return str(uuid4())
    
    async def cleanup(self):
        """Cleanup service resources"""
        try:
            if self._system_metrics_task:
                self._system_metrics_task.cancel()
                try:
                    await self._system_metrics_task
                except asyncio.CancelledError:
                    pass
            
            self._executor.shutdown(wait=True)
            logger.info("Analytics service cleaned up")
        except Exception as e:
            logger.error(f"Error during analytics service cleanup: {e}")

# Global instance
_analytics_service: Optional[AnalyticsService] = None

def get_analytics_service() -> AnalyticsService:
    """Get or create the analytics service instance"""
    global _analytics_service
    if _analytics_service is None:
        _analytics_service = AnalyticsService()
    return _analytics_service

async def cleanup_analytics_service():
    """Cleanup the analytics service"""
    global _analytics_service
    if _analytics_service:
        await _analytics_service.cleanup()
        _analytics_service = None