import { windowManager } from "$lib/window-manager.svelte.js";
import VideoGallery from "./VideoGallery.svelte";

const windowId = "video-gallery-window";

function openVideoGalleryWindow() {
  windowManager.createWindow({
    id: windowId,
    title: "Video Gallery",
    content: {
      component: VideoGallery,
      props: {},
    },
    width: 1000,
    height: 700,
    x: 250,
    y: 100,
    resizable: true,
    minimizable: true,
    maximizable: true,
  });
}

function VideoGalleryController() {
  windowManager.registerWindowCreator(windowId, openVideoGalleryWindow);
  return { openVideoGalleryWindow };
}

export default VideoGalleryController();