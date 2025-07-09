import { windowManager } from "$lib/window-manager.svelte.js";
import PromptGenerator from "./PromptGenerator.svelte";

/**
 * Prompt Generator Window Controller
 */
function createPromptGeneratorController() {
  /** @type {string | null} */
  let activeWindowId = $state(null);

  /**
   * Open the prompt generator window
   */
  function openPromptGeneratorWindow() {
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
      title: "Prompt Generator",
      content: {
        component: PromptGenerator,
        props: {}
      },
      width: 1200,
      height: 700,
      x: 50,
      y: 50
    });

    activeWindowId = windowId;

    // Clean up when window is closed
    const unsubscribe = windowManager.onWindowClose(windowId, () => {
      activeWindowId = null;
      unsubscribe();
    });
  }

  /**
   * Close the prompt generator window
   */
  function closePromptGeneratorWindow() {
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
    openPromptGeneratorWindow,
    closePromptGeneratorWindow,
    isWindowOpen,
    get activeWindowId() {
      return activeWindowId;
    }
  };
}

export default createPromptGeneratorController();