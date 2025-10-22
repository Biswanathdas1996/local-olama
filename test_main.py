"""
Test suite for the Local LLM Platform.
Run with: pytest
"""
import pytest
from httpx import AsyncClient
from main import app


@pytest.mark.asyncio
async def test_health_check():
    """Test health check endpoint."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "ollama_connected" in data
        assert "timestamp" in data
        assert "version" in data


@pytest.mark.asyncio
async def test_root_endpoint():
    """Test root endpoint."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "name" in data
        assert "version" in data
        assert "status" in data


@pytest.mark.asyncio
async def test_list_models():
    """Test listing models."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/models")
        # May fail if Ollama is not running, but should return valid structure
        assert response.status_code in [200, 503]
        
        if response.status_code == 200:
            data = response.json()
            assert "models" in data
            assert "count" in data
            assert isinstance(data["models"], list)


@pytest.mark.asyncio
async def test_generate_validation():
    """Test generation request validation."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Invalid request - missing required fields
        response = await client.post("/generate", json={})
        assert response.status_code == 422  # Validation error
        
        # Valid structure but may fail if Ollama not running
        response = await client.post(
            "/generate",
            json={
                "model": "llama3",
                "prompt": "Test prompt",
                "max_tokens": 100
            }
        )
        assert response.status_code in [200, 404, 503]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
