const DEFAULT_SETTINGS = {
    workTime: 25,
    shortBreakTime: 5,
    longBreakTime: 15,
    pomodoroCountForLongBreak: 4,
    soundVolume: 1.0,
    theme: 'light',
    language: 'en'
};
let settings = { ...DEFAULT_SETTINGS }; // Global settings variable
let isPaused = true;
let wasStarted = false;

// Persistent aria-live region
const liveRegion = document.createElement('div');
liveRegion.setAttribute('aria-live', 'assertive');
liveRegion.setAttribute('style', 'position: absolute; left: -9999px;');
document.body.appendChild(liveRegion);

// DOM Selectors
const selectors = {
    timerDisplay: document.getElementById('timer-display'),
    sessionType: document.getElementById('session-type'),
    startBtn: document.getElementById('start-btn'),
    pauseBtn: document.getElementById('pause-btn'),
    resetBtn: document.getElementById('reset-btn'),
    sessionInfo: document.getElementById('session-info'),
    themeSelect: document.getElementById('theme-select'),
    languageSelect: document.getElementById('language-select'),
    aboutBtn: document.getElementById('about-btn'),
    aboutModal: document.getElementById('about-modal'),
    closeAbout: document.getElementById('close-about'),
    settingsLink: document.getElementById('settings-link'),
    statusMsg: document.getElementById('statusMsg')
};

// Validate DOM elements
const missingElements = Object.entries(selectors)
    .filter(([key, value]) => !value)
    .map(([key]) => key);
if (missingElements.length > 0) {
    console.error(`Missing DOM elements: ${missingElements.join(', ')}`);
}

const amharicNumerals = {
    0: '00', 1: '፩', 2: '፪', 3: '፫', 4: '፬', 5: '፭', 6: '፮', 7: '፯', 8: '፰', 9: '፱',
    10: '፲', 11: '፲፩', 12: '፲፪', 13: '፲፫', 14: '፲፬', 15: '፲፭', 16: '፲፮', 17: '፲፯', 18: '፲፰', 19: '፲፱',
    20: '፳', 21: '፳፩', 22: '፳፪', 23: '፳፫', 24: '፳፬', 25: '፳፭', 26: '፳፮', 27: '፳፯', 28: '፳፰', 29: '፳፱',
    30: '፴', 31: '፴፩', 32: '፴፪', 33: '፴፫', 34: '፴፬', 35: '፴፭', 36: '፴፮', 37: '፴፯', 38: '፴፰', 39: '፴፱',
    40: '፵', 41: '፵፩', 42: '፵፪', 43: '፵፫', 44: '፵፬', 45: '፵፭', 46: '፵፮', 47: '፵፯', 48: '፵፰', 49: '፵፱',
    50: '፶', 51: '፶፩', 52: '፶፪', 53: '፶፫', 54: '፶፬', 55: '፶፭', 56: '፶፮', 57: '፶፯', 58: '፶፰', 59: '፶፱'
};

function toAmharicNumerals(number) {
    if (number < 0 || number > 59) {
        console.warn(`Number ${number} out of range (0-59) for Amharic numerals, using default format`);
        return String(number).padStart(2, '0');
    }
    return amharicNumerals[number] || String(number).padStart(2, '0');
}

function ariaLiveUpdate(timeStr, mode, lang) {
    const modeText = lang === 'am' ? (mode === 'work' ? 'ፖም' : 'ዶሮ') : mode.charAt(0).toUpperCase() + mode.slice(1);
    liveRegion.textContent = `${modeText}: ${timeStr}`;
}

function updateDisplay({ timeLeft, pomodoroCount, isPaused: pausedState, mode }) {
    const { timerDisplay, sessionInfo, sessionType, startBtn, pauseBtn, statusMsg } = selectors;
    if (!timerDisplay || !sessionInfo || !sessionType || !startBtn || !pauseBtn || !statusMsg) return;
    isPaused = pausedState;
    const lang = settings.language;
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const minStr = lang === 'am' ? toAmharicNumerals(minutes) : String(minutes).padStart(2, '0');
    const secStr = lang === 'am' ? toAmharicNumerals(seconds) : String(seconds).padStart(2, '0');
    const timeStr = `${minStr}:${secStr}`;
    timerDisplay.textContent = timeStr;
    sessionInfo.textContent = lang === 'am' ? `ክፍለ-ጊዜ: ${toAmharicNumerals(pomodoroCount + 1)}` : `Session: ${pomodoroCount + 1}`;
    sessionType.textContent = lang === 'am' ? (mode === 'work' ? 'ፖም' : 'ዶሮ') : mode.charAt(0).toUpperCase() + mode.slice(1);
    ariaLiveUpdate(timeStr, mode, lang);
    startBtn.disabled = !isPaused;
    pauseBtn.disabled = isPaused;
    startBtn.textContent = isPaused && wasStarted ? (lang === 'am' ? 'ቀጥል' : 'Resume') : (lang === 'am' ? 'ጀምር' : 'Start');
    startBtn.setAttribute('aria-label', startBtn.textContent);
    pauseBtn.setAttribute('aria-label', lang === 'am' ? 'አቁም' : 'Pause');
    timerDisplay.classList.toggle('work-mode', mode === 'work');
    timerDisplay.classList.toggle('break-mode', mode === 'break');
    if (isPaused && !wasStarted) {
        statusMsg.textContent = lang === 'am' ? 'ጊዜ ቆጣሪ ዝግጁ ' : 'Timer ready';
    } else if (isPaused && wasStarted) {
        statusMsg.textContent = lang === 'am' ? 'ጊዜ ቆጣሪ ቆሟል' : 'Timer paused';
    } else {
        statusMsg.classList.remove('show');
    }
    if (isPaused) {
        statusMsg.classList.add('show');
    }
}

function resetTimerDisplay() {
    const { timerDisplay, sessionInfo, sessionType, startBtn, pauseBtn, statusMsg } = selectors;
    if (!timerDisplay || !sessionInfo || !sessionType || !startBtn || !pauseBtn || !statusMsg) return;
    const lang = settings.language;
    const minStr = lang === 'am' ? toAmharicNumerals(settings.workTime) : String(settings.workTime).padStart(2, '0');
    const secStr = lang === 'am' ? toAmharicNumerals(0) : '00';
    timerDisplay.textContent = `${minStr}:${secStr}`;
    timerDisplay.classList.remove('break-mode');
    timerDisplay.classList.add('work-mode');
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    sessionInfo.textContent = lang === 'am' ? 'ክፍለ-ጊዜ: ፩' : 'Session: 1';
    sessionType.textContent = lang === 'am' ? 'ፖም' : 'Work';
    startBtn.textContent = lang === 'am' ? 'ጀምር' : 'Start';
    startBtn.setAttribute('aria-label', startBtn.textContent);
    ariaLiveUpdate(`${minStr}:${secStr}`, 'work', lang);
    statusMsg.textContent = lang === 'am' ? 'የጊዜ መጠን ዝግጁ ነው' : 'Timer ready';
    statusMsg.classList.add('show');
    wasStarted = false;
}

function applyTheme(theme) {
    if (!selectors.themeSelect) return;
    document.body.className = `theme-${theme}`;
    selectors.themeSelect.value = theme;
    if (selectors.aboutModal && selectors.aboutModal.getAttribute('aria-hidden') === 'false') {
        selectors.aboutModal.classList.remove('theme-light', 'theme-dark', 'theme-waillord', 'theme-ivy', 'theme-ethiopian');
        selectors.aboutModal.classList.add(`theme-${theme}`);
    }
}

function applyLanguage(lang) {
    document.documentElement.setAttribute('data-lang', lang);
    document.querySelectorAll('[data-amharic]').forEach(el => {
        const englishText = el.dataset.english || el.textContent.trim();
        const amharicText = el.dataset.amharic;
        el.textContent = lang === 'am' ? amharicText : englishText;
        el.setAttribute('lang', lang);
    });
    document.querySelectorAll('option[data-amharic]').forEach(opt => {
        opt.textContent = lang === 'am' ? opt.dataset.amharic : opt.dataset.english || opt.textContent;
        opt.setAttribute('lang', lang);
    });
    const title = document.querySelector('title');
    if (title) {
        title.textContent = lang === 'am' ? title.dataset.amharic : title.dataset.english || title.textContent;
    }
    if (isPaused) resetTimerDisplay();
    else chrome.runtime.sendMessage({ action: 'getTimerState' }, (response) => {
        if (chrome.runtime.lastError) {
            console.error('Failed to get timer state:', chrome.runtime.lastError.message);
            resetTimerDisplay();
        } else if (response && typeof response === 'object') {
            updateDisplay(response);
        } else {
            resetTimerDisplay();
        }
    });
}

chrome.storage.sync.get(DEFAULT_SETTINGS, (data) => {
    if (chrome.runtime.lastError) {
        console.error('Failed to load settings:', chrome.runtime.lastError.message);
        return;
    }
    settings = { ...DEFAULT_SETTINGS, ...data };
    applyTheme(settings.theme);
    applyLanguage(settings.language);
    if (isPaused) resetTimerDisplay();
});

chrome.runtime.sendMessage({ action: 'getTimerState' }, (response) => {
    if (chrome.runtime.lastError) {
        console.error('Failed to get timer state:', chrome.runtime.lastError.message);
        resetTimerDisplay();
    } else if (response && typeof response === 'object') {
        updateDisplay(response);
    } else {
        resetTimerDisplay();
    }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'timerUpdate') {
        console.log('Received timer update:', msg);
        updateDisplay(msg);
    }
    // [CHANGED] Remove playSoundNotification handler as background handles it
    sendResponse();
});

if (selectors.startBtn) {
    selectors.startBtn.addEventListener('click', () => {
        wasStarted = true;
        console.log("Sending start message to background");
        chrome.runtime.sendMessage({ action: 'start' }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Failed to start timer:', chrome.runtime.lastError.message);
                // Retry once if connection fails
                if (chrome.runtime.lastError.message.includes("Receiving end does not exist")) {
                    console.log("Retrying start message...");
                    chrome.runtime.sendMessage({ action: 'start' }, (retryResponse) => {
                        if (chrome.runtime.lastError) {
                            console.error('Retry failed:', chrome.runtime.lastError.message);
                        } else {
                            console.log('Retry successful');
                        }
                    });
                }
            } else {
                console.log('Start message sent successfully');
            }
        });
        // Force service worker activation with persistent connection
        const port = chrome.runtime.connect({ name: 'activateWorker' });
        port.postMessage({ action: 'ping' });
        port.onMessage.addListener((msg) => {
            if (msg.action === 'pong') {
                console.log('Service worker responded:', msg);
            }
        });
        port.onDisconnect.addListener(() => {
            console.log('Service worker disconnected');
            setTimeout(() => {
                const newPort = chrome.runtime.connect({ name: 'activateWorker' });
                newPort.postMessage({ action: 'ping' });
                newPort.onMessage.addListener((msg) => {
                    if (msg.action === 'pong') console.log('Reconnected service worker responded:', msg);
                });
            }, 1000);
        });
    });
}

if (selectors.pauseBtn) {
    selectors.pauseBtn.addEventListener('click', () => {
        wasStarted = true;
        chrome.runtime.sendMessage({ action: 'pause' }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Failed to pause timer:', chrome.runtime.lastError.message);
            }
        });
    });
}

if (selectors.resetBtn) {
    selectors.resetBtn.addEventListener('click', () => {
        wasStarted = false;
        chrome.runtime.sendMessage({ action: 'reset' }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Failed to reset timer:', chrome.runtime.lastError.message);
            }
            resetTimerDisplay();
        });
    });
}

if (selectors.themeSelect) {
    selectors.themeSelect.addEventListener('change', () => {
        const theme = selectors.themeSelect.value;
        applyTheme(theme);
        settings.theme = theme;
        chrome.storage.sync.set({ theme });
    });
}

if (selectors.languageSelect) {
    selectors.languageSelect.addEventListener('change', () => {
        const language = selectors.languageSelect.value;
        applyLanguage(language);
        settings.language = language;
        chrome.storage.sync.set({ language });
    });
}

if (selectors.settingsLink) {
    selectors.settingsLink.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.runtime.openOptionsPage();
    });
}

chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    if (changes.settings) {
        settings = { ...settings, ...changes.settings.newValue };
        applyTheme(settings.theme);
        applyLanguage(settings.language);
        if (isPaused) resetTimerDisplay();
    }
});

function toggleModal(show) {
    const { aboutModal, aboutBtn, closeAbout } = selectors;
    if (!aboutModal || !aboutBtn || !closeAbout) return;
    aboutModal.setAttribute('aria-hidden', show ? 'false' : 'true');
    if (show) {
        trapFocus(aboutModal);
        closeAbout.focus();
        aboutModal.classList.add(`theme-${settings.theme}`);
    } else {
        aboutBtn.focus();
        aboutModal.classList.remove('theme-light', 'theme-dark', 'theme-waillord', 'theme-ivy', 'theme-ethiopian');
    }
}

if (selectors.aboutBtn) {
    selectors.aboutBtn.addEventListener('click', () => toggleModal(true));
}

if (selectors.closeAbout) {
    selectors.closeAbout.addEventListener('click', () => toggleModal(false));
    selectors.closeAbout.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === 'Space') {
            e.preventDefault();
            toggleModal(false);
        }
    });
}

if (selectors.aboutModal) {
    selectors.aboutModal.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            toggleModal(false);
        }
    });
    selectors.aboutModal.addEventListener('click', (e) => {
        if (e.target === selectors.aboutModal) {
            toggleModal(false);
        }
    });
}

function trapFocus(modal) {
    if (!modal) return;
    const focusableElements = modal.querySelectorAll('button, [tabindex="0"]');
    if (focusableElements.length === 0) return;
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    modal.addEventListener('keydown', function handler(e) {
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
            toggleModal(false);
            modal.removeEventListener('keydown', handler);
        }
    });
}

// [CHANGED] Remove testSound button logic as sound is handled by background
// document.getElementById('testSound').addEventListener('click', () => {
//     new Audio('assets/sounds/apple-bite-chew-40.mp3').play();
// });