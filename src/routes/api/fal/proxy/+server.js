import { error } from '@sveltejs/kit';
import { FAL_API_KEY as FAL_KEY } from '$env/static/private';

/**
 * @type {import('./$types').RequestHandler}
 */
export async function GET({ request, url }) {
//   console.log("Base proxy GET:", { url: url.toString(), headers: Object.fromEntries(request.headers.entries()) });
  return handleRequest('GET', request, url);
}

/**
 * @type {import('./$types').RequestHandler}
 */
export async function POST({ request, url }) {
//   console.log("Base proxy POST:", { url: url.toString(), headers: Object.fromEntries(request.headers.entries()) });
  return handleRequest('POST', request, url);
}

/**
 * @type {import('./$types').RequestHandler}
 */
export async function OPTIONS({ request, url }) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-fal-target-url',
      'Access-Control-Max-Age': '86400' // 24 hours
    }
  });
}


/**
 * Handles a proxy request to fal.ai.
 * @param {string} method - The HTTP method to use for the request
 * @param {Request} request - The SvelteKit request object
 * @param {URL} url - The SvelteKit URL object
 * @throws {import('@sveltejs/kit').Error} - If there is an error with the request
 * @returns {Promise<Response>} - The proxied response
 */
async function handleRequest(method, request, url) {
  try {
    // Validate API key is available
    if (!FAL_KEY) {
      console.error('FAL_API_KEY environment variable is not set');
      throw error(500, 'API configuration error');
    }

    // Check if there's a target URL in headers (standard fal.ai proxy pattern)
    let targetUrl = request.headers.get('x-fal-target-url');
    
    if (!targetUrl) {
      console.error('Missing x-fal-target-url header. Headers received:', Object.fromEntries(request.headers.entries()));
      throw error(400, 'Missing x-fal-target-url header - check fal.ai client configuration');
    }

    console.log("Target URL:", targetUrl);

    // Validate target URL is a fal.ai URL for security
    try {
      const parsedTargetUrl = new URL(targetUrl);
      if (!parsedTargetUrl.hostname.includes('fal.run') && !parsedTargetUrl.hostname.includes('fal.ai')) {
        throw error(400, 'Invalid target URL - must be a fal.ai domain');
      }
    } catch (urlError) {
      throw error(400, 'Invalid target URL format');
    }

    // Prepare headers for forwarding
    const forwardHeaders = new Headers();
    
    // Copy relevant headers (exclude host and proxy-specific headers)
    const excludedHeaders = ['host', 'x-fal-target-url', 'authorization', 'cookie'];
    for (const [key, value] of request.headers.entries()) {
      if (!excludedHeaders.includes(key.toLowerCase())) {
        forwardHeaders.set(key, value);
      }
    }
    
    // Add fal.ai API key
    forwardHeaders.set('Authorization', `Key ${FAL_KEY}`);
    
    // Ensure content-type is set for POST requests
    if (method === 'POST' && !forwardHeaders.has('content-type')) {
      forwardHeaders.set('Content-Type', 'application/json');
    }

    // Get request body for POST requests (re-read since we might have consumed it)
    let body = undefined;
    if (method === 'POST') {
      body = await request.text();
    }

    console.log("Making request to:", targetUrl, "with method:", method);

    // Make the proxied request
    const response = await fetch(targetUrl, {
      method: method,
      headers: forwardHeaders,
      body: body
    });
    
    console.log("Response status:", response.status, response.statusText);

    // Prepare response headers
    const responseHeaders = new Headers();
    
    // Copy safe response headers
    const safeHeaders = ['content-type', 'content-length', 'cache-control'];
    for (const [key, value] of response.headers.entries()) {
      if (safeHeaders.includes(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    }
    
    // Add CORS headers for browser requests
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-fal-target-url');

    // Return proxied response
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });

  } catch (/** @type {*} */ err) {
    // Log error for debugging
    console.error('Fal.ai proxy error:', err);
    
    // Re-throw SvelteKit errors
    if (err.status) {
      throw err;
    }
    
    // Handle other errors
    throw error(500, 'Internal proxy error');
  }
}