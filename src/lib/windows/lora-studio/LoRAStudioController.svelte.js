import { windowManager } from "$lib/window-manager.svelte.js";
import LoRAStudio from "./LoRAStudio.svelte";

const windowId = "lora-studio-window";

function openLoRAStudioWindow() {
  windowManager.createWindow({
    id: windowId,
    title: "LoRA Studio",
    content: {
      component: LoRAStudio,
      props: {}
    },
    width: 1200,
    height: 800,
    x: 100,
    y: 50
  });
}

function LoRAStudioController() {
  windowManager.registerWindowCreator(windowId, openLoRAStudioWindow);
  return { openLoRAStudioWindow };
}

export default LoRAStudioController();