import { json } from '@sveltejs/kit';
import { 
  getAllTags,
  getAnalyzedImagesByTag
} from '$lib/analyzed-image-storage.js';

/**
 * GET /api/analyzed-images/tags
 * Get all available tags or images by tag
 */
export async function GET({ url }) {
  try {
    const tag = url.searchParams.get('tag');
    
    if (tag) {
      // Get images by specific tag
      const images = getAnalyzedImagesByTag(tag);
      return json({ success: true, data: images });
    } else {
      // Get all available tags
      const tags = getAllTags();
      return json({ success: true, data: tags });
    }
  } catch (error) {
    console.error('Error fetching tags:', error);
    return json({ success: false, error: 'Failed to fetch tags' }, { status: 500 });
  }
}