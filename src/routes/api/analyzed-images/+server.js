import { json } from '@sveltejs/kit';
import { 
  getAnalyzedImages, 
  saveAnalyzedImage, 
  deleteAnalyzedImage, 
  getAnalyzedImage,
  addAnalysisToImage,
  updateAnalyzedImageMetadata,
  searchAnalyzedImages,
  getAllTags,
  getAnalyzedImagesByTag
} from '$lib/analyzed-image-storage.js';

/**
 * GET /api/analyzed-images
 * Get all analyzed images or search/filter them
 */
export async function GET({ url }) {
  try {
    const searchQuery = url.searchParams.get('search');
    const tag = url.searchParams.get('tag');
    const id = url.searchParams.get('id');
    
    let result;
    
    if (id) {
      // Get specific image
      result = getAnalyzedImage(id);
      if (!result) {
        return json({ success: false, error: 'Image not found' }, { status: 404 });
      }
    } else if (searchQuery) {
      // Search images
      result = searchAnalyzedImages(searchQuery);
    } else if (tag) {
      // Get images by tag
      result = getAnalyzedImagesByTag(tag);
    } else {
      // Get all images
      result = getAnalyzedImages();
    }
    
    return json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching analyzed images:', error);
    return json({ success: false, error: 'Failed to fetch analyzed images' }, { status: 500 });
  }
}

/**
 * POST /api/analyzed-images
 * Create or update an analyzed image
 */
export async function POST({ request }) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.id || !data.name || !data.imageUrl) {
      return json({ success: false, error: 'Missing required fields: id, name, imageUrl' }, { status: 400 });
    }
    
    // Create analyzed image object
    const analyzedImage = {
      id: data.id,
      name: data.name,
      imageUrl: data.imageUrl,
      thumbnailUrl: data.thumbnailUrl,
      analyses: data.analyses || [],
      tags: data.tags,
      notes: data.notes,
      createdAt: data.createdAt || Date.now(),
      updatedAt: Date.now()
    };
    
    const success = saveAnalyzedImage(analyzedImage);
    
    if (success) {
      return json({ success: true, data: analyzedImage });
    } else {
      return json({ success: false, error: 'Failed to save analyzed image' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error saving analyzed image:', error);
    return json({ success: false, error: 'Failed to save analyzed image' }, { status: 500 });
  }
}

/**
 * PUT /api/analyzed-images/:id
 * Update analyzed image metadata
 */
export async function PUT({ request, url }) {
  try {
    const data = await request.json();
    const id = url.searchParams.get('id');
    
    if (!id) {
      return json({ success: false, error: 'Missing image ID' }, { status: 400 });
    }
    
    const success = updateAnalyzedImageMetadata(id, data);
    
    if (success) {
      const updatedImage = getAnalyzedImage(id);
      return json({ success: true, data: updatedImage });
    } else {
      return json({ success: false, error: 'Failed to update analyzed image' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error updating analyzed image:', error);
    return json({ success: false, error: 'Failed to update analyzed image' }, { status: 500 });
  }
}

/**
 * DELETE /api/analyzed-images/:id
 * Delete an analyzed image
 */
export async function DELETE({ url }) {
  try {
    const id = url.searchParams.get('id');
    
    if (!id) {
      return json({ success: false, error: 'Missing image ID' }, { status: 400 });
    }
    
    const success = deleteAnalyzedImage(id);
    
    if (success) {
      return json({ success: true, message: 'Image deleted successfully' });
    } else {
      return json({ success: false, error: 'Failed to delete analyzed image' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error deleting analyzed image:', error);
    return json({ success: false, error: 'Failed to delete analyzed image' }, { status: 500 });
  }
}