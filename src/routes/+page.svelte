<script>
  import { onMount } from "svelte";
  import { windowManager } from "$lib/window-manager.svelte.js";
  import { themeManager } from "$lib/theme-manager.svelte.js";
  import WindowManager from "$lib/components/WindowManager.svelte";
  import Taskbar from "$lib/components/Taskbar.svelte";
  import ThemeSwitcher from "$lib/components/ThemeSwitcher.svelte";
  import NotepadController from "$lib/windows/notepad/NotepadController.svelte.js";
  import FluxorController from "$lib/windows/fluxor/FluxorController.svelte.js";
  import AboutController from "$lib/windows/about/AboutController.svelte";
  import ImageGalleryController from "$lib/windows/image-gallery/ImageGalleryController.js";
  import VideoGalleryController from "$lib/windows/video-gallery/VideoGalleryController.js";
  import SettingsController from "$lib/windows/settings/SettingsController.svelte.js";
  import CinematOrController from "$lib/windows/cinemator/CinematOrController.svelte.js";
  import UpscalerController from "$lib/windows/upscaler/UpscalerController.svelte.js";
  import VideoUpscalerController from "$lib/windows/video-upscaler/VideoUpscalerController.svelte.js";
  import ChatController from "$lib/windows/chat/ChatController.svelte.js";
  import StaticFileBrowserController from "$lib/windows/static-files/StaticFileBrowserController.svelte.js";
  import ImageAnalyzerController from "$lib/windows/image-analyzer/ImageAnalyzerController.svelte.js";
  import PromptGeneratorController from "$lib/windows/prompt-generator/PromptGeneratorController.svelte.js";
  import LightingStudioController from "$lib/windows/lighting-studio/LightingStudioController.svelte.js";
  // Initialize window manager and theme manager on page load
  onMount(() => {
    windowManager.loadWindowState();
    themeManager.loadTheme();
  });

  // Function to create a demo window
  function createDemoWindow() {
    windowManager.createWindow({
      id: "demo-window",
      title: "Demo Window",
      content: "<h2>Hello from the window system!</h2><p>This is a demo window. You can drag, resize, minimize, maximize, and close it.</p>",
      width: 400,
      height: 300,
      x: 200,
      y: 100,
    });
  }
</script>

<div class="desktop">
  <!-- Desktop Icons -->
  <div class="desktop-icons">
    <!-- <button class="desktop-icon" on:click={createDemoWindow}>
      <div class="icon">📄</div>
      <div class="label">Demo Window</div>
    </button> -->
    <button class="desktop-icon" on:click={AboutController.openAboutWindow}>
      <div class="icon">ℹ️</div>
      <div class="label">About</div>
    </button>
    <button class="desktop-icon" on:click={NotepadController.openNotepadWindow}>
      <div class="icon">📝</div>
      <div class="label">Notepad</div>
    </button>
    <button class="desktop-icon" on:click={FluxorController.openFluxorWindow}>
      <div class="icon">🎨</div>
      <div class="label">Fluxor</div>
    </button>
    <button class="desktop-icon" on:click={ImageGalleryController.openImageGalleryWindow}>
      <div class="icon">🖼️</div>
      <div class="label">Image Gallery</div>
    </button>
    <button class="desktop-icon" on:click={VideoGalleryController.openVideoGalleryWindow}>
      <div class="icon">🎥</div>
      <div class="label">Video Gallery</div>
    </button>
    <button class="desktop-icon" on:click={SettingsController.openSettingsWindow}>
      <div class="icon">⚙️</div>
      <div class="label">Settings</div>
    </button>
    <button class="desktop-icon" on:click={CinematOrController.openCinematOrWindow}>
      <div class="icon">🎬</div>
      <div class="label">Cinemator</div>
    </button>
    <button class="desktop-icon" on:click={UpscalerController.openUpscalerWindow}>
      <div class="icon">🔍</div>
      <div class="label">Upscaler</div>
    </button>
    <button class="desktop-icon" on:click={VideoUpscalerController.openVideoUpscalerWindow}>
      <div class="icon">🎬</div>
      <div class="label">Video Upscaler</div>
    </button>
    <!-- <button class="desktop-icon" on:click={ChatController.openChatWindow}>
      <div class="icon">💬</div>
      <div class="label">Chat</div>
    </button> -->
    <button class="desktop-icon" on:click={StaticFileBrowserController.openStaticFileBrowserWindow}>
      <div class="icon">📁</div>
      <div class="label">Static Files</div>
    </button>
    <button class="desktop-icon" on:click={ImageAnalyzerController.openImageAnalyzerWindow}>
      <div class="icon">🔍</div>
      <div class="label">Image Analyzer</div>
    </button>
    <button class="desktop-icon" on:click={PromptGeneratorController.openPromptGeneratorWindow}>
      <div class="icon">✨</div>
      <div class="label">Prompt Generator</div>
    </button>
    <!-- <button class="desktop-icon" on:click={LightingStudioController.openLightingStudioWindow}>
      <div class="icon">💡</div>
      <div class="label">Lighting Studio</div>
    </button> -->
  </div>

  <!-- Theme Switcher -->
  <ThemeSwitcher />

  <!-- Window Manager -->
  <WindowManager />

  <!-- Taskbar -->
  <Taskbar />
</div>

<style>
  .desktop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: var(--theme-desktop);
    overflow: hidden;
  }

  .desktop-icons {
    padding: 20px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 20px;
    width: 100px;
    height: 90%;
    flex-wrap: wrap;
  }

  .desktop-icon {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: none;
    border: none;
    cursor: pointer;
    padding: 8px;
    border-radius: 4px;
    transition: background-color 0.2s;
  }

  .desktop-icon:hover {
    background-color: rgba(255, 255, 255, 0.2);
  }

  .icon {
    font-size: 32px;
    margin-bottom: 4px;
  }

  .label {
    font-size: 12px;
    color: white;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
    text-align: center;
    max-width: 64px;
    word-wrap: break-word;
  }
</style>
