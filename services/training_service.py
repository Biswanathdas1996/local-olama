"""
Model training service.
Handles fine-tuning of models using different techniques (LoRA, Adapters, BitFit).
"""
import os
import json
import asyncio
import uuid
from datetime import datetime
from typing import Dict, Any, Optional, List
from pathlib import Path
import torch
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    TrainingArguments,
    Trainer,
    DataCollatorForLanguageModeling,
)
from datasets import load_dataset, Dataset, load_from_disk
from peft import (
    LoraConfig,
    get_peft_model,
    PeftModel,
    TaskType,
    PrefixTuningConfig,
    # Note: AdapterConfig removed in newer PEFT versions
)

from utils.logger import get_logger
from services.dataset_service import get_dataset_service
from schemas.training_schemas import (
    TrainingRequest,
    TrainingStatus,
    TrainingJobInfo,
    LoRAConfig as LoRAConfigSchema,
    AdapterConfig as AdapterConfigSchema,
    BitFitConfig as BitFitConfigSchema,
)

logger = get_logger(__name__)


class TrainingService:
    """Service for managing model training jobs."""
    
    def __init__(self):
        """Initialize training service."""
        self.jobs: Dict[str, Dict[str, Any]] = {}
        self.models_dir = Path("models/trained")
        self.models_dir.mkdir(parents=True, exist_ok=True)
        self.checkpoints_dir = Path("models/checkpoints")
        self.checkpoints_dir.mkdir(parents=True, exist_ok=True)
        
    async def start_training(self, request: TrainingRequest) -> Dict[str, Any]:
        """
        Start a new training job.
        
        Args:
            request: Training configuration
            
        Returns:
            Job information including job_id
        """
        job_id = str(uuid.uuid4())
        
        job_info = {
            "job_id": job_id,
            "model_name": request.new_model_name,
            "base_model": request.base_model,
            "technique": request.technique,
            "status": "queued",
            "progress": 0.0,
            "created_at": datetime.utcnow(),
            "request": request.dict(),
        }
        
        self.jobs[job_id] = job_info
        
        # Start training in background
        asyncio.create_task(self._run_training(job_id))
        
        logger.info(
            "training_job_created",
            job_id=job_id,
            model=request.new_model_name,
            technique=request.technique
        )
        
        return {
            "job_id": job_id,
            "status": "queued",
            "message": f"Training job created for {request.new_model_name}",
            "model_name": request.new_model_name,
        }
    
    async def _run_training(self, job_id: str):
        """
        Execute the training job.
        
        Args:
            job_id: Job identifier
        """
        job = self.jobs[job_id]
        request = TrainingRequest(**job["request"])
        
        try:
            job["status"] = "running"
            job["started_at"] = datetime.utcnow()
            
            logger.info("training_started", job_id=job_id, base_model=request.base_model)
            
            # Validate base model identifier
            if "/" not in request.base_model and not os.path.exists(request.base_model):
                raise ValueError(
                    f"Invalid base model: '{request.base_model}'. "
                    f"Please provide a valid HuggingFace model identifier (e.g., 'mistralai/Mistral-7B-v0.1', "
                    f"'TinyLlama/TinyLlama-1.1B-Chat-v1.0') or a local path to a model."
                )
            
            # Load tokenizer and model
            logger.info("loading_tokenizer", base_model=request.base_model)
            tokenizer = AutoTokenizer.from_pretrained(request.base_model)
            if tokenizer.pad_token is None:
                tokenizer.pad_token = tokenizer.eos_token
            
            # Load base model with appropriate settings
            model_kwargs = {
                "device_map": "auto" if torch.cuda.is_available() else None,
            }
            
            if request.technique in ["qlora"]:
                # Check if GPU is available for QLoRA
                if not torch.cuda.is_available():
                    raise ValueError(
                        "QLoRA requires a CUDA-capable GPU. Your system doesn't have one. "
                        "Please use one of these CPU-compatible techniques instead: "
                        "LoRA, Adapter, Prefix Tuning, or BitFit. "
                        "These techniques work on CPU but will still be slow."
                    )
                
                # Check if bitsandbytes is installed
                try:
                    from transformers import BitsAndBytesConfig
                except ImportError:
                    raise ImportError(
                        "bitsandbytes package is required for QLoRA training. "
                        "Install it with: pip install bitsandbytes"
                    )
                
                # Load in 4-bit for QLoRA
                model_kwargs["quantization_config"] = BitsAndBytesConfig(
                    load_in_4bit=True,
                    bnb_4bit_quant_type="nf4",
                    bnb_4bit_compute_dtype=torch.float16,
                    bnb_4bit_use_double_quant=True,
                )
            
            model = AutoModelForCausalLM.from_pretrained(
                request.base_model,
                **model_kwargs
            )
            
            # Apply technique-specific configuration
            if request.technique in ["lora", "qlora"]:
                model = self._apply_lora(model, request.lora_config or LoRAConfigSchema())
            elif request.technique in ["adapter", "prefix_tuning"]:
                model = self._apply_adapter(
                    model,
                    request.adapter_config or AdapterConfigSchema(),
                    request.technique
                )
            elif request.technique == "bitfit":
                model = self._apply_bitfit(
                    model,
                    request.bitfit_config or BitFitConfigSchema()
                )
            
            # Load and prepare dataset
            dataset = await self._load_dataset(request.data_config, tokenizer, request.training_params.max_seq_length)
            
            # Setup training arguments
            output_dir = self.checkpoints_dir / job_id
            
            # Check if GPU is available
            has_cuda = torch.cuda.is_available()
            
            # Adjust settings for CPU training
            if not has_cuda:
                logger.warning(
                    "training_on_cpu",
                    message="No GPU detected. Training on CPU will be very slow. Consider using a smaller model or GPU."
                )
                # Reduce batch size for CPU
                batch_size = min(request.training_params.batch_size, 2)
                # Disable dataloader optimizations that don't work on CPU
                dataloader_num_workers = 0
            else:
                batch_size = request.training_params.batch_size
                dataloader_num_workers = 4
            
            training_args = TrainingArguments(
                output_dir=str(output_dir),
                num_train_epochs=request.training_params.num_epochs,
                per_device_train_batch_size=batch_size,
                gradient_accumulation_steps=request.training_params.gradient_accumulation_steps,
                learning_rate=request.training_params.learning_rate,
                warmup_steps=request.training_params.warmup_steps,
                logging_steps=request.training_params.logging_steps,
                save_steps=request.training_params.save_steps,
                fp16=request.training_params.use_fp16 and has_cuda,
                save_total_limit=3,
                logging_dir=str(output_dir / "logs"),
                report_to="none",  # Disable external reporting
                dataloader_num_workers=dataloader_num_workers,
                dataloader_pin_memory=has_cuda,  # Only use pinned memory with GPU
                use_cpu=not has_cuda,  # Explicitly use CPU if no GPU
            )
            
            # Create trainer
            data_collator = DataCollatorForLanguageModeling(
                tokenizer=tokenizer,
                mlm=False
            )
            
            trainer = Trainer(
                model=model,
                args=training_args,
                train_dataset=dataset["train"],
                eval_dataset=dataset.get("validation"),
                data_collator=data_collator,
            )
            
            # Train the model
            job["progress"] = 10.0
            trainer.train()
            job["progress"] = 90.0
            
            # Save the final model
            final_model_path = self.models_dir / request.new_model_name
            final_model_path.mkdir(parents=True, exist_ok=True)
            
            model.save_pretrained(str(final_model_path))
            tokenizer.save_pretrained(str(final_model_path))
            
            # Save training metadata
            metadata = {
                "base_model": request.base_model,
                "technique": request.technique,
                "created_at": datetime.utcnow().isoformat(),
                "training_config": request.dict(),
            }
            
            with open(final_model_path / "training_metadata.json", "w") as f:
                json.dump(metadata, f, indent=2)
            
            job["status"] = "completed"
            job["progress"] = 100.0
            job["completed_at"] = datetime.utcnow()
            job["model_path"] = str(final_model_path)
            
            logger.info(
                "training_completed",
                job_id=job_id,
                model_path=str(final_model_path)
            )
            
        except Exception as e:
            job["status"] = "failed"
            error_msg = str(e)
            
            # Provide helpful error messages
            if "is not a local folder and is not a valid model identifier" in error_msg:
                error_msg = (
                    f"Invalid model identifier: '{request.base_model}'. "
                    f"Please use a full HuggingFace model identifier (e.g., 'mistralai/Mistral-7B-v0.1', "
                    f"'TinyLlama/TinyLlama-1.1B-Chat-v1.0', 'microsoft/phi-2') or a local path. "
                    f"Note: Ollama model names like 'llama2', 'mistral' are NOT valid here. "
                    f"See MODEL_SELECTION_GUIDE.md for more details."
                )
            elif "401" in error_msg or "token" in error_msg.lower():
                error_msg = (
                    f"Authentication required for '{request.base_model}'. "
                    f"This model requires a HuggingFace token. "
                    f"1. Accept the model license at https://huggingface.co/{request.base_model} "
                    f"2. Run 'huggingface-cli login' and provide your token. "
                    f"Get a token at: https://huggingface.co/settings/tokens"
                )
            elif "CUDA out of memory" in error_msg or "OutOfMemoryError" in error_msg:
                error_msg = (
                    f"GPU out of memory. Try: "
                    f"1. Use QLoRA instead of LoRA "
                    f"2. Reduce batch size "
                    f"3. Use a smaller model "
                    f"4. Close other GPU-using applications"
                )
            elif "bitsandbytes" in error_msg.lower() or ("ImportError" in error_msg and "qlora" in request.technique.lower()):
                error_msg = (
                    f"Missing required package for QLoRA training. "
                    f"Install it with: pip install bitsandbytes accelerate "
                    f"Or use a different training technique (LoRA, Adapter, BitFit, Prefix Tuning) "
                    f"that doesn't require quantization."
                )
            elif "KeyError" in error_msg and "text_column" in str(e.__class__):
                # Extract column name from error if possible
                error_msg = (
                    f"Dataset column mismatch. The dataset does not have the expected text column. "
                    f"Please check your dataset's column names and specify the correct 'text_column' "
                    f"in the dataset configuration. Common column names: 'text', 'content', 'input', 'prompt'."
                )
            
            job["error_message"] = error_msg
            job["completed_at"] = datetime.utcnow()
            
            logger.error(
                "training_failed",
                job_id=job_id,
                error=error_msg,
                exc_info=True
            )
    
    def _apply_lora(self, model, config: LoRAConfigSchema):
        """Apply LoRA configuration to model."""
        peft_config = LoraConfig(
            task_type=TaskType.CAUSAL_LM,
            r=config.r,
            lora_alpha=config.lora_alpha,
            lora_dropout=config.lora_dropout,
            target_modules=config.target_modules,
            bias="none",
        )
        
        model = get_peft_model(model, peft_config)
        model.print_trainable_parameters()
        return model
    
    def _apply_adapter(self, model, config: AdapterConfigSchema, technique: str):
        """Apply Adapter or Prefix Tuning configuration."""
        if technique == "prefix_tuning":
            peft_config = PrefixTuningConfig(
                task_type=TaskType.CAUSAL_LM,
                num_virtual_tokens=config.prefix_length or 10,
            )
        else:
            # Standard adapter - use LoRA as alternative since AdapterConfig was removed in PEFT 0.17+
            # Using a small rank LoRA as a substitute for traditional adapters
            logger.warning(
                "adapter_config_deprecated",
                message="AdapterConfig removed in PEFT 0.17+, using LoRA with small rank instead"
            )
            peft_config = LoraConfig(
                task_type=TaskType.CAUSAL_LM,
                r=16,  # Small rank for adapter-like behavior
                lora_alpha=32,
                lora_dropout=0.1,
                target_modules=["q_proj", "v_proj", "k_proj", "o_proj"],
            )
        
        model = get_peft_model(model, peft_config)
        model.print_trainable_parameters()
        return model
    
    def _apply_bitfit(self, model, config: BitFitConfigSchema):
        """Apply BitFit - only train bias parameters."""
        for name, param in model.named_parameters():
            if "bias" not in name:
                param.requires_grad = False
            else:
                param.requires_grad = True
        
        # Optionally include layer norm
        if config.include_layer_norm:
            for name, param in model.named_parameters():
                if "LayerNorm" in name or "layer_norm" in name:
                    param.requires_grad = True
        
        # Count trainable parameters
        trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
        total = sum(p.numel() for p in model.parameters())
        logger.info(
            "bitfit_parameters",
            trainable=trainable,
            total=total,
            percentage=100 * trainable / total
        )
        
        return model
    
    async def _load_dataset(self, data_config, tokenizer, max_seq_length: int):
        """Load and prepare dataset for training."""
        # Check if it's a custom dataset first
        dataset_service = get_dataset_service()
        custom_dataset_path = dataset_service.get_dataset_path(data_config.dataset_name)
        
        if custom_dataset_path:
            # Load custom dataset
            logger.info("loading_custom_dataset", name=data_config.dataset_name)
            dataset = load_from_disk(custom_dataset_path)
            
            # Convert to dict if needed
            if not isinstance(dataset, dict):
                # Split into train/validation if needed
                if data_config.validation_split and data_config.validation_split > 0:
                    split = dataset.train_test_split(test_size=data_config.validation_split)
                    dataset = {
                        "train": split["train"],
                        "validation": split["test"],
                    }
                else:
                    dataset = {"train": dataset}
        elif data_config.dataset_name:
            # Load from HuggingFace
            logger.info("loading_huggingface_dataset", name=data_config.dataset_name)
            dataset = load_dataset(data_config.dataset_name)
        elif data_config.dataset_path:
            # Load from local file
            logger.info("loading_local_dataset", path=data_config.dataset_path)
            dataset = load_dataset("text", data_files=data_config.dataset_path)
        else:
            raise ValueError("No dataset source provided")
        
        # Get train split
        if isinstance(dataset, dict):
            train_dataset = dataset.get("train", dataset.get("train_split"))
        else:
            train_dataset = dataset
        
        # Check if the specified text column exists
        available_columns = train_dataset.column_names
        logger.info("dataset_columns", columns=available_columns)
        
        # Auto-detect text column if the specified one doesn't exist
        text_column = data_config.text_column
        if text_column not in available_columns:
            # Try common column names
            common_text_columns = ['text', 'content', 'input', 'prompt', 'instruction', 'question', 'sentence']
            found_column = None
            for col in common_text_columns:
                if col in available_columns:
                    found_column = col
                    break
            
            if found_column:
                logger.warning(
                    "text_column_not_found",
                    requested=text_column,
                    available=available_columns,
                    using=found_column
                )
                text_column = found_column
            else:
                # Use the first string column
                if available_columns:
                    text_column = available_columns[0]
                    logger.warning(
                        "text_column_not_found_using_first",
                        requested=data_config.text_column,
                        available=available_columns,
                        using=text_column
                    )
                else:
                    raise ValueError(
                        f"Could not find text column '{data_config.text_column}' in dataset. "
                        f"Available columns: {available_columns}. "
                        f"Please specify the correct text_column in your dataset configuration."
                    )
        
        # Take subset if specified
        if data_config.max_samples and train_dataset:
            train_dataset = train_dataset.select(range(min(data_config.max_samples, len(train_dataset))))
        
        # Tokenize dataset
        def tokenize_function(examples):
            return tokenizer(
                examples[text_column],
                truncation=True,
                max_length=max_seq_length,
                padding="max_length",
            )
        
        tokenized_train = train_dataset.map(
            tokenize_function,
            batched=True,
            remove_columns=train_dataset.column_names,
        )
        
        # Handle validation
        if isinstance(dataset, dict) and "validation" in dataset:
            tokenized_val = dataset["validation"].map(
                tokenize_function,
                batched=True,
                remove_columns=dataset["validation"].column_names,
            )
            return {
                "train": tokenized_train,
                "validation": tokenized_val,
            }
        elif data_config.validation_split and data_config.validation_split > 0:
            # Create validation split
            split = tokenized_train.train_test_split(test_size=data_config.validation_split)
            return {
                "train": split["train"],
                "validation": split["test"],
            }
        else:
            return {"train": tokenized_train}

    
    def get_job_status(self, job_id: str) -> Optional[TrainingStatus]:
        """Get status of a training job."""
        if job_id not in self.jobs:
            return None
        
        job = self.jobs[job_id]
        
        return TrainingStatus(
            job_id=job_id,
            status=job["status"],
            progress=job.get("progress", 0.0),
            current_epoch=job.get("current_epoch"),
            total_epochs=job.get("request", {}).get("training_params", {}).get("num_epochs"),
            current_step=job.get("current_step"),
            total_steps=job.get("total_steps"),
            loss=job.get("loss"),
            learning_rate=job.get("learning_rate"),
            started_at=job.get("started_at"),
            completed_at=job.get("completed_at"),
            error_message=job.get("error_message"),
        )
    
    def list_jobs(self) -> List[TrainingJobInfo]:
        """List all training jobs."""
        jobs = []
        for job_id, job in self.jobs.items():
            jobs.append(
                TrainingJobInfo(
                    job_id=job_id,
                    model_name=job["model_name"],
                    base_model=job["base_model"],
                    technique=job["technique"],
                    status=job["status"],
                    progress=job.get("progress", 0.0),
                    created_at=job["created_at"],
                    started_at=job.get("started_at"),
                    completed_at=job.get("completed_at"),
                )
            )
        
        return sorted(jobs, key=lambda x: x.created_at, reverse=True)
    
    def cancel_job(self, job_id: str) -> bool:
        """Cancel a training job."""
        if job_id not in self.jobs:
            return False
        
        job = self.jobs[job_id]
        if job["status"] in ["completed", "failed", "cancelled"]:
            return False
        
        job["status"] = "cancelled"
        job["completed_at"] = datetime.utcnow()
        
        logger.info("training_cancelled", job_id=job_id)
        return True


# Singleton instance
_training_service: Optional[TrainingService] = None


def get_training_service() -> TrainingService:
    """Get the training service instance."""
    global _training_service
    if _training_service is None:
        _training_service = TrainingService()
    return _training_service
