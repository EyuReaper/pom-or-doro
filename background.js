const DEFAULT_WORK_TIME = 25;
const DEFAULT_SHORT_BREAK = 5;
const DEFAULT_LONG_BREAK = 15;
const DEFAULT_POMODORO_COUNT_FOR_LONG_BREAK = 4;

let timerIntervalId = null;
let currentMode = 'work';
let timeLeft = null; // Initialize after loading settings
let pomodoroCount = 0;
let isPaused = true;
let userSettings = {};
let offscreenDocumentId = null;
let offscreenReady = false; // Track offscreen document readiness
let pendingPopup = false; // Flag to track pending popup request

// Theme color map for icon (used only when timer is running)
const themeColors = {
    'light': { bg: '#f5f7fa', text: '#1a1a1a' },
    'dark': { bg: '#1e1e1e', text: '#e0e0e0' },
    'waillord': { bg: '#D7CFE4', text: '#282C3C' },
    'ivy': { bg: '#4DAEAC', text: '#203430' },
    'ethiopian': { bg: '#006241', text: '#FFFFFF' }
};

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

function updateIcon(time) {
    // Only generate dynamic icon if timer is running
    if (!isPaused) {
        const canvas = new OffscreenCanvas(32, 32);
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            console.error("Failed to get 2D context for OffscreenCanvas");
            setDefaultIcon();
            return;
        }

        const theme = themeColors[userSettings.theme] || themeColors['light'];
        const bgColor = theme.bg;
        const textColor = theme.text;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = textColor;
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const timeStr = formatTime(time);
        ctx.fillText(timeStr, canvas.width / 2, canvas.height / 2);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        if (imageData.data.length !== 32 * 32 * 4) {
            console.error("Invalid imageData length:", imageData.data.length);
            setDefaultIcon();
            return;
        }
        chrome.action.setIcon({ imageData }).catch(e => {
            console.error("Failed to set dynamic icon with imageData:", e);
            setDefaultIcon();
        });
    }
}

function setDefaultIcon() {
    // Set the original icon from assets
    chrome.action.setIcon({ path: 'assets/images/pomordoro.png' }).catch(e => {
        console.error("Failed to set default icon from path 'assets/images/pomordoro.png':", e);
        // Fallback to a built-in icon
        chrome.action.setIcon({ path: 'icon16.png' }).catch(e => {
            console.error("Failed to set fallback icon 'icon16.png':", e);
        });
    });
}

function sendTimerUpdate() {
    const displayMode = currentMode === 'work' ? 'work' : 'break';
    chrome.runtime.sendMessage({
        action: 'timerUpdate',
        timeLeft,
        pomodoroCount,
        isPaused,
        mode: displayMode
    }).catch(e => {
        if (!e.message.includes("Receiving end does not exist")) {
            console.error("Error sending timer update:", e);
        }
    });
}

async function updateTimerState() {
    console.log("Updating timer state, timeLeft:", timeLeft);
    if (timeLeft === null) {
        console.error("timeLeft is uninitialized, resetting timer");
        resetTimer(false);
        return;
    }
    if (timeLeft > 0) {
        timeLeft--;
        updateIcon(timeLeft);
    } else {
        clearInterval(timerIntervalId);
        timerIntervalId = null;
        await handleSessionEnd();
        setDefaultIcon(); // Reset to default icon when timer ends
    }
    sendTimerUpdate();
}

async function handleSessionEnd() {
    let notificationTitle = '';
    let notificationMessage = '';
    let nextMode = '';
    let newTime = 0;

    if (currentMode === 'work') {
        pomodoroCount++;
        notificationTitle = 'Work Session Complete';
        notificationMessage = 'Time for a break. Click to continue.';
        nextMode = pomodoroCount % userSettings.pomodoroCountForLongBreak === 0 ? 'long-break' : 'short-break';
        newTime = nextMode === 'long-break' ? userSettings.longBreakTime : userSettings.shortBreakTime;
    } else {
        notificationTitle = 'Break Over';
        notificationMessage = 'Time to work. Click to continue.';
        nextMode = 'work';
        newTime = userSettings.workTime;
    }

    currentMode = nextMode;
    timeLeft = newTime * 60;
    isPaused = true;

    if (offscreenDocumentId && offscreenReady) {
        console.log("Sending playSound message for mode:", currentMode);
        chrome.runtime.sendMessage({
            action: 'playSound',
            mode: currentMode,
            volume: userSettings.soundVolume || 1.0
        }).catch(e => console.error("Failed to send playSound message:", e));
    } else {
        console.warn("Offscreen document not ready or unavailable, sound playback skipped. offscreenReady:", offscreenReady, "offscreenDocumentId:", offscreenDocumentId);
        if (!offscreenDocumentId) {
            await createOffscreenDocument();
            if (offscreenDocumentId && offscreenReady) {
                console.log("Recreated offscreen document, resending playSound");
                chrome.runtime.sendMessage({
                    action: 'playSound',
                    mode: currentMode,
                    volume: userSettings.soundVolume || 1.0
                }).catch(e => console.error("Failed to resend playSound message:", e));
            }
        }
    }

    try {
        const notificationId = 'sessionEnd_' + Date.now();
        chrome.notifications.create(notificationId, {
            type: 'basic',
            iconUrl: 'assets/images/pomordoro.png',
            title: notificationTitle,
            message: notificationMessage,
            priority: 2
        });
    } catch (e) {
        console.error("Error creating notification:", e);
    }

    await saveTimerState();
    chrome.runtime.sendMessage({ action: 'sessionEnded' }); // Notify side panel
}

async function createOffscreenDocument() {
    if (offscreenDocumentId) {
        try {
            const hasDocument = await chrome.offscreen.hasDocument();
            if (hasDocument) await chrome.offscreen.closeDocument();
        } catch (e) {
            console.error("Error managing offscreen document:", e);
        }
    }
    if (typeof chrome.offscreen?.createDocument === 'function') {
        try {
            await chrome.offscreen.createDocument({
                url: 'offscreen.html',
                reasons: ['AUDIO_PLAYBACK'],
                justification: 'Playing audio notifications for Pom-or-doro timer'
            });
            offscreenDocumentId = 'audio-offscreen';
            return new Promise(resolve => {
                const checkReady = () => {
                    chrome.runtime.sendMessage({ action: 'pingOffscreen' }, response => {
                        if (chrome.runtime.lastError) {
                            setTimeout(checkReady, 100);
                        } else {
                            offscreenReady = true;
                            resolve();
                        }
                    });
                };
                checkReady();
            });
        } catch (e) {
            console.error("Failed to create offscreen document:", e);
            offscreenDocumentId = null;
        }
    } else {
        console.error("Offscreen API not supported");
        offscreenDocumentId = null;
    }
}

async function loadSettings() {
    try {
        const { settings } = await chrome.storage.sync.get(['settings']);
        userSettings = {
            workTime: Number.isInteger(settings?.workTime) && settings.workTime > 0 ? settings.workTime : DEFAULT_WORK_TIME,
            shortBreakTime: Number.isInteger(settings?.shortBreakTime) && settings.shortBreakTime > 0 ? settings.shortBreakTime : DEFAULT_SHORT_BREAK,
            longBreakTime: Number.isInteger(settings?.longBreakTime) && settings.longBreakTime > 0 ? settings.longBreakTime : DEFAULT_LONG_BREAK,
            pomodoroCountForLongBreak: Number.isInteger(settings?.pomodoroCountForLongBreak) && settings.pomodoroCountForLongBreak > 0 ? settings.pomodoroCountForLongBreak : DEFAULT_POMODORO_COUNT_FOR_LONG_BREAK,
            soundVolume: typeof settings?.soundVolume === 'number' && settings.soundVolume >= 0 && settings.soundVolume <= 1 ? settings.soundVolume : 1.0,
            theme: ['light', 'dark', 'waillord', 'ivy', 'ethiopian'].includes(settings?.theme) ? settings.theme : 'light',
            language: ['en', 'am'].includes(settings?.language) ? settings.language : 'en'
        };
        if (timeLeft === null) {
            timeLeft = userSettings.workTime * 60;
            setDefaultIcon(); // Set default icon on initial load
        }
    } catch (error) {
        console.error("Error loading settings:", error);
        userSettings = {
            workTime: DEFAULT_WORK_TIME,
            shortBreakTime: DEFAULT_SHORT_BREAK,
            longBreakTime: DEFAULT_LONG_BREAK,
            pomodoroCountForLongBreak: DEFAULT_POMODORO_COUNT_FOR_LONG_BREAK,
            soundVolume: 1.0,
            theme: 'light',
            language: 'en'
        };
        timeLeft = userSettings.workTime * 60;
        setDefaultIcon(); // Set default icon on error
    }
}

async function saveSettings(newSettings) {
    try {
        userSettings = { ...userSettings, ...newSettings };
        await chrome.storage.sync.set({ settings: userSettings });
        if (isPaused) {
            const timeKey = currentMode === 'work' ? 'workTime' : currentMode === 'short-break' ? 'shortBreakTime' : 'longBreakTime';
            if (newSettings[timeKey] !== undefined) {
                timeLeft = userSettings[timeKey] * 60;
                setDefaultIcon(); // Set default icon on settings change if paused
                sendTimerUpdate();
            }
        }
    } catch (error) {
        console.error("Error saving settings:", error);
    }
}

async function loadTimerState() {
    try {
        const { timerState } = await chrome.storage.sync.get(['timerState']);
        if (timerState && ['work', 'short-break', 'long-break'].includes(timerState.currentMode) && Number.isInteger(timerState.timeLeft) && timerState.timeLeft >= 0) {
            currentMode = timerState.currentMode;
            timeLeft = timerState.timeLeft;
            pomodoroCount = Number.isInteger(timerState.pomodoroCount) && timerState.pomodoroCount >= 0 ? timerState.pomodoroCount : 0;
            isPaused = !!timerState.isPaused;
            if (!isPaused) startTimerInterval();
            updateIcon(timeLeft); // Update with timer icon if running
        } else {
            timeLeft = userSettings.workTime * 60;
            currentMode = 'work';
            pomodoroCount = 0;
            isPaused = true;
            setDefaultIcon(); // Set default icon on reset
        }
    } catch (error) {
        console.error("Error loading timer state:", error);
        timeLeft = userSettings.workTime * 60;
        currentMode = 'work';
        pomodoroCount = 0;
        isPaused = true;
        setDefaultIcon(); // Set default icon on error
    }
}

async function saveTimerState() {
    const timerState = { currentMode, timeLeft, pomodoroCount, isPaused };
    try {
        await chrome.storage.sync.set({ timerState });
    } catch (error) {
        console.error("Error saving timer state:", error);
    }
}

function startTimerInterval() {
    console.log("Starting timer interval, isPaused:", isPaused);
    if (isPaused && !timerIntervalId) {
        isPaused = false;
        timerIntervalId = setInterval(updateTimerState, 1000);
        saveTimerState();
        sendTimerUpdate();
        // Open side panel if supported, otherwise trigger notification
        if (typeof chrome.sidePanel?.setOptions === 'function') {
            chrome.sidePanel.setOptions({ path: 'side_panel.html', enabled: true });
            chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT }).catch((error) => {
                console.error("Failed to open side panel on session start:", error);
                showSessionNotification();
            });
        } else {
            console.warn("Side Panel API not supported");
            showSessionNotification();
        }
        updateIcon(timeLeft); // Switch to timer icon when session starts
    } else if (!isPaused) {
        console.warn("Timer already running, ignoring start request");
    }
}

function showSessionNotification() {
    chrome.windows.getAll({ populate: false, windowTypes: ['normal'] }, (windows) => {
        if (chrome.runtime.lastError) {
            console.error("Error checking windows:", chrome.runtime.lastError);
            triggerNotification();
        } else if (windows.length > 0) {
            pendingPopup = true; // Set flag to attempt popup when window is detected
            console.log("Window detected, setting up popup on next window creation");
        } else {
            triggerNotification();
        }
    });
}

function triggerNotification() {
    const notificationId = 'sessionStart_' + Date.now();
    chrome.notifications.create(notificationId, {
        type: 'basic',
        iconUrl: 'assets/images/pomordoro.png',
        title: 'Session Started',
        message: 'The timer has started. Check the extension icon for details.',
        priority: 2
    }).catch(e => console.error("Failed to create session notification:", e));
}

chrome.windows.onCreated.addListener(() => {
    if (pendingPopup) {
        chrome.action.openPopup().then(() => {
            console.log("Popup opened after window creation");
            pendingPopup = false;
        }).catch((error) => {
            console.error("Failed to open popup after window creation:", error);
            showSessionNotification(); // Fallback to notification
        });
    }
});

function pauseTimer() {
    if (isPaused) return;
    clearInterval(timerIntervalId);
    timerIntervalId = null;
    isPaused = true;
    saveTimerState();
    sendTimerUpdate();
    setDefaultIcon(); // Reset to default icon when paused
}

function resetTimer(save = true) {
    clearInterval(timerIntervalId);
    timerIntervalId = null;
    isPaused = true;
    currentMode = 'work';
    timeLeft = userSettings.workTime * 60;
    pomodoroCount = 0;
    if (save) saveTimerState();
    sendTimerUpdate();
    setDefaultIcon(); // Reset to default icon on reset
}

function skipBreak() {
    if (currentMode !== 'work') {
        clearInterval(timerIntervalId);
        timerIntervalId = null;
        isPaused = true;
        currentMode = 'work';
        timeLeft = userSettings.workTime * 60;
        saveTimerState();
        sendTimerUpdate();
        setDefaultIcon(); // Reset to default icon on skip
    }
}

chrome.notifications.onClicked.addListener((notificationId) => {
    console.log("Notification clicked, opening popup for ID:", notificationId);
    chrome.action.openPopup();
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    (async () => {
        try {
            console.log("Received message:", request.action);
            switch (request.action) {
                case 'start':
                    offscreenReady = false;
                    await createOffscreenDocument();
                    if (offscreenDocumentId) {
                        chrome.runtime.sendMessage({
                            action: 'preloadAudio',
                            workUrl: chrome.runtime.getURL('assets/sounds/apple-bite-chew-40.mp3'),
                            breakUrl: chrome.runtime.getURL('assets/sounds/rooster-crowing.mp3'),
                            volume: userSettings.soundVolume || 1.0
                        }).catch(e => console.error("Failed to send preloadAudio message:", e));
                    }
                    startTimerInterval();
                    sendResponse({});
                    break;
                case 'pause':
                    pauseTimer();
                    sendResponse({});
                    break;
                case 'reset':
                    resetTimer();
                    sendResponse({});
                    break;
                case 'skipBreak':
                    skipBreak();
                    sendResponse({});
                    break;
                case 'getTimerState':
                    sendResponse({
                        timeLeft,
                        pomodoroCount,
                        isPaused,
                        mode: currentMode === 'work' ? 'work' : 'break'
                    });
                    break;
                case 'getSettings':
                    sendResponse(userSettings);
                    break;
                case 'saveSettings':
                    await saveSettings(request.settings);
                    sendResponse({});
                    break;
                case 'themeChanged':
                    updateIcon(timeLeft); // Update icon on theme change if running
                    sendResponse({});
                    break;
                case 'playSoundNotification':
                    sendResponse({});
                    break;
                default:
                    console.warn("Unknown message action:", request.action);
                    sendResponse({ error: "Unknown action" });
            }
        } catch (e) {
            console.error("Error handling message:", e);
            sendResponse({ error: e.message });
        }
    })();
    return true;
});

chrome.runtime.onInstalled.addListener(async () => {
    console.log("Pom-or-doro installed or updated!");
    await loadSettings();
    await loadTimerState();
    sendTimerUpdate();
});

console.log("Service worker started at:", new Date().toISOString());

(async () => {
    await loadSettings();
    await loadTimerState();
    sendTimerUpdate();
})();

chrome.runtime.onConnect.addListener((port) => {
    console.log('Connected:', port.name, 'at', new Date().toISOString());
    port.onMessage.addListener((msg) => {
        console.log('Message from popup:', msg.action, 'at', new Date().toISOString());
        if (msg.action === 'ping') {
            port.postMessage({ action: 'pong', timestamp: Date.now() });
        }
    });
    port.onDisconnect.addListener(() => console.log('Disconnected:', port.name, 'at', new Date().toISOString()));
});

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.settings) {
        userSettings = { ...userSettings, ...changes.settings.newValue };
        const timeKey = currentMode === 'work' ? 'workTime' : currentMode === 'short-break' ? 'shortBreakTime' : 'longBreakTime';
        if (changes.settings.newValue.theme !== undefined) {
            if (isPaused) {
                setDefaultIcon(); // Set default icon on theme change if paused
            } else {
                updateIcon(timeLeft); // Update timer icon if running
            }
        } else if (changes.settings.newValue[timeKey] !== undefined && isPaused) {
            timeLeft = userSettings[timeKey] * 60;
            setDefaultIcon(); // Set default icon on time settings change if paused
            sendTimerUpdate();
        }
    }
});

chrome.action.onClicked.addListener(() => {
    if (typeof chrome.sidePanel?.setOptions === 'function') {
        chrome.sidePanel.setOptions({
            path: 'side_panel.html',
            enabled: true
        });
        chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT }).catch((error) => {
            console.error("Failed to open side panel:", error);
            showSessionNotification();
        });
    } else {
        showSessionNotification();
    }
});