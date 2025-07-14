import { windowManager } from "$lib/window-manager.svelte.js";
import ImageAnalyzer from "./ImageAnalyzer.svelte";

const windowId = "image-analyzer-window";

function openImageAnalyzerWindow() {
  windowManager.createWindow({
    id: windowId,
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
}

function ImageAnalyzerController() {
  windowManager.registerWindowCreator(windowId, openImageAnalyzerWindow);
  return { openImageAnalyzerWindow };
}

export default ImageAnalyzerController();