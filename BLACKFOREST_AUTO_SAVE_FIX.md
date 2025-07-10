# BlackForest Auto-Save Fix

## Issue
Auto-save works with FAL.AI images but fails with BlackForest images with error:
```
Auto-save error: TypeError: fetch failed
[cause]: Error: invalid method
```

## Root Cause Analysis

### FAL.AI vs BlackForest Image Flow
- **FAL.AI images**: Return direct HTTP URLs that work with server-side fetch
- **BlackForest images**: Have CORS issues, get processed through proxy and converted to blob URLs

### The Problem Flow
1. BlackForest API returns image URL with CORS restrictions
2. BlackForest API client proxies through `/api/proxy-image` endpoint
3. Creates blob URL with `URL.createObjectURL(blob)` (line 216 in blackforest-api.svelte.js)
4. Auto-save tries to fetch blob URL from server → fails with "invalid method"
5. **Blob URLs** (`blob:http://localhost:5173/...`) only exist in browser memory, not accessible from server-side

### Code References
- **BlackForest API**: `/src/lib/blackforest-api.svelte.js:216` - Creates blob URL
- **Proxy Image**: `/src/routes/api/proxy-image/+server.js` - Proxies CORS-restricted images
- **Auto-save**: `/src/routes/api/auto-save/+server.js:74` - Server-side fetch fails on blob URLs

## Solution Options

### Option 1: Detect and Handle Blob URLs (Recommended)
```javascript
// In autoSaveToFilesystem function
async function autoSaveToFilesystem(imageUrl, prompt, generationParams = null) {
  try {
    let imageData;
    
    if (imageUrl.startsWith('blob:')) {
      // Handle blob URLs on client side
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      imageData = `data:${blob.type};base64,${base64}`;
      
      // Send base64 data instead of URL
      const response = await fetch('/api/auto-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData, // Send data instead of URL
          prompt,
          metadata: generationParams || {}
        })
      });
    } else {
      // Regular HTTP URLs - use existing flow
      const response = await fetch('/api/auto-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          prompt,
          metadata: generationParams || {}
        })
      });
    }
    // ... rest of function
  } catch (error) {
    console.log('Auto-save failed:', error.message);
  }
}
```

### Option 2: Access Original BlackForest URL
- Modify BlackForest API to return both original URL and blob URL
- Send original URL to auto-save endpoint
- Server tries original URL with proper headers

### Option 3: Always Send Image Data (Most Reliable)
- Always convert images to base64 before auto-save
- Works for all image types (blob, proxy, data URI, HTTP)
- Modify auto-save endpoint to accept `imageData` instead of `imageUrl`

## Auto-Save Endpoint Changes
```javascript
// Update auto-save endpoint to handle both URL and data
export async function POST({ request }) {
  const { imageUrl, imageData, prompt, metadata } = await request.json();
  
  let imageBuffer;
  if (imageData) {
    // Handle base64 data
    const base64Data = imageData.split(',')[1]; // Remove data:image/jpeg;base64, prefix
    imageBuffer = Buffer.from(base64Data, 'base64');
  } else if (imageUrl) {
    // Handle URL (existing flow)
    const response = await fetch(imageUrl);
    imageBuffer = Buffer.from(await response.arrayBuffer());
  }
  
  // Save imageBuffer to file...
}
```

## Priority
- **Low priority** - Use FAL.AI for now
- **Implement later** when BlackForest auto-save is needed
- **Recommended approach**: Option 1 (detect blob URLs and handle specially)

## Files to Modify
1. `/src/lib/image-manager.svelte.js` - `autoSaveToFilesystem` function
2. `/src/routes/api/auto-save/+server.js` - Handle both URL and base64 data
3. Optional: `/src/lib/blackforest-api.svelte.js` - Return original URLs for auto-save