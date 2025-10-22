"""
Diagnostic script to test document search functionality.
Run this to verify your RAG system is working correctly.
"""
import sys
import asyncio
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from core.embedder import get_embedder
from core.vector_store import get_vector_store
from core.hybrid_search import HybridSearchEngine
from utils.config import get_settings
from utils.logger import get_logger

logger = get_logger(__name__)


async def test_search():
    """Test search functionality"""
    
    print("\n" + "="*60)
    print("🔍 RAG Search Diagnostic Tool")
    print("="*60 + "\n")
    
    settings = get_settings()
    
    try:
        # 1. Check vector store
        print("1️⃣  Checking vector store...")
        vs = get_vector_store(persist_directory=settings.vector_store_path)
        indices = vs.list_collections()
        
        if not indices:
            print("   ❌ No indices found. Please upload a document first!")
            return False
        
        print(f"   ✅ Found {len(indices)} indices: {', '.join(indices)}")
        
        # 2. Get index info
        index_name = indices[0]
        print(f"\n2️⃣  Checking index: '{index_name}'")
        info = vs.get_collection_info(index_name)
        if info:
            print(f"   ✅ Index has {info['count']} documents")
        else:
            print(f"   ❌ Could not get index info")
            return False
        
        # 3. Test embedder
        print(f"\n3️⃣  Testing embedder...")
        embedder = get_embedder(model_name=settings.embedding_model)
        test_query = "test query"
        query_emb = embedder.embed_query(test_query)
        print(f"   ✅ Embedder working (dimension: {len(query_emb)})")
        
        # 4. Test semantic search
        print(f"\n4️⃣  Testing semantic search...")
        results = vs.query(
            collection_name=index_name,
            query_embedding=query_emb,
            top_k=3
        )
        
        if results['ids']:
            print(f"   ✅ Semantic search returned {len(results['ids'])} results")
            for i, (doc_id, text, dist) in enumerate(zip(results['ids'], results['documents'], results['distances'])):
                print(f"      #{i+1}: ID={doc_id}, Distance={dist:.4f}")
                print(f"           Text preview: {text[:100]}...")
        else:
            print(f"   ⚠️  Semantic search returned 0 results")
        
        # 5. Test hybrid search
        print(f"\n5️⃣  Testing hybrid search...")
        hs = HybridSearchEngine(
            vector_store=vs,
            keyword_index_dir=settings.keyword_index_path,
            semantic_weight=settings.semantic_weight,
            lexical_weight=settings.lexical_weight
        )
        
        # Check if keyword index exists
        kw_idx = hs.get_keyword_index(index_name)
        if kw_idx:
            print(f"   ✅ Keyword index found for '{index_name}'")
        else:
            print(f"   ⚠️  No keyword index (will use semantic search only)")
        
        # Test search
        search_results = hs.search(
            collection_name=index_name,
            query_text=test_query,
            query_embedding=query_emb,
            top_k=3,
            search_type='hybrid'
        )
        
        if search_results:
            print(f"   ✅ Hybrid search returned {len(search_results)} results")
            for i, result in enumerate(search_results):
                print(f"      #{i+1}: ID={result['id']}")
                print(f"           Semantic: {result.get('semantic_score', 0):.4f}, "
                      f"Lexical: {result.get('lexical_score', 0):.4f}, "
                      f"Hybrid: {result.get('hybrid_score', 0):.4f}")
                print(f"           Source: {result.get('source', 'unknown')}")
        else:
            print(f"   ❌ Hybrid search returned 0 results")
            return False
        
        print("\n" + "="*60)
        print("✅ All tests passed! Search is working correctly.")
        print("="*60 + "\n")
        return True
        
    except Exception as e:
        print(f"\n❌ Error during testing: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = asyncio.run(test_search())
    sys.exit(0 if success else 1)
