<script>
  import { windowManager } from "$lib/window-manager.svelte.js";

  let { windowId, title = "Untitled", width = 400, height = 300, x = 100, y = 100, zIndex = 1000, isMinimized = false, isMaximized = false, children } = $props();

  let isDragging = false;
  let isResizing = false;
  let dragOffset = { x: 0, y: 0 };
  let resizeStart = { x: 0, y: 0, width: 0, height: 0 };

  /** @param {*} e */
  function handleMouseDown(e) {
    if (e.target.closest(".window-controls") || e.target.closest(".resize-handle")) {
      return;
    }

    windowManager.focusWindow(windowId);
    isDragging = true;
    dragOffset.x = e.clientX - x;
    dragOffset.y = e.clientY - y;

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    e.preventDefault();
  }

  /** @param {*} e */
  function handleMouseMove(e) {
    if (isDragging && !isMaximized) {
      const newX = e.clientX - dragOffset.x;
      const newY = Math.max(0, e.clientY - dragOffset.y);
      windowManager.moveWindow(windowId, newX, newY);
    } else if (isResizing) {
      const newWidth = resizeStart.width + (e.clientX - resizeStart.x);
      const newHeight = resizeStart.height + (e.clientY - resizeStart.y);
      windowManager.resizeWindow(windowId, newWidth, newHeight);
    }
  }

  function handleMouseUp() {
    isDragging = false;
    isResizing = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  }

  /** @param {*} e */
  function handleResizeStart(e) {
    if (isMaximized) return;

    isResizing = true;
    resizeStart.x = e.clientX;
    resizeStart.y = e.clientY;
    resizeStart.width = width;
    resizeStart.height = height;

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    e.preventDefault();
    e.stopPropagation();
  }

  function close() {
    windowManager.closeWindow(windowId);
  }

  function minimize() {
    windowManager.minimizeWindow(windowId);
  }

  function maximize() {
    windowManager.maximizeWindow(windowId);
  }

  function handleDoubleClick() {
    maximize();
  }
</script>

{#if !isMinimized}
  <div
    class="window"
    style="
		left: {x}px; 
		top: {y}px; 
		width: {width}px; 
		height: {height}px; 
		z-index: {zIndex};
		position: fixed;
	"
    role="dialog"
    aria-label={title}
  >
    <div class="window-header" onmousedown={handleMouseDown} ondblclick={handleDoubleClick} role="button" tabindex="0" aria-label="Drag to move window, double-click to maximize">
      <div class="window-title">{title}</div>
      <div class="window-controls">
        <button class="window-button minimize-btn" onclick={minimize} aria-label="Minimize">_</button>
        <button class="window-button maximize-btn" onclick={maximize} aria-label={isMaximized ? "Restore" : "Maximize"}>
          {isMaximized ? "❐" : "□"}
        </button>
        <button class="window-button close-btn" onclick={close} aria-label="Close">×</button>
      </div>
    </div>

    <div class="window-content">
      {@render children?.()}
    </div>

    {#if !isMaximized}
      <div class="resize-handle" onmousedown={handleResizeStart} role="button" tabindex="0" aria-label="Resize window"></div>
    {/if}
  </div>
{/if}

<style>
  .window {
    background: var(--theme-window);
    border: 2px outset var(--theme-windowBorder);
    box-shadow: 2px 2px 4px var(--theme-shadow);
    user-select: none;
    font-family: 'MS Sans Serif', 'Microsoft Sans Serif', 'Tahoma', 'Arial', sans-serif;
    font-size: 11px;
  }

  .window-header {
    background: var(--theme-windowHeader);
    color: var(--theme-windowHeaderText);
    padding: 4px 4px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 18px;
    cursor: move;
    letter-spacing: 0px;
    font-size: 11px;
    font-weight: bold;
    font-family: inherit;
  }

  .window-title {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    flex: 1;
    padding-left: 4px;
    color: var(--theme-windowHeaderText);
  }

  .window-controls {
    display: flex;
    gap: 2px;
  }

  .window-button {
    width: 16px;
    height: 14px;
    border: 1px outset var(--theme-button);
    background: var(--theme-button);
    color: var(--theme-buttonText);
    font-size: 10px;
    font-weight: bold;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    line-height: 1;
    font-family: inherit;
  }

  .window-button:hover {
    background: #d4d0c8;
  }

  .window-button:active {
    border: 1px inset var(--theme-button);
  }

  .close-btn {
    font-size: 12px;
  }

  .window-content {
    background: var(--theme-window);
    color: var(--theme-text);
    padding: 4px;
    height: calc(100% - 32px);
    overflow: auto;
    border-top: 1px inset var(--theme-windowBorder);
    box-sizing: border-box;
  }

  .resize-handle {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 12px;
    height: 12px;
    cursor: se-resize;
    background: linear-gradient(135deg, transparent 0%, transparent 30%, #808080 30%, #808080 35%, transparent 35%, transparent 65%, #808080 65%, #808080 70%, transparent 70%);
  }

  .resize-handle:hover {
    background-color: rgba(128, 128, 128, 0.3);
  }
</style>
