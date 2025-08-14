let workAudio = null;
let breakAudio = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'preloadAudio') {
        try {
            workAudio = new Audio(message.workUrl);
            breakAudio = new Audio(message.breakUrl);
            workAudio.preload = 'auto';
            breakAudio.preload = 'auto';
            workAudio.volume = message.volume;
            breakAudio.volume = message.volume;
            console.log("Audio files preloaded in offscreen document");
            sendResponse({ success: true });
        } catch (e) {
            console.error("Failed to preload audio in offscreen document:", e);
            sendResponse({ success: false, error: e.message });
        }
    } else if (message.action === 'playSound') {
        const audio = message.mode === 'work' ? workAudio : breakAudio;
        if (audio) {
            try {
                audio.currentTime = 0; // Reset to start
                await audio.play();
                console.log("Sound played in offscreen document for:", message.mode);
                sendResponse({ success: true });
            } catch (e) {
                console.error("Failed to play sound in offscreen document:", e);
                sendResponse({ success: false, error: e.message });
            }
        } else {
            console.error("Audio not preloaded for:", message.mode);
            sendResponse({ success: false, error: "Audio not preloaded" });
        }
    }
    return true; // Keep message channel open for async response
});