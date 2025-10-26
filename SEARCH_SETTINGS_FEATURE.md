# Search Settings Feature Implementation

## Overview
Added conditional search configuration fields to the Chat Settings that appear when "Search Indices (Optional)" is selected. This allows users to fine-tune how the RAG (Retrieval-Augmented Generation) system searches through their documents.

## Features Added

### 1. **Number of Chunks to Consider**
- Control how many text chunks to retrieve per index
- Range: 1-50 chunks
- Default: 5 chunks
- Purpose: Balance between context richness and response time

### 2. **Minimum Match Percentage**
- Set the minimum relevance threshold for search results
- Range: 0-100% (displayed as percentage, stored as 0.0-1.0)
- Default: 0% (no filtering)
- Increments: 5%
- Purpose: Filter out low-quality/irrelevant matches

### 3. **Search Type**
- Choose the search algorithm strategy
- Options:
  - **Hybrid (Best)** - Combines semantic (meaning-based) and keyword (lexical) search
  - **Semantic Only** - Uses AI embeddings to find contextually similar content
  - **Keyword Only** - Traditional keyword matching
- Default: Hybrid
- Purpose: Optimize search based on use case

## UI/UX Design

### Conditional Display
- Search configuration fields **only appear** when at least one search index is selected
- Clean, collapsible design within the Settings modal
- Visual feedback showing number of selected indices

### Layout
- Responsive grid layout (3 columns on desktop, stacks on mobile)
- Clear labels and helper text
- Consistent styling with existing UI

### User Experience
- Settings persist in localStorage
- "Reset to Defaults" button restores all settings
- Immediate visual feedback on changes

## Technical Implementation

### Frontend Changes

#### 1. **Type Definitions** (`frontend/src/types/api.ts`)
```typescript
// Added to GenerateRequest and GenerationOptions
search_top_k?: number;
search_min_score?: number;
search_type?: 'hybrid' | 'semantic' | 'lexical';
```

#### 2. **Chat Interface** (`frontend/src/components/ChatInterface.tsx`)
- Added state management for search configuration
- Conditional rendering of search settings
- Updated default options to include search parameters
- Modified API call to include search config only when indices selected

### Backend Changes

#### 1. **Request Schema** (`schemas/request_schemas.py`)
```python
# Added fields to GenerateRequest
search_top_k: Optional[int] = Field(default=5, ge=1, le=50)
search_min_score: Optional[float] = Field(default=0.0, ge=0.0, le=1.0)
search_type: Optional[str] = Field(default="hybrid")
```
- Added validator for search_type to ensure only valid values

#### 2. **Generation Route** (`routes/generate.py`)
- Updated `fetch_relevant_context()` to accept search parameters
- Pass user-specified search config to hybrid search
- Added logging for search configuration

#### 3. **Hybrid Search** (`core/hybrid_search.py`)
- Updated `search()` method to accept `min_score` parameter
- Properly propagate min_score to hybrid_search()

## Default Values

```typescript
{
  search_top_k: 5,           // 5 chunks per index
  search_min_score: 0.0,     // No filtering (0%)
  search_type: 'hybrid'      // Best of both worlds
}
```

## Usage Example

1. Open Chat Settings (⚙️ icon)
2. Scroll to "Search Indices (Optional)"
3. Select one or more indices (e.g., "company-docs")
4. **Search Configuration section appears automatically**
5. Adjust settings:
   - Set chunks to 10 for more context
   - Set min match to 30% to filter low-quality results
   - Keep hybrid search for best results
6. Click "Apply Settings"
7. Your search queries now use these optimized settings

## Benefits

### For Users
- **More Control**: Fine-tune search behavior without code changes
- **Better Results**: Filter out irrelevant matches with min score
- **Faster Responses**: Reduce chunks when speed matters
- **Flexibility**: Choose search type based on query nature

### For Developers
- **Clean Architecture**: Settings flow from UI → API → Search Engine
- **Type Safety**: Full TypeScript typing throughout
- **Validation**: Backend validates all parameters
- **Extensible**: Easy to add more search options

## API Request Example

```json
POST /generate/text
{
  "model": "llama3",
  "prompt": "What is our refund policy?",
  "indices": ["company-policies"],
  "search_top_k": 8,
  "search_min_score": 0.3,
  "search_type": "hybrid",
  "temperature": 0.7
}
```

## Testing Checklist

- [x] Frontend compiles without TypeScript errors
- [x] Settings persist across page reloads
- [x] Conditional display works correctly
- [x] Backend accepts and validates new parameters
- [x] Search parameters passed to hybrid search
- [x] Default values work correctly
- [x] Reset to defaults restores all settings

## Files Modified

### Frontend
- `frontend/src/types/api.ts` - Added search config types
- `frontend/src/components/ChatInterface.tsx` - Added UI and state management

### Backend
- `schemas/request_schemas.py` - Added fields and validation
- `routes/generate.py` - Updated context fetching
- `core/hybrid_search.py` - Added min_score support

## Future Enhancements

Potential improvements for future iterations:
1. **Advanced Filters**: Filter by document type, date range, etc.
2. **Score Visualization**: Show relevance scores in chat
3. **Per-Index Settings**: Different settings for different indices
4. **Presets**: Save and load search configuration presets
5. **A/B Testing**: Compare results with different settings
6. **Smart Defaults**: AI-suggested settings based on query type

## Notes

- All settings are optional and have sensible defaults
- Search configuration only affects queries when indices are selected
- Settings are stored in browser localStorage (per-user)
- Backend gracefully handles missing or invalid parameters
