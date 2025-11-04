"""
Metabase Dataset Service
Handles Excel/CSV uploads, data processing, and database management for Metabase analytics.
Supports large file uploads and automatic table creation.
"""

import pandas as pd
import sqlite3
import hashlib
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
import re
from io import BytesIO
from fastapi import UploadFile
import aiofiles
import asyncio
from concurrent.futures import ThreadPoolExecutor

from utils.logger import get_logger
from utils.config import get_settings

logger = get_logger(__name__)


class MetabaseDatasetService:
    """
    Service for managing datasets uploaded to Metabase analytics.
    Handles Excel/CSV parsing, SQLite storage, and metadata management.
    """
    
    def __init__(self):
        self.settings = get_settings()
        self.metabase_dir = Path("metabase")
        self.data_dir = self.metabase_dir / "data"
        self.uploads_dir = self.data_dir / "uploads"
        
        # Create directories
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.uploads_dir.mkdir(parents=True, exist_ok=True)
        
        # Database paths
        self.metadata_db = self.data_dir / "uploaded_datasets.db"
        self.datasets_db = self.data_dir / "datasets.db"
        
        # Thread pool for heavy operations
        self._executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="dataset")
        
        # Initialize databases
        self._init_metadata_db()
        self._init_datasets_db()
    
    def _init_metadata_db(self):
        """Initialize metadata database for tracking uploaded datasets"""
        try:
            with sqlite3.connect(self.metadata_db) as conn:
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS datasets (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        original_filename TEXT NOT NULL,
                        table_name TEXT UNIQUE NOT NULL,
                        upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                        row_count INTEGER DEFAULT 0,
                        column_count INTEGER DEFAULT 0,
                        file_size INTEGER DEFAULT 0,
                        file_type TEXT,
                        description TEXT,
                        metadata TEXT,
                        status TEXT DEFAULT 'processing'
                    )
                """)
                
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS dashboard_configs (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        dataset_id INTEGER NOT NULL,
                        dashboard_id INTEGER,
                        metabase_url TEXT,
                        created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                        config TEXT,
                        FOREIGN KEY (dataset_id) REFERENCES datasets(id)
                    )
                """)
                
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS data_insights (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        dataset_id INTEGER NOT NULL,
                        insight_type TEXT NOT NULL,
                        title TEXT NOT NULL,
                        description TEXT,
                        severity TEXT DEFAULT 'info',
                        data TEXT,
                        created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (dataset_id) REFERENCES datasets(id)
                    )
                """)
                
                conn.commit()
                logger.info("Metadata database initialized")
                
        except Exception as e:
            logger.error(f"Failed to initialize metadata database: {e}")
            raise
    
    def _init_datasets_db(self):
        """Initialize the main datasets database (where actual data is stored)"""
        try:
            # Just ensure the database file exists
            if not self.datasets_db.exists():
                with sqlite3.connect(self.datasets_db) as conn:
                    conn.execute("SELECT 1")  # Create empty database
                logger.info("Datasets database initialized")
        except Exception as e:
            logger.error(f"Failed to initialize datasets database: {e}")
            raise
    
    def _sanitize_table_name(self, name: str) -> str:
        """Sanitize name to be a valid SQL table name"""
        # Remove file extension
        name = Path(name).stem
        # Replace invalid characters with underscore
        name = re.sub(r'[^a-zA-Z0-9_]', '_', name)
        # Ensure starts with letter
        if not name[0].isalpha():
            name = 'table_' + name
        # Add timestamp hash to ensure uniqueness
        timestamp_hash = hashlib.md5(str(datetime.now().timestamp()).encode()).hexdigest()[:8]
        return f"{name}_{timestamp_hash}".lower()
    
    async def upload_dataset(self, 
                           file: UploadFile,
                           name: Optional[str] = None,
                           description: Optional[str] = None) -> Dict[str, Any]:
        """
        Upload and process Excel/CSV file.
        Supports large files through chunked reading.
        """
        try:
            # Validate file type
            filename = file.filename
            file_ext = Path(filename).suffix.lower()
            
            if file_ext not in ['.csv', '.xlsx', '.xls']:
                raise ValueError(f"Unsupported file type: {file_ext}. Only CSV and Excel files are supported.")
            
            # Generate metadata
            dataset_name = name or Path(filename).stem
            table_name = self._sanitize_table_name(filename)
            
            # Save uploaded file
            upload_path = self.uploads_dir / f"{table_name}{file_ext}"
            
            # Read file in chunks to handle large files
            file_size = 0
            async with aiofiles.open(upload_path, 'wb') as f:
                while chunk := await file.read(1024 * 1024):  # 1MB chunks
                    await f.write(chunk)
                    file_size += len(chunk)
            
            logger.info(f"File saved: {upload_path} ({file_size} bytes)")
            
            # Process file in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                self._executor,
                self._process_uploaded_file,
                str(upload_path),
                table_name,
                dataset_name,
                filename,
                file_size,
                file_ext,
                description
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to upload dataset: {e}")
            raise
    
    def _process_uploaded_file(self,
                              file_path: str,
                              table_name: str,
                              dataset_name: str,
                              original_filename: str,
                              file_size: int,
                              file_ext: str,
                              description: Optional[str]) -> Dict[str, Any]:
        """Process uploaded file and store in database (runs in thread pool)"""
        try:
            # Read file based on type
            logger.info(f"Reading file: {file_path}")
            
            if file_ext == '.csv':
                # Try different encodings for CSV
                for encoding in ['utf-8', 'latin1', 'iso-8859-1', 'cp1252']:
                    try:
                        df = pd.read_csv(file_path, encoding=encoding, low_memory=False)
                        break
                    except UnicodeDecodeError:
                        continue
                else:
                    raise ValueError("Could not decode CSV file with any supported encoding")
            else:
                # Excel file
                df = pd.read_excel(file_path, engine='openpyxl')
            
            row_count, column_count = df.shape
            logger.info(f"Data loaded: {row_count} rows, {column_count} columns")
            
            # Clean column names
            df.columns = [self._sanitize_column_name(col) for col in df.columns]
            
            # Analyze data and generate metadata
            metadata = self._analyze_dataframe(df)
            
            # Store in datasets database
            with sqlite3.connect(self.datasets_db) as conn:
                df.to_sql(table_name, conn, if_exists='replace', index=False)
                logger.info(f"Data stored in table: {table_name}")
            
            # Store metadata
            with sqlite3.connect(self.metadata_db) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO datasets 
                    (name, original_filename, table_name, row_count, column_count, 
                     file_size, file_type, description, metadata, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ready')
                """, (
                    dataset_name,
                    original_filename,
                    table_name,
                    row_count,
                    column_count,
                    file_size,
                    file_ext,
                    description,
                    json.dumps(metadata)
                ))
                dataset_id = cursor.lastrowid
                conn.commit()
            
            # Generate automatic insights
            self._generate_insights(dataset_id, df, metadata)
            
            return {
                'dataset_id': dataset_id,
                'name': dataset_name,
                'table_name': table_name,
                'row_count': row_count,
                'column_count': column_count,
                'file_size': file_size,
                'metadata': metadata,
                'status': 'ready'
            }
            
        except Exception as e:
            logger.error(f"Failed to process uploaded file: {e}")
            
            # Update status to failed
            try:
                with sqlite3.connect(self.metadata_db) as conn:
                    conn.execute("""
                        UPDATE datasets 
                        SET status = 'failed', description = ?
                        WHERE table_name = ?
                    """, (str(e), table_name))
                    conn.commit()
            except:
                pass
            
            raise
    
    def _sanitize_column_name(self, name: str) -> str:
        """Sanitize column name for SQL"""
        # Convert to string and strip whitespace
        name = str(name).strip()
        # Replace spaces and invalid characters
        name = re.sub(r'[^a-zA-Z0-9_]', '_', name)
        # Ensure starts with letter
        if not name[0].isalpha():
            name = 'col_' + name
        return name.lower()
    
    def _analyze_dataframe(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Analyze dataframe and generate metadata"""
        metadata = {
            'columns': [],
            'numeric_columns': [],
            'categorical_columns': [],
            'date_columns': [],
            'missing_data': {},
            'summary_stats': {}
        }
        
        for col in df.columns:
            col_info = {
                'name': col,
                'dtype': str(df[col].dtype),
                'null_count': int(df[col].isnull().sum()),
                'null_percentage': float(df[col].isnull().sum() / len(df) * 100),
                'unique_count': int(df[col].nunique())
            }
            
            # Detect column type
            if pd.api.types.is_numeric_dtype(df[col]):
                col_info['type'] = 'numeric'
                metadata['numeric_columns'].append(col)
                
                # Add statistics for numeric columns
                col_info['min'] = float(df[col].min()) if not df[col].isnull().all() else None
                col_info['max'] = float(df[col].max()) if not df[col].isnull().all() else None
                col_info['mean'] = float(df[col].mean()) if not df[col].isnull().all() else None
                col_info['median'] = float(df[col].median()) if not df[col].isnull().all() else None
                
            elif pd.api.types.is_datetime64_any_dtype(df[col]):
                col_info['type'] = 'date'
                metadata['date_columns'].append(col)
                
            else:
                col_info['type'] = 'categorical'
                metadata['categorical_columns'].append(col)
                
                # Sample values for categorical
                if col_info['unique_count'] <= 20:
                    col_info['unique_values'] = df[col].dropna().unique().tolist()[:20]
            
            metadata['columns'].append(col_info)
            
            # Track missing data
            if col_info['null_count'] > 0:
                metadata['missing_data'][col] = col_info['null_count']
        
        # Overall summary
        metadata['summary_stats'] = {
            'total_rows': len(df),
            'total_columns': len(df.columns),
            'total_missing_values': int(df.isnull().sum().sum()),
            'memory_usage_mb': float(df.memory_usage(deep=True).sum() / 1024 / 1024)
        }
        
        return metadata
    
    def _generate_insights(self, dataset_id: int, df: pd.DataFrame, metadata: Dict[str, Any]):
        """Generate automatic insights from the data"""
        insights = []
        
        try:
            # Missing data insights
            if metadata['summary_stats']['total_missing_values'] > 0:
                missing_pct = (metadata['summary_stats']['total_missing_values'] / 
                             (len(df) * len(df.columns)) * 100)
                
                severity = 'warning' if missing_pct > 10 else 'info'
                insights.append({
                    'type': 'data_quality',
                    'title': f'{missing_pct:.1f}% Missing Data Detected',
                    'description': f'Dataset contains {metadata["summary_stats"]["total_missing_values"]} missing values across {len(metadata["missing_data"])} columns.',
                    'severity': severity,
                    'data': json.dumps(metadata['missing_data'])
                })
            
            # Numeric column insights
            for col in metadata['numeric_columns']:
                col_data = df[col].dropna()
                if len(col_data) > 0:
                    # Check for outliers (values beyond 3 std deviations)
                    mean = col_data.mean()
                    std = col_data.std()
                    if std > 0:
                        outliers = col_data[(col_data < mean - 3*std) | (col_data > mean + 3*std)]
                        if len(outliers) > 0:
                            insights.append({
                                'type': 'outliers',
                                'title': f'Outliers Detected in {col}',
                                'description': f'{len(outliers)} outlier values found ({len(outliers)/len(col_data)*100:.1f}% of data)',
                                'severity': 'info',
                                'data': json.dumps({'column': col, 'outlier_count': len(outliers)})
                            })
            
            # Categorical insights
            for col in metadata['categorical_columns']:
                unique_count = df[col].nunique()
                if unique_count == 1:
                    insights.append({
                        'type': 'data_quality',
                        'title': f'Constant Column: {col}',
                        'description': f'Column "{col}" has only one unique value',
                        'severity': 'warning',
                        'data': json.dumps({'column': col, 'value': str(df[col].iloc[0])})
                    })
                elif unique_count == len(df):
                    insights.append({
                        'type': 'data_quality',
                        'title': f'Unique Identifier: {col}',
                        'description': f'Column "{col}" appears to be a unique identifier (all values are unique)',
                        'severity': 'info',
                        'data': json.dumps({'column': col})
                    })
            
            # Store insights
            with sqlite3.connect(self.metadata_db) as conn:
                for insight in insights:
                    conn.execute("""
                        INSERT INTO data_insights 
                        (dataset_id, insight_type, title, description, severity, data)
                        VALUES (?, ?, ?, ?, ?, ?)
                    """, (
                        dataset_id,
                        insight['type'],
                        insight['title'],
                        insight['description'],
                        insight['severity'],
                        insight['data']
                    ))
                conn.commit()
            
            logger.info(f"Generated {len(insights)} insights for dataset {dataset_id}")
            
        except Exception as e:
            logger.error(f"Failed to generate insights: {e}")
    
    async def get_all_datasets(self) -> List[Dict[str, Any]]:
        """Get list of all uploaded datasets"""
        try:
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(self._executor, self._get_all_datasets_sync)
        except Exception as e:
            logger.error(f"Failed to get datasets: {e}")
            return []
    
    def _get_all_datasets_sync(self) -> List[Dict[str, Any]]:
        """Sync version of get all datasets"""
        try:
            with sqlite3.connect(self.metadata_db) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT id, name, original_filename, table_name, upload_date,
                           row_count, column_count, file_size, file_type, 
                           description, status
                    FROM datasets 
                    ORDER BY upload_date DESC
                """)
                
                datasets = []
                for row in cursor.fetchall():
                    datasets.append({
                        'id': row[0],
                        'name': row[1],
                        'original_filename': row[2],
                        'table_name': row[3],
                        'upload_date': row[4],
                        'row_count': row[5],
                        'column_count': row[6],
                        'file_size': row[7],
                        'file_type': row[8],
                        'description': row[9],
                        'status': row[10]
                    })
                
                return datasets
                
        except Exception as e:
            logger.error(f"Failed to get datasets sync: {e}")
            return []
    
    async def get_dataset(self, dataset_id: int) -> Optional[Dict[str, Any]]:
        """Get detailed information about a specific dataset"""
        try:
            with sqlite3.connect(self.metadata_db) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT id, name, original_filename, table_name, upload_date,
                           row_count, column_count, file_size, file_type,
                           description, metadata, status
                    FROM datasets 
                    WHERE id = ?
                """, (dataset_id,))
                
                row = cursor.fetchone()
                if not row:
                    return None
                
                dataset = {
                    'id': row[0],
                    'name': row[1],
                    'original_filename': row[2],
                    'table_name': row[3],
                    'upload_date': row[4],
                    'row_count': row[5],
                    'column_count': row[6],
                    'file_size': row[7],
                    'file_type': row[8],
                    'description': row[9],
                    'metadata': json.loads(row[10]) if row[10] else {},
                    'status': row[11]
                }
                
                # Get insights
                cursor.execute("""
                    SELECT insight_type, title, description, severity, data, created_date
                    FROM data_insights
                    WHERE dataset_id = ?
                    ORDER BY created_date DESC
                """, (dataset_id,))
                
                dataset['insights'] = []
                for insight_row in cursor.fetchall():
                    dataset['insights'].append({
                        'type': insight_row[0],
                        'title': insight_row[1],
                        'description': insight_row[2],
                        'severity': insight_row[3],
                        'data': json.loads(insight_row[4]) if insight_row[4] else {},
                        'created_date': insight_row[5]
                    })
                
                return dataset
                
        except Exception as e:
            logger.error(f"Failed to get dataset {dataset_id}: {e}")
            return None
    
    async def delete_dataset(self, dataset_id: int) -> bool:
        """Delete a dataset and all associated data"""
        try:
            # Get dataset info
            dataset = await self.get_dataset(dataset_id)
            if not dataset:
                return False
            
            table_name = dataset['table_name']
            
            # Delete from datasets database
            with sqlite3.connect(self.datasets_db) as conn:
                conn.execute(f"DROP TABLE IF EXISTS {table_name}")
                conn.commit()
            
            # Delete from metadata database
            with sqlite3.connect(self.metadata_db) as conn:
                conn.execute("DELETE FROM data_insights WHERE dataset_id = ?", (dataset_id,))
                conn.execute("DELETE FROM dashboard_configs WHERE dataset_id = ?", (dataset_id,))
                conn.execute("DELETE FROM datasets WHERE id = ?", (dataset_id,))
                conn.commit()
            
            # Delete uploaded file
            for ext in ['.csv', '.xlsx', '.xls']:
                file_path = self.uploads_dir / f"{table_name}{ext}"
                if file_path.exists():
                    file_path.unlink()
            
            logger.info(f"Deleted dataset {dataset_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete dataset {dataset_id}: {e}")
            return False
    
    async def query_dataset(self, dataset_id: int, limit: int = 100) -> Optional[Dict[str, Any]]:
        """Query dataset and return sample data"""
        try:
            dataset = await self.get_dataset(dataset_id)
            if not dataset:
                return None
            
            table_name = dataset['table_name']
            
            with sqlite3.connect(self.datasets_db) as conn:
                # Get sample data
                df = pd.read_sql_query(f"SELECT * FROM {table_name} LIMIT ?", conn, params=(limit,))
                
                return {
                    'dataset_id': dataset_id,
                    'table_name': table_name,
                    'columns': df.columns.tolist(),
                    'sample_rows': df.to_dict(orient='records'),
                    'sample_size': len(df),
                    'total_rows': dataset['row_count']
                }
                
        except Exception as e:
            logger.error(f"Failed to query dataset {dataset_id}: {e}")
            return None


# Global instance
_metabase_dataset_service: Optional[MetabaseDatasetService] = None

def get_metabase_dataset_service() -> MetabaseDatasetService:
    """Get or create the Metabase dataset service instance"""
    global _metabase_dataset_service
    if _metabase_dataset_service is None:
        _metabase_dataset_service = MetabaseDatasetService()
    return _metabase_dataset_service
