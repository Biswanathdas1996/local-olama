"""
Example usage of the RAG system API.
Demonstrates document ingestion and search.
"""

import requests
from pathlib import Path
import time

# API base URL
BASE_URL = "http://localhost:8000/rag"


def check_health():
    """Check if RAG system is healthy"""
    print("🔍 Checking RAG system health...")
    response = requests.get(f"{BASE_URL}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}\n")
    return response.status_code == 200


def ingest_document(file_path: str, index_name: str):
    """
    Ingest a document into the RAG system.
    
    Args:
        file_path: Path to document file
        index_name: Name of index to store in
    """
    print(f"📄 Ingesting document: {file_path}")
    print(f"   Index: {index_name}")
    
    file_path = Path(file_path)
    if not file_path.exists():
        print(f"❌ File not found: {file_path}\n")
        return None
    
    with open(file_path, 'rb') as f:
        files = {'file': f}
        data = {'index_name': index_name}
        
        response = requests.post(
            f"{BASE_URL}/ingest-doc",
            files=files,
            data=data
        )
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Success!")
        print(f"   Chunks created: {result['chunks_created']}")
        print(f"   Filename: {result['filename']}\n")
        return result
    else:
        print(f"❌ Error {response.status_code}: {response.text}\n")
        return None


def search_documents(query: str, index_name: str, top_k: int = 5, search_type: str = 'hybrid'):
    """
    Search documents in an index.
    
    Args:
        query: Search query
        index_name: Index to search
        top_k: Number of results
        search_type: 'hybrid', 'semantic', or 'lexical'
    """
    print(f"🔎 Searching: '{query}'")
    print(f"   Index: {index_name}")
    print(f"   Type: {search_type}")
    print(f"   Top-K: {top_k}")
    
    response = requests.get(
        f"{BASE_URL}/search",
        params={
            'query': query,
            'index_name': index_name,
            'top_k': top_k,
            'search_type': search_type
        }
    )
    
    if response.status_code == 200:
        result = response.json()
        print(f"\n✅ Found {result['total_results']} results:\n")
        
        for i, res in enumerate(result['results'], 1):
            print(f"Result {i} (score: {res['score']:.4f})")
            print(f"  Text: {res['text'][:200]}...")
            print(f"  Metadata: {res['metadata']}")
            print()
        
        return result
    else:
        print(f"❌ Error {response.status_code}: {response.text}\n")
        return None


def list_indices():
    """List all available indices"""
    print("📚 Listing indices...")
    
    response = requests.get(f"{BASE_URL}/indices")
    
    if response.status_code == 200:
        result = response.json()
        print(f"Total indices: {result['total_indices']}\n")
        
        for idx in result['indices']:
            print(f"📁 {idx['name']}")
            print(f"   Documents: {idx['document_count']}")
            print(f"   Metadata: {idx['metadata']}\n")
        
        return result
    else:
        print(f"❌ Error {response.status_code}: {response.text}\n")
        return None


def get_statistics():
    """Get system statistics"""
    print("📊 Fetching statistics...")
    
    response = requests.get(f"{BASE_URL}/stats")
    
    if response.status_code == 200:
        result = response.json()
        
        print(f"\nVector Store:")
        print(f"  Collections: {result['vector_store']['total_collections']}")
        print(f"  Documents: {result['vector_store']['total_documents']}")
        
        print(f"\nEmbedding Model:")
        print(f"  Name: {result['embedding_model']['model_name']}")
        print(f"  Dimension: {result['embedding_model']['dimension']}")
        print(f"  Device: {result['embedding_model']['device']}")
        
        print(f"\nConfiguration:")
        config = result['configuration']
        print(f"  Chunk size: {config['chunk_size']} tokens")
        print(f"  Chunk overlap: {config['chunk_overlap']} tokens")
        print(f"  Semantic weight: {config['semantic_weight']}")
        print(f"  Lexical weight: {config['lexical_weight']}")
        print()
        
        return result
    else:
        print(f"❌ Error {response.status_code}: {response.text}\n")
        return None


def delete_index(index_name: str):
    """Delete an index"""
    print(f"🗑️ Deleting index: {index_name}")
    
    response = requests.delete(f"{BASE_URL}/indices/{index_name}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ {result['message']}\n")
        return result
    else:
        print(f"❌ Error {response.status_code}: {response.text}\n")
        return None


def main():
    """Example workflow"""
    print("=" * 70)
    print("RAG System Example Workflow")
    print("=" * 70)
    print()
    
    # 1. Check health
    if not check_health():
        print("❌ RAG system is not healthy. Make sure the server is running.")
        return
    
    # 2. Get statistics
    get_statistics()
    
    # 3. List existing indices
    list_indices()
    
    # 4. Example: Ingest a document
    # Uncomment and provide a real file path to test
    # ingest_document("path/to/your/document.pdf", "test_index")
    
    # 5. Example: Search
    # Uncomment after ingesting a document
    # search_documents(
    #     query="your search query here",
    #     index_name="test_index",
    #     top_k=3
    # )
    
    print("=" * 70)
    print("Example complete!")
    print("=" * 70)
    print()
    print("💡 Next steps:")
    print("   1. Update this script with your document path")
    print("   2. Run ingestion: ingest_document('your_file.pdf', 'your_index')")
    print("   3. Run search: search_documents('your query', 'your_index')")
    print()


if __name__ == "__main__":
    main()
