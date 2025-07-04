import { windowManager } from "$lib/window-manager.svelte.js";
import About from "./About.svelte";

const windowId = "about-window";
function openAboutWindow() {
  windowManager.createWindow({
    id: windowId,
    title: "About Windows",
    content: {
      component: About,
      props: {},
    },
    width: 400,
    height: 350,
    x: 300,
    y: 150,
  });
}

function AboutController() {
  windowManager.registerWindowCreator(windowId, openAboutWindow);
  return { openAboutWindow };
}

export default AboutController();
