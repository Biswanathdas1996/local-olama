"""
Service for generating training data from PDF documents.
Creates LoRA-compatible JSONL files for model fine-tuning.
"""
import json
import uuid
import asyncio
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime
import io

from core.doc_extractor import DocumentExtractor
from core.text_chunker import SemanticChunker
from services.ollama_service import OllamaService
from schemas.request_schemas import GenerateRequest
from utils.logger import get_logger

logger = get_logger(__name__)


class TrainingDataService:
    """Service for creating training datasets from PDFs."""
    
    def __init__(self):
        """Initialize training data service."""
        self.output_dir = Path("data/training_data")
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.ollama_service = OllamaService()
        self.processing_jobs: Dict[str, Dict[str, Any]] = {}
        self.doc_extractor = DocumentExtractor()
        self.text_chunker = SemanticChunker()
        
    async def process_pdf_to_jsonl(
        self,
        pdf_content: bytes,
        filename: str,
        model: str = "llama2",
        max_samples: Optional[int] = None,
        chunk_size: int = 500,
        chunk_overlap: int = 50
    ) -> Dict[str, Any]:
        """
        Process a PDF and generate training data in JSONL format.
        
        Args:
            pdf_content: PDF file content as bytes
            filename: Original filename
            model: Ollama model to use for generating Q&A pairs
            max_samples: Maximum number of training samples to generate
            chunk_size: Size of text chunks
            chunk_overlap: Overlap between chunks
            
        Returns:
            Job information including job_id
        """
        job_id = str(uuid.uuid4())
        
        job_info = {
            "job_id": job_id,
            "filename": filename,
            "status": "queued",
            "progress": 0.0,
            "created_at": datetime.utcnow(),
            "model": model,
            "total_samples": 0,
            "output_path": None,
        }
        
        self.processing_jobs[job_id] = job_info
        
        # Start processing in background
        asyncio.create_task(
            self._process_pdf_task(
                job_id, pdf_content, filename, model, max_samples, chunk_size, chunk_overlap
            )
        )
        
        logger.info(
            "training_data_job_created",
            job_id=job_id,
            filename=filename,
            model=model
        )
        
        return job_info
    
    async def _process_pdf_task(
        self,
        job_id: str,
        pdf_content: bytes,
        filename: str,
        model: str,
        max_samples: Optional[int],
        chunk_size: int,
        chunk_overlap: int
    ):
        """Execute PDF processing task."""
        job = self.processing_jobs[job_id]
        
        try:
            job["status"] = "running"
            job["progress"] = 5.0
            
            # Extract text from PDF
            logger.info("extracting_text_from_pdf", job_id=job_id, filename=filename)
            file_obj = io.BytesIO(pdf_content)
            extracted_doc = self.doc_extractor.extract(file_obj, filename)
            text = extracted_doc.text
            
            if not text or len(text.strip()) < 100:
                raise ValueError("Could not extract sufficient text from PDF")
            
            job["progress"] = 20.0
            
            # Chunk the text
            logger.info("chunking_text", job_id=job_id, text_length=len(text))
            chunker = SemanticChunker(
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap
            )
            chunk_objects = chunker.chunk_text(text)
            chunks = [chunk.text for chunk in chunk_objects]
            
            job["progress"] = 30.0
            
            # Limit chunks if max_samples is specified
            if max_samples:
                chunks = chunks[:max_samples]
            
            logger.info(
                "generating_training_data",
                job_id=job_id,
                num_chunks=len(chunks),
                model=model
            )
            
            # Generate training samples
            training_samples = []
            progress_step = 60.0 / len(chunks) if chunks else 0
            
            for i, chunk in enumerate(chunks):
                try:
                    # Generate Q&A pairs from the chunk
                    sample = await self._generate_training_sample(chunk, model)
                    if sample:
                        training_samples.append(sample)
                    
                    job["progress"] = 30.0 + (i + 1) * progress_step
                    
                except Exception as e:
                    logger.warning(
                        "sample_generation_failed",
                        job_id=job_id,
                        chunk_index=i,
                        error=str(e)
                    )
                    continue
            
            job["progress"] = 90.0
            
            if not training_samples:
                raise ValueError("Failed to generate any training samples from the PDF")
            
            # Save as JSONL
            output_filename = f"{Path(filename).stem}_{job_id[:8]}_training_data.jsonl"
            output_path = self.output_dir / output_filename
            
            with open(output_path, "w", encoding="utf-8") as f:
                for sample in training_samples:
                    f.write(json.dumps(sample, ensure_ascii=False) + "\n")
            
            job["status"] = "completed"
            job["progress"] = 100.0
            job["total_samples"] = len(training_samples)
            job["output_path"] = str(output_path)
            job["completed_at"] = datetime.utcnow()
            
            logger.info(
                "training_data_generation_completed",
                job_id=job_id,
                samples=len(training_samples),
                output_path=str(output_path)
            )
            
        except Exception as e:
            job["status"] = "failed"
            job["error_message"] = str(e)
            job["completed_at"] = datetime.utcnow()
            
            logger.error(
                "training_data_generation_failed",
                job_id=job_id,
                error=str(e),
                exc_info=True
            )
    
    async def _generate_training_sample(
        self,
        text_chunk: str,
        model: str
    ) -> Optional[Dict[str, Any]]:
        """
        Generate a training sample from a text chunk.
        Creates instruction-response pairs suitable for LoRA training.
        
        Args:
            text_chunk: Text to generate training data from
            model: Ollama model to use
            
        Returns:
            Training sample in LoRA format
        """
        # Create comprehensive prompt with instructions
        prompt = f"""You are an expert at creating training data for language models. 
Given a piece of text, create a natural question that can be answered using that text, 
and provide the answer. The question should be specific and the answer should be informative.

Format your response as:
QUESTION: [your question here]
ANSWER: [your answer here]

Only generate ONE question-answer pair.

Based on this text, create ONE question-answer pair:

Text: {text_chunk}

Generate the question and answer now:"""

        try:
            # Generate Q&A using Ollama
            request = GenerateRequest(
                model=model,
                prompt=prompt,
                temperature=0.7,
                max_tokens=500
            )
            
            response = await self.ollama_service.generate(request)
            
            response_text = response.get("response", "").strip()
            
            # Parse the response
            question = None
            answer = None
            
            lines = response_text.split("\n")
            for line in lines:
                line = line.strip()
                if line.startswith("QUESTION:"):
                    question = line.replace("QUESTION:", "").strip()
                elif line.startswith("ANSWER:"):
                    answer = line.replace("ANSWER:", "").strip()
            
            # If parsing failed, try alternative approach
            if not question or not answer:
                # Try to split by common patterns
                if "?" in response_text:
                    parts = response_text.split("?", 1)
                    if len(parts) == 2:
                        question = parts[0].strip() + "?"
                        answer = parts[1].strip()
            
            if question and answer and len(answer) > 20:
                # Return in LoRA training format
                # Format 1: Instruction-Response format
                return {
                    "instruction": question,
                    "input": "",
                    "output": answer,
                    "text": f"### Instruction:\n{question}\n\n### Response:\n{answer}"
                }
            
            return None
            
        except Exception as e:
            logger.warning("qa_generation_failed", error=str(e))
            return None
    
    def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get status of a processing job."""
        return self.processing_jobs.get(job_id)
    
    def list_jobs(self) -> List[Dict[str, Any]]:
        """List all processing jobs."""
        return list(self.processing_jobs.values())
    
    def get_output_path(self, job_id: str) -> Optional[Path]:
        """Get output file path for a completed job."""
        job = self.processing_jobs.get(job_id)
        if job and job.get("output_path"):
            return Path(job["output_path"])
        return None


# Singleton instance
_training_data_service: Optional[TrainingDataService] = None


def get_training_data_service() -> TrainingDataService:
    """Get the training data service instance."""
    global _training_data_service
    if _training_data_service is None:
        _training_data_service = TrainingDataService()
    return _training_data_service
