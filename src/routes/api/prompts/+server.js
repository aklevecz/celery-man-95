import { json } from '@sveltejs/kit';
import { 
  getSavedPrompts, 
  savePrompt, 
  deletePrompt, 
  getPromptById,
  updatePromptRating,
  togglePromptFavorite,
  recordPromptUsage,
  searchPrompts,
  getPromptsByStyle,
  getPromptsByRating,
  getFavoritePrompts,
  exportPrompts,
  importPrompts,
  getPromptStats
} from '$lib/prompt-storage.js';

/**
 * GET /api/prompts
 * Get prompts with optional filtering
 */
export async function GET({ url }) {
  try {
    const searchQuery = url.searchParams.get('search');
    const style = url.searchParams.get('style');
    const minRating = url.searchParams.get('minRating');
    const favoritesOnly = url.searchParams.get('favorites') === 'true';
    const stats = url.searchParams.get('stats') === 'true';
    const id = url.searchParams.get('id');
    
    if (stats) {
      // Get prompt statistics
      const statistics = getPromptStats();
      return json({ success: true, data: statistics });
    }
    
    if (id) {
      // Get specific prompt
      const prompt = getPromptById(id);
      if (!prompt) {
        return json({ success: false, error: 'Prompt not found' }, { status: 404 });
      }
      return json({ success: true, data: prompt });
    }
    
    let result;
    
    if (searchQuery) {
      // Search prompts
      result = searchPrompts(searchQuery);
    } else if (favoritesOnly) {
      // Get favorites
      result = getFavoritePrompts();
    } else if (style) {
      // Get by style
      result = getPromptsByStyle(style);
    } else if (minRating) {
      // Get by rating
      result = getPromptsByRating(parseInt(minRating));
    } else {
      // Get all prompts
      result = getSavedPrompts();
    }
    
    return json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching prompts:', error);
    return json({ success: false, error: 'Failed to fetch prompts' }, { status: 500 });
  }
}

/**
 * POST /api/prompts
 * Create or update a prompt
 */
export async function POST({ request }) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.prompt || !data.scenePremise || !data.style) {
      return json({ 
        success: false, 
        error: 'Missing required fields: prompt, scenePremise, style' 
      }, { status: 400 });
    }
    
    // Create prompt object
    const prompt = {
      id: data.id || `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      prompt: data.prompt,
      scenePremise: data.scenePremise,
      style: data.style,
      tags: data.tags,
      rating: data.rating || 3,
      isFavorite: data.isFavorite || false,
      createdAt: data.createdAt || Date.now(),
      savedAt: Date.now(),
      notes: data.notes,
      usageCount: data.usageCount || 0,
      lastUsed: data.lastUsed
    };
    
    const success = savePrompt(prompt);
    
    if (success) {
      return json({ success: true, data: prompt });
    } else {
      return json({ success: false, error: 'Failed to save prompt' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error saving prompt:', error);
    return json({ success: false, error: 'Failed to save prompt' }, { status: 500 });
  }
}

/**
 * PUT /api/prompts/:id
 * Update prompt metadata
 */
export async function PUT({ request, url }) {
  try {
    const data = await request.json();
    const id = url.searchParams.get('id');
    
    if (!id) {
      return json({ success: false, error: 'Missing prompt ID' }, { status: 400 });
    }
    
    const prompt = getPromptById(id);
    if (!prompt) {
      return json({ success: false, error: 'Prompt not found' }, { status: 404 });
    }
    
    // Update specific fields based on action
    const action = data.action;
    let success = false;
    
    switch (action) {
      case 'rating':
        success = updatePromptRating(id, data.rating);
        break;
      case 'favorite':
        success = togglePromptFavorite(id);
        break;
      case 'usage':
        success = recordPromptUsage(id);
        break;
      default:
        // Update entire prompt
        const updatedPrompt = { ...prompt, ...data };
        success = savePrompt(updatedPrompt);
    }
    
    if (success) {
      const updatedPrompt = getPromptById(id);
      return json({ success: true, data: updatedPrompt });
    } else {
      return json({ success: false, error: 'Failed to update prompt' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error updating prompt:', error);
    return json({ success: false, error: 'Failed to update prompt' }, { status: 500 });
  }
}

/**
 * DELETE /api/prompts/:id
 * Delete a prompt
 */
export async function DELETE({ url }) {
  try {
    const id = url.searchParams.get('id');
    
    if (!id) {
      return json({ success: false, error: 'Missing prompt ID' }, { status: 400 });
    }
    
    const success = deletePrompt(id);
    
    if (success) {
      return json({ success: true, message: 'Prompt deleted successfully' });
    } else {
      return json({ success: false, error: 'Failed to delete prompt' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error deleting prompt:', error);
    return json({ success: false, error: 'Failed to delete prompt' }, { status: 500 });
  }
}