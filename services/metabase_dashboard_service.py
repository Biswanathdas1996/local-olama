"""
Metabase Dashboard Service
Handles automatic dashboard creation and Metabase API integration.
Provides AI-powered insights using local LLM.
"""

import aiohttp
import asyncio
import json
from typing import Dict, List, Optional, Any
from pathlib import Path
import sqlite3
from datetime import datetime

from services.metabase_dataset_service import get_metabase_dataset_service
from services.ollama_service import get_ollama_service
from utils.logger import get_logger
from utils.config import get_settings

logger = get_logger(__name__)


class MetabaseDashboardService:
    """
    Service for creating and managing Metabase dashboards.
    Integrates with Metabase API for automatic dashboard generation.
    """
    
    def __init__(self):
        self.settings = get_settings()
        # Use 127.0.0.1 for better offline compatibility (avoids DNS issues)
        self.metabase_url = "http://127.0.0.1:3001"
        self.session_token = None
        self.database_id = None
        
        self.metabase_dir = Path("metabase")
        self.data_dir = self.metabase_dir / "data"
        self.metadata_db = self.data_dir / "uploaded_datasets.db"
        self.datasets_db = self.data_dir / "datasets.db"
    
    def _get_connector(self):
        """Get aiohttp connector configured for reliable connection"""
        return aiohttp.TCPConnector(
            force_close=True,
            enable_cleanup_closed=True
        )
    
    async def check_status(self) -> Dict[str, Any]:
        """Check if Metabase is running and accessible"""
        # Try 127.0.0.1 first for best offline compatibility
        urls_to_try = [
            "http://127.0.0.1:3001",
            "http://localhost:3001",
            "http://[::1]:3001"  # IPv6 loopback
        ]
        
        for url in urls_to_try:
            try:
                connector = self._get_connector()
                
                async with aiohttp.ClientSession(connector=connector) as session:
                    async with session.get(
                        f"{url}/api/health",
                        timeout=aiohttp.ClientTimeout(total=3),
                        allow_redirects=False
                    ) as response:
                        if response.status == 200:
                            # Update the URL if we found a working one
                            self.metabase_url = url
                            logger.info(f"Metabase accessible at {url}")
                            return {
                                "status": "running",
                                "running": True,
                                "url": self.metabase_url,
                                "version": "0.50.x"
                            }
            except (aiohttp.ClientConnectorError, asyncio.TimeoutError, OSError):
                # Try next URL
                continue
            except Exception as e:
                logger.debug(f"Error trying {url}: {e}")
                continue
        
        # None of the URLs worked
        logger.warning("Metabase not accessible on any address (localhost, 127.0.0.1, or ::1)")
        return {
            "status": "stopped",
            "running": False,
            "message": "Metabase server is not running. Start it with: .\\scripts\\start-metabase-integrated.ps1"
        }
    
    async def configure_metabase(self, admin_email: str, admin_password: str) -> Dict[str, Any]:
        """
        Configure Metabase with admin credentials and database connection.
        This should be called on first-time setup.
        """
        try:
            connector = self._get_connector()
            async with aiohttp.ClientSession(connector=connector) as session:
                # Check if setup is needed
                async with session.get(f"{self.metabase_url}/api/session/properties") as response:
                    properties = await response.json()
                    
                    if properties.get("setup-token"):
                        # First-time setup needed
                        setup_data = {
                            "token": properties["setup-token"],
                            "user": {
                                "email": admin_email,
                                "first_name": "Admin",
                                "last_name": "User",
                                "password": admin_password,
                                "site_name": "Olama Analytics"
                            },
                            "prefs": {
                                "site_name": "Olama Analytics",
                                "allow_tracking": False
                            }
                        }
                        
                        async with session.post(
                            f"{self.metabase_url}/api/setup",
                            json=setup_data
                        ) as setup_response:
                            if setup_response.status == 200:
                                result = await setup_response.json()
                                self.session_token = result.get("id")
                                logger.info("Metabase initial setup completed")
                            else:
                                error = await setup_response.text()
                                raise Exception(f"Setup failed: {error}")
                    else:
                        # Already setup, just login
                        await self._login(admin_email, admin_password)
                
                # Add database connection
                await self._add_database_connection()
                
                return {
                    "success": True,
                    "message": "Metabase configured successfully",
                    "database_connected": True
                }
                
        except Exception as e:
            logger.error(f"Failed to configure Metabase: {e}")
            raise
    
    async def _login(self, email: str, password: str):
        """Login to Metabase and get session token"""
        try:
            connector = self._get_connector()
            async with aiohttp.ClientSession(connector=connector) as session:
                async with session.post(
                    f"{self.metabase_url}/api/session",
                    json={"username": email, "password": password}
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        self.session_token = result.get("id")
                        logger.info("Logged into Metabase successfully")
                    else:
                        error = await response.text()
                        raise Exception(f"Login failed: {error}")
        except Exception as e:
            logger.error(f"Failed to login to Metabase: {e}")
            raise
    
    async def _add_database_connection(self):
        """Add SQLite database connection to Metabase"""
        if not self.session_token:
            raise Exception("Not authenticated with Metabase")
        
        try:
            headers = {"X-Metabase-Session": self.session_token}
            
            # Check if database already exists
            connector = self._get_connector()
            async with aiohttp.ClientSession(connector=connector) as session:
                async with session.get(
                    f"{self.metabase_url}/api/database",
                    headers=headers
                ) as response:
                    if response.status == 200:
                        databases = await response.json()
                        for db in databases.get("data", []):
                            if db.get("name") == "Uploaded Datasets":
                                self.database_id = db["id"]
                                logger.info(f"Using existing database connection (ID: {self.database_id})")
                                return
                
                # Create new database connection
                db_config = {
                    "name": "Uploaded Datasets",
                    "engine": "sqlite",
                    "details": {
                        "db": str(self.datasets_db.absolute())
                    },
                    "auto_run_queries": True,
                    "is_full_sync": True
                }
                
                async with session.post(
                    f"{self.metabase_url}/api/database",
                    headers=headers,
                    json=db_config
                ) as response:
                    if response.status in [200, 201]:
                        result = await response.json()
                        self.database_id = result.get("id")
                        logger.info(f"Database connection created (ID: {self.database_id})")
                    else:
                        error = await response.text()
                        logger.warning(f"Failed to create database connection: {error}")
                        
        except Exception as e:
            logger.error(f"Failed to add database connection: {e}")
            raise
    
    async def create_dashboard(self, dataset_id: int) -> Dict[str, Any]:
        """
        Automatically create a Metabase dashboard for the dataset.
        Analyzes data and creates appropriate visualizations.
        """
        try:
            # Get dataset info
            dataset_service = get_metabase_dataset_service()
            dataset = await dataset_service.get_dataset(dataset_id)
            
            if not dataset:
                raise ValueError(f"Dataset {dataset_id} not found")
            
            # Check if Metabase is running
            status = await self.check_status()
            if not status.get("running", False):
                return {
                    "success": False,
                    "dataset_id": dataset_id,
                    "dashboard_id": None,
                    "dashboard_url": None,
                    "message": "Metabase server is not running. Please start it first.",
                    "charts_created": 0
                }
            
            # Try to authenticate and create dashboard
            try:
                # Authenticate with Metabase
                if not await self._authenticate():
                    logger.warning("Metabase authentication failed - may need initial setup")
                    return {
                        "success": False,
                        "dataset_id": dataset_id,
                        "dashboard_id": None,
                        "dashboard_url": f"{self.metabase_url}/setup",
                        "message": "Please complete Metabase setup at http://localhost:3001/setup first",
                        "charts_created": 0
                    }
                
                # Create database connection if needed
                if not self.database_id:
                    await self._ensure_database_connection()
                
                # Sync database metadata to ensure new tables are visible
                await self._sync_database_metadata()
                
                # Get the table ID for the dataset
                table_id = await self._get_table_id(dataset['table_name'])
                
                if not table_id:
                    raise ValueError(f"Table {dataset['table_name']} not found in Metabase")

                
                # Use Metabase's auto-dashboard feature instead of creating custom dashboard
                # This provides better interactive filtering and exploration
                # Add bordered=false and titled=false to hide the header
                dashboard_url = f"{self.metabase_url}/auto/dashboard/table/{table_id}?bordered=false&titled=false"
                await self._save_dashboard_url(dataset_id, dashboard_url)
                
                logger.info(f"Auto-dashboard URL generated for dataset {dataset_id}: {dashboard_url}")
                
                return {
                    "success": True,
                    "dataset_id": dataset_id,
                    "dashboard_id": table_id,  # Using table_id as reference
                    "dashboard_url": dashboard_url,
                    "message": f"Interactive dashboard created successfully",
                    "charts_created": 0  # Auto-dashboard creates charts dynamically
                }
                
            except Exception as e:
                logger.error(f"Failed to create Metabase dashboard: {e}")
                # Return a manual dashboard option
                return {
                    "success": False,
                    "dataset_id": dataset_id,
                    "dashboard_id": None,
                    "dashboard_url": f"{self.metabase_url}/browse",
                    "message": f"Auto-dashboard creation failed: {str(e)}. Please create manually in Metabase.",
                    "charts_created": 0
                }
            
        except Exception as e:
            logger.error(f"Failed to create dashboard: {e}")
            raise
    
    async def get_dashboard_url(self, dataset_id: int) -> Optional[str]:
        """Get the dashboard URL for a dataset"""
        try:
            with sqlite3.connect(self.metadata_db) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT metabase_url 
                    FROM dashboard_configs 
                    WHERE dataset_id = ? 
                    ORDER BY created_date DESC 
                    LIMIT 1
                """, (dataset_id,))
                
                result = cursor.fetchone()
                if result:
                    url = result[0]
                    # Normalize URL to use localhost for consistency
                    url = url.replace("http://127.0.0.1:3001", "http://localhost:3001")
                    url = url.replace("http://[::1]:3001", "http://localhost:3001")
                    return url
                
                # Return browse URL as fallback
                return f"{self.metabase_url}/browse"
                
        except Exception as e:
            logger.error(f"Failed to get dashboard URL: {e}")
            return None
    
    async def generate_ai_insights(self, dataset_id: int) -> Dict[str, Any]:
        """
        Generate AI-powered insights from the dataset using local LLM.
        This uses Ollama to analyze data patterns and provide recommendations.
        """
        try:
            # Get dataset info
            dataset_service = get_metabase_dataset_service()
            dataset = await dataset_service.get_dataset(dataset_id)
            
            if not dataset:
                raise ValueError(f"Dataset {dataset_id} not found")
            
            # Get sample data
            sample_data = await dataset_service.query_dataset(dataset_id, limit=50)
            
            # Prepare analysis prompt
            metadata = dataset.get('metadata', {})
            insights_from_db = dataset.get('insights', [])
            
            prompt = self._create_analysis_prompt(dataset, metadata, insights_from_db, sample_data)
            
            # Use Ollama to generate insights
            ollama_service = get_ollama_service()
            
            # Import GenerateRequest schema
            from schemas.request_schemas import GenerateRequest
            
            # Create request
            generate_request = GenerateRequest(
                model="gemma3",  # Use available model
                prompt=prompt,
                max_tokens=2000,
                temperature=0.3  # Lower temperature for more focused analysis
            )
            
            response = await ollama_service.generate(generate_request)
            
            # Parse response and extract insights
            ai_insights = self._parse_ai_response(response.get('response', ''))
            
            # Combine with existing insights
            all_insights = insights_from_db + [
                {
                    'type': 'ai_generated',
                    'title': 'AI Analysis',
                    'description': ai_insights.get('summary', ''),
                    'severity': 'info',
                    'data': {},
                    'created_date': None
                }
            ]
            
            return {
                'dataset_id': dataset_id,
                'insights': all_insights,
                'summary': ai_insights.get('summary', 'Analysis completed'),
                'recommendations': ai_insights.get('recommendations', [])
            }
            
        except Exception as e:
            logger.error(f"Failed to generate AI insights: {e}")
            
            # Return basic insights on error
            dataset_service = get_metabase_dataset_service()
            dataset = await dataset_service.get_dataset(dataset_id)
            
            return {
                'dataset_id': dataset_id,
                'insights': dataset.get('insights', []) if dataset else [],
                'summary': f'Unable to generate AI insights: {str(e)}',
                'recommendations': ['Ensure Ollama is running', 'Check dataset has sufficient data']
            }
    
    def _create_analysis_prompt(self, 
                               dataset: Dict[str, Any],
                               metadata: Dict[str, Any],
                               existing_insights: List[Dict],
                               sample_data: Optional[Dict]) -> str:
        """Create analysis prompt for LLM"""
        
        prompt = f"""You are a data analyst. Analyze the following dataset and provide insights and recommendations.

Dataset: {dataset['name']}
Rows: {dataset['row_count']}
Columns: {dataset['column_count']}

Column Information:
"""
        
        for col in metadata.get('columns', []):
            prompt += f"\n- {col['name']} ({col['type']})"
            if col.get('null_count', 0) > 0:
                prompt += f" - {col['null_percentage']:.1f}% missing"
            if col['type'] == 'numeric' and col.get('mean'):
                prompt += f" - Mean: {col['mean']:.2f}, Range: [{col.get('min')}, {col.get('max')}]"

        prompt += f"\n\nExisting Insights Found:"
        for insight in existing_insights[:5]:
            prompt += f"\n- {insight.get('title', '')}: {insight.get('description', '')}"
        
        if sample_data and len(sample_data.get('data', [])) > 0:
            prompt += f"\n\nSample Data (first 3 rows):\n"
            for row in sample_data['data'][:3]:
                prompt += f"{row}\n"
        
        prompt += """

Please provide:
1. A brief summary of the dataset (2-3 sentences)
2. 3-5 key insights or patterns in the data
3. 3-5 actionable recommendations for further analysis or business decisions

Format your response as:
SUMMARY: [your summary]
INSIGHTS:
- [insight 1]
- [insight 2]
...
RECOMMENDATIONS:
- [recommendation 1]
- [recommendation 2]
...
"""
        
        return prompt
    
    def _parse_ai_response(self, response: str) -> Dict[str, Any]:
        """Parse AI response into structured format"""
        result = {
            'summary': '',
            'insights': [],
            'recommendations': []
        }
        
        try:
            # Extract summary
            if 'SUMMARY:' in response:
                summary_part = response.split('SUMMARY:')[1].split('INSIGHTS:')[0].strip()
                result['summary'] = summary_part
            
            # Extract insights
            if 'INSIGHTS:' in response:
                insights_part = response.split('INSIGHTS:')[1].split('RECOMMENDATIONS:')[0].strip()
                insights = [line.strip('- ').strip() for line in insights_part.split('\n') if line.strip().startswith('-')]
                result['insights'] = insights
            
            # Extract recommendations
            if 'RECOMMENDATIONS:' in response:
                recs_part = response.split('RECOMMENDATIONS:')[1].strip()
                recommendations = [line.strip('- ').strip() for line in recs_part.split('\n') if line.strip().startswith('-')]
                result['recommendations'] = recommendations
            
        except Exception as e:
            logger.warning(f"Failed to parse AI response: {e}")
            result['summary'] = response[:200]  # Use first 200 chars as summary
        
        return result
    
    async def _authenticate(self) -> bool:
        """Authenticate with Metabase and get session token"""
        try:
            # Try to use default admin credentials
            # Users should change these after first setup
            default_credentials = [
                {"username": "admin@olama.local", "password": "OlamaAdmin2024!"},
                {"username": "admin@example.com", "password": "OlamaAdmin2024!"},
            ]
            
            connector = self._get_connector()
            async with aiohttp.ClientSession(connector=connector) as session:
                # Try to login with default credentials FIRST
                for creds in default_credentials:
                    try:
                        async with session.post(
                            f"{self.metabase_url}/api/session",
                            json=creds,
                            timeout=aiohttp.ClientTimeout(total=5)
                        ) as login_response:
                            if login_response.status == 200:
                                result = await login_response.json()
                                self.session_token = result.get("id")
                                logger.info(f"Authenticated with Metabase as {creds['username']}")
                                return True
                    except Exception as e:
                        logger.debug(f"Failed to login with {creds['username']}: {e}")
                        continue
                
                # If login failed, check if setup is needed
                try:
                    async with session.get(
                        f"{self.metabase_url}/api/session/properties",
                        timeout=aiohttp.ClientTimeout(total=5)
                    ) as response:
                        if response.status == 200:
                            properties = await response.json()
                            
                            # If setup token exists, Metabase needs initial setup
                            if properties.get("setup-token"):
                                logger.warning("Metabase needs initial setup")
                                return False
                except:
                    pass
                
                logger.warning("Could not authenticate with any default credentials")
                return False
                
        except Exception as e:
            logger.error(f"Authentication check failed: {e}")
            return False
    
    async def _ensure_database_connection(self):
        """Ensure database connection exists in Metabase"""
        try:
            if not self.session_token:
                raise Exception("Not authenticated with Metabase")
            
            headers = {"X-Metabase-Session": self.session_token}
            
            connector = self._get_connector()
            async with aiohttp.ClientSession(connector=connector) as session:
                # Get list of databases
                async with session.get(
                    f"{self.metabase_url}/api/database",
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        databases = result.get("data", [])
                        
                        # Look for our datasets database
                        for db in databases:
                            if db.get("name") == "Uploaded Datasets":
                                self.database_id = db["id"]
                                logger.info(f"Found Uploaded Datasets database (ID: {self.database_id})")
                                return
                        
                        # If not found, create it
                        logger.info("Creating Uploaded Datasets database connection...")
                        await self._create_database_connection(headers)
                    else:
                        logger.error(f"Failed to get databases: {response.status}")
                        
        except Exception as e:
            logger.error(f"Failed to ensure database connection: {e}")
    
    async def _create_database_connection(self, headers: Dict[str, str]):
        """Create database connection in Metabase"""
        try:
            db_config = {
                "name": "Uploaded Datasets",
                "engine": "sqlite",
                "details": {
                    "db": str(self.datasets_db.absolute()).replace("\\", "/")
                },
                "auto_run_queries": True,
                "is_full_sync": True,
                "schedules": {}
            }
            
            connector = self._get_connector()
            async with aiohttp.ClientSession(connector=connector) as session:
                async with session.post(
                    f"{self.metabase_url}/api/database",
                    headers=headers,
                    json=db_config,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    if response.status in [200, 201]:
                        result = await response.json()
                        self.database_id = result.get("id")
                        logger.info(f"Created database connection (ID: {self.database_id})")
                        
                        # Wait for sync to complete
                        await asyncio.sleep(2)
                    else:
                        error = await response.text()
                        logger.error(f"Failed to create database: {error}")
                        
        except Exception as e:
            logger.error(f"Failed to ensure database connection: {e}")
            raise
    
    async def _sync_database_metadata(self):
        """Force Metabase to sync database metadata and discover new tables"""
        try:
            if not self.session_token or not self.database_id:
                raise Exception("Not properly authenticated or database not connected")
            
            headers = {"X-Metabase-Session": self.session_token}
            
            connector = self._get_connector()
            async with aiohttp.ClientSession(connector=connector) as session:
                # Trigger database metadata sync
                async with session.post(
                    f"{self.metabase_url}/api/database/{self.database_id}/sync_schema",
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    if response.status in [200, 202]:
                        logger.info(f"Database metadata sync initiated for database {self.database_id}")
                        # Wait a moment for sync to complete
                        await asyncio.sleep(2)
                    else:
                        logger.warning(f"Database sync returned status {response.status}")
                        
        except Exception as e:
            logger.warning(f"Failed to sync database metadata (non-critical): {e}")
            # Don't raise - this is non-critical
    
    async def _get_table_id(self, table_name: str) -> Optional[int]:
        """Get the Metabase table ID for a given table name"""
        try:
            if not self.session_token or not self.database_id:
                raise Exception("Not properly authenticated or database not connected")
            
            headers = {"X-Metabase-Session": self.session_token}
            
            connector = self._get_connector()
            async with aiohttp.ClientSession(connector=connector) as session:
                async with session.get(
                    f"{self.metabase_url}/api/database/{self.database_id}/metadata",
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    if response.status != 200:
                        logger.error(f"Failed to get database metadata: {response.status}")
                        return None
                    
                    db_metadata = await response.json()
                    
                    # Find the table
                    for table in db_metadata.get("tables", []):
                        if table.get("name") == table_name:
                            return table["id"]
                    
                    logger.warning(f"Table {table_name} not found in Metabase")
                    return None
                    
        except Exception as e:
            logger.error(f"Failed to get table ID: {e}")
            return None
    
    async def _create_auto_dashboard(self, dataset_id: int, dataset: Dict) -> int:
        """Create dashboard with automatic visualizations"""
        try:
            if not self.session_token or not self.database_id:
                raise Exception("Not properly authenticated or database not connected")
            
            headers = {"X-Metabase-Session": self.session_token}
            table_name = dataset['table_name']
            dataset_name = dataset['name']
            
            connector = self._get_connector()
            async with aiohttp.ClientSession(connector=connector) as session:
                # Get table metadata from Metabase
                async with session.get(
                    f"{self.metabase_url}/api/database/{self.database_id}/metadata",
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    if response.status != 200:
                        logger.error(f"Failed to get database metadata: {response.status}")
                        raise Exception("Could not fetch database metadata")
                    
                    db_metadata = await response.json()
                    
                    # Find the table
                    table_id = None
                    for table in db_metadata.get("tables", []):
                        if table.get("name") == table_name:
                            table_id = table["id"]
                            break
                    
                    if not table_id:
                        logger.error(f"Table {table_name} not found in Metabase")
                        raise Exception(f"Table {table_name} not found")
                    
                    logger.info(f"Found table {table_name} with ID: {table_id}")
                
                # Create the dashboard
                dashboard_data = {
                    "name": f"Dashboard - {dataset_name}",
                    "description": f"Auto-generated dashboard for {dataset_name}",
                    "parameters": []
                }
                
                async with session.post(
                    f"{self.metabase_url}/api/dashboard",
                    headers=headers,
                    json=dashboard_data,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    if response.status not in [200, 201]:
                        error = await response.text()
                        logger.error(f"Failed to create dashboard: {error}")
                        raise Exception("Failed to create dashboard")
                    
                    dashboard_result = await response.json()
                    dashboard_id = dashboard_result["id"]
                    logger.info(f"Created dashboard with ID: {dashboard_id}")
                
                # Create a simple table card to show the data
                await self._create_table_card(session, headers, dashboard_id, table_id, dataset_name)
                
                # Try to create some basic charts
                await self._create_basic_charts(session, headers, dashboard_id, table_id, dataset, db_metadata)
                
                return dashboard_id
            
        except Exception as e:
            logger.error(f"Failed to create auto dashboard: {e}")
            raise
    
    async def _create_table_card(self, session, headers: Dict[str, str], dashboard_id: int, table_id: int, dataset_name: str):
        """Create a table card showing raw data"""
        try:
            # Create a query for the table
            query_data = {
                "name": f"{dataset_name} - Data Table",
                "dataset_query": {
                    "database": self.database_id,
                    "type": "query",
                    "query": {
                        "source-table": table_id,
                        "limit": 100
                    }
                },
                "display": "table",
                "visualization_settings": {}
            }
            
            async with session.post(
                f"{self.metabase_url}/api/card",
                headers=headers,
                json=query_data,
                timeout=aiohttp.ClientTimeout(total=10)
            ) as response:
                if response.status in [200, 201]:
                    card_result = await response.json()
                    card_id = card_result["id"]
                    
                    # Add card to dashboard
                    await self._add_card_to_dashboard(session, headers, dashboard_id, card_id, 0, 0, 12, 8)
                    logger.info(f"Added table card to dashboard")
                else:
                    error = await response.text()
                    logger.warning(f"Failed to create table card: {error}")
                    
        except Exception as e:
            logger.error(f"Failed to create table card: {e}")
    
    async def _create_basic_charts(self, session, headers: Dict[str, str], dashboard_id: int, 
                                   table_id: int, dataset: Dict, db_metadata: Dict):
        """Create basic charts based on data types"""
        try:
            metadata = dataset.get('metadata', {})
            columns = metadata.get('columns', [])
            
            # Find numeric columns for count/sum visualizations
            numeric_cols = [col for col in columns if col['type'] == 'numeric']
            categorical_cols = [col for col in columns if col['type'] in ['text', 'categorical']]
            
            chart_row = 8  # Start below the table
            
            # Create a row count metric
            await self._create_metric_card(session, headers, dashboard_id, table_id, 
                                          "Total Rows", chart_row, 0)
            
            # If we have categorical columns, create a bar chart
            if categorical_cols and len(categorical_cols) > 0:
                await self._create_bar_chart(session, headers, dashboard_id, table_id,
                                            categorical_cols[0]['name'], chart_row, 4)
            
            # If we have numeric columns, create a line chart
            if numeric_cols and len(numeric_cols) > 0:
                await self._create_line_chart(session, headers, dashboard_id, table_id,
                                             numeric_cols[0]['name'], chart_row, 8)
            
        except Exception as e:
            logger.error(f"Failed to create basic charts: {e}")
    
    async def _create_metric_card(self, session, headers: Dict[str, str], dashboard_id: int,
                                 table_id: int, title: str, row: int, col: int):
        """Create a metric card showing count"""
        try:
            query_data = {
                "name": title,
                "dataset_query": {
                    "database": self.database_id,
                    "type": "query",
                    "query": {
                        "source-table": table_id,
                        "aggregation": [["count"]]
                    }
                },
                "display": "scalar",
                "visualization_settings": {}
            }
            
            async with session.post(
                f"{self.metabase_url}/api/card",
                headers=headers,
                json=query_data,
                timeout=aiohttp.ClientTimeout(total=10)
            ) as response:
                if response.status in [200, 201]:
                    card_result = await response.json()
                    card_id = card_result["id"]
                    await self._add_card_to_dashboard(session, headers, dashboard_id, card_id, row, col, 4, 4)
                    logger.info(f"Added metric card: {title}")
                    
        except Exception as e:
            logger.error(f"Failed to create metric card: {e}")
    
    async def _create_bar_chart(self, session, headers: Dict[str, str], dashboard_id: int,
                               table_id: int, column_name: str, row: int, col: int):
        """Create a bar chart for categorical data"""
        try:
            query_data = {
                "name": f"{column_name} Distribution",
                "dataset_query": {
                    "database": self.database_id,
                    "type": "query",
                    "query": {
                        "source-table": table_id,
                        "aggregation": [["count"]],
                        "breakout": [[
                            "field",
                            column_name,
                            {"base-type": "type/Text"}
                        ]],
                        "limit": 10
                    }
                },
                "display": "bar",
                "visualization_settings": {}
            }
            
            async with session.post(
                f"{self.metabase_url}/api/card",
                headers=headers,
                json=query_data,
                timeout=aiohttp.ClientTimeout(total=10)
            ) as response:
                if response.status in [200, 201]:
                    card_result = await response.json()
                    card_id = card_result["id"]
                    await self._add_card_to_dashboard(session, headers, dashboard_id, card_id, row, col, 4, 4)
                    logger.info(f"Added bar chart: {column_name}")
                    
        except Exception as e:
            logger.error(f"Failed to create bar chart: {e}")
    
    async def _create_line_chart(self, session, headers: Dict[str, str], dashboard_id: int,
                                table_id: int, column_name: str, row: int, col: int):
        """Create a line chart for numeric data"""
        try:
            query_data = {
                "name": f"{column_name} Trend",
                "dataset_query": {
                    "database": self.database_id,
                    "type": "query",
                    "query": {
                        "source-table": table_id,
                        "aggregation": [["avg", ["field", column_name, {"base-type": "type/Number"}]]],
                        "limit": 100
                    }
                },
                "display": "line",
                "visualization_settings": {}
            }
            
            async with session.post(
                f"{self.metabase_url}/api/card",
                headers=headers,
                json=query_data,
                timeout=aiohttp.ClientTimeout(total=10)
            ) as response:
                if response.status in [200, 201]:
                    card_result = await response.json()
                    card_id = card_result["id"]
                    await self._add_card_to_dashboard(session, headers, dashboard_id, card_id, row, col, 4, 4)
                    logger.info(f"Added line chart: {column_name}")
                    
        except Exception as e:
            logger.error(f"Failed to create line chart: {e}")
    
    async def _add_card_to_dashboard(self, session, headers: Dict[str, str], dashboard_id: int,
                                    card_id: int, row: int, col: int, size_x: int, size_y: int):
        """Add a card to the dashboard"""
        try:
            card_data = {
                "cardId": card_id,
                "row": row,
                "col": col,
                "size_x": size_x,
                "size_y": size_y
            }
            
            async with session.post(
                f"{self.metabase_url}/api/dashboard/{dashboard_id}/cards",
                headers=headers,
                json=card_data,
                timeout=aiohttp.ClientTimeout(total=10)
            ) as response:
                if response.status not in [200, 201]:
                    error = await response.text()
                    logger.warning(f"Failed to add card to dashboard: {error}")
                    
        except Exception as e:
            logger.error(f"Failed to add card to dashboard: {e}")
    
    async def _save_dashboard_url(self, dataset_id: int, dashboard_url: str):
        """Save dashboard URL to metadata database"""
        try:
            with sqlite3.connect(self.metadata_db) as conn:
                cursor = conn.cursor()
                
                # Create table if it doesn't exist
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS dashboard_configs (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        dataset_id INTEGER NOT NULL,
                        metabase_url TEXT,
                        created_date TEXT,
                        FOREIGN KEY (dataset_id) REFERENCES datasets(id)
                    )
                """)
                
                # Insert dashboard URL
                cursor.execute("""
                    INSERT INTO dashboard_configs (dataset_id, metabase_url, created_date)
                    VALUES (?, ?, ?)
                """, (dataset_id, dashboard_url, datetime.now().isoformat()))
                
                conn.commit()
                logger.info(f"Saved dashboard URL for dataset {dataset_id}")
                
        except Exception as e:
            logger.error(f"Failed to save dashboard URL: {e}")
    
    async def _count_dashboard_cards(self, dashboard_id: int) -> int:
        """Count visualizations in dashboard"""
        try:
            if not self.session_token:
                return 0
            
            headers = {"X-Metabase-Session": self.session_token}
            
            connector = self._get_connector()
            async with aiohttp.ClientSession(connector=connector) as session:
                async with session.get(
                    f"{self.metabase_url}/api/dashboard/{dashboard_id}",
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    if response.status == 200:
                        dashboard_data = await response.json()
                        return len(dashboard_data.get("ordered_cards", []))
                    
            return 0
            
        except Exception as e:
            logger.error(f"Failed to count dashboard cards: {e}")
            return 0


# Global instance
_metabase_dashboard_service: Optional[MetabaseDashboardService] = None

def get_metabase_dashboard_service() -> MetabaseDashboardService:
    """Get or create the Metabase dashboard service instance"""
    global _metabase_dashboard_service
    if _metabase_dashboard_service is None:
        _metabase_dashboard_service = MetabaseDashboardService()
    return _metabase_dashboard_service

