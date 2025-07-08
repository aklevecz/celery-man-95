import { json } from '@sveltejs/kit';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';

/**
 * @type {import('./$types').RequestHandler}
 */
export async function GET() {
  try {
    const staticDir = 'static';
    const files = await readdir(staticDir);
    
    // Filter for image files and get their info
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif'];
    const imageFiles = [];
    
    for (const file of files) {
      const filePath = join(staticDir, file);
      const stats = await stat(filePath);
      
      if (stats.isFile()) {
        const ext = file.toLowerCase().substring(file.lastIndexOf('.'));
        if (imageExtensions.includes(ext)) {
          imageFiles.push({
            name: file,
            path: `/${file}`, // URL path for serving
            size: stats.size,
            modified: stats.mtime.toISOString(),
            extension: ext
          });
        }
      }
    }
    
    // Sort by name
    imageFiles.sort((a, b) => a.name.localeCompare(b.name));
    
    return json({
      success: true,
      files: imageFiles,
      count: imageFiles.length
    });
    
  } catch (error) {
    console.error('Error reading static files:', error);
    return json({
      success: false,
      error: 'Failed to read static files',
      files: [],
      count: 0
    }, { status: 500 });
  }
}