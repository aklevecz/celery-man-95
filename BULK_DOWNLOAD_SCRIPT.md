# Bulk Image Download Solutions

## Option 1: Browser Console Script (Use Right Now!)

**Instructions:**
1. Open your app in browser
2. Go to Image Gallery or any page with saved images
3. Open browser dev tools (F12)
4. Paste this script in Console tab and press Enter

```javascript
// Bulk download all saved images from browser storage
async function bulkDownloadAllImages() {
  console.log('🔥 Starting bulk download...');
  
  // Open IndexedDB
  const dbRequest = indexedDB.open('FluxorImageDB', 1);
  
  return new Promise((resolve, reject) => {
    dbRequest.onsuccess = async () => {
      const db = dbRequest.result;
      const transaction = db.transaction(['images'], 'readonly');
      const store = transaction.objectStore('images');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = async () => {
        const images = getAllRequest.result;
        const metadata = JSON.parse(localStorage.getItem('saved_images') || '[]');
        
        console.log(`📁 Found ${images.length} images to download`);
        
        // Create download function
        const downloadBlob = (blob, filename) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        };
        
        // Download each image with delay to avoid overwhelming browser
        for (let i = 0; i < images.length; i++) {
          const image = images[i];
          const meta = metadata.find(m => m.id === image.id);
          
          if (meta) {
            // Generate filename from prompt
            const sanitizedPrompt = meta.prompt.substring(0, 40)
              .replace(/[^a-zA-Z0-9\s]/g, '')
              .replace(/\s+/g, '_')
              .toLowerCase();
            const timestamp = new Date(meta.timestamp).toISOString().slice(0, 10);
            const filename = `${timestamp}_${sanitizedPrompt}_${i}.jpg`;
            
            console.log(`📥 Downloading ${i + 1}/${images.length}: ${filename}`);
            downloadBlob(image.blob, filename);
            
            // Small delay between downloads
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        console.log('✅ Bulk download complete!');
        resolve();
      };
    };
    
    dbRequest.onerror = () => reject(dbRequest.error);
  });
}

// Run the bulk download
bulkDownloadAllImages().catch(console.error);
```

## Option 2: Selective Download Script

**Download only recent images or by date range:**

```javascript
// Download images from specific date range
async function downloadImagesByDateRange(startDate, endDate) {
  console.log(`🔥 Downloading images from ${startDate} to ${endDate}`);
  
  const dbRequest = indexedDB.open('FluxorImageDB', 1);
  
  return new Promise((resolve, reject) => {
    dbRequest.onsuccess = async () => {
      const db = dbRequest.result;
      const transaction = db.transaction(['images'], 'readonly');
      const store = transaction.objectStore('images');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = async () => {
        const images = getAllRequest.result;
        const metadata = JSON.parse(localStorage.getItem('saved_images') || '[]');
        
        // Filter by date range
        const filteredMeta = metadata.filter(meta => {
          const imageDate = new Date(meta.timestamp);
          return imageDate >= new Date(startDate) && imageDate <= new Date(endDate);
        });
        
        console.log(`📁 Found ${filteredMeta.length} images in date range`);
        
        const downloadBlob = (blob, filename) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        };
        
        for (let i = 0; i < filteredMeta.length; i++) {
          const meta = filteredMeta[i];
          const image = images.find(img => img.id === meta.id);
          
          if (image) {
            const sanitizedPrompt = meta.prompt.substring(0, 40)
              .replace(/[^a-zA-Z0-9\s]/g, '')
              .replace(/\s+/g, '_')
              .toLowerCase();
            const timestamp = new Date(meta.timestamp).toISOString().slice(0, 10);
            const filename = `${timestamp}_${sanitizedPrompt}_${i}.jpg`;
            
            console.log(`📥 Downloading ${i + 1}/${filteredMeta.length}: ${filename}`);
            downloadBlob(image.blob, filename);
            
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        console.log('✅ Selective download complete!');
        resolve();
      };
    };
    
    dbRequest.onerror = () => reject(dbRequest.error);
  });
}

// Example usage:
// downloadImagesByDateRange('2024-01-01', '2024-01-31'); // January 2024
// downloadImagesByDateRange('2024-07-01', '2024-07-10'); // Last 10 days
```

## Option 3: Download with Metadata

**Download images AND their metadata as JSON files:**

```javascript
// Download images with metadata files
async function downloadImagesWithMetadata() {
  console.log('🔥 Starting download with metadata...');
  
  const dbRequest = indexedDB.open('FluxorImageDB', 1);
  
  return new Promise((resolve, reject) => {
    dbRequest.onsuccess = async () => {
      const db = dbRequest.result;
      const transaction = db.transaction(['images'], 'readonly');
      const store = transaction.objectStore('images');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = async () => {
        const images = getAllRequest.result;
        const metadata = JSON.parse(localStorage.getItem('saved_images') || '[]');
        
        console.log(`📁 Found ${images.length} images to download with metadata`);
        
        const downloadBlob = (blob, filename) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        };
        
        const downloadText = (text, filename) => {
          const blob = new Blob([text], { type: 'application/json' });
          downloadBlob(blob, filename);
        };
        
        for (let i = 0; i < images.length; i++) {
          const image = images[i];
          const meta = metadata.find(m => m.id === image.id);
          
          if (meta) {
            const sanitizedPrompt = meta.prompt.substring(0, 40)
              .replace(/[^a-zA-Z0-9\s]/g, '')
              .replace(/\s+/g, '_')
              .toLowerCase();
            const timestamp = new Date(meta.timestamp).toISOString().slice(0, 10);
            const baseFilename = `${timestamp}_${sanitizedPrompt}_${i}`;
            
            // Download image
            console.log(`📥 Downloading image ${i + 1}/${images.length}: ${baseFilename}.jpg`);
            downloadBlob(image.blob, `${baseFilename}.jpg`);
            
            // Download metadata
            const metadataContent = JSON.stringify({
              prompt: meta.prompt,
              timestamp: meta.timestamp,
              generationParams: meta.generationParams || {},
              filename: `${baseFilename}.jpg`
            }, null, 2);
            
            downloadText(metadataContent, `${baseFilename}.json`);
            
            await new Promise(resolve => setTimeout(resolve, 800)); // Longer delay for two files
          }
        }
        
        console.log('✅ Download with metadata complete!');
        resolve();
      };
    };
    
    dbRequest.onerror = () => reject(dbRequest.error);
  });
}

// Run download with metadata
downloadImagesWithMetadata().catch(console.error);
```

## Usage Instructions

1. **Quick & Easy**: Use Option 1 script to download everything immediately
2. **Selective**: Use Option 2 to download specific date ranges
3. **Complete**: Use Option 3 to get images + metadata for full backup

**Tips:**
- Scripts will download to your default Downloads folder
- Files are named with date and prompt for easy organization  
- Small delays prevent browser from getting overwhelmed
- Check browser download settings if files don't appear

## Coming Next: UI-Based Batch Selection
I'll also implement a proper UI feature with checkboxes for selecting specific images to download in batches.