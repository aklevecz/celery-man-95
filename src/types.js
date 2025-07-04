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