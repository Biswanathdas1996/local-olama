# Testing Guide: Search Settings Feature

## Pre-Testing Setup

### Requirements
1. Backend server running
2. Frontend dev server running
3. At least one document uploaded and indexed
4. A valid Ollama model available

### Test Environment
```bash
# Terminal 1: Start backend
cd c:\Users\daspa\Desktop\Olama
python main.py

# Terminal 2: Start frontend
cd frontend
npm run dev
```

---

## Test Cases

### ✅ Test 1: Conditional Display
**Goal:** Verify settings only appear when indices selected

**Steps:**
1. Open Chat page
2. Click Settings (⚙️)
3. Scroll to "Search Indices"
4. Verify: No "Search Configuration" section visible
5. Click on an index (e.g., "company-docs")
6. ✓ Expected: "Search Configuration" section appears
7. Click the index again to deselect
8. ✓ Expected: "Search Configuration" section disappears

**Pass Criteria:** Section toggles correctly with index selection

---

### ✅ Test 2: Default Values
**Goal:** Verify correct default values are loaded

**Steps:**
1. Open Settings
2. Select an index
3. Check each field:
   - Number of Chunks: Should be **5**
   - Min Match %: Should show **(0%)**
   - Search Type: Should be **Hybrid (Best)**

**Pass Criteria:** All defaults match expected values

---

### ✅ Test 3: Number of Chunks Input
**Goal:** Test chunk count adjustment

**Steps:**
1. Select an index
2. Find "Number of Chunks" input
3. Try entering: 1 (minimum)
   - ✓ Expected: Accepts value
4. Try entering: 50 (maximum)
   - ✓ Expected: Accepts value
5. Try entering: 100 (over max)
   - ✓ Expected: Constrained to max (50)
6. Try entering: 0 (under min)
   - ✓ Expected: Constrained to min (1)
7. Set to 10
8. Close and reopen settings
   - ✓ Expected: Value persists (still 10)

**Pass Criteria:** Input validation works, values persist

---

### ✅ Test 4: Min Match Percentage Slider
**Goal:** Test relevance threshold slider

**Steps:**
1. Select an index
2. Find "Min Match %" slider
3. Drag slider to far left
   - ✓ Expected: Shows (0%)
4. Drag slider to far right
   - ✓ Expected: Shows (100%)
5. Drag slider to middle
   - ✓ Expected: Shows value around (50%)
6. Note the exact percentage shown
7. Close and reopen settings
   - ✓ Expected: Slider at same position

**Pass Criteria:** Slider responsive, label updates, value persists

---

### ✅ Test 5: Search Type Dropdown
**Goal:** Test search algorithm selection

**Steps:**
1. Select an index
2. Click "Search Type" dropdown
3. Verify options available:
   - Hybrid (Best)
   - Semantic Only
   - Keyword Only
4. Select "Semantic Only"
   - ✓ Expected: Selection changes
5. Close and reopen settings
   - ✓ Expected: Still shows "Semantic Only"
6. Select "Keyword Only"
   - ✓ Expected: Changes to Keyword Only
7. Reset to "Hybrid (Best)"

**Pass Criteria:** All options selectable, value persists

---

### ✅ Test 6: Reset to Defaults
**Goal:** Verify reset functionality

**Steps:**
1. Select 2 indices
2. Change all search settings:
   - Chunks: 20
   - Min Match: 50%
   - Type: Semantic Only
3. Click "Reset to Defaults"
4. Verify:
   - ✓ All indices deselected
   - ✓ Chunks: 5
   - ✓ Min Match: 0%
   - ✓ Type: Hybrid

**Pass Criteria:** All settings and selections reset correctly

---

### ✅ Test 7: Settings Persistence
**Goal:** Verify localStorage persistence

**Steps:**
1. Configure custom settings:
   - Select 1 index
   - Chunks: 8
   - Min Match: 30%
   - Type: Semantic Only
2. Click "Apply Settings"
3. Refresh the page (F5)
4. Open Settings again
5. Verify all values retained:
   - ✓ Same index selected
   - ✓ Chunks: 8
   - ✓ Min Match: 30%
   - ✓ Type: Semantic Only

**Pass Criteria:** Settings survive page reload

---

### ✅ Test 8: API Request - Default Settings
**Goal:** Verify API call with default search settings

**Steps:**
1. Open browser DevTools → Network tab
2. Select an index (use defaults: 5, 0%, hybrid)
3. Send a query: "What is the company policy?"
4. Find the POST to `/generate/text`
5. Check request payload:
   ```json
   {
     "indices": ["company-docs"],
     "search_top_k": 5,
     "search_min_score": 0.0,
     "search_type": "hybrid"
   }
   ```

**Pass Criteria:** Request includes search parameters

---

### ✅ Test 9: API Request - Custom Settings
**Goal:** Verify API call with custom search settings

**Steps:**
1. Configure settings:
   - Chunks: 10
   - Min Match: 40%
   - Type: Semantic Only
2. Open DevTools → Network
3. Send a query
4. Check request payload:
   ```json
   {
     "search_top_k": 10,
     "search_min_score": 0.4,
     "search_type": "semantic"
   }
   ```

**Pass Criteria:** Custom values sent correctly (note: 40% = 0.4)

---

### ✅ Test 10: API Request - No Indices
**Goal:** Verify search params NOT sent without indices

**Steps:**
1. Deselect all indices
2. Open DevTools → Network
3. Send a query
4. Check request payload
5. ✓ Expected: No `indices`, `search_top_k`, `search_min_score`, or `search_type` fields

**Pass Criteria:** Search params excluded when no indices selected

---

### ✅ Test 11: Backend Processing
**Goal:** Verify backend uses search parameters

**Steps:**
1. Check backend logs (terminal running main.py)
2. Configure: Chunks=7, Match=25%, Type=hybrid
3. Select index and send query
4. Look for log entry:
   ```
   INFO: Search config - top_k: 7, min_score: 0.25, type: hybrid
   ```

**Pass Criteria:** Backend logs show correct parameters

---

### ✅ Test 12: Search Quality - High Threshold
**Goal:** Verify min_score filtering works

**Steps:**
1. Select an index with several documents
2. Set Min Match to 80%
3. Send a vague query
4. ✓ Expected: Fewer/no results (high threshold filters most)
5. Check response for sources
6. If sources exist, scores should be ≥ 80%

**Pass Criteria:** High threshold filters weak matches

---

### ✅ Test 13: Search Quality - Low Threshold
**Goal:** Verify min_score=0 returns all results

**Steps:**
1. Set Min Match to 0%
2. Send same query as Test 12
3. ✓ Expected: More results than with 80%
4. Check sources - may include lower scores

**Pass Criteria:** Low threshold includes more results

---

### ✅ Test 14: Chunk Count Impact
**Goal:** Verify chunk count affects results

**Steps:**
1. Set Chunks to 2
2. Send query, note number of source citations
3. Set Chunks to 10
4. Send same query
5. ✓ Expected: More source citations with higher chunk count

**Pass Criteria:** More chunks = more context retrieved

---

### ✅ Test 15: Search Type Comparison
**Goal:** Compare different search algorithms

**Scenario:** Send query "database connection error"

**Test 15a: Hybrid**
1. Set Type: Hybrid
2. Send query
3. Note results

**Test 15b: Semantic**
1. Set Type: Semantic Only
2. Send query
3. Compare with Hybrid
4. ✓ May find related concepts even without exact words

**Test 15c: Keyword**
1. Set Type: Keyword Only
2. Send query
3. Compare with others
4. ✓ Should match exact words "database", "connection", "error"

**Pass Criteria:** Different types produce different results

---

### ✅ Test 16: Multi-Index Search
**Goal:** Test search across multiple indices

**Steps:**
1. Select 3 indices
2. Set Chunks to 5
3. Send query
4. Check response sources
5. ✓ Expected: Sources from multiple indices
6. ✓ Expected: Total chunks ≈ 5 × 3 = 15 (or less if filtered)

**Pass Criteria:** Results merged from all selected indices

---

### ✅ Test 17: Mobile Responsiveness
**Goal:** Test on mobile viewport

**Steps:**
1. Open DevTools
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select mobile device (e.g., iPhone 12)
4. Open Settings
5. Navigate to Search Configuration
6. ✓ Expected: Fields stack vertically
7. ✓ All inputs usable with touch
8. ✓ Slider works on touch screen

**Pass Criteria:** Fully functional on mobile

---

### ✅ Test 18: Edge Case - Very High Match Threshold
**Goal:** Test 100% match requirement

**Steps:**
1. Set Min Match to 100%
2. Send a query
3. ✓ Expected: Likely no results (very strict)
4. Check response
5. Backend should handle gracefully

**Pass Criteria:** No errors, handles empty results

---

### ✅ Test 19: Edge Case - Maximum Chunks
**Goal:** Test performance with high chunk count

**Steps:**
1. Select multiple indices
2. Set Chunks to 50 (maximum)
3. Send query
4. ✓ Expected: Response may be slower
5. ✓ Should still complete successfully
6. Check for timeout or errors

**Pass Criteria:** Handles max chunks without errors

---

### ✅ Test 20: Integration Test - Full Workflow
**Goal:** End-to-end test of complete feature

**Steps:**
1. **Setup**
   - Upload a document → creates index "test-docs"
   
2. **Configure**
   - Open Chat Settings
   - Select "test-docs" index
   - Set Chunks: 7
   - Set Min Match: 20%
   - Set Type: Hybrid (Best)
   - Click "Apply Settings"

3. **Query**
   - Send: "What are the key points in the document?"
   - Wait for response

4. **Verify**
   - ✓ Response includes relevant information
   - ✓ Sources cited below response
   - ✓ Source count ≤ 7
   - ✓ All source scores ≥ 20%

5. **Modify & Retry**
   - Change to Chunks: 3, Match: 50%
   - Send same query
   - ✓ Fewer sources
   - ✓ Higher quality results

6. **Reset & Clean**
   - Click "Reset to Defaults"
   - ✓ Settings reset
   - Send query without indices
   - ✓ Works normally (no RAG)

**Pass Criteria:** Complete workflow functional

---

## Test Result Template

```
Test #: [Number]
Test Name: [Name]
Date: [Date]
Tester: [Name]

Status: [ ] Pass [ ] Fail [ ] Partial

Notes:
_________________________________________________

Issues Found:
_________________________________________________

Screenshots: [if applicable]
```

---

## Known Limitations

1. **Min Match %** - Shows as percentage but sent as decimal (0.0-1.0)
2. **Chunk Count** - Actual results may be less if filtered by min_score
3. **Search Type** - Semantic/Keyword require different data availability

---

## Regression Tests

After any code changes, re-run:
- Test 6 (Reset)
- Test 7 (Persistence)
- Test 10 (No indices)
- Test 20 (Full workflow)

---

## Performance Benchmarks

Record typical response times:
```
Default settings (5 chunks, 0%, hybrid): _____ ms
High chunks (20 chunks): _____ ms
High threshold (70% match): _____ ms
Multiple indices (3x): _____ ms
```

---

## Bug Report Template

```
Title: [Brief description]
Test: [Test # where found]

Expected Behavior:
_________________________________________________

Actual Behavior:
_________________________________________________

Steps to Reproduce:
1. 
2. 
3. 

Environment:
- Browser: 
- OS: 
- Backend: Running/Not Running
- Indices: [List]

Severity: [ ] Critical [ ] High [ ] Medium [ ] Low

Screenshots/Logs:
_________________________________________________
```

---

## Sign-Off

```
All tests completed: _____ / 20 passed

Critical issues: [None / List]
Minor issues: [None / List]

Feature ready for: [ ] Production [ ] Beta [ ] Needs work

Tested by: _________________
Date: _____________________
Signature: _________________
```
