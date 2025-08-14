let workAudio = null;
let breakAudio = null;

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    try {
        if (message.action === 'preloadAudio') {
            try {
                workAudio = new Audio(message.workUrl);
                breakAudio = new Audio(message.breakUrl);
                workAudio.preload = 'auto';
                breakAudio.preload = 'auto';
                workAudio.volume = message.volume;
                breakAudio.volume = message.volume;
                console.log("Audio files preloaded in offscreen document. workAudio:", workAudio.src, "breakAudio:", breakAudio.src);
                sendResponse({ success: true });
            } catch (e) {
                console.error("Failed to preload audio in offscreen document:", e, "workUrl:", message.workUrl, "breakUrl:", message.breakUrl);
                sendResponse({ success: false, error: e.message });
            }
        } else if (message.action === 'playSound') {
            const audio = message.mode === 'work' ? workAudio : breakAudio;
            if (audio) {
                try {
                    console.log("Attempting to play sound for mode:", message.mode, "audio src:", audio.src);
                    audio.currentTime = 0; // Reset to start
                    await audio.play();
                    console.log("Sound played successfully in offscreen document for:", message.mode);
                    sendResponse({ success: true });
                } catch (e) {
                    console.error("Failed to play sound in offscreen document:", e, "mode:", message.mode, "audio src:", audio.src);
                    sendResponse({ success: false, error: e.message });
                }
            } else {
                console.error("Audio not preloaded for mode:", message.mode);
                sendResponse({ success: false, error: "Audio not preloaded" });
            }
        } else if (message.action === 'pingOffscreen') {
            // Respond to ping to confirm offscreen is ready
            sendResponse({ ready: true });
        }
    } catch (e) {
        console.error("Unexpected error in message handler:", e);
        sendResponse({ success: false, error: e.message });
    }
    return true; // Keep message channel open for async response
});