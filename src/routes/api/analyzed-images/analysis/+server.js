import { json } from '@sveltejs/kit';
import { 
  addAnalysisToImage,
  getImageAnalysis,
  getAnalyzedImage
} from '$lib/analyzed-image-storage.js';

/**
 * GET /api/analyzed-images/analysis
 * Get specific analysis for an image
 */
export async function GET({ url }) {
  try {
    const imageId = url.searchParams.get('imageId');
    const type = url.searchParams.get('type');
    
    if (!imageId) {
      return json({ success: false, error: 'Missing imageId parameter' }, { status: 400 });
    }
    
    if (type) {
      // Get specific analysis type
      const analysis = getImageAnalysis(imageId, type);
      if (!analysis) {
        return json({ success: false, error: 'Analysis not found' }, { status: 404 });
      }
      return json({ success: true, data: analysis });
    } else {
      // Get all analyses for the image
      const image = getAnalyzedImage(imageId);
      if (!image) {
        return json({ success: false, error: 'Image not found' }, { status: 404 });
      }
      return json({ success: true, data: image.analyses });
    }
  } catch (error) {
    console.error('Error fetching analysis:', error);
    return json({ success: false, error: 'Failed to fetch analysis' }, { status: 500 });
  }
}

/**
 * POST /api/analyzed-images/analysis
 * Add new analysis to an image
 */
export async function POST({ request }) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.imageId || !data.type || !data.description) {
      return json({ 
        success: false, 
        error: 'Missing required fields: imageId, type, description' 
      }, { status: 400 });
    }
    
    // Validate analysis type
    const validTypes = ['prompt', 'artistic', 'technical', 'subject', 'style'];
    if (!validTypes.includes(data.type)) {
      return json({ 
        success: false, 
        error: `Invalid analysis type. Must be one of: ${validTypes.join(', ')}` 
      }, { status: 400 });
    }
    
    // Create analysis object
    const analysis = {
      type: data.type,
      description: data.description,
      timestamp: data.timestamp || Date.now()
    };
    
    const success = addAnalysisToImage(data.imageId, analysis);
    
    if (success) {
      return json({ success: true, data: analysis });
    } else {
      return json({ success: false, error: 'Failed to add analysis' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error adding analysis:', error);
    return json({ success: false, error: 'Failed to add analysis' }, { status: 500 });
  }
}