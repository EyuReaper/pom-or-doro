const timerDisplay = document.getElementById('timerDisplay');
const progressBar = document.getElementById('progressBar');
const modeDisplay = document.getElementById('modeDisplay');
const sessionInfo = document.getElementById('sessionInfo');
const promptContainer = document.getElementById('promptContainer');
const continueBtn = document.getElementById('continueBtn');
const endBtn = document.getElementById('endBtn');
const liveRegion = document.getElementById('liveRegion');

let maxTime = 0; // To calculate progress percentage
let settings = { theme: 'light', language: 'en' }; // Default settings

// Apply theme to body and promptContainer
function applyTheme(theme) {
    document.body.className = `theme-${theme}`;
    promptContainer.className = `theme-${theme}`;
}

// Apply language to elements with data-amharic/data-english
function applyLanguage(lang) {
    document.documentElement.setAttribute('data-lang', lang);
    [document.querySelector('title'), modeDisplay, sessionInfo, promptContainer.querySelector('#promptMessage'), continueBtn, endBtn].forEach(el => {
        if (el) {
            const englishText = el.dataset.english || el.textContent.trim();
            const amharicText = el.dataset.amharic;
            el.textContent = lang === 'am' ? amharicText : englishText;
            el.setAttribute('lang', lang);
        }
    });
}

// Update display from background messages with accessibility
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'timerUpdate') {
        const timeStr = `${Math.floor(msg.timeLeft / 60).toString().padStart(2, '0')}:${(msg.timeLeft % 60).toString().padStart(2, '0')}`;
        timerDisplay.textContent = timeStr;
        modeDisplay.textContent = msg.mode.charAt(0).toUpperCase() + msg.mode.slice(1) + " Mode";
        sessionInfo.textContent = `Session: ${msg.pomodoroCount + 1}`;
        if (maxTime === 0) maxTime = msg.timeLeft + 1; // Set initial max for progress
        const progress = (msg.timeLeft / maxTime) * 100;
        progressBar.value = progress;
        promptContainer.style.display = 'none'; // Hide prompt during session
        liveRegion.textContent = `${modeDisplay.textContent}: ${timeStr}`; // Accessibility update
    } else if (msg.action === 'settingsUpdate') {
        settings = { ...settings, ...msg.settings };
        applyTheme(settings.theme);
        applyLanguage(settings.language);
    }
    sendResponse();
});

// Fetch initial state and settings
chrome.runtime.sendMessage({ action: 'getTimerState' }, (response) => {
    if (chrome.runtime.lastError) {
        console.error('Failed to get timer state:', chrome.runtime.lastError.message);
    } else if (response && typeof response === 'object') {
        const timeStr = `${Math.floor(response.timeLeft / 60).toString().padStart(2, '0')}:${(response.timeLeft % 60).toString().padStart(2, '0')}`;
        timerDisplay.textContent = timeStr;
        modeDisplay.textContent = response.mode.charAt(0).toUpperCase() + response.mode.slice(1) + " Mode";
        sessionInfo.textContent = `Session: ${response.pomodoroCount + 1}`;
        maxTime = response.timeLeft + 1;
        progressBar.value = 100;
        liveRegion.textContent = `${modeDisplay.textContent}: ${timeStr}`;
    }
});

chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
    if (response && typeof response === 'object') {
        settings = { ...settings, ...response };
        applyTheme(settings.theme);
        applyLanguage(settings.language);
    }
});

// Handle session end prompt (from background)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'sessionEnded') {
        promptContainer.style.display = 'block';
        promptContainer.setAttribute('aria-hidden', 'false');
        timerDisplay.textContent = '00:00';
        progressBar.value = 0;
        liveRegion.textContent = promptContainer.querySelector('#promptMessage').textContent;
    }
});

// Button actions with focus trapping
continueBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'continueSession' }, (response) => {
        if (chrome.runtime.lastError) console.error('Failed to continue session:', chrome.runtime.lastError.message);
    });
    promptContainer.style.display = 'none';
    promptContainer.setAttribute('aria-hidden', 'true');
});

endBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'endSession' }, (response) => {
        if (chrome.runtime.lastError) console.error('Failed to end session:', chrome.runtime.lastError.message);
    });
    promptContainer.style.display = 'none';
    promptContainer.setAttribute('aria-hidden', 'true');
});

// Trap focus in promptContainer when visible
function trapFocus() {
    if (promptContainer.style.display === 'block') {
        const focusableElements = promptContainer.querySelectorAll('button');
        if (focusableElements.length > 0) {
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            promptContainer.addEventListener('keydown', function handler(e) {
                if (e.key === 'Tab') {
                    if (e.shiftKey && document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    } else if (!e.shiftKey && document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
                if (e.key === 'Escape') {
                    e.preventDefault();
                    promptContainer.style.display = 'none';
                    promptContainer.setAttribute('aria-hidden', 'true');
                    promptContainer.removeEventListener('keydown', handler);
                }
            });
            firstElement.focus();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    chrome.runtime.sendMessage({ action: 'pingOffscreen' }, (response) => {
        if (chrome.runtime.lastError || !response?.ready) {
            console.error('Offscreen document not ready:', chrome.runtime.lastError?.message);
        }
    });
    if (promptContainer.style.display === 'block') trapFocus();
});