import { windowManager } from '$lib/window-manager.svelte.js';
import ImagePreview from './ImagePreview.svelte';

let windowCounter = 0;

/**
 * Open an image preview window
 * @param {Object} options - Preview options
 * @param {string} options.imageUrl - URL of the image to preview
 * @param {string} [options.imageId] - Optional ID of saved image
 * @param {string} [options.title] - Optional window title
 * @param {string} [options.prompt] - Optional prompt text for title
 */
function openImagePreviewWindow({ imageUrl, imageId, title, prompt }) {
  const windowId = `image-preview-${++windowCounter}`;
  
  // Generate title based on available info
  let windowTitle = "Image Preview";
  if (prompt) {
    windowTitle = prompt.length > 30 ? `${prompt.substring(0, 30)}...` : prompt;
  } else if (title) {
    windowTitle = title;
  }

  windowManager.createWindow({
    id: windowId,
    title: windowTitle,
    content: {
      component: ImagePreview,
      props: {
        imageUrl,
        imageId,
        title: windowTitle
      }
    },
    width: 800,
    height: 600,
    x: 100 + (windowCounter * 30),
    y: 50 + (windowCounter * 30)
  });
}

function ImagePreviewController() {
  return { openImagePreviewWindow };
}

export default ImagePreviewController();