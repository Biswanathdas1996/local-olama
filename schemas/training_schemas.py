"""
Training request and response schemas.
Defines data models for model fine-tuning operations.
"""
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime
from pydantic import BaseModel, Field, field_validator, model_validator


class TrainingTechnique(BaseModel):
    """Information about a training technique."""
    name: str = Field(..., description="Name of the technique")
    description: str = Field(..., description="Description of the technique")
    memory_requirement: str = Field(..., description="Memory requirements")
    gpu_required: bool = Field(..., description="Whether GPU is required")
    training_speed: str = Field(..., description="Training speed indication")


class LoRAConfig(BaseModel):
    """Configuration for LoRA/QLoRA training."""
    r: int = Field(default=8, ge=1, le=256, description="Rank of the low-rank decomposition")
    lora_alpha: int = Field(default=16, ge=1, description="LoRA scaling factor")
    lora_dropout: float = Field(default=0.1, ge=0.0, le=1.0, description="Dropout probability")
    target_modules: List[str] = Field(
        default=["q_proj", "v_proj"],
        description="Model modules to apply LoRA to"
    )
    use_qlora: bool = Field(default=False, description="Whether to use QLoRA (4-bit quantization)")


class AdapterConfig(BaseModel):
    """Configuration for Adapter/Prefix Tuning."""
    adapter_size: int = Field(default=64, ge=1, description="Size of the adapter layers")
    adapter_type: Literal["adapter", "prefix_tuning"] = Field(
        default="adapter",
        description="Type of adapter to use"
    )
    prefix_length: Optional[int] = Field(
        default=10,
        ge=1,
        description="Length of prefix tokens (for prefix tuning)"
    )


class BitFitConfig(BaseModel):
    """Configuration for BitFit training."""
    train_bias_only: bool = Field(default=True, description="Train only bias terms")
    include_layer_norm: bool = Field(default=True, description="Include layer normalization parameters")


class TrainingDataConfig(BaseModel):
    """Configuration for training data."""
    dataset_name: Optional[str] = Field(None, description="Name of dataset from HuggingFace")
    dataset_path: Optional[str] = Field(None, description="Local path to dataset")
    text_column: str = Field(default="text", description="Column name containing text data")
    max_samples: Optional[int] = Field(None, ge=1, description="Maximum number of samples to use")
    validation_split: float = Field(default=0.1, ge=0.0, le=0.5, description="Validation split ratio")

    @model_validator(mode='after')
    def check_dataset_source(self):
        """Ensure at least one dataset source is provided."""
        if not self.dataset_name and not self.dataset_path:
            raise ValueError("Either dataset_name or dataset_path must be provided")
        return self


class TrainingParameters(BaseModel):
    """General training parameters."""
    num_epochs: int = Field(default=3, ge=1, le=100, description="Number of training epochs")
    batch_size: int = Field(default=4, ge=1, le=128, description="Batch size for training")
    learning_rate: float = Field(default=2e-4, gt=0, description="Learning rate")
    max_seq_length: int = Field(default=512, ge=128, le=4096, description="Maximum sequence length")
    gradient_accumulation_steps: int = Field(default=4, ge=1, description="Gradient accumulation steps")
    warmup_steps: int = Field(default=100, ge=0, description="Number of warmup steps")
    logging_steps: int = Field(default=10, ge=1, description="Log every N steps")
    save_steps: int = Field(default=100, ge=1, description="Save checkpoint every N steps")
    use_fp16: bool = Field(default=True, description="Use mixed precision training")


class TrainingRequest(BaseModel):
    """Request to start model training."""
    base_model: str = Field(..., description="Name of the base model to fine-tune")
    new_model_name: str = Field(..., description="Name for the newly trained model")
    technique: Literal["lora", "qlora", "adapter", "prefix_tuning", "bitfit"] = Field(
        ...,
        description="Training technique to use"
    )
    
    # Technique-specific configs (only one should be provided)
    lora_config: Optional[LoRAConfig] = None
    adapter_config: Optional[AdapterConfig] = None
    bitfit_config: Optional[BitFitConfig] = None
    
    # Training data and parameters
    data_config: TrainingDataConfig
    training_params: TrainingParameters
    
    # Optional metadata
    description: Optional[str] = Field(None, description="Description of the training task")

    @model_validator(mode='after')
    def validate_technique_config(self):
        """Ensure correct config is provided for the selected technique."""
        technique = self.technique
            
        if technique in ['lora', 'qlora'] and not self.lora_config:
            self.lora_config = LoRAConfig()  # Use defaults
        elif technique in ['adapter', 'prefix_tuning'] and not self.adapter_config:
            self.adapter_config = AdapterConfig()
        elif technique == 'bitfit' and not self.bitfit_config:
            self.bitfit_config = BitFitConfig()
        
        return self


class TrainingStatus(BaseModel):
    """Status of an ongoing training job."""
    job_id: str = Field(..., description="Unique identifier for the training job")
    status: Literal["queued", "running", "completed", "failed", "cancelled"] = Field(
        ...,
        description="Current status of the training"
    )
    progress: float = Field(default=0.0, ge=0.0, le=100.0, description="Training progress percentage")
    current_epoch: Optional[int] = Field(None, description="Current epoch number")
    total_epochs: Optional[int] = Field(None, description="Total number of epochs")
    current_step: Optional[int] = Field(None, description="Current training step")
    total_steps: Optional[int] = Field(None, description="Total training steps")
    loss: Optional[float] = Field(None, description="Current training loss")
    learning_rate: Optional[float] = Field(None, description="Current learning rate")
    estimated_time_remaining: Optional[str] = Field(None, description="Estimated time remaining")
    started_at: Optional[datetime] = Field(None, description="When training started")
    completed_at: Optional[datetime] = Field(None, description="When training completed")
    error_message: Optional[str] = Field(None, description="Error message if failed")


class TrainingResponse(BaseModel):
    """Response after initiating training."""
    job_id: str = Field(..., description="Unique identifier for the training job")
    status: str = Field(..., description="Initial status of the training")
    message: str = Field(..., description="Confirmation message")
    model_name: str = Field(..., description="Name of the model being trained")


class TrainingJobInfo(BaseModel):
    """Information about a training job."""
    job_id: str
    model_name: str
    base_model: str
    technique: str
    status: str
    progress: float
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class TrainingJobsListResponse(BaseModel):
    """Response containing list of training jobs."""
    jobs: List[TrainingJobInfo] = Field(default_factory=list)
    total: int = Field(..., description="Total number of jobs")


class ModelCreateRequest(BaseModel):
    """Request to create a model from trained adapter."""
    job_id: str = Field(..., description="Training job ID to create model from")
    push_to_ollama: bool = Field(
        default=True,
        description="Whether to create an Ollama modelfile and register the model"
    )


class ModelCreateResponse(BaseModel):
    """Response after creating a model."""
    status: str = Field(..., description="Creation status")
    model_name: str = Field(..., description="Name of the created model")
    model_path: str = Field(..., description="Path to the model files")
    ollama_model: Optional[str] = Field(None, description="Ollama model name if pushed")
    message: str = Field(..., description="Status message")


class TechniquesListResponse(BaseModel):
    """Response listing available training techniques."""
    techniques: List[TrainingTechnique] = Field(default_factory=list)
    total: int = Field(..., description="Total number of techniques")


# Dataset Creation Schemas
class DatasetCreateRequest(BaseModel):
    """Request to create a custom dataset."""
    name: str = Field(..., description="Name for the dataset")
    description: Optional[str] = Field(None, description="Dataset description")
    text_column: str = Field(default="text", description="Name of the text column")


class DatasetTextEntry(BaseModel):
    """A single text entry for manual dataset creation."""
    text: str = Field(..., description="The text content")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Optional metadata")


class DatasetFromTextRequest(BaseModel):
    """Request to create dataset from text entries."""
    dataset_name: str = Field(..., description="Name for the dataset")
    entries: List[DatasetTextEntry] = Field(..., description="List of text entries")
    description: Optional[str] = Field(None, description="Dataset description")
    text_column: str = Field(default="text", description="Name of the text column")


class DatasetUploadResponse(BaseModel):
    """Response after uploading a dataset file."""
    success: bool = Field(..., description="Whether upload was successful")
    dataset_name: str = Field(..., description="Name of the created dataset")
    num_samples: int = Field(..., description="Number of samples in dataset")
    message: str = Field(..., description="Status message")
    dataset_path: str = Field(..., description="Path to the dataset file")


class DatasetInfo(BaseModel):
    """Information about a custom dataset."""
    name: str = Field(..., description="Dataset name")
    description: Optional[str] = Field(None, description="Dataset description")
    num_samples: int = Field(..., description="Number of samples")
    text_column: str = Field(..., description="Text column name")
    created_at: datetime = Field(..., description="Creation timestamp")
    file_path: str = Field(..., description="Path to dataset file")


class DatasetsListResponse(BaseModel):
    """Response listing custom datasets."""
    datasets: List[DatasetInfo] = Field(default_factory=list)
    total: int = Field(..., description="Total number of datasets")
