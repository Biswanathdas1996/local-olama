# Fix: Metabase Login Page When Clicking Chat

## Issue
When clicking on "Chat" link from the `/metabase` page, users were being redirected to the Metabase login page instead of navigating to the Chat interface.

## Root Causes Identified

1. **Metabase Proxy Route Interference**: The `/metabase/proxy/{path:path}` endpoint was too permissive and could intercept ANY request path, not just Metabase dashboard URLs. When navigation occurred while Metabase was being accessed, requests might get routed through the Metabase proxy unnecessarily.

2. **Navigation Method**: The Layout component was using React Router's `<Link>` component, which could be affected by concurrent proxy requests or iframe state.

3. **Missing Permission Check**: The Chat route requires `generate.write` permission. If a user doesn't have this permission, they see an "Access Denied" page which may be confused with the Metabase login page.

## Fixes Implemented

### 1. Backend: Secured Metabase Proxy Endpoint
**File**: `routes/metabase_routes.py`

Added a security check to prevent non-dashboard paths from being routed through the Metabase proxy:

```python
# Security check: Only proxy Metabase dashboard paths, not general requests
non_dashboard_paths = ['chat', 'api', 'auth', 'documents', 'models', 'training', 
                      'templates', 'analytics', 'connect', 'mcp', 'generate', 'rag', 
                      'health', 'server-info']
if any(path.startswith(p) for p in non_dashboard_paths):
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Cannot proxy non-dashboard paths through Metabase proxy"
    )
```

This ensures that navigation to Chat, API calls, and other app routes don't get intercepted by the Metabase proxy.

### 2. Frontend: Improved Navigation in Layout
**File**: `frontend/src/components/Layout.tsx`

- Added `useNavigate` hook for programmatic navigation
- Created `handleNavClick` function to ensure clean route transitions
- Changed from `<Link>` to `<button>` elements that use `navigate()` for more reliable navigation
- Added proper ARIA attributes for accessibility

```typescript
const handleNavClick = (href: string) => {
  setSidebarOpen(false);
  // Use programmatic navigation to ensure clean route transition
  navigate(href);
};
```

### 3. Frontend: Improved External Link Handling
**File**: `frontend/src/pages/DashboardViewPage.tsx`

Enhanced the external link opening to prevent interference with app navigation:

```typescript
const handleOpenExternal = () => {
  if (decodedUrl) {
    const externalUrl = decodedUrl.startsWith('/') 
      ? `http://localhost:3001${decodedUrl}` 
      : decodedUrl;
    window.open(externalUrl, '_blank', 'noopener,noreferrer');
  }
};
```

## Troubleshooting

### If you still see the Metabase login page:

1. **Check Browser Console Logs**
   - Open Developer Tools (F12)
   - Look for `[ProtectedRoute]` logs
   - Check if you see "Resource permission denied: generate.write"

2. **Verify User Permissions**
   - If the logs show a permission error, your user account lacks the `generate.write` permission
   - An admin needs to assign this permission to your user role

3. **Check Metabase Status**
   - Navigate to `/metabase` endpoint to see if Metabase is running
   - Ensure Metabase service is accessible at `http://localhost:3001`

### Clear Cache if Needed

If issues persist after the fix:

1. Clear browser cache and localStorage:
   ```javascript
   // Run in browser console
   localStorage.clear();
   sessionStorage.clear();
   location.reload();
   ```

2. Hard refresh the page (Ctrl+Shift+R on Windows/Linux, Cmd+Shift+R on Mac)

## Testing the Fix

1. Navigate to `/metabase`
2. Upload or view a dataset
3. Click on the "Chat" link in the sidebar
4. You should now navigate to `/chat` instead of the Metabase login page

## Permission Requirements

To access Chat, your user must have the `generate.write` permission. If you get an "Access Denied" message after the fix, ask an admin to:

1. Go to Admin Panel
2. Find your user role
3. Assign the `generate.write` permission

## Related Files Modified

- `routes/metabase_routes.py` - Secured proxy endpoint
- `frontend/src/components/Layout.tsx` - Improved navigation
- `frontend/src/pages/DashboardViewPage.tsx` - Better external link handling
