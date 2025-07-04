import { windowManager } from "$lib/window-manager.svelte.js";
import Cinemator from "./Cinemator.svelte";

const windowId = "cinemator-window";

function openCinematOrWindow() {
  windowManager.createWindow({
    id: windowId,
    title: "Cinemator - AI Video Generator",
    content: {
      component: Cinemator,
      props: {},
    },
    width: 700,
    height: 800,
    x: 200,
    y: 50,
    resizable: true,
    minimizable: true,
    maximizable: true,
  });
}

function CinematOrController() {
  windowManager.registerWindowCreator(windowId, openCinematOrWindow);
  return { openCinematOrWindow };
}

export default CinematOrController();