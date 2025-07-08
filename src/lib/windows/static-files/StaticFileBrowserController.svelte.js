import { windowManager } from "$lib/window-manager.svelte.js";
import StaticFileBrowser from "./StaticFileBrowser.svelte";

/**
 * Static Files Browser Window Controller
 */
function createStaticFileBrowserController() {
  /** @type {string | null} */
  let activeWindowId = $state(null);

  /**
   * Open the static files browser window
   */
  function openStaticFileBrowserWindow() {
    // Check if window is already open
    if (activeWindowId) {
      const existingWindow = windowManager.windows.find(w => w.id === activeWindowId);
      if (existingWindow) {
        windowManager.focusWindow(activeWindowId);
        return;
      }
    }

    // Create new window
    const windowId = windowManager.createWindow({
      title: "Static Files Browser",
      content: {
        component: StaticFileBrowser,
        props: {}
      },
      width: 800,
      height: 600,
      x: 100,
      y: 100
    });

    activeWindowId = windowId;

    // Clean up when window is closed
    const unsubscribe = windowManager.onWindowClose(windowId, () => {
      activeWindowId = null;
      unsubscribe();
    });
  }

  /**
   * Close the static files browser window
   */
  function closeStaticFileBrowserWindow() {
    if (activeWindowId) {
      windowManager.closeWindow(activeWindowId);
      activeWindowId = null;
    }
  }

  /**
   * Check if the window is currently open
   * @returns {boolean}
   */
  function isWindowOpen() {
    return activeWindowId !== null && 
           windowManager.windows.some(w => w.id === activeWindowId);
  }

  return {
    openStaticFileBrowserWindow,
    closeStaticFileBrowserWindow,
    isWindowOpen,
    get activeWindowId() {
      return activeWindowId;
    }
  };
}

export default createStaticFileBrowserController();