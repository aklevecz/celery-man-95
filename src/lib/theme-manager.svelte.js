/**
 * @typedef {Object} Theme
 * @property {string} name - Display name of the theme
 * @property {string} id - Unique identifier for the theme
 * @property {Object} colors - Color palette for the theme
 * @property {string} colors.desktop - Desktop background color
 * @property {string} colors.window - Window background color
 * @property {string} colors.windowHeader - Window header background
 * @property {string} colors.windowHeaderActive - Active window header background
 * @property {string} colors.windowHeaderText - Window header text color
 * @property {string} colors.windowBorder - Window border color
 * @property {string} colors.button - Button background color
 * @property {string} colors.buttonText - Button text color
 * @property {string} colors.taskbar - Taskbar background color
 * @property {string} colors.taskbarText - Taskbar text color
 * @property {string} colors.text - Default text color
 * @property {string} colors.textHighlight - Highlighted text color
 * @property {string} colors.shadow - Shadow color
 * @property {string} fontFamily - Font family for the theme
 */

/** @type {Theme[]} */
const themes = [
	{
		name: 'Windows 95',
		id: 'win95',
		colors: {
			desktop: '#008080',
			window: '#c0c0c0',
			windowHeader: '#0000ff',
			windowHeaderActive: '#0000ff',
			windowHeaderText: '#ffffff',
			windowBorder: '#c0c0c0',
			button: '#c0c0c0',
			buttonText: '#000000',
			taskbar: '#c0c0c0',
			taskbarText: '#000000',
			text: '#000000',
			textHighlight: '#ffffff',
			shadow: 'rgba(0, 0, 0, 0.5)'
		}
	},
	{
		name: 'Windows 98',
		id: 'win98',
		colors: {
			desktop: '#4a808a',
			window: '#c0c0c0',
			windowHeader: 'linear-gradient(90deg, #1084d0 0%, #5cb3cc 100%)',
			windowHeaderActive: 'linear-gradient(90deg, #1084d0 0%, #5cb3cc 100%)',
			windowHeaderText: '#ffffff',
			windowBorder: '#c0c0c0',
			button: '#c0c0c0',
			buttonText: '#000000',
			taskbar: 'linear-gradient(180deg, #c0c0c0 0%, #a0a0a0 100%)',
			taskbarText: '#000000',
			text: '#000000',
			textHighlight: '#ffffff',
			shadow: 'rgba(0, 0, 0, 0.5)'
		}
	},
	{
		name: 'Windows XP',
		id: 'winxp',
		colors: {
			desktop: '#5a8bb0',
			window: '#ece9d8',
			windowHeader: 'linear-gradient(90deg, #0054e3 0%, #3992d7 50%, #0054e3 100%)',
			windowHeaderActive: 'linear-gradient(90deg, #0054e3 0%, #3992d7 50%, #0054e3 100%)',
			windowHeaderText: '#ffffff',
			windowBorder: '#0054e3',
			button: '#ece9d8',
			buttonText: '#000000',
			taskbar: 'linear-gradient(180deg, #245edb 0%, #3f73e0 3%, #4f7ce0 6%, #245edb 10%, #245edb 54%, #5088e5 100%)',
			taskbarText: '#ffffff',
			text: '#000000',
			textHighlight: '#ffffff',
			shadow: 'rgba(0, 0, 0, 0.3)'
		}
	},
	{
		name: 'Windows 2000',
		id: 'win2000',
		colors: {
			desktop: '#3a6ea5',
			window: '#c0c0c0',
			windowHeader: 'linear-gradient(90deg, #166499 0%, #5197cc 100%)',
			windowHeaderActive: 'linear-gradient(90deg, #166499 0%, #5197cc 100%)',
			windowHeaderText: '#ffffff',
			windowBorder: '#c0c0c0',
			button: '#c0c0c0',
			buttonText: '#000000',
			taskbar: 'linear-gradient(180deg, #c0c0c0 0%, #b0b0b0 100%)',
			taskbarText: '#000000',
			text: '#000000',
			textHighlight: '#ffffff',
			shadow: 'rgba(0, 0, 0, 0.5)'
		}
	}
];

function createThemeManager() {
	let currentTheme = $state(themes[0]);
	
	const LOCAL_STORAGE_KEY = 'selected_theme';

	/**
	 * Get all available themes
	 * @returns {Theme[]}
	 */
	function getThemes() {
		return themes;
	}

	/**
	 * Get current theme
	 * @returns {Theme}
	 */
	function getCurrentTheme() {
		return currentTheme;
	}

	/**
	 * Set theme by ID
	 * @param {string} themeId - Theme ID to set
	 */
	function setTheme(themeId) {
		const theme = themes.find(t => t.id === themeId);
		if (theme) {
			currentTheme = theme;
			applyTheme(theme);
			saveTheme(themeId);
		}
	}

	/**
	 * Apply theme to CSS custom properties
	 * @param {Theme} theme - Theme to apply
	 */
	function applyTheme(theme) {
		const root = document.documentElement;
		Object.entries(theme.colors).forEach(([key, value]) => {
			root.style.setProperty(`--theme-${key}`, value);
		});
	}

	/**
	 * Save theme preference to localStorage
	 * @param {string} themeId - Theme ID to save
	 */
	function saveTheme(themeId) {
		if (typeof window !== 'undefined') {
			localStorage.setItem(LOCAL_STORAGE_KEY, themeId);
		}
	}

	/**
	 * Load theme from localStorage
	 */
	function loadTheme() {
		if (typeof window !== 'undefined') {
			const savedThemeId = localStorage.getItem(LOCAL_STORAGE_KEY);
			if (savedThemeId) {
				setTheme(savedThemeId);
			} else {
				applyTheme(currentTheme);
			}
		}
	}

	return {
		getThemes,
		getCurrentTheme,
		setTheme,
		loadTheme
	};
}

export const themeManager = createThemeManager();