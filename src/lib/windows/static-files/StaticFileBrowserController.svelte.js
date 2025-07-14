import { windowManager } from "$lib/window-manager.svelte.js";
import StaticFileBrowser from "./StaticFileBrowser.svelte";

const windowId = "static-files-window";

function openStaticFileBrowserWindow() {
  windowManager.createWindow({
    id: windowId,
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
}

function StaticFileBrowserController() {
  windowManager.registerWindowCreator(windowId, openStaticFileBrowserWindow);
  return { openStaticFileBrowserWindow };
}

export default StaticFileBrowserController();