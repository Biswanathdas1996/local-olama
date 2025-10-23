# Template Management Features

## Overview
The Templates page now includes comprehensive localStorage-based template management with response editing and HTML preview capabilities.

## New Features

### 1. **Template Storage (localStorage)**
- All templates are automatically saved to browser's localStorage
- Persistent storage across browser sessions
- No server-side database required

### 2. **Template Management**

#### Save Template
- Click "Save" button to save current template to localStorage
- Auto-generates unique ID and timestamps
- Preserves all prompts, responses, settings

#### Load Template
- Click "Templates (X)" button to view saved templates
- Shows list of all saved templates with:
  - Template name
  - Number of boxes
  - Model used
  - Last update date
- Click any template card to load it
- Currently active template is highlighted

#### Create New Template
- Click "New" button to start fresh template
- Clears current workspace without affecting saved templates

#### Delete Template
- Click trash icon on template card
- Confirmation dialog prevents accidental deletion
- If deleting active template, creates new blank template

### 3. **Import/Export**

#### Export Template
- Click "Export" button
- Downloads JSON file with all template data
- Can share templates with team members

#### Import Template
- Click "Import" button
- Select JSON template file
- Automatically loads into workspace
- Creates new copy (doesn't overwrite)

### 4. **Response Editing**
Each template box now supports:
- **View Mode**: Display generated response (default)
- **Edit Mode**: Click edit icon to modify response
- Full text editing with monospace font
- Changes persist when saving template
- Toggle between view/edit with eye/pencil icons

### 5. **HTML Preview**
- Click eye icon on any response to preview as HTML
- Modal window with two modes:
  - **Rendered View**: See HTML formatted output
  - **Code View**: See raw HTML source
- Features:
  - Copy to clipboard
  - Download as HTML file
  - Styled iframe preview
  - Toggle between rendered/code views

### 6. **Auto-Persist Active Template**
- System remembers last active template
- Automatically loads on page refresh
- Seamless workflow continuation

## Usage Workflow

### Creating and Saving Templates
1. Enter template name
2. Add boxes (Small/Medium/Large/XLarge)
3. Enter prompts
4. Configure model and indices
5. Generate responses
6. Click "Save to Storage"
7. Template saved to localStorage

### Editing Responses
1. Generate initial response
2. Click edit icon (pencil) on response box
3. Modify text as needed
4. Click eye icon to return to view mode
5. Click "Save to Storage" to persist changes

### Previewing HTML
1. Select response box with content
2. Click eye icon (purple)
3. View rendered HTML or source code
4. Copy or download if needed
5. Close modal to continue

### Managing Multiple Templates
1. Click "Templates (X)" to see all saved templates
2. Click template card to switch
3. Delete unwanted templates with trash icon
4. Export templates to share
5. Import templates from files

## Technical Details

### localStorage Structure
```typescript
interface SavedTemplate {
  id: string;                    // Unique identifier
  name: string;                  // Template name
  boxes: TemplateBox[];          // All boxes with prompts/responses
  selectedIndices: string[];     // Knowledge base indices
  model: string;                 // Selected model
  createdAt: string;             // ISO timestamp
  updatedAt: string;             // ISO timestamp
}
```

### Storage Keys
- `olama_templates`: Array of all saved templates
- `olama_active_template`: ID of currently active template

### Components Added
- **HtmlPreviewModal**: Modal for HTML preview and code view
- **templateStorage**: Utility class for localStorage operations

## Benefits

1. **Persistence**: Never lose your work
2. **Flexibility**: Edit responses after generation
3. **Visualization**: Preview HTML output before using
4. **Organization**: Manage multiple template variations
5. **Collaboration**: Export/import for team sharing
6. **Privacy**: All data stored locally, no server upload

## Browser Compatibility
Works in all modern browsers supporting:
- localStorage API
- ES6+ JavaScript
- React 18+

## Storage Limits
- Browser localStorage typically allows 5-10MB
- Each template includes full text of all responses
- Monitor storage if creating many large templates
- Export and clear old templates if needed
