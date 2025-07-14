
function createWindowManager() {
	/** @type {AppWindow[]} */
	let windows = $state([]);
	/** @type {string | null} */
	let activeWindowId = $state(null);
	let zIndexCounter = 1000;
	/** @type {Map<string, Set<Function>>} */
	let windowCloseListeners = new Map();

	const LOCAL_STORAGE_KEY = 'window_manager_state';

	// Registry to map window IDs to their creation functions
	const windowCreators = new Map();

	const visibleWindows = $derived(windows.filter((w) => !w.isMinimized));

	/**
	 * Register a window creator function
	 * @param {string} windowId - The ID of the window
	 * @param {Function} creatorFunction - Function to recreate the window
	 */
	function registerWindowCreator(windowId, creatorFunction) {
		windowCreators.set(windowId, creatorFunction);
	}

	/**
	 * Save current window state to localStorage
	 */
	function saveWindowState() {
		if (typeof window === 'undefined') return;

		try {
			/** @type {SerializableWindow[]} */
			const serializableWindows = windows.map((win) => ({
				id: win.id,
				title: win.title,
				width: win.width,
				height: win.height,
				x: win.x,
				y: win.y,
				zIndex: win.zIndex,
				isMinimized: win.isMinimized,
				isMaximized: win.isMaximized,
				originalBounds: win.originalBounds,
				contentType: typeof win.content === 'string' ? 'string' : 'component',
				contentData: typeof win.content === 'string' ? win.content : win.id // For components, we'll use the ID to recreate
			}));

			const state = {
				windows: serializableWindows,
				activeWindowId,
				zIndexCounter
			};

			localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
			// console.log('Window state saved:', state);
		} catch (error) {
			console.error('Failed to save window state:', error);
		}
	}

	/**
	 * Load window state from localStorage
	 */
	function loadWindowState() {
		if (typeof window === 'undefined') return;

		try {
			const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
			if (!savedState) return;

			const state = JSON.parse(savedState);
			if (!state.windows) return;

			zIndexCounter = state.zIndexCounter || 1000;
			activeWindowId = state.activeWindowId;

			console.log('Loading window state:', state);

			// Restore windows
			for (const savedWindow of state.windows) {
				const creator = windowCreators.get(savedWindow.id);
				if (creator) {
					console.log()
					// Recreate the window using its creator function
					creator();

					// Update the recreated window with saved state
					const restoredWindow = windows.find((w) => w.id === savedWindow.id);
					if (restoredWindow) {
						restoredWindow.width = savedWindow.width;
						restoredWindow.height = savedWindow.height;
						restoredWindow.x = savedWindow.x;
						restoredWindow.y = savedWindow.y;
						restoredWindow.zIndex = savedWindow.zIndex;
						restoredWindow.isMinimized = savedWindow.isMinimized;
						restoredWindow.isMaximized = savedWindow.isMaximized;
						restoredWindow.originalBounds = savedWindow.originalBounds;
					}
				} else {
					console.warn(`No creator function registered for window: ${savedWindow.id}`);
				}
			}
		} catch (error) {
			console.error('Failed to load window state:', error);
		}
	}

	/**
	 * Clear saved window state
	 */
	function clearWindowState() {
		if (typeof window === 'undefined') return;
		localStorage.removeItem(LOCAL_STORAGE_KEY);
	}

	/**
	 * Create a new window
	 * @param {{ id?: string, title: string, content: string|WindowComponentContent, width?: number, height?: number, x?: number, y?: number }} options
	 * @returns {string} The id of the created window
	 */
	function createWindow({ id, title, content, width = 400, height = 300, x = 100, y = 100 }) {
		const windowId = id || `window-${Date.now()}`;

		const existingWindow = windows.find((w) => w.id === windowId);
		if (existingWindow) {
			focusWindow(windowId);
			return windowId;
		}

		const newWindow = {
			id: windowId,
			title,
			content,
			width,
			height,
			x,
			y,
			zIndex: ++zIndexCounter,
			isMinimized: false,
			isMaximized: false,
			originalBounds: null
		};

		windows.push(newWindow);
		activeWindowId = windowId;
		saveWindowState();

		return windowId;
	}

	/**
	 * Close a window by its ID
	 * @param {string} windowId - The ID of the window to close
	 */
	function closeWindow(windowId) {
		const windowIndex = windows.findIndex((w) => w.id === windowId);
		if (windowIndex === -1) return;

		// Notify listeners before removing the window
		const listeners = windowCloseListeners.get(windowId);
		if (listeners) {
			listeners.forEach(callback => {
				try {
					callback();
				} catch (error) {
					console.error('Error in window close callback:', error);
				}
			});
			windowCloseListeners.delete(windowId);
		}

		windows.splice(windowIndex, 1);

		if (activeWindowId === windowId) {
			activeWindowId = windows.length > 0 ? windows[windows.length - 1].id : null;
		}
		saveWindowState();
	}

	/**
	 * Focus a window by its ID
	 * @param {string} windowId - The ID of the window to focus
	 */
	function focusWindow(windowId) {
		const window = windows.find((w) => w.id === windowId);
		if (!window) return;

		if (window.isMinimized) {
			window.isMinimized = false;
		}
		window.zIndex = ++zIndexCounter;
		activeWindowId = windowId;
		saveWindowState();
	}

	/**
	 * Minimize a window by its ID
	 * @param {string} windowId - The ID of the window to minimize
	 */
	function minimizeWindow(windowId) {
		const window = windows.find((w) => w.id === windowId);
		if (!window) return

		window.isMinimized = true;

		if (activeWindowId === windowId) {
			const visibleWindowsList = windows.filter((w) => !w.isMinimized);
			activeWindowId =
				visibleWindowsList.length > 0 ? visibleWindowsList[visibleWindowsList.length - 1].id : null;
		}
		saveWindowState();
	}

	/**
	 * Maximize or restore a window by its ID
	 * @param {string} windowId - The ID of the window to maximize/restore
	 */
	function maximizeWindow(windowId) {
		const window = windows.find((w) => w.id === windowId);
		if (!window) return;

		if (window.isMaximized) {
			// Restore window
			if (window.originalBounds) {
				window.x = window.originalBounds.x;
				window.y = window.originalBounds.y;
				window.width = window.originalBounds.width;
				window.height = window.originalBounds.height;
			}
			window.isMaximized = false;
			window.originalBounds = null;
		} else {
			// Maximize window
			window.originalBounds = {
				x: window.x,
				y: window.y,
				width: window.width,
				height: window.height
			};
			window.x = 0;
			window.y = 0;
			window.width = (typeof globalThis !== 'undefined' && globalThis.innerWidth) || 800;
			window.height = (typeof globalThis !== 'undefined' && globalThis.innerHeight) || 600;
			window.isMaximized = true;
		}
		focusWindow(windowId);
		saveWindowState();
	}

	/**
	 * Move a window to new coordinates
	 * @param {string} windowId - The ID of the window to move
	 * @param {number} x - New X coordinate
	 * @param {number} y - New Y coordinate
	 */
	function moveWindow(windowId, x, y) {
		const window = windows.find((w) => w.id === windowId);
		if (!window || window.isMaximized) return;

		window.x = x;
		window.y = y;
		saveWindowState();
	}

	/**
	 * Resize a window
	 * @param {string} windowId - The ID of the window to resize
	 * @param {number} width - New width
	 * @param {number} height - New height
	 */
	function resizeWindow(windowId, width, height) {
		const window = windows.find((w) => w.id === windowId);
		if (!window || window.isMaximized) return;

		window.width = Math.max(200, width);
		window.height = Math.max(100, height);
		saveWindowState();
	}

	/**
	 * Update window content and properties
	 * @param {string} windowId - The ID of the window to update
	 * @param {Partial<Pick<AppWindow, 'title' | 'content' | 'width' | 'height'>>} updates - Updates to apply
	 */
	function updateWindowContent(windowId, updates) {
		const window = windows.find((w) => w.id === windowId);
		if (!window) return;

		if (updates.title !== undefined) window.title = updates.title;
		if (updates.content !== undefined) window.content = updates.content;
		if (updates.width !== undefined) window.width = updates.width;
		if (updates.height !== undefined) window.height = updates.height;
		saveWindowState();
	}

	/**
	 * Register a callback to be called when a window is closed
	 * @param {string} windowId - The ID of the window to listen to
	 * @param {Function} callback - The callback function to call when the window is closed
	 * @returns {Function} An unsubscribe function
	 */
	function onWindowClose(windowId, callback) {
		if (!windowCloseListeners.has(windowId)) {
			windowCloseListeners.set(windowId, new Set());
		}
		
		const listeners = windowCloseListeners.get(windowId);
		listeners.add(callback);
		
		// Return unsubscribe function
		return () => {
			listeners.delete(callback);
			if (listeners.size === 0) {
				windowCloseListeners.delete(windowId);
			}
		};
	}

	return {
		get windows() {
			return windows;
		},
		get activeWindowId() {
			return activeWindowId;
		},
		get visibleWindows() {
			return visibleWindows;
		},
		createWindow,
		closeWindow,
		focusWindow,
		minimizeWindow,
		maximizeWindow,
		moveWindow,
		resizeWindow,
		updateWindowContent,
		registerWindowCreator,
		loadWindowState,
		saveWindowState,
		clearWindowState,
		onWindowClose
	};
}

export const windowManager = createWindowManager();
