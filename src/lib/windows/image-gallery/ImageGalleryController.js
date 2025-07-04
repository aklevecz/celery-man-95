import { windowManager } from "$lib/window-manager.svelte.js";
import ImageGallery from "./ImageGallery.svelte";

const windowId = "image-gallery-window";
function openImageGalleryWindow() {
  windowManager.createWindow({
    id: windowId,
    title: "Image Gallery",
    content: {
      component: ImageGallery,
      props: {},
    },
    width: 400,
    height: 350,
    x: 300,
    y: 150,
  });
}

function ImageGalleryController() {
  windowManager.registerWindowCreator(windowId, openImageGalleryWindow);
  return { openImageGalleryWindow };
}

export default ImageGalleryController();
