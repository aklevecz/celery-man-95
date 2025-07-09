import { json } from '@sveltejs/kit';
import { exportPrompts, importPrompts } from '$lib/prompt-storage.js';

/**
 * GET /api/prompts/export
 * Export prompts as JSON
 */
export async function GET({ url }) {
  try {
    const ids = url.searchParams.get('ids');
    const promptIds = ids ? ids.split(',') : undefined;
    
    const jsonString = exportPrompts(promptIds);
    
    return new Response(jsonString, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="prompts_${new Date().toISOString().split('T')[0]}.json"`
      }
    });
  } catch (error) {
    console.error('Error exporting prompts:', error);
    return json({ success: false, error: 'Failed to export prompts' }, { status: 500 });
  }
}

/**
 * POST /api/prompts/export
 * Import prompts from JSON
 */
export async function POST({ request }) {
  try {
    const data = await request.json();
    
    if (!data.prompts) {
      return json({ success: false, error: 'Missing prompts data' }, { status: 400 });
    }
    
    const jsonString = typeof data.prompts === 'string' ? data.prompts : JSON.stringify(data.prompts);
    const success = importPrompts(jsonString);
    
    if (success) {
      return json({ success: true, message: 'Prompts imported successfully' });
    } else {
      return json({ success: false, error: 'Failed to import prompts' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error importing prompts:', error);
    return json({ success: false, error: 'Failed to import prompts' }, { status: 500 });
  }
}