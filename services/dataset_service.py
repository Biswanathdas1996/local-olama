"""
Dataset management service.
Handles creation and management of custom training datasets.
"""
import os
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
import pandas as pd
from datasets import Dataset, DatasetDict

from utils.logger import get_logger
from schemas.training_schemas import (
    DatasetInfo,
    DatasetTextEntry,
)

logger = get_logger(__name__)


class DatasetService:
    """Service for managing custom training datasets."""
    
    def __init__(self):
        """Initialize dataset service."""
        self.datasets_dir = Path("data/custom_datasets")
        self.datasets_dir.mkdir(parents=True, exist_ok=True)
        self.metadata_file = self.datasets_dir / "datasets_metadata.json"
        self.metadata = self._load_metadata()
    
    def _load_metadata(self) -> Dict[str, Any]:
        """Load datasets metadata."""
        if self.metadata_file.exists():
            try:
                with open(self.metadata_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                logger.error("Failed to load metadata", error=str(e))
                return {}
        return {}
    
    def _save_metadata(self):
        """Save datasets metadata."""
        try:
            with open(self.metadata_file, 'w', encoding='utf-8') as f:
                json.dump(self.metadata, f, indent=2, default=str)
        except Exception as e:
            logger.error("Failed to save metadata", error=str(e))
    
    def create_dataset_from_file(
        self,
        file_content: bytes,
        filename: str,
        dataset_name: str,
        description: Optional[str] = None,
        text_column: str = "text"
    ) -> Dict[str, Any]:
        """
        Create a dataset from an uploaded file.
        
        Args:
            file_content: File content as bytes
            filename: Original filename
            dataset_name: Name for the dataset
            description: Optional description
            text_column: Name of the text column
            
        Returns:
            Dataset information
        """
        # Determine file type
        file_ext = Path(filename).suffix.lower()
        
        # Save file
        dataset_dir = self.datasets_dir / dataset_name
        dataset_dir.mkdir(parents=True, exist_ok=True)
        
        file_path = dataset_dir / filename
        with open(file_path, 'wb') as f:
            f.write(file_content)
        
        # Parse file based on type
        if file_ext == '.txt':
            data = self._parse_text_file(file_path, text_column)
        elif file_ext == '.csv':
            data = self._parse_csv_file(file_path, text_column)
        elif file_ext == '.json' or file_ext == '.jsonl':
            data = self._parse_json_file(file_path, text_column)
        else:
            raise ValueError(f"Unsupported file type: {file_ext}")
        
        # Create dataset
        dataset = Dataset.from_dict(data)
        
        # Save as arrow format for efficient loading
        arrow_path = dataset_dir / "dataset.arrow"
        dataset.save_to_disk(str(arrow_path))
        
        # Save metadata
        metadata = {
            "name": dataset_name,
            "description": description,
            "num_samples": len(dataset),
            "text_column": text_column,
            "created_at": datetime.utcnow().isoformat(),
            "file_path": str(arrow_path),
            "original_file": filename,
        }
        
        self.metadata[dataset_name] = metadata
        self._save_metadata()
        
        logger.info(
            "dataset_created_from_file",
            dataset_name=dataset_name,
            num_samples=len(dataset),
            file_type=file_ext
        )
        
        return metadata
    
    def _parse_text_file(self, file_path: Path, text_column: str) -> Dict[str, List]:
        """Parse a plain text file (one sample per line)."""
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = [line.strip() for line in f if line.strip()]
        
        return {text_column: lines}
    
    def _parse_csv_file(self, file_path: Path, text_column: str) -> Dict[str, List]:
        """Parse a CSV file."""
        df = pd.read_csv(file_path)
        
        # If text_column doesn't exist, use first column
        if text_column not in df.columns:
            text_column = df.columns[0]
            logger.warning(
                "text_column_not_found",
                requested=text_column,
                using=text_column
            )
        
        return df.to_dict('list')
    
    def _parse_json_file(self, file_path: Path, text_column: str) -> Dict[str, List]:
        """Parse a JSON or JSONL file."""
        data = []
        
        with open(file_path, 'r', encoding='utf-8') as f:
            file_content = f.read()
            
            # Try JSONL first (one JSON object per line)
            if file_path.suffix == '.jsonl':
                for line in file_content.strip().split('\n'):
                    if line.strip():
                        data.append(json.loads(line))
            else:
                # Try regular JSON
                parsed = json.loads(file_content)
                if isinstance(parsed, list):
                    data = parsed
                else:
                    data = [parsed]
        
        # Convert to dict of lists
        if data:
            keys = data[0].keys()
            result = {key: [item.get(key) for item in data] for key in keys}
            
            # Ensure text_column exists
            if text_column not in result and 'text' in result:
                result[text_column] = result['text']
            
            return result
        
        return {text_column: []}
    
    def create_dataset_from_text(
        self,
        dataset_name: str,
        entries: List[DatasetTextEntry],
        description: Optional[str] = None,
        text_column: str = "text"
    ) -> Dict[str, Any]:
        """
        Create a dataset from text entries.
        
        Args:
            dataset_name: Name for the dataset
            entries: List of text entries
            description: Optional description
            text_column: Name of the text column
            
        Returns:
            Dataset information
        """
        # Create dataset directory
        dataset_dir = self.datasets_dir / dataset_name
        dataset_dir.mkdir(parents=True, exist_ok=True)
        
        # Prepare data
        data = {
            text_column: [entry.text for entry in entries]
        }
        
        # Add metadata if present
        if entries and entries[0].metadata:
            metadata_keys = set()
            for entry in entries:
                if entry.metadata:
                    metadata_keys.update(entry.metadata.keys())
            
            for key in metadata_keys:
                data[key] = [
                    entry.metadata.get(key) if entry.metadata else None
                    for entry in entries
                ]
        
        # Create dataset
        dataset = Dataset.from_dict(data)
        
        # Save as arrow format
        arrow_path = dataset_dir / "dataset.arrow"
        dataset.save_to_disk(str(arrow_path))
        
        # Save metadata
        metadata = {
            "name": dataset_name,
            "description": description,
            "num_samples": len(dataset),
            "text_column": text_column,
            "created_at": datetime.utcnow().isoformat(),
            "file_path": str(arrow_path),
            "original_file": "manual_entry",
        }
        
        self.metadata[dataset_name] = metadata
        self._save_metadata()
        
        logger.info(
            "dataset_created_from_text",
            dataset_name=dataset_name,
            num_samples=len(dataset)
        )
        
        return metadata
    
    def list_datasets(self) -> List[DatasetInfo]:
        """List all custom datasets."""
        datasets = []
        for name, meta in self.metadata.items():
            datasets.append(DatasetInfo(**meta))
        
        return sorted(datasets, key=lambda x: x.created_at, reverse=True)
    
    def get_dataset(self, dataset_name: str) -> Optional[DatasetInfo]:
        """Get information about a specific dataset."""
        if dataset_name in self.metadata:
            return DatasetInfo(**self.metadata[dataset_name])
        return None
    
    def delete_dataset(self, dataset_name: str) -> bool:
        """Delete a custom dataset."""
        if dataset_name not in self.metadata:
            return False
        
        # Delete files
        dataset_dir = self.datasets_dir / dataset_name
        if dataset_dir.exists():
            import shutil
            shutil.rmtree(dataset_dir)
        
        # Remove from metadata
        del self.metadata[dataset_name]
        self._save_metadata()
        
        logger.info("dataset_deleted", dataset_name=dataset_name)
        return True
    
    def get_dataset_path(self, dataset_name: str) -> Optional[str]:
        """Get the file path for a dataset."""
        if dataset_name in self.metadata:
            return self.metadata[dataset_name]["file_path"]
        return None


# Singleton instance
_dataset_service: Optional[DatasetService] = None


def get_dataset_service() -> DatasetService:
    """Get the dataset service instance."""
    global _dataset_service
    if _dataset_service is None:
        _dataset_service = DatasetService()
    return _dataset_service
