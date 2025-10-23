# Local LLM Platform

## Overview

The Local LLM Platform is a comprehensive FastAPI-based application that provides enterprise-grade document ingestion, RAG (Retrieval-Augmented Generation), and model fine-tuning capabilities powered by Ollama. The platform enables users to run local LLMs with privacy-first document processing, hybrid search, and custom model training using techniques like LoRA and QLoRA.

The system consists of a Python FastAPI backend with advanced document processing capabilities and a React TypeScript frontend built with Vite. It supports document upload, semantic search, chat interfaces, template generation, and model fine-tuning workflows.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Backend Architecture

**Framework**: FastAPI with async/await patterns for concurrent request handling and long-running operations.

**Application Structure**:
- Main application entry point (`main.py`) with lifespan management for startup/shutdown events
- Modular route structure separating concerns (models, generation, ingestion, training)
- Service layer pattern with singleton instances for Ollama integration, training, and dataset management
- Core document processing modules organized as reusable components

**Document Processing Pipeline**:
- **DocumentExtractor**: Structure-aware parsing using Docling for PDFs, DOCX, TXT, PPTX, HTML with fallback parsers
- **SemanticChunker**: Token-aware text chunking with configurable overlap (default 512 tokens, 100 token overlap)
- **LocalEmbedder**: Sentence-transformers based embedding generation supporting multiple models (nomic-embed-text, BGE variants)
- **KeywordExtractor**: KeyBERT-based semantic keyword extraction for hybrid search
- **VectorStoreManager**: ChromaDB integration for persistent local vector storage
- **HybridSearchEngine**: Combines semantic similarity (ChromaDB) with lexical matching (Whoosh BM25) using weighted fusion (65% semantic, 35% lexical by default)

**Model Training System**:
- Training techniques: LoRA, QLoRA, Adapter/Prefix Tuning, BitFit
- PEFT (Parameter-Efficient Fine-Tuning) integration using Hugging Face transformers
- Training data generation from PDFs using Ollama models
- Model checkpointing and metadata tracking
- Async job management for long-running training operations
- Model conversion service for GGUF format and Ollama registration

**Context Management**: 
- Handles large prompts with size validation (default 10MB limit)
- Multi-turn conversation context preservation
- RAG-augmented generation with configurable index selection

### Frontend Architecture

**Framework**: React 18 with TypeScript, built using Vite for fast development and optimized production builds.

**UI Library**: TailwindCSS with custom design system including responsive breakpoints and mobile-first approach.

**Routing**: React Router v7 for client-side navigation with routes for Chat, Documents (BYOD), Models, Training, Templates, and Saved Templates.

**State Management**: React hooks-based state management with custom hooks:
- `useGeneration`: Handles chat message state and API calls for text generation
- `useModels`: Manages model list, download progress polling, and CRUD operations
- `useHealth`: Periodic health checks for Ollama connectivity

**Key Features**:
- Real-time chat interface with Markdown rendering and syntax highlighting
- Document upload with RAG index management
- Model download with progress tracking via polling
- Template system with grid/list views and localStorage persistence
- Training data creation from PDFs with job status monitoring
- Dataset management for fine-tuning workflows

**API Communication**: Axios-based service layer with centralized error handling and 5-minute timeout for model operations.

### Data Storage Solutions

**Vector Database**: ChromaDB with persistent local storage in `./data/vector_store`
- Efficient batch operations for embeddings
- Metadata filtering support
- Automatic collection management per index

**Keyword Index**: Whoosh-based full-text search index in `./data/keyword_index`
- BM25F scoring for lexical matching
- Multi-field search capabilities

**Training Data**: 
- Custom datasets stored in Arrow format under `./data/custom_datasets`
- Metadata tracked in JSON (`datasets_metadata.json`)
- JSONL format support for training data upload

**Trained Models**: Stored in `./models/trained` with:
- LoRA adapter weights
- Tokenizer configurations
- Training metadata JSON files
- Model checkpoints in `./models/checkpoints`

**Template Storage**: Browser localStorage for user-created templates with JSON serialization.

### Authentication and Authorization

Currently no authentication layer implemented - designed for local/private deployment scenarios. The application assumes trusted local network access.

## External Dependencies

### LLM Runtime
- **Ollama**: Core LLM runtime running locally (default: `http://localhost:11434`)
  - Handles model downloads, storage, and inference
  - Provides streaming generation capabilities
  - CLI integration for model management

### Document Processing
- **Docling** (v2.58.0+): Structure-aware document parsing for PDFs with section preservation
- **PyPDF2**: Fallback PDF text extraction
- **python-docx**: DOCX document parsing
- **python-pptx**: PowerPoint presentation parsing
- **BeautifulSoup4**: HTML content extraction
- **NLTK/SpaCy**: Optional NLP enhancements for text processing

### ML & Embeddings
- **sentence-transformers**: Local embedding generation with models like:
  - nomic-ai/nomic-embed-text-v1.5 (768d, recommended)
  - BAAI/bge-large-en-v1.5 (1024d, highest accuracy)
  - BAAI/bge-base-en-v1.5 (768d, balanced)
- **PyTorch**: Deep learning framework for training and inference
- **Transformers (Hugging Face)**: Model loading and fine-tuning infrastructure
- **PEFT**: Parameter-efficient fine-tuning techniques (LoRA, QLoRA, Adapters)

### Vector & Search
- **ChromaDB** (v0.5.0+): Persistent vector database with HNSW indexing
- **Whoosh**: Pure Python search library for BM25 lexical matching (optional, for hybrid search)
- **KeyBERT**: Semantic keyword extraction

### Text Processing
- **LangChain**: Text splitting and chunking utilities
- **langchain-text-splitters**: Token-aware text segmentation

### Frontend Stack
- **React 18**: UI framework
- **React Router v7**: Client-side routing
- **Axios**: HTTP client with interceptors
- **react-markdown**: Markdown rendering in chat
- **react-syntax-highlighter**: Code block syntax highlighting
- **html2pdf.js**: PDF export functionality
- **TailwindCSS**: Utility-first CSS framework
- **Vite**: Build tool and development server

### Development Tools
- **TypeScript**: Type safety for frontend
- **ESLint**: Code linting
- **PostCSS/Autoprefixer**: CSS processing

### Python Infrastructure
- **FastAPI**: ASGI web framework
- **Uvicorn**: ASGI server with WebSocket support
- **Pydantic**: Data validation and settings management
- **structlog**: Structured JSON logging for production
- **httpx**: Async HTTP client for Ollama communication
- **python-multipart**: File upload handling

### Configuration Management
- **python-dotenv**: Environment variable loading
- **pydantic-settings**: Type-safe configuration from environment