# Quick Reference: Search Settings

## 🎯 What It Does
Fine-tune how your AI searches through documents to find relevant information.

## 📍 Where To Find It
1. Open Chat page
2. Click ⚙️ Settings icon (top right)
3. Scroll to "📚 Search Indices (Optional)"
4. Select at least one index
5. **Search Configuration** section appears automatically

## 🔧 Settings Explained

### Number of Chunks (1-50)
**What it controls:** How many text pieces to retrieve from each selected document index.

**When to adjust:**
- **Lower (1-3)** → Faster responses, less context
- **Medium (5-10)** → Balanced (recommended)
- **Higher (15+)** → More context, slower responses

**Default:** 5 chunks per index

---

### Minimum Match % (0-100%)
**What it controls:** Filter out results below this relevance score.

**When to adjust:**
- **0%** → Show all results (default)
- **20-40%** → Filter weak matches
- **60%+** → Only high-confidence matches

**Visual:** Drag slider left (less strict) or right (more strict)

**Default:** 0% (no filtering)

---

### Search Type
**What it controls:** The algorithm used to find relevant text.

**Options:**

#### 🏆 Hybrid (Best) - RECOMMENDED
- Combines AI understanding + keyword matching
- Best overall accuracy
- Handles typos and synonyms
- Use for: General questions, complex queries

#### 🧠 Semantic Only
- AI-based meaning comparison
- Great for concept-based questions
- Ignores exact keywords
- Use for: "What's the main idea?", "Explain the concept of..."

#### 🔍 Keyword Only
- Traditional exact word matching
- Fastest option
- Requires exact terms
- Use for: Finding specific terms, codes, names

**Default:** Hybrid (Best)

---

## 💡 Recommended Presets

### 📊 General Q&A (Default)
```
Chunks: 5
Min Match: 0%
Type: Hybrid
```
Good for everyday questions.

### ⚡ Quick Lookup
```
Chunks: 3
Min Match: 30%
Type: Hybrid
```
Fast, high-quality results only.

### 🔬 Deep Research
```
Chunks: 15
Min Match: 0%
Type: Semantic
```
Maximum context for complex analysis.

### 🎯 Exact Match
```
Chunks: 5
Min Match: 50%
Type: Keyword
```
Find specific terms or codes.

### 📚 Academic Search
```
Chunks: 10
Min Match: 25%
Type: Hybrid
```
Balanced depth and relevance.

---

## 🚀 Quick Tips

1. **Start with defaults** - They work well for most cases
2. **Too many results?** → Increase Min Match %
3. **Missing relevant info?** → Increase Number of Chunks
4. **Looking for concepts?** → Use Semantic search
5. **Need exact phrases?** → Use Keyword search
6. **Best results?** → Stick with Hybrid

---

## 🔄 Reset Anytime
Click **"Reset to Defaults"** at the bottom of Settings to restore original values.

---

## 💾 Settings Are Saved
Your preferences persist across sessions - no need to reconfigure each time!

---

## ❓ Troubleshooting

**Problem:** Not seeing search settings
**Solution:** Make sure you've selected at least one index

**Problem:** Results seem irrelevant
**Solution:** Increase Min Match % to 30-40%

**Problem:** Missing expected information
**Solution:** Increase Number of Chunks to 10-15

**Problem:** Responses are slow
**Solution:** Decrease Number of Chunks to 3-5

**Problem:** Can't find specific terms
**Solution:** Switch to "Keyword Only" search type

---

## 📖 Examples

### Example 1: Finding Company Policy
```
Question: "What's our vacation policy?"
Indices: [hr-handbook]
Settings: Chunks=5, Match=20%, Type=Hybrid
Result: ✅ Fast, accurate answer
```

### Example 2: Understanding Concept
```
Question: "Explain quantum entanglement"
Indices: [physics-textbooks]
Settings: Chunks=10, Match=0%, Type=Semantic
Result: ✅ Comprehensive explanation
```

### Example 3: Finding Error Code
```
Question: "Error E-4402 solution"
Indices: [tech-docs]
Settings: Chunks=3, Match=50%, Type=Keyword
Result: ✅ Exact match found quickly
```

---

## 🎓 Advanced Usage

### Multi-Index Search
When selecting multiple indices (e.g., [docs, manuals, wiki]):
- Each index is searched with same settings
- Results are merged and ranked
- Top results from all sources combined

### Score Interpretation
- **80-100%** → Highly relevant
- **60-80%** → Good match
- **40-60%** → Moderate relevance
- **20-40%** → Weak connection
- **0-20%** → Barely related

### Performance Impact
```
Low Impact:   Chunks ≤ 5,  Min Match ≥ 30%
Medium Impact: Chunks 6-10, Min Match 10-30%
High Impact:  Chunks > 10, Min Match < 10%
```

---

## 🏁 Summary

**Casual Use:** Keep defaults
**Power User:** Experiment with settings
**Best Practice:** Start simple, adjust as needed

Happy searching! 🎉
