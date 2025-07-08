import { windowManager } from "$lib/window-manager.svelte.js";
import ImageAnalyzer from "./ImageAnalyzer.svelte";

/**
 * Image Analyzer Window Controller
 */
function createImageAnalyzerController() {
  /** @type {string | null} */
  let activeWindowId = $state(null);

  /**
   * Open the image analyzer window
   */
  function openImageAnalyzerWindow() {
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
      title: "Image Analyzer",
      content: {
        component: ImageAnalyzer,
        props: {}
      },
      width: 1000,
      height: 700,
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
   * Close the image analyzer window
   */
  function closeImageAnalyzerWindow() {
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
    openImageAnalyzerWindow,
    closeImageAnalyzerWindow,
    isWindowOpen,
    get activeWindowId() {
      return activeWindowId;
    }
  };
}

export default createImageAnalyzerController();