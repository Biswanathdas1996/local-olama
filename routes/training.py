"""
API routes for model training.
Provides endpoints for fine-tuning models using various techniques.
"""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, UploadFile, File, Form

from schemas.training_schemas import (
    TrainingRequest,
    TrainingResponse,
    TrainingStatus,
    TrainingJobsListResponse,
    TrainingJobInfo,
    ModelCreateRequest,
    ModelCreateResponse,
    TechniquesListResponse,
    TrainingTechnique,
    DatasetFromTextRequest,
    DatasetUploadResponse,
    DatasetsListResponse,
    DatasetInfo,
)
from services.training_service import get_training_service
from services.dataset_service import get_dataset_service
from services.training_data_service import get_training_data_service
from services.model_conversion_service import get_conversion_service
from utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/training", tags=["Training"])


@router.get(
    "/techniques",
    response_model=TechniquesListResponse,
    summary="List available training techniques",
    description="Get information about all supported fine-tuning techniques."
)
async def list_techniques() -> TechniquesListResponse:
    """List all available training techniques with their details."""
    techniques = [
        TrainingTechnique(
            name="LoRA",
            description="Low-Rank Adaptation - Trains small adapter matrices instead of full model weights",
            memory_requirement="8GB+ VRAM recommended, can work with 6GB",
            gpu_required=True,
            training_speed="Fast"
        ),
        TrainingTechnique(
            name="QLoRA",
            description="Quantized LoRA - 4-bit quantization + LoRA for extreme memory efficiency",
            memory_requirement="4-8GB VRAM, can even work on some CPUs",
            gpu_required=False,
            training_speed="Medium"
        ),
        TrainingTechnique(
            name="Adapter",
            description="Adds small trainable adapter layers on top of frozen model layers",
            memory_requirement="6GB+ VRAM recommended",
            gpu_required=True,
            training_speed="Fast"
        ),
        TrainingTechnique(
            name="Prefix Tuning",
            description="Prepends trainable prefix tokens to input, keeps model frozen",
            memory_requirement="4GB+ VRAM, very lightweight",
            gpu_required=False,
            training_speed="Very Fast"
        ),
        TrainingTechnique(
            name="BitFit",
            description="Only trains bias parameters - extremely parameter efficient",
            memory_requirement="2-4GB VRAM, can work on CPU",
            gpu_required=False,
            training_speed="Very Fast"
        ),
    ]
    
    return TechniquesListResponse(
        techniques=techniques,
        total=len(techniques)
    )


@router.post(
    "/start",
    response_model=TrainingResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Start model training",
    description="Initiate a new model fine-tuning job with the specified technique and configuration."
)
async def start_training(request: TrainingRequest) -> TrainingResponse:
    """
    Start a new training job.
    
    Args:
        request: Training configuration including model, technique, and parameters
        
    Returns:
        TrainingResponse with job_id for tracking progress
    """
    try:
        training_service = get_training_service()
        result = await training_service.start_training(request)
        
        return TrainingResponse(**result)
        
    except ValueError as e:
        logger.error("training_validation_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error("training_start_error", error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start training: {str(e)}"
        )


@router.get(
    "/jobs",
    response_model=TrainingJobsListResponse,
    summary="List training jobs",
    description="Get a list of all training jobs (past and present)."
)
async def list_training_jobs() -> TrainingJobsListResponse:
    """
    List all training jobs.
    
    Returns:
        List of training jobs with their status
    """
    try:
        training_service = get_training_service()
        jobs = training_service.list_jobs()
        
        return TrainingJobsListResponse(
            jobs=jobs,
            total=len(jobs)
        )
        
    except Exception as e:
        logger.error("list_jobs_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list jobs: {str(e)}"
        )


@router.get(
    "/jobs/{job_id}",
    response_model=TrainingStatus,
    summary="Get training job status",
    description="Get detailed status information for a specific training job."
)
async def get_training_status(job_id: str) -> TrainingStatus:
    """
    Get status of a specific training job.
    
    Args:
        job_id: Unique identifier of the training job
        
    Returns:
        Detailed training status
    """
    try:
        training_service = get_training_service()
        status = training_service.get_job_status(job_id)
        
        if status is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Training job {job_id} not found"
            )
        
        return status
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_status_error", job_id=job_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get job status: {str(e)}"
        )


@router.post(
    "/jobs/{job_id}/cancel",
    summary="Cancel training job",
    description="Cancel a running or queued training job."
)
async def cancel_training(job_id: str):
    """
    Cancel a training job.
    
    Args:
        job_id: Unique identifier of the training job
        
    Returns:
        Cancellation confirmation
    """
    try:
        training_service = get_training_service()
        success = training_service.cancel_job(job_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot cancel job {job_id} - it may not exist or already be completed"
            )
        
        return {
            "status": "cancelled",
            "job_id": job_id,
            "message": f"Training job {job_id} has been cancelled"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("cancel_job_error", job_id=job_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel job: {str(e)}"
        )


@router.post(
    "/create-model",
    response_model=ModelCreateResponse,
    summary="Create model from training job",
    description="Create a usable model from a completed training job and optionally register it with Ollama."
)
async def create_model_from_training(request: ModelCreateRequest) -> ModelCreateResponse:
    """
    Create a model from a completed training job.
    
    Args:
        request: Model creation request with job_id
        
    Returns:
        Model creation status and paths
    """
    try:
        training_service = get_training_service()
        
        # Get job status
        job_status = training_service.get_job_status(request.job_id)
        if job_status is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Training job {request.job_id} not found"
            )
        
        if job_status.status != "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Training job must be completed. Current status: {job_status.status}"
            )
        
        # Get job info
        job = training_service.jobs[request.job_id]
        model_path = job.get("model_path")
        model_name = job["model_name"]
        
        if not model_path:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Model path not found in job"
            )
        
        ollama_model = None
        conversion_status = None
        message = f"Model {model_name} created successfully"
        
        if request.push_to_ollama:
            # Convert and register with Ollama
            logger.info(
                "creating_ollama_model",
                job_id=request.job_id,
                model_name=model_name
            )
            
            try:
                conversion_service = get_conversion_service()
                
                # Get training metadata
                base_model = job.get("base_model", "unknown")
                technique = job.get("technique", "lora")
                
                # Generate Ollama model name
                ollama_model = f"{model_name}_ollama"
                
                # Convert and register
                conversion_result = await conversion_service.convert_and_register_with_ollama(
                    model_path=model_path,
                    model_name=ollama_model,
                    base_model=base_model,
                    technique=technique
                )
                
                conversion_status = conversion_result.get("status")
                message = conversion_result.get("message", message)
                
                # Add instructions if registration was partial
                if conversion_status == "partial":
                    message += f"\n\n{conversion_result.get('instructions', '')}"
                    
                logger.info(
                    "ollama_model_created",
                    job_id=request.job_id,
                    model_name=model_name,
                    ollama_model=ollama_model,
                    status=conversion_status
                )
                
            except Exception as e:
                logger.error(
                    "ollama_conversion_error",
                    job_id=request.job_id,
                    error=str(e),
                    exc_info=True
                )
                # Don't fail the whole request if Ollama registration fails
                message += f"\n\nWarning: Ollama registration failed: {str(e)}"
        
        return ModelCreateResponse(
            status="success" if not request.push_to_ollama or conversion_status == "success" else "partial",
            model_name=model_name,
            model_path=model_path,
            ollama_model=ollama_model,
            message=message
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("create_model_error", error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create model: {str(e)}"
        )


# Dataset Management Endpoints

@router.post(
    "/datasets/upload",
    response_model=DatasetUploadResponse,
    summary="Upload dataset file",
    description="Upload a text, CSV, JSON, or JSONL file to create a custom training dataset."
)
async def upload_dataset(
    file: UploadFile = File(...),
    dataset_name: str = Form(...),
    description: str = Form(None),
    text_column: str = Form("text")
) -> DatasetUploadResponse:
    """
    Upload a file to create a custom dataset.
    
    Supported formats:
    - .txt: One sample per line
    - .csv: CSV with headers
    - .json: JSON array or object
    - .jsonl: One JSON object per line
    """
    try:
        dataset_service = get_dataset_service()
        
        # Read file content
        content = await file.read()
        
        # Create dataset
        metadata = dataset_service.create_dataset_from_file(
            file_content=content,
            filename=file.filename,
            dataset_name=dataset_name,
            description=description,
            text_column=text_column
        )
        
        return DatasetUploadResponse(
            success=True,
            dataset_name=metadata["name"],
            num_samples=metadata["num_samples"],
            message=f"Dataset '{dataset_name}' created with {metadata['num_samples']} samples",
            dataset_path=metadata["file_path"]
        )
        
    except ValueError as e:
        logger.error("dataset_upload_validation_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error("dataset_upload_error", error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload dataset: {str(e)}"
        )


@router.post(
    "/datasets/from-text",
    response_model=DatasetUploadResponse,
    summary="Create dataset from text entries",
    description="Create a custom dataset from a list of text entries."
)
async def create_dataset_from_text(request: DatasetFromTextRequest) -> DatasetUploadResponse:
    """
    Create a dataset from text entries.
    
    Args:
        request: Dataset creation request with text entries
        
    Returns:
        Dataset creation response
    """
    try:
        dataset_service = get_dataset_service()
        
        metadata = dataset_service.create_dataset_from_text(
            dataset_name=request.dataset_name,
            entries=request.entries,
            description=request.description,
            text_column=request.text_column
        )
        
        return DatasetUploadResponse(
            success=True,
            dataset_name=metadata["name"],
            num_samples=metadata["num_samples"],
            message=f"Dataset '{request.dataset_name}' created with {metadata['num_samples']} samples",
            dataset_path=metadata["file_path"]
        )
        
    except Exception as e:
        logger.error("dataset_from_text_error", error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create dataset: {str(e)}"
        )


@router.get(
    "/datasets",
    response_model=DatasetsListResponse,
    summary="List custom datasets",
    description="Get a list of all custom training datasets."
)
async def list_datasets() -> DatasetsListResponse:
    """List all custom datasets."""
    try:
        dataset_service = get_dataset_service()
        datasets = dataset_service.list_datasets()
        
        return DatasetsListResponse(
            datasets=datasets,
            total=len(datasets)
        )
        
    except Exception as e:
        logger.error("list_datasets_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list datasets: {str(e)}"
        )


@router.get(
    "/datasets/{dataset_name}",
    response_model=DatasetInfo,
    summary="Get dataset information",
    description="Get detailed information about a specific dataset."
)
async def get_dataset(dataset_name: str) -> DatasetInfo:
    """Get information about a specific dataset."""
    try:
        dataset_service = get_dataset_service()
        dataset_info = dataset_service.get_dataset(dataset_name)
        
        if dataset_info is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Dataset '{dataset_name}' not found"
            )
        
        return dataset_info
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_dataset_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get dataset: {str(e)}"
        )


@router.delete(
    "/datasets/{dataset_name}",
    summary="Delete dataset",
    description="Delete a custom training dataset."
)
async def delete_dataset(dataset_name: str):
    """Delete a custom dataset."""
    try:
        dataset_service = get_dataset_service()
        success = dataset_service.delete_dataset(dataset_name)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Dataset '{dataset_name}' not found"
            )
        
        return {
            "success": True,
            "message": f"Dataset '{dataset_name}' deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("delete_dataset_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete dataset: {str(e)}"
        )


# Training Data Generation from PDF

@router.post(
    "/training-data/from-pdf",
    summary="Generate training data from PDF",
    description="Upload a PDF and generate LoRA-compatible training data in JSONL format."
)
async def generate_training_data_from_pdf(
    file: UploadFile = File(...),
    model: str = Form("llama2"),
    max_samples: Optional[int] = Form(None),
    chunk_size: int = Form(500),
    chunk_overlap: int = Form(50)
):
    """
    Generate training data from a PDF file.
    
    The service will:
    1. Extract text from the PDF
    2. Chunk the text into manageable pieces
    3. Use an LLM to generate question-answer pairs
    4. Save as JSONL in LoRA training format
    """
    try:
        # Validate file type
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only PDF files are supported"
            )
        
        # Read PDF content
        pdf_content = await file.read()
        
        if len(pdf_content) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Empty PDF file"
            )
        
        # Process PDF
        training_data_service = get_training_data_service()
        job_info = await training_data_service.process_pdf_to_jsonl(
            pdf_content=pdf_content,
            filename=file.filename,
            model=model,
            max_samples=max_samples,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap
        )
        
        return {
            "job_id": job_info["job_id"],
            "status": job_info["status"],
            "message": f"Started processing {file.filename}",
            "filename": file.filename
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("training_data_from_pdf_error", error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process PDF: {str(e)}"
        )


@router.get(
    "/training-data/jobs/{job_id}",
    summary="Get training data generation status",
    description="Check the status of a training data generation job."
)
async def get_training_data_job_status(job_id: str):
    """Get status of a training data generation job."""
    try:
        training_data_service = get_training_data_service()
        job = training_data_service.get_job_status(job_id)
        
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Job {job_id} not found"
            )
        
        return job
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_training_data_job_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get job status: {str(e)}"
        )


@router.get(
    "/training-data/jobs",
    summary="List training data generation jobs",
    description="Get a list of all training data generation jobs."
)
async def list_training_data_jobs():
    """List all training data generation jobs."""
    try:
        training_data_service = get_training_data_service()
        jobs = training_data_service.list_jobs()
        
        return {
            "jobs": jobs,
            "total": len(jobs)
        }
        
    except Exception as e:
        logger.error("list_training_data_jobs_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list jobs: {str(e)}"
        )


@router.get(
    "/training-data/download/{job_id}",
    summary="Download generated training data",
    description="Download the JSONL file containing the generated training data."
)
async def download_training_data(job_id: str):
    """Download the generated training data JSONL file."""
    from fastapi.responses import FileResponse
    
    try:
        training_data_service = get_training_data_service()
        
        job = training_data_service.get_job_status(job_id)
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Job {job_id} not found"
            )
        
        if job["status"] != "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Job is not completed. Current status: {job['status']}"
            )
        
        output_path = training_data_service.get_output_path(job_id)
        if not output_path or not output_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Output file not found"
            )
        
        return FileResponse(
            path=str(output_path),
            media_type="application/jsonl",
            filename=output_path.name
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("download_training_data_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to download training data: {str(e)}"
        )


