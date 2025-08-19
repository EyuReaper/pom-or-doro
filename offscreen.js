let workAudioBuffer = null;
let breakAudioBuffer = null;
let audioContext = null;

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    try {
        if (message.action === 'preloadAudio') {
            try {
                if (!audioContext) {
                    audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    console.log("AudioContext created, initial state:", audioContext.state);
                }
                const loadAudio = async (url) => {
                    const response = await fetch(url);
                    const arrayBuffer = await response.arrayBuffer();
                    return await audioContext.decodeAudioData(arrayBuffer);
                };
                workAudioBuffer = await loadAudio(message.workUrl);
                breakAudioBuffer = await loadAudio(message.breakUrl);
                console.log("Audio buffers preloaded in offscreen document. workAudioBuffer:", message.workUrl, "breakAudioBuffer:", message.breakUrl);
                sendResponse({ success: true });
            } catch (e) {
                console.error("Failed to preload audio buffers:", e, "workUrl:", message.workUrl, "breakUrl:", message.breakUrl);
                sendResponse({ success: false, error: e.message });
            }
        } else if (message.action === 'playSound') {
            if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                console.log("AudioContext created for playback, initial state:", audioContext.state);
            }
            const audioBuffer = message.mode === 'work' ? workAudioBuffer : breakAudioBuffer;
            if (audioBuffer) {
                try {
                    console.log("Attempting to play sound for mode:", message.mode);
                    const source = audioContext.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(audioContext.destination);
                    if (audioContext.state === 'suspended') {
                        console.log("AudioContext suspended, awaiting resume");
                        await new Promise(resolve => {
                            const resumeListener = () => {
                                audioContext.removeEventListener('statechange', resumeListener);
                                resolve();
                            };
                            audioContext.addEventListener('statechange', resumeListener);
                            chrome.runtime.sendMessage({ action: 'requestAudioResume' });
                        });
                    }
                    source.start(0);
                    console.log("Sound played successfully in offscreen document for:", message.mode);
                    sendResponse({ success: true });
                } catch (e) {
                    console.error("Failed to play sound in offscreen document:", e, "mode:", message.mode);
                    sendResponse({ success: false, error: e.message });
                }
            } else {
                console.error("Audio buffer not preloaded for mode:", message.mode);
                sendResponse({ success: false, error: "Audio buffer not preloaded" });
            }
        } else if (message.action === 'pingOffscreen') {
            sendResponse({ ready: true });
        } else if (message.action === 'resumeAudio') {
            if (audioContext && audioContext.state === 'suspended') {
                await audioContext.resume();
                console.log("AudioContext resumed, new state:", audioContext.state);
                sendResponse({ success: true });
            } else {
                sendResponse({ success: false, error: "AudioContext not suspended or not initialized" });
            }
        }
    } catch (e) {
        console.error("Unexpected error in message handler:", e);
        sendResponse({ success: false, error: e.message });
    }
    return true;
});