# Template Page UI Guide

## Header Section

```
┌─────────────────────────────────────────────────────────────────────────┐
│  [Template Name Input]                                                   │
│                                                                           │
│  [New] [Templates (X)] [Save] [Import] [Export]                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Buttons:
- **New**: Create new blank template
- **Templates (X)**: Show/hide saved templates list (X = count)
- **Save**: Save current template to localStorage
- **Import**: Import template from JSON file
- **Export**: Download current template as JSON

## Saved Templates Panel (Expandable)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Saved Templates                                                    [×]  │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐           │
│  │ Template 1     │  │ Template 2     │  │ Template 3     │           │
│  │ 3 boxes • llama│  │ 5 boxes • gpt  │  │ 2 boxes • phi  │           │
│  │ Updated: 10/23 │  │ Updated: 10/22 │  │ Updated: 10/21 │           │
│  │ ✓ Active   [🗑]│  │            [🗑]│  │            [🗑]│           │
│  └────────────────┘  └────────────────┘  └────────────────┘           │
└─────────────────────────────────────────────────────────────────────────┘
```

## Add Template Box Section

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Add Template Box                                                        │
│  [+ Small] [+ Medium] [+ Large] [+ XLarge]                              │
└─────────────────────────────────────────────────────────────────────────┘
```

## Configuration Section

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Configuration                                                           │
│  ┌──────────────────────────┐  ┌──────────────────────────────────────┐│
│  │ Model: [llama3.2 ▼]     │  │ Knowledge Indices:                    ││
│  │                          │  │ □ index1 (5 docs)                     ││
│  │                          │  │ ☑ index2 (10 docs)                    ││
│  └──────────────────────────┘  └──────────────────────────────────────┘│
│                                                                          │
│  [▶ Generate All] [🗑 Clear Responses] [💾 Save to Storage]            │
└─────────────────────────────────────────────────────────────────────────┘
```

## Template Box (Individual)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  [Size: Medium ▼]                           [▶ Generate] [🗑 Remove]    │
│                                                                           │
│  Prompt:                                                                 │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Write a Python function to calculate factorial                  │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  Response:                                     [✏️ Edit] [👁 Preview]    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ def factorial(n):                                                │   │
│  │     if n == 0:                                                   │   │
│  │         return 1                                                 │   │
│  │     return n * factorial(n-1)                                    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Response Controls:
- **Edit Icon (✏️)**: Toggle edit mode for response
  - In edit mode: Shows textarea for editing
  - In view mode: Shows formatted text
- **Preview Icon (👁)**: Open HTML preview modal

## HTML Preview Modal

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Response Preview          [Code/Preview] [Copy] [Download] [×]         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                                                                     │ │
│  │  [Rendered HTML Content or Code View]                             │ │
│  │                                                                     │ │
│  │  • Rendered: Shows HTML as it would appear in browser             │ │
│  │  • Code: Shows raw HTML source with formatting                    │ │
│  │                                                                     │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

### Modal Controls:
- **Code/Preview Toggle**: Switch between rendered view and source code
- **Copy**: Copy content to clipboard
- **Download**: Download as HTML file
- **×**: Close modal

## Workflow Examples

### Example 1: Create and Save Template
1. Enter template name: "Python Examples"
2. Click "+ Medium" to add box
3. Enter prompt: "Write a Python class"
4. Click "▶ Generate" on box
5. Review response
6. Click "💾 Save to Storage"
7. Template saved to localStorage

### Example 2: Edit Response
1. Generate response in box
2. Click "✏️ Edit" icon
3. Modify text in textarea
4. Click "👁" icon to return to view mode
5. Click "💾 Save to Storage" to persist

### Example 3: Preview HTML
1. Generate response with HTML content
2. Click "👁 Preview" icon
3. Modal opens showing rendered HTML
4. Click "Code" to see source
5. Click "Copy" to copy to clipboard
6. Click "Download" to save as .html file

### Example 4: Manage Templates
1. Click "Templates (5)" button
2. Panel shows all 5 saved templates
3. Click template card to load
4. Or click 🗑 to delete unwanted template
5. Click × to close panel

### Example 5: Share Template
1. Load template you want to share
2. Click "Export" button
3. JSON file downloads
4. Share file with team
5. Team member clicks "Import"
6. Selects JSON file
7. Template loads in their browser

## Color Coding

- **Gray**: New template
- **Blue**: Save/Generate actions
- **Green**: Import/Add actions
- **Purple**: Export/Preview actions
- **Red**: Delete/Clear actions
- **Indigo**: Template list
- **Highlighted Blue**: Active template
