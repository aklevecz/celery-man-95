import { windowManager } from '$lib/window-manager.svelte.js';
import VideoUpscaler from './VideoUpscaler.svelte';

const windowId = 'video-upscaler';

function openVideoUpscalerWindow() {
    windowManager.createWindow({
        id: windowId,
        title: 'Video Upscaler',
        content: {
            component: VideoUpscaler,
            props: {}
        },
        width: 800,
        height: 650,
        x: 150,
        y: 100
    });
}

function VideoUpscalerController() {
    windowManager.registerWindowCreator(windowId, openVideoUpscalerWindow);
    return { openVideoUpscalerWindow };
}

export default VideoUpscalerController();