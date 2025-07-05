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
    height: 500,
    x: 200,
    y: 50,
  });
}

function CinematOrController() {
  windowManager.registerWindowCreator(windowId, openCinematOrWindow);
  return { openCinematOrWindow };
}

export default CinematOrController();
