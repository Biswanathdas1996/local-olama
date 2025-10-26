# Search Settings UI Guide

## Visual Layout

### Before Selecting Indices
```
┌─────────────────────────────────────────────────────────────┐
│ 📚 Search Indices (Optional)                                │
├─────────────────────────────────────────────────────────────┤
│ Select indices to search through your documents for         │
│ relevant context                                             │
│                                                              │
│ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│ │company-docs │  │tech-manuals │  │policies (5) │          │
│ │    (12)     │  │    (8)      │  │             │          │
│ └─────────────┘  └─────────────┘  └─────────────┘          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### After Selecting Indices - NEW SECTION APPEARS
```
┌─────────────────────────────────────────────────────────────┐
│ 📚 Search Indices (Optional)                                │
├─────────────────────────────────────────────────────────────┤
│ Select indices to search through your documents for         │
│ relevant context                                             │
│                                                              │
│ ┌═════════════┐  ┌─────────────┐  ┌═════════════┐          │
│ ║company-docs ║  │tech-manuals │  ║policies (5) ║          │
│ ║    (12)     ║  │    (8)      │  ║             ║          │
│ └═════════════┘  └─────────────┘  └═════════════┘          │
│                                                              │
│ ┌───────────────────────────────────────────────────────────┐│
│ │ ✓ 2 indices selected                                      ││
│ └───────────────────────────────────────────────────────────┘│
│                                                              │
│ ─────────────────────────────────────────────────────────── │
│                                                              │
│ 🔍 Search Configuration                                     │
│                                                              │
│ ┌─────────────────┬─────────────────┬─────────────────┐     │
│ │ Number of Chunks│ Min Match % (0%)│ Search Type     │     │
│ ├─────────────────┼─────────────────┼─────────────────┤     │
│ │ [    5      ] ↕ │ [━━━━━━━━━━━━━] │ [Hybrid (Best) ▼]│   │
│ │                 │ 0%          100%│                 │     │
│ │ Chunks to       │ Minimum         │ Combines meaning│     │
│ │ retrieve per    │ relevance       │ & keywords      │     │
│ │ index           │ threshold       │                 │     │
│ └─────────────────┴─────────────────┴─────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## Field Details

### 1️⃣ Number of Chunks
```
┌──────────────────────────────────┐
│ Number of Chunks                 │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ 5                        ↕   │ │
│ └──────────────────────────────┘ │
│                                  │
│ Chunks to retrieve per index    │
└──────────────────────────────────┘

• Type: Number input
• Range: 1-50
• Default: 5
• Step: 1
```

### 2️⃣ Minimum Match Percentage
```
┌──────────────────────────────────┐
│ Min Match % (35%)                │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ ━━━━━━━●━━━━━━━━━━━━━━━━━━━ │ │
│ │ 0%                      100% │ │
│ └──────────────────────────────┘ │
│                                  │
│ Minimum relevance threshold      │
└──────────────────────────────────┘

• Type: Range slider
• Range: 0-100%
• Default: 0% (no filtering)
• Step: 5%
• Shows current value in label
```

### 3️⃣ Search Type
```
┌──────────────────────────────────┐
│ Search Type                      │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ Hybrid (Best)            ▼  │ │
│ ├──────────────────────────────┤ │
│ │ Hybrid (Best)                │ │
│ │ Semantic Only                │ │
│ │ Keyword Only                 │ │
│ └──────────────────────────────┘ │
│                                  │
│ Combines meaning & keywords      │
└──────────────────────────────────┘

• Type: Dropdown select
• Options:
  - Hybrid (Best) - Default
  - Semantic Only
  - Keyword Only
```

## Color Scheme

### Selected Index (Active)
- Background: Blue gradient (from-blue-600 to-indigo-600)
- Text: White
- Shadow: Medium
- Border: None

### Unselected Index (Inactive)
- Background: White
- Text: Gray-700
- Border: 2px Gray-300
- Hover: Blue-50 background, Blue-400 border

### Info Box (Indices Selected)
- Background: Blue-100
- Text: Blue-700 (bold)
- Border: Blue-200
- Icon: ✓ checkmark

### Search Configuration Section
- Border Top: Gray-300 divider
- Background: Transparent
- Inputs: White background, gray borders

## Responsive Behavior

### Desktop (≥1024px)
```
Grid: 3 columns
[Number of Chunks] [Min Match %] [Search Type]
```

### Tablet (768px - 1023px)
```
Grid: 3 columns
[Number of Chunks] [Min Match %] [Search Type]
(Slightly condensed)
```

### Mobile (<768px)
```
Grid: 1 column

[Number of Chunks]

[Min Match %]

[Search Type]
```

## Interaction States

### Initial State
- All fields have default values
- Section is hidden until index selected

### Index Selected
- Section slides in smoothly
- All fields become interactive
- Values persist in localStorage

### Editing Values
- Number input: Type or use arrows
- Range slider: Drag or click position
- Dropdown: Click to expand options

### Reset to Defaults
- All fields return to original values
- Selected indices are cleared
- Confirmation not required (can undo)

## Example Scenarios

### Scenario 1: Quick Search
```
Indices: [company-policies]
Number of Chunks: 3
Min Match %: 20%
Search Type: Hybrid

→ Fast, relevant results only
```

### Scenario 2: Deep Research
```
Indices: [docs, manuals, research]
Number of Chunks: 15
Min Match %: 0%
Search Type: Semantic

→ Maximum context, all results
```

### Scenario 3: Exact Match
```
Indices: [legal-docs]
Number of Chunks: 5
Min Match %: 60%
Search Type: Keyword

→ Only high-confidence matches
```

## Accessibility

- All inputs have labels
- Helper text explains each field
- Keyboard navigation supported
- Screen reader friendly
- Visual feedback on interaction
- Error states clearly indicated

## Performance

- Settings saved to localStorage instantly
- No network calls on change
- Applied only when generating text
- Minimal re-renders
- Smooth animations
