import { themeArray } from "./theme-data.js";
import { browser } from "$app/environment";

function createThemeManager() {
  let currentTheme = $state(themeArray[0]);

  /**
   * Get all available themes
   * @returns {Theme[]}
   */
  function getThemes() {
    return themeArray;
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
    const theme = themeArray.find((t) => t.id === themeId);
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
   * Save theme preference to cookie
   * @param {string} themeId - Theme ID to save
   */
  function saveTheme(themeId) {
    if (browser) {
      document.cookie = `selected_theme=${themeId}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    }
  }

  /**
   * Load theme from cookie (fallback for client-side)
   */
  function loadTheme() {
    if (browser) {
      const cookieValue = document.cookie
        .split("; ")
        .find((row) => row.startsWith("selected_theme="))
        ?.split("=")[1];

      if (cookieValue) {
        setTheme(cookieValue);
      } else {
        applyTheme(currentTheme);
      }
    }
  }

  return {
    get currentTheme() {
		console.log(currentTheme)
      return currentTheme;
    },
    getThemes,
    getCurrentTheme,
    setTheme,
    loadTheme,
  };
}

export const themeManager = createThemeManager();
