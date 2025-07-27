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

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

function sendTimerUpdate() {
    const displayMode = currentMode === 'work' ? 'work' : 'break'; // Map for popup.js
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

async function playSoundNotification() {
    const validSounds = ['standard', 'amharic'];
    const sound = validSounds.includes(userSettings.selectedSound) ? userSettings.selectedSound : 'standard';
    const soundPath = `assets/sounds/notification_${sound}.mp3`;

    try {
        const audio = new Audio(chrome.runtime.getURL(soundPath));
        audio.volume = Math.max(0, Math.min(1, userSettings.soundVolume || 1.0));
        await audio.play();
    } catch (e) {
        console.error("Error playing audio:", e);
    }
}

async function updateTimerState() {
    if (timeLeft > 0) {
        timeLeft--;
    }

    if (timeLeft <= 0) {
        clearInterval(timerIntervalId);
        timerIntervalId = null;
        await handleSessionEnd();
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
        notificationTitle = 'Work session complete!';
        notificationMessage = 'Time for a break!';
        nextMode = pomodoroCount % userSettings.pomodoroCountForLongBreak === 0 ? 'long-break' : 'short-break';
        newTime = nextMode === 'long-break' ? userSettings.longBreakTime : userSettings.shortBreakTime;
    } else {
        notificationTitle = 'Break over!';
        notificationMessage = 'Back to work!';
        nextMode = 'work';
        newTime = userSettings.workTime;
    }

    currentMode = nextMode;
    timeLeft = newTime * 60;
    isPaused = true;

    await playSoundNotification();

    try {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'assets/images/extension_128.png',
            title: notificationTitle,
            message: notificationMessage,
            priority: 2
        });
    } catch (e) {
        console.error("Error creating notification:", e);
    }

    await saveTimerState();
}

async function loadSettings() {
    try {
        const { settings } = await chrome.storage.sync.get(['settings']);
        userSettings = {
            workTime: Number.isInteger(settings?.workTime) && settings.workTime > 0 ? settings.workTime : DEFAULT_WORK_TIME,
            shortBreakTime: Number.isInteger(settings?.shortBreakTime) && settings.shortBreakTime > 0 ? settings.shortBreakTime : DEFAULT_SHORT_BREAK,
            longBreakTime: Number.isInteger(settings?.longBreakTime) && settings.longBreakTime > 0 ? settings.longBreakTime : DEFAULT_LONG_BREAK,
            pomodoroCountForLongBreak: Number.isInteger(settings?.pomodoroCountForLongBreak) && settings.pomodoroCountForLongBreak > 0 ? settings.pomodoroCountForLongBreak : DEFAULT_POMODORO_COUNT_FOR_LONG_BREAK,
            selectedSound: ['standard', 'amharic'].includes(settings?.selectedSound) ? settings.selectedSound : 'standard',
            soundVolume: typeof settings?.soundVolume === 'number' && settings.soundVolume >= 0 && settings.soundVolume <= 1 ? settings.soundVolume : 1.0,
            theme: ['light', 'dark', 'ocean', 'forest', 'ethiopian'].includes(settings?.theme) ? settings.theme : 'light',
            language: ['en', 'am'].includes(settings?.language) ? settings.language : 'en'
        };
        console.log("Settings loaded:", userSettings);
        if (timeLeft === null) {
            timeLeft = userSettings.workTime * 60; // Initialize timeLeft
        }
    } catch (error) {
        console.error("Error loading settings:", error);
        userSettings = {
            workTime: DEFAULT_WORK_TIME,
            shortBreakTime: DEFAULT_SHORT_BREAK,
            longBreakTime: DEFAULT_LONG_BREAK,
            pomodoroCountForLongBreak: DEFAULT_POMODORO_COUNT_FOR_LONG_BREAK,
            selectedSound: 'standard',
            soundVolume: 1.0,
            theme: 'light',
            language: 'en'
        };
        timeLeft = userSettings.workTime * 60;
    }
}

async function saveSettings(newSettings) {
    try {
        userSettings = { ...userSettings, ...newSettings };
        await chrome.storage.sync.set({ settings: userSettings });
        console.log("Settings saved:", userSettings);

        if (isPaused) {
            const timeKey = currentMode === 'work' ? 'workTime' : currentMode === 'short-break' ? 'shortBreakTime' : 'longBreakTime';
            if (newSettings[timeKey] !== undefined) {
                timeLeft = userSettings[timeKey] * 60;
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
            console.log("Timer state loaded:", timerState);
            if (!isPaused) {
                startTimerInterval();
            }
        } else {
            console.log("No valid timer state found, initializing defaults");
            timeLeft = userSettings.workTime * 60;
            currentMode = 'work';
            pomodoroCount = 0;
            isPaused = true;
        }
    } catch (error) {
        console.error("Error loading timer state:", error);
        timeLeft = userSettings.workTime * 60;
        currentMode = 'work';
        pomodoroCount = 0;
        isPaused = true;
    }
}

async function saveTimerState() {
    const timerState = { currentMode, timeLeft, pomodoroCount, isPaused };
    try {
        await chrome.storage.sync.set({ timerState });
        console.log("Timer state saved:", timerState);
    } catch (error) {
        console.error("Error saving timer state:", error);
    }
}

function startTimerInterval() {
    if (!isPaused && timerIntervalId !== null) {
        return;
    }
    isPaused = false;
    if (timerIntervalId) {
        clearInterval(timerIntervalId);
    }
    timerIntervalId = setInterval(updateTimerState, 1000);
    saveTimerState();
    sendTimerUpdate();
}

function pauseTimer() {
    if (isPaused) return;
    clearInterval(timerIntervalId);
    timerIntervalId = null;
    isPaused = true;
    saveTimerState();
    sendTimerUpdate();
}

function resetTimer(save = true) {
    clearInterval(timerIntervalId);
    timerIntervalId = null;
    isPaused = true;
    currentMode = 'work';
    timeLeft = userSettings.workTime * 60;
    pomodoroCount = 0;
    if (save) {
        saveTimerState();
    }
    sendTimerUpdate();
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
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    (async () => {
        try {
            switch (request.action) {
                case 'start':
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
                default:
                    console.warn("Unknown message action:", request.action);
                    sendResponse({ error: "Unknown action" });
            }
        } catch (e) {
            console.error("Error handling message:", e);
            sendResponse({ error: e.message });
        }
    })();
    return true; // Keep message channel open for async responses
});

chrome.runtime.onInstalled.addListener(async () => {
    console.log("Pom-or-doro installed or updated!");
    await loadSettings();
    await loadTimerState();
    sendTimerUpdate();
});

(async () => {
    await loadSettings();
    await loadTimerState();
    sendTimerUpdate();
})();

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.settings) {
        userSettings = { ...userSettings, ...changes.settings.newValue };
        console.log("Settings updated via storage change:", userSettings);
        if (isPaused) {
            timeLeft = userSettings[currentMode === 'work' ? 'workTime' : currentMode === 'short-break' ? 'shortBreakTime' : 'longBreakTime'] * 60;
            sendTimerUpdate();
        }
    }
});