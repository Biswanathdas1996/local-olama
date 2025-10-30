"""
Analytics Database Models and Management
Handles data persistence for analytics, usage tracking, and business intelligence.
"""

import sqlite3
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path
import logging
from dataclasses import dataclass, asdict
from utils.logger import get_logger

logger = get_logger(__name__)

@dataclass
class RequestLog:
    """Individual request log entry"""
    id: Optional[int] = None
    timestamp: Optional[datetime] = None
    endpoint: str = ""
    method: str = "POST"
    model_name: Optional[str] = None
    prompt_length: int = 0
    response_length: int = 0
    response_time: float = 0.0
    tokens_generated: int = 0
    status_code: int = 200
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    rag_enabled: bool = False
    indices_used: Optional[str] = None  # JSON string of list
    search_type: Optional[str] = None
    error_message: Optional[str] = None
    guardrails_applied: bool = False
    input_filtered: bool = False
    output_filtered: bool = False

@dataclass
class DocumentAnalytics:
    """Document usage analytics"""
    id: Optional[int] = None
    document_id: str = ""
    filename: str = ""
    index_name: str = ""
    query_count: int = 0
    total_retrievals: int = 0
    avg_relevance_score: float = 0.0
    last_accessed: Optional[datetime] = None
    upload_date: Optional[datetime] = None
    file_size: int = 0
    chunk_count: int = 0
    avg_chunk_retrieval: float = 0.0

@dataclass
class ModelUsage:
    """Model performance and usage stats"""
    id: Optional[int] = None
    model_name: str = ""
    total_requests: int = 0
    total_tokens: int = 0
    avg_response_time: float = 0.0
    success_rate: float = 100.0
    last_used: Optional[datetime] = None
    total_errors: int = 0
    avg_prompt_length: float = 0.0
    avg_response_length: float = 0.0

@dataclass
class UserSession:
    """User session tracking"""
    id: Optional[int] = None
    session_id: str = ""
    user_id: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    total_requests: int = 0
    total_tokens: int = 0
    unique_models_used: int = 0
    documents_queried: int = 0
    avg_response_time: float = 0.0

@dataclass
class SystemMetrics:
    """System performance metrics"""
    id: Optional[int] = None
    timestamp: Optional[datetime] = None
    cpu_usage: float = 0.0
    memory_usage: float = 0.0
    disk_usage: float = 0.0
    gpu_usage: float = 0.0
    gpu_memory: float = 0.0
    active_requests: int = 0
    queue_length: int = 0
    embedder_cache_size: int = 0
    vector_store_size: int = 0

class AnalyticsDatabase:
    """
    Analytics database management class.
    Handles all data persistence for analytics and business intelligence.
    """
    
    def __init__(self, db_path: str = "data/analytics.db"):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_database()
    
    def _init_database(self):
        """Initialize database with all required tables"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("PRAGMA foreign_keys = ON")
                
                # Request logs table
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS request_logs (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                        endpoint TEXT NOT NULL,
                        method TEXT DEFAULT 'POST',
                        model_name TEXT,
                        prompt_length INTEGER DEFAULT 0,
                        response_length INTEGER DEFAULT 0,
                        response_time REAL DEFAULT 0.0,
                        tokens_generated INTEGER DEFAULT 0,
                        status_code INTEGER DEFAULT 200,
                        user_id TEXT,
                        session_id TEXT,
                        rag_enabled BOOLEAN DEFAULT FALSE,
                        indices_used TEXT,
                        search_type TEXT,
                        error_message TEXT,
                        guardrails_applied BOOLEAN DEFAULT FALSE,
                        input_filtered BOOLEAN DEFAULT FALSE,
                        output_filtered BOOLEAN DEFAULT FALSE
                    )
                """)
                
                # Document analytics table
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS document_analytics (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        document_id TEXT UNIQUE NOT NULL,
                        filename TEXT NOT NULL,
                        index_name TEXT NOT NULL,
                        query_count INTEGER DEFAULT 0,
                        total_retrievals INTEGER DEFAULT 0,
                        avg_relevance_score REAL DEFAULT 0.0,
                        last_accessed DATETIME,
                        upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                        file_size INTEGER DEFAULT 0,
                        chunk_count INTEGER DEFAULT 0,
                        avg_chunk_retrieval REAL DEFAULT 0.0
                    )
                """)
                
                # Model usage table
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS model_usage (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        model_name TEXT UNIQUE NOT NULL,
                        total_requests INTEGER DEFAULT 0,
                        total_tokens INTEGER DEFAULT 0,
                        avg_response_time REAL DEFAULT 0.0,
                        success_rate REAL DEFAULT 100.0,
                        last_used DATETIME,
                        total_errors INTEGER DEFAULT 0,
                        avg_prompt_length REAL DEFAULT 0.0,
                        avg_response_length REAL DEFAULT 0.0
                    )
                """)
                
                # User sessions table
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS user_sessions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        session_id TEXT UNIQUE NOT NULL,
                        user_id TEXT,
                        start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                        end_time DATETIME,
                        total_requests INTEGER DEFAULT 0,
                        total_tokens INTEGER DEFAULT 0,
                        unique_models_used INTEGER DEFAULT 0,
                        documents_queried INTEGER DEFAULT 0,
                        avg_response_time REAL DEFAULT 0.0
                    )
                """)
                
                # System metrics table
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS system_metrics (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                        cpu_usage REAL DEFAULT 0.0,
                        memory_usage REAL DEFAULT 0.0,
                        disk_usage REAL DEFAULT 0.0,
                        gpu_usage REAL DEFAULT 0.0,
                        gpu_memory REAL DEFAULT 0.0,
                        active_requests INTEGER DEFAULT 0,
                        queue_length INTEGER DEFAULT 0,
                        embedder_cache_size INTEGER DEFAULT 0,
                        vector_store_size INTEGER DEFAULT 0
                    )
                """)
                
                # Create indexes for better query performance
                conn.execute("CREATE INDEX IF NOT EXISTS idx_request_logs_timestamp ON request_logs(timestamp)")
                conn.execute("CREATE INDEX IF NOT EXISTS idx_request_logs_model ON request_logs(model_name)")
                conn.execute("CREATE INDEX IF NOT EXISTS idx_request_logs_session ON request_logs(session_id)")
                conn.execute("CREATE INDEX IF NOT EXISTS idx_document_analytics_index ON document_analytics(index_name)")
                conn.execute("CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON system_metrics(timestamp)")
                
                conn.commit()
                logger.info("Analytics database initialized successfully")
                
        except Exception as e:
            logger.error(f"Failed to initialize analytics database: {e}")
            raise
    
    def log_request(self, log_entry: RequestLog) -> int:
        """Log a request entry and return the inserted ID"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                data = asdict(log_entry)
                data.pop('id', None)  # Remove id field
                
                # Convert datetime to string if present
                if data.get('timestamp'):
                    data['timestamp'] = data['timestamp'].isoformat()
                
                # Convert lists to JSON strings
                if data.get('indices_used') and isinstance(data['indices_used'], list):
                    data['indices_used'] = json.dumps(data['indices_used'])
                
                columns = ', '.join(data.keys())
                placeholders = ', '.join(['?' for _ in data.keys()])
                
                cursor.execute(
                    f"INSERT INTO request_logs ({columns}) VALUES ({placeholders})",
                    list(data.values())
                )
                
                request_id = cursor.lastrowid
                conn.commit()
                
                # Update model usage stats
                self._update_model_usage(log_entry)
                
                return request_id
                
        except Exception as e:
            logger.error(f"Failed to log request: {e}")
            return -1
    
    def _update_model_usage(self, log_entry: RequestLog):
        """Update model usage statistics"""
        if not log_entry.model_name:
            return
            
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Get current stats
                cursor.execute(
                    "SELECT total_requests, total_tokens, avg_response_time, total_errors FROM model_usage WHERE model_name = ?",
                    (log_entry.model_name,)
                )
                result = cursor.fetchone()
                
                if result:
                    # Update existing record
                    total_requests, total_tokens, avg_response_time, total_errors = result
                    
                    new_total_requests = total_requests + 1
                    new_total_tokens = total_tokens + log_entry.tokens_generated
                    new_avg_response_time = ((avg_response_time * total_requests) + log_entry.response_time) / new_total_requests
                    new_total_errors = total_errors + (1 if log_entry.status_code >= 400 else 0)
                    new_success_rate = ((new_total_requests - new_total_errors) / new_total_requests) * 100
                    
                    cursor.execute("""
                        UPDATE model_usage 
                        SET total_requests = ?, total_tokens = ?, avg_response_time = ?, 
                            success_rate = ?, last_used = CURRENT_TIMESTAMP, total_errors = ?,
                            avg_prompt_length = (avg_prompt_length * ? + ?) / ?,
                            avg_response_length = (avg_response_length * ? + ?) / ?
                        WHERE model_name = ?
                    """, (
                        new_total_requests, new_total_tokens, new_avg_response_time,
                        new_success_rate, new_total_errors,
                        total_requests, log_entry.prompt_length, new_total_requests,
                        total_requests, log_entry.response_length, new_total_requests,
                        log_entry.model_name
                    ))
                else:
                    # Create new record
                    success_rate = 100.0 if log_entry.status_code < 400 else 0.0
                    total_errors = 1 if log_entry.status_code >= 400 else 0
                    
                    cursor.execute("""
                        INSERT INTO model_usage 
                        (model_name, total_requests, total_tokens, avg_response_time, 
                         success_rate, last_used, total_errors, avg_prompt_length, avg_response_length)
                        VALUES (?, 1, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?)
                    """, (
                        log_entry.model_name, log_entry.tokens_generated, log_entry.response_time,
                        success_rate, total_errors, log_entry.prompt_length, log_entry.response_length
                    ))
                
                conn.commit()
                
        except Exception as e:
            logger.error(f"Failed to update model usage: {e}")
    
    def update_document_analytics(self, doc_id: str, filename: str, index_name: str, 
                                 relevance_score: float = 0.0, chunks_retrieved: int = 0):
        """Update document analytics when a document is queried"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Check if document exists
                cursor.execute(
                    "SELECT query_count, total_retrievals, avg_relevance_score, avg_chunk_retrieval FROM document_analytics WHERE document_id = ?",
                    (doc_id,)
                )
                result = cursor.fetchone()
                
                if result:
                    # Update existing record
                    query_count, total_retrievals, avg_relevance_score, avg_chunk_retrieval = result
                    
                    new_query_count = query_count + 1
                    new_total_retrievals = total_retrievals + chunks_retrieved
                    new_avg_relevance = ((avg_relevance_score * query_count) + relevance_score) / new_query_count
                    new_avg_chunk_retrieval = new_total_retrievals / new_query_count
                    
                    cursor.execute("""
                        UPDATE document_analytics 
                        SET query_count = ?, total_retrievals = ?, avg_relevance_score = ?, 
                            last_accessed = CURRENT_TIMESTAMP, avg_chunk_retrieval = ?
                        WHERE document_id = ?
                    """, (new_query_count, new_total_retrievals, new_avg_relevance, 
                          new_avg_chunk_retrieval, doc_id))
                else:
                    # Create new record
                    cursor.execute("""
                        INSERT INTO document_analytics 
                        (document_id, filename, index_name, query_count, total_retrievals, 
                         avg_relevance_score, last_accessed, avg_chunk_retrieval)
                        VALUES (?, ?, ?, 1, ?, ?, CURRENT_TIMESTAMP, ?)
                    """, (doc_id, filename, index_name, chunks_retrieved, relevance_score, chunks_retrieved))
                
                conn.commit()
                
        except Exception as e:
            logger.error(f"Failed to update document analytics: {e}")
    
    def log_system_metrics(self, metrics: SystemMetrics) -> int:
        """Log system performance metrics"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                data = asdict(metrics)
                data.pop('id', None)
                
                if data.get('timestamp'):
                    data['timestamp'] = data['timestamp'].isoformat()
                
                columns = ', '.join(data.keys())
                placeholders = ', '.join(['?' for _ in data.keys()])
                
                cursor.execute(
                    f"INSERT INTO system_metrics ({columns}) VALUES ({placeholders})",
                    list(data.values())
                )
                
                metrics_id = cursor.lastrowid
                conn.commit()
                return metrics_id
                
        except Exception as e:
            logger.error(f"Failed to log system metrics: {e}")
            return -1
    
    def get_usage_summary(self, days: int = 7) -> Dict[str, Any]:
        """Get usage summary for the last N days"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                since_date = datetime.now() - timedelta(days=days)
                
                # Total requests
                cursor.execute(
                    "SELECT COUNT(*) FROM request_logs WHERE timestamp >= ?",
                    (since_date.isoformat(),)
                )
                total_requests = cursor.fetchone()[0]
                
                # Total tokens
                cursor.execute(
                    "SELECT SUM(tokens_generated) FROM request_logs WHERE timestamp >= ?",
                    (since_date.isoformat(),)
                )
                total_tokens = cursor.fetchone()[0] or 0
                
                # Average response time
                cursor.execute(
                    "SELECT AVG(response_time) FROM request_logs WHERE timestamp >= ?",
                    (since_date.isoformat(),)
                )
                avg_response_time = cursor.fetchone()[0] or 0.0
                
                # Most used models
                cursor.execute("""
                    SELECT model_name, COUNT(*) as count 
                    FROM request_logs 
                    WHERE timestamp >= ? AND model_name IS NOT NULL
                    GROUP BY model_name 
                    ORDER BY count DESC 
                    LIMIT 5
                """, (since_date.isoformat(),))
                top_models = [{"model": row[0], "count": row[1]} for row in cursor.fetchall()]
                
                # Success rate
                cursor.execute(
                    "SELECT COUNT(*) FROM request_logs WHERE timestamp >= ? AND status_code < 400",
                    (since_date.isoformat(),)
                )
                successful_requests = cursor.fetchone()[0]
                success_rate = (successful_requests / total_requests * 100) if total_requests > 0 else 100.0
                
                # RAG usage
                cursor.execute(
                    "SELECT COUNT(*) FROM request_logs WHERE timestamp >= ? AND rag_enabled = 1",
                    (since_date.isoformat(),)
                )
                rag_requests = cursor.fetchone()[0]
                rag_usage_rate = (rag_requests / total_requests * 100) if total_requests > 0 else 0.0
                
                return {
                    "period_days": days,
                    "total_requests": total_requests,
                    "total_tokens": total_tokens,
                    "avg_response_time": round(avg_response_time, 3),
                    "success_rate": round(success_rate, 2),
                    "rag_usage_rate": round(rag_usage_rate, 2),
                    "top_models": top_models
                }
                
        except Exception as e:
            logger.error(f"Failed to get usage summary: {e}")
            return {}
    
    def get_model_stats(self) -> List[Dict[str, Any]]:
        """Get comprehensive model statistics"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute("""
                    SELECT model_name, total_requests, total_tokens, avg_response_time,
                           success_rate, last_used, total_errors, avg_prompt_length, avg_response_length
                    FROM model_usage 
                    ORDER BY total_requests DESC
                """)
                
                models = []
                for row in cursor.fetchall():
                    models.append({
                        "model_name": row[0],
                        "total_requests": row[1],
                        "total_tokens": row[2],
                        "avg_response_time": round(row[3], 3),
                        "success_rate": round(row[4], 2),
                        "last_used": row[5],
                        "total_errors": row[6],
                        "avg_prompt_length": round(row[7], 1),
                        "avg_response_length": round(row[8], 1)
                    })
                
                return models
                
        except Exception as e:
            logger.error(f"Failed to get model stats: {e}")
            return []
    
    def get_document_stats(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Get document usage statistics"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute("""
                    SELECT document_id, filename, index_name, query_count, total_retrievals,
                           avg_relevance_score, last_accessed, upload_date, chunk_count, avg_chunk_retrieval
                    FROM document_analytics 
                    ORDER BY query_count DESC
                    LIMIT ?
                """, (limit,))
                
                documents = []
                for row in cursor.fetchall():
                    documents.append({
                        "document_id": row[0],
                        "filename": row[1],
                        "index_name": row[2],
                        "query_count": row[3],
                        "total_retrievals": row[4],
                        "avg_relevance_score": round(row[5], 3),
                        "last_accessed": row[6],
                        "upload_date": row[7],
                        "chunk_count": row[8],
                        "avg_chunk_retrieval": round(row[9], 2)
                    })
                
                return documents
                
        except Exception as e:
            logger.error(f"Failed to get document stats: {e}")
            return []
    
    def get_usage_trends(self, days: int = 30) -> Dict[str, List]:
        """Get usage trends over time"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                since_date = datetime.now() - timedelta(days=days)
                
                # Daily request counts
                cursor.execute("""
                    SELECT DATE(timestamp) as date, COUNT(*) as requests
                    FROM request_logs 
                    WHERE timestamp >= ?
                    GROUP BY DATE(timestamp)
                    ORDER BY date
                """, (since_date.isoformat(),))
                
                daily_requests = [{"date": row[0], "requests": row[1]} for row in cursor.fetchall()]
                
                # Hourly patterns (last 7 days)
                week_ago = datetime.now() - timedelta(days=7)
                cursor.execute("""
                    SELECT strftime('%H', timestamp) as hour, COUNT(*) as requests
                    FROM request_logs 
                    WHERE timestamp >= ?
                    GROUP BY strftime('%H', timestamp)
                    ORDER BY hour
                """, (week_ago.isoformat(),))
                
                hourly_pattern = [{"hour": int(row[0]), "requests": row[1]} for row in cursor.fetchall()]
                
                return {
                    "daily_requests": daily_requests,
                    "hourly_pattern": hourly_pattern
                }
                
        except Exception as e:
            logger.error(f"Failed to get usage trends: {e}")
            return {"daily_requests": [], "hourly_pattern": []}
    
    def cleanup_old_data(self, days_to_keep: int = 90):
        """Clean up old analytics data to manage database size"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cutoff_date = datetime.now() - timedelta(days=days_to_keep)
                
                # Clean old request logs
                cursor = conn.cursor()
                cursor.execute(
                    "DELETE FROM request_logs WHERE timestamp < ?",
                    (cutoff_date.isoformat(),)
                )
                
                # Clean old system metrics
                cursor.execute(
                    "DELETE FROM system_metrics WHERE timestamp < ?",
                    (cutoff_date.isoformat(),)
                )
                
                conn.commit()
                logger.info(f"Cleaned up analytics data older than {days_to_keep} days")
                
        except Exception as e:
            logger.error(f"Failed to cleanup old data: {e}")

# Global instance
_analytics_db: Optional[AnalyticsDatabase] = None

def get_analytics_db() -> AnalyticsDatabase:
    """Get or create the analytics database instance"""
    global _analytics_db
    if _analytics_db is None:
        _analytics_db = AnalyticsDatabase()
    return _analytics_db