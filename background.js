// This script runs in the background and manages the timer state.
// It uses Chrome's storage API to persist settings and notifications API for alerts.

const DEFAULT_WORK_TIME = 25 * 60; // 25 minutes in seconds
const DEFAULT_SHORT_BREAK = 5 * 60;  // 5 minutes in seconds
const DEFAULT_LONG_BREAK = 15 * 60; // 15 minutes in seconds
const DEFAULT_POMODORO_COUNT_FOR_LONG_BREAK = 4;

let timer = null; // Will store the setInterval ID or alarm ID
let currentMode = 'work'; // 'work', 'short-break', 'long-break'
let timeLeft = DEFAULT_WORK_TIME;
let pomodoroCount = 0;
let isPaused = true;
let userSettings = {}; // To store loaded settings

// --- Utility Functions ---
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

// --- Timer Logic ---
async function updateTimerState() {
    if (!isPaused && timeLeft > 0) {
        timeLeft--;
    } else if (timeLeft <= 0) {
        // Session ended
        await handleSessionEnd();
    }
    // Send state to popup
    chrome.runtime.sendMessage({
        action: 'timerUpdate',
        timeLeft: timeLeft,
        currentMode: currentMode,
        pomodoroCount: pomodoroCount,
        isPaused: isPaused
    });
}

async function handleSessionEnd() {
    clearInterval(timer); // Stop the interval

    let notificationTitle = '';
    let notificationMessage = '';
    let nextMode = '';
    let newTime = 0;

    if (currentMode === 'work') {
        pomodoroCount++;
        notificationTitle = 'Work session complete!';
        notificationMessage = 'Time for a break!';

        if (pomodoroCount % userSettings.pomodoroCountForLongBreak === 0) {
            nextMode = 'long-break';
            newTime = userSettings.longBreakTime;
        } else {
            nextMode = 'short-break';
            newTime = userSettings.shortBreakTime;
        }
    } else { // It was a break
        notificationTitle = 'Break over!';
        notificationMessage = 'Back to work!';
        nextMode = 'work';
        newTime = userSettings.workTime;
    }

    currentMode = nextMode;
    timeLeft = newTime;
    isPaused = true; // Pause after session end, waiting for user to start next

    // Play sound
    playSoundNotification(currentMode);

    // Show notification
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'assets/images/extension.png',
        title: notificationTitle,
        message: notificationMessage,
        priority: 2
    });

    // Save updated state
    await saveTimerState();
    // Send final update to popup to reflect new mode and time
    chrome.runtime.sendMessage({
        action: 'timerUpdate',
        timeLeft: timeLeft,
        currentMode: currentMode,
        pomodoroCount: pomodoroCount,
        isPaused: isPaused
    });
}

async function playSoundNotification(mode) {
    // Use userSettings.selectedSound and userSettings.soundVolume
    const soundPath = userSettings.selectedSound === 'amharic' ? 'assets/sounds/notification_amharic.mp3' : 'assets/sounds/notification_standard.mp3';
    const audio = new Audio(chrome.runtime.getURL(soundPath));
    audio.volume = userSettings.soundVolume || 1.0;
    await audio.play().catch(e => console.error("Error playing audio:", e));
}

// --- State Management (using chrome.storage.local) ---
async function loadSettings() {
    const data = await chrome.storage.local.get(['settings']);
    userSettings = data.settings || {
        workTime: DEFAULT_WORK_TIME,
        shortBreakTime: DEFAULT_SHORT_BREAK,
        longBreakTime: DEFAULT_LONG_BREAK,
        pomodoroCountForLongBreak: DEFAULT_POMODORO_COUNT_FOR_LONG_BREAK,
        selectedSound: 'standard', // 'standard' or 'amharic'
        soundVolume: 1.0, // 0.0 to 1.0
        theme: 'light', // 'light', 'dark', 'ocean', 'forest'
        language: 'en' // 'en', 'am'
    };
    // Set initial time based on current mode after loading settings
    if (currentMode === 'work') {
        timeLeft = userSettings.workTime;
    } else if (currentMode === 'short-break') {
        timeLeft = userSettings.shortBreakTime;
    } else { // long-break
        timeLeft = userSettings.longBreakTime;
    }
    await loadTimerState(); // Load any previously saved timer state
}

async function saveSettings(newSettings) {
    userSettings = { ...userSettings, ...newSettings };
    await chrome.storage.local.set({ settings: userSettings });
    console.log("Settings saved:", userSettings);

    // If durations changed while timer is paused and at start of a mode, update timeLeft
    if (isPaused) {
        const timeBasedOnMode = userSettings[currentMode + 'Time'];
        if (timeLeft === timeBasedOnMode || timeLeft === 0) {
            timeLeft = timeBasedOnMode;
            chrome.runtime.sendMessage({
                action: 'timerUpdate',
                timeLeft: timeLeft,
                currentMode: currentMode,
                pomodoroCount: pomodoroCount,
                isPaused: isPaused
            });
        }
    }
}

async function loadTimerState() {
    const data = await chrome.storage.local.get(['timerState']);
    if (data.timerState) {
        currentMode = data.timerState.currentMode;
        timeLeft = data.timerState.timeLeft;
        pomodoroCount = data.timerState.pomodoroCount;
        isPaused = data.timerState.isPaused;

        // If timer was running, restart interval
        if (!isPaused) {
            startTimerInterval();
        }
    }
}

async function saveTimerState() {
    const timerState = {
        currentMode: currentMode,
        timeLeft: timeLeft,
        pomodoroCount: pomodoroCount,
        isPaused: isPaused
    };
    await chrome.storage.local.set({ timerState: timerState });
}

// --- Timer Controls ---
function startTimerInterval() {
    if (timer) clearInterval(timer); // Clear existing if any
    isPaused = false;
    timer = setInterval(updateTimerState, 1000); // Update every second
    saveTimerState(); // Update saved state
}

function pauseTimer() {
    clearInterval(timer);
    isPaused = true;
    saveTimerState(); // Update saved state
}

function resetTimer() {
    clearInterval(timer);
    isPaused = true;
    currentMode = 'work';
    timeLeft = userSettings.workTime; // Reset to user's configured work time
    pomodoroCount = 0;
    saveTimerState(); // Update saved state
    chrome.runtime.sendMessage({
        action: 'timerUpdate',
        timeLeft: timeLeft,
        currentMode: currentMode,
        pomodoroCount: pomodoroCount,
        isPaused: isPaused
    });
}

function skipBreak() {
    if (currentMode !== 'work') {
        clearInterval(timer);
        isPaused = true;
        currentMode = 'work';
        timeLeft = userSettings.workTime;
        saveTimerState();
        chrome.runtime.sendMessage({
            action: 'timerUpdate',
            timeLeft: timeLeft,
            currentMode: currentMode,
            pomodoroCount: pomodoroCount,
            isPaused: isPaused
        });
    }
}

// --- Message Listeners ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'start':
            startTimerInterval();
            break;
        case 'pause':
            pauseTimer();
            break;
        case 'reset':
            resetTimer();
            break;
        case 'skipBreak':
            skipBreak();
            break;
        case 'getTimerState':
            sendResponse({
                timeLeft: timeLeft,
                currentMode: currentMode,
                pomodoroCount: pomodoroCount,
                isPaused: isPaused
            });
            break;
        case 'getSettings':
            sendResponse(userSettings);
            break;
        case 'saveSettings':
            saveSettings(request.settings);
            break;
    }
});

// --- Initial Load ---
chrome.runtime.onInstalled.addListener(() => {
    loadSettings();
    console.log("Pom-or-doro installed or updated!");
});

// Load settings when the service worker starts up
loadSettings();