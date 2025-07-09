import { error } from '@sveltejs/kit';
import { BLACKFOREST_API_KEY } from '$env/static/private';

/**
 * @type {import('./$types').RequestHandler}
 */
export async function GET({ request, url }) {
  return handleRequest('GET', request, url);
}

/**
 * @type {import('./$types').RequestHandler}
 */
export async function POST({ request, url }) {
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
      'Access-Control-Allow-Headers': 'Content-Type, x-key, x-blackforest-target-url, x-blackforest-client-key',
      'Access-Control-Max-Age': '86400' // 24 hours
    }
  });
}

/**
 * Handles a proxy request to BlackForest Labs API.
 * @param {string} method - The HTTP method to use for the request
 * @param {Request} request - The SvelteKit request object
 * @param {URL} url - The SvelteKit URL object
 * @throws {import('@sveltejs/kit').Error} - If there is an error with the request
 * @returns {Promise<Response>} - The proxied response
 */
async function handleRequest(method, request, url) {
  try {
    console.log('🔍 BlackForest Proxy - Starting request handling');
    console.log('🔍 Environment BLACKFOREST_API_KEY available:', !!BLACKFOREST_API_KEY, BLACKFOREST_API_KEY ? `(${BLACKFOREST_API_KEY.substring(0, 8)}...)` : 'NONE');
    
    // Check if there's a target URL in headers
    let targetUrl = request.headers.get('x-blackforest-target-url');
    
    if (!targetUrl) {
      console.error('Missing x-blackforest-target-url header. Headers received:', Object.fromEntries(request.headers.entries()));
      throw error(400, 'Missing x-blackforest-target-url header - check BlackForest client configuration');
    }

    console.log("BlackForest Target URL:", targetUrl);

    // Validate target URL is a BlackForest Labs URL for security
    try {
      const parsedTargetUrl = new URL(targetUrl);
      if (!parsedTargetUrl.hostname.includes('bfl.ml')) {
        throw error(400, 'Invalid target URL - must be a BlackForest Labs domain (bfl.ml)');
      }
    } catch (urlError) {
      throw error(400, 'Invalid target URL format');
    }

    // Prepare headers for forwarding
    const forwardHeaders = new Headers();
    
    // Check for client-provided API key
    const clientApiKey = request.headers.get('x-blackforest-client-key');
    console.log('🔍 Client API key received:', !!clientApiKey, clientApiKey ? `(${clientApiKey.substring(0, 8)}...)` : 'NONE');
    
    // Copy relevant headers (exclude host and proxy-specific headers)
    const excludedHeaders = ['host', 'x-blackforest-target-url', 'authorization', 'cookie', 'x-blackforest-client-key'];
    for (const [key, value] of request.headers.entries()) {
      if (!excludedHeaders.includes(key.toLowerCase())) {
        forwardHeaders.set(key, value);
      }
    }
    
    // Determine which API key to use
    let apiKeyToUse = null;
    if (clientApiKey && clientApiKey.trim()) {
      apiKeyToUse = clientApiKey.trim();
      console.log("✅ Using client-provided BlackForest API key:", `${apiKeyToUse.substring(0, 8)}...`);
    } else if (BLACKFOREST_API_KEY && BLACKFOREST_API_KEY.trim()) {
      apiKeyToUse = BLACKFOREST_API_KEY.trim();
      console.log("✅ Using server-side BlackForest API key:", `${apiKeyToUse.substring(0, 8)}...`);
    } else {
      console.error('❌ No API key available - client:', !!clientApiKey, 'server:', !!BLACKFOREST_API_KEY);
      throw error(500, 'No BlackForest API key available - configure in settings or server environment');
    }
    
    // Add BlackForest API key (uses x-key header format)
    forwardHeaders.set('x-key', apiKeyToUse);
    console.log('🔍 x-key header set:', `${apiKeyToUse.substring(0, 8)}...`);
    
    // Ensure content-type is set for POST requests
    if (method === 'POST' && !forwardHeaders.has('content-type')) {
      forwardHeaders.set('Content-Type', 'application/json');
    }

    // Get request body for POST requests
    let body = undefined;
    if (method === 'POST') {
      body = await request.text();
    }

    console.log("Making BlackForest request to:", targetUrl, "with method:", method);

    // Make the proxied request
    const response = await fetch(targetUrl, {
      method: method,
      headers: forwardHeaders,
      body: body
    });
    
    console.log("BlackForest response status:", response.status, response.statusText);
    
    // Log response details for debugging
    if (!response.ok) {
      const responseText = await response.clone().text();
      console.error('❌ BlackForest API error response:', responseText);
    }

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
    responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, x-key, x-blackforest-target-url, x-blackforest-client-key');

    // Return proxied response
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });

  } catch (/** @type {*} */ err) {
    // Log error for debugging
    console.error('BlackForest proxy error:', err);
    
    // Re-throw SvelteKit errors
    if (err.status) {
      throw err;
    }
    
    // Handle other errors
    throw error(500, 'Internal BlackForest proxy error');
  }
}