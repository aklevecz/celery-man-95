/**
 * @typedef {Object} WindowComponentContent
 * @property {any} component - The Svelte component constructor
 * @property {Object} [props] - Props to pass to the component
 */

/**
 * @typedef {Object} AppWindow
 * @property {string} id
 * @property {string} title
 * @property {string | WindowComponentContent} content
 * @property {number} width
 * @property {number} height
 * @property {number} x
 * @property {number} y
 * @property {number} zIndex
 * @property {boolean} isMinimized
 * @property {boolean} isMaximized
 * @property {{x: number, y: number, width: number, height: number} | null} originalBounds
 */

/**
 * @typedef {Object} SerializableWindow
 * @property {string} id
 * @property {string} title
 * @property {number} width
 * @property {number} height
 * @property {number} x
 * @property {number} y
 * @property {number} zIndex
 * @property {boolean} isMinimized
 * @property {boolean} isMaximized
 * @property {{x: number, y: number, width: number, height: number} | null} originalBounds
 * @property {string} contentType - 'string' or 'component'
 * @property {string} contentData - Serialized content
 */

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
 */