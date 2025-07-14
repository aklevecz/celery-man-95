import { windowManager } from "$lib/window-manager.svelte.js";
import PromptGenerator from "./PromptGenerator.svelte";

const windowId = "prompt-generator-window";

function openPromptGeneratorWindow() {
  windowManager.createWindow({
    id: windowId,
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
}

function PromptGeneratorController() {
  windowManager.registerWindowCreator(windowId, openPromptGeneratorWindow);
  return { openPromptGeneratorWindow };
}

export default PromptGeneratorController();