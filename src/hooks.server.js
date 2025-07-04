import { themes } from '$lib/theme-data.js';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	// Get theme from cookie, default to win95
	const themeCookie = event.cookies.get('selected_theme');
	const themeId = themeCookie && themes[themeCookie] ? themeCookie : 'win95';
	const theme = themes[themeId];

	// Generate CSS custom properties for the theme
	const themeCSS = Object.entries(theme.colors)
		.map(([key, value]) => `--theme-${key}: ${value};`)
		.join(' ');

	// Inject theme CSS into the HTML
	const response = await resolve(event, {
		transformPageChunk: ({ html }) => {
			return html.replace(
				'<html lang="en">',
				`<html lang="en" style="${themeCSS}">`
			);
		}
	});

	return response;
}