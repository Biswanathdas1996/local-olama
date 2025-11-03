# Collection Name Validation Fix

## Issue
The system was failing when trying to create a collection with the name "tg" with the error:
```
Validation error: name: Expected a name containing 3-512 characters from [a-zA-Z0-9._-], 
starting and ending with a character in [a-zA-Z0-9]. Got: tg
```

## Root Cause
- ChromaDB/Qdrant requires collection names to be **at least 3 characters long**
- The collection name "tg" is only 2 characters
- No validation was enforced at the API level, allowing invalid names to reach the database layer

## Solution Applied

### 1. **API-Level Validation** (`routes/ingestion_routes.py`)
Added validation in the `/rag/ingest-doc` endpoint:
- **Length Check**: Collection name must be 3-512 characters
- **Character Check**: Must contain only `[a-zA-Z0-9._-]`
- **Start/End Check**: Must start and end with an alphanumeric character `[a-zA-Z0-9]`
- **Clear Error Messages**: Returns HTTP 400 with descriptive message if validation fails

### 2. **Vector Store Validation** (`core/vector_store.py`)
Enhanced `create_collection()` method:
- Validates collection name before attempting creation
- Raises `ValueError` with clear error message for invalid names
- Better error handling and logging

### 3. **Error Propagation**
- API endpoint catches `ValueError` from vector store
- Converts to HTTP 400 Bad Request with user-friendly message
- Prevents cryptic database errors from reaching the user

## Collection Name Rules

✅ **Valid Collection Names:**
- `documents` (3+ chars)
- `pdf_files` (with underscore)
- `data-2024` (with hyphen)
- `my.collection` (with dot)
- `abc` (minimum 3 chars)
- `MyDocuments123` (alphanumeric)

❌ **Invalid Collection Names:**
- `tg` (too short - only 2 chars)
- `ab` (too short - only 2 chars)
- `a` (too short - only 1 char)
- `_docs` (starts with underscore)
- `docs-` (ends with hyphen)
- `my docs` (contains space)
- `docs@2024` (contains @)
- `123-abc-` (ends with hyphen)

## Error Messages

### Before Fix:
```
Failed to create collection 'tg': Validation error: name: Expected a name containing 
3-512 characters from [a-zA-Z0-9._-], starting and ending with a character in [a-zA-Z0-9]. Got: tg
```

### After Fix:
```
HTTP 400 Bad Request
{
  "detail": "Index name must be between 3 and 512 characters. Got: 'tg' (2 characters)"
}
```

Or:
```
HTTP 400 Bad Request
{
  "detail": "Index name must contain only alphanumeric characters, dots, underscores, 
  and hyphens, and must start and end with an alphanumeric character. Got: '-invalid'"
}
```

## Testing

To test the fix, try these scenarios:

### Valid Names (Should Succeed):
```bash
# Valid 3-character name
curl -X POST "http://localhost:8000/rag/ingest-doc" \
  -F "file=@document.pdf" \
  -F "index_name=abc"

# Valid name with special chars
curl -X POST "http://localhost:8000/rag/ingest-doc" \
  -F "file=@document.pdf" \
  -F "index_name=my_docs-2024"
```

### Invalid Names (Should Return 400 Error):
```bash
# Too short
curl -X POST "http://localhost:8000/rag/ingest-doc" \
  -F "file=@document.pdf" \
  -F "index_name=tg"

# Invalid characters
curl -X POST "http://localhost:8000/rag/ingest-doc" \
  -F "file=@document.pdf" \
  -F "index_name=my docs"
```

## Recommendation
When creating a new index/collection, use descriptive names that are:
- At least 3 characters long
- Use underscores or hyphens for spaces
- Examples: `pdf_documents`, `research-papers`, `customer_data`

## Files Modified
1. `routes/ingestion_routes.py` - Added API-level validation
2. `core/vector_store.py` - Added database-level validation
3. Both files now provide clear, user-friendly error messages

## Status
✅ **Fixed** - The system now properly validates collection names and provides clear error messages before attempting to create collections.
