/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
	try {
		const { url } = await request.json();
		
		if (!url) {
			return new Response('URL is required', { status: 400 });
		}

		const response = await fetch(url);
		
		if (!response.ok) {
			throw new Error(`Failed to fetch image: ${response.status}`);
		}

		const blob = await response.blob();
		
		return new Response(blob, {
			headers: {
				'Content-Type': response.headers.get('Content-Type') || 'image/png',
				'Access-Control-Allow-Origin': '*'
			}
		});
	} catch (error) {
		console.error('Proxy error:', error);
		return new Response('Failed to proxy image', { status: 500 });
	}
}