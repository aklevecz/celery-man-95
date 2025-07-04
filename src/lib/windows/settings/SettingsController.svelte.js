import { windowManager } from "$lib/window-manager.svelte.js";
import Settings from "./Settings.svelte";

const windowId = "settings-window";

function openSettingsWindow() {
  windowManager.createWindow({
    id: windowId,
    title: "Settings",
    content: {
      component: Settings,
      props: {},
    },
    width: 500,
    height: 600,
    x: 250,
    y: 100,
    resizable: true,
    minimizable: true,
    maximizable: true,
  });
}

function SettingsController() {
  windowManager.registerWindowCreator(windowId, openSettingsWindow);
  return { openSettingsWindow };
}

export default SettingsController();