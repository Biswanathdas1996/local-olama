# Example Requests

This file contains example requests for testing the Local LLM Platform API.

## Using PowerShell

### 1. Health Check
```powershell
Invoke-RestMethod -Uri http://localhost:8000/health | ConvertTo-Json
```

### 2. List Models
```powershell
Invoke-RestMethod -Uri http://localhost:8000/models | ConvertTo-Json
```

### 3. Generate Text
```powershell
$body = @{
    model = "llama3"
    prompt = "Explain what FastAPI is in 2 sentences."
    max_tokens = 100
    temperature = 0.7
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:8000/generate -Method Post -Body $body -ContentType "application/json" | ConvertTo-Json
```

### 4. Download Model
```powershell
$body = @{
    model_name = "mistral"
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:8000/models/download -Method Post -Body $body -ContentType "application/json" | ConvertTo-Json
```

### 5. Delete Model
```powershell
Invoke-RestMethod -Uri http://localhost:8000/models/mistral -Method Delete | ConvertTo-Json
```

## Using cURL (Git Bash / WSL)

### 1. Health Check
```bash
curl http://localhost:8000/health | jq
```

### 2. List Models
```bash
curl http://localhost:8000/models | jq
```

### 3. Generate Text
```bash
curl -X POST http://localhost:8000/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3",
    "prompt": "Explain what FastAPI is in 2 sentences.",
    "max_tokens": 100,
    "temperature": 0.7
  }' | jq
```

### 4. Generate with Large Context
```bash
curl -X POST http://localhost:8000/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3",
    "prompt": "Write a detailed technical explanation of how neural networks work...",
    "max_tokens": 4000,
    "temperature": 0.8,
    "top_p": 0.9
  }' | jq
```

### 5. Download Model
```bash
curl -X POST http://localhost:8000/models/download \
  -H "Content-Type: application/json" \
  -d '{"model_name": "mistral"}' | jq
```

### 6. Delete Model
```bash
curl -X DELETE http://localhost:8000/models/mistral | jq
```

## Using Python

```python
import requests

# Base URL
BASE_URL = "http://localhost:8000"

# Health Check
response = requests.get(f"{BASE_URL}/health")
print(response.json())

# List Models
response = requests.get(f"{BASE_URL}/models")
print(response.json())

# Generate Text
response = requests.post(
    f"{BASE_URL}/generate",
    json={
        "model": "llama3",
        "prompt": "What is machine learning?",
        "max_tokens": 200,
        "temperature": 0.7
    }
)
print(response.json())

# Download Model
response = requests.post(
    f"{BASE_URL}/models/download",
    json={"model_name": "phi3"}
)
print(response.json())
```

## Multi-turn Conversation Example

```powershell
# First turn
$body1 = @{
    model = "llama3"
    prompt = "Hi, my name is Alice."
    max_tokens = 50
} | ConvertTo-Json

$response1 = Invoke-RestMethod -Uri http://localhost:8000/generate -Method Post -Body $body1 -ContentType "application/json"

# Second turn - using context from first
$body2 = @{
    model = "llama3"
    prompt = "What is my name?"
    max_tokens = 50
    context = $response1.context
} | ConvertTo-Json

$response2 = Invoke-RestMethod -Uri http://localhost:8000/generate -Method Post -Body $body2 -ContentType "application/json"
```
