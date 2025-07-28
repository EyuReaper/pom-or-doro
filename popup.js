const DEFAULT_SETTINGS = {
    theme: 'light',
    language: 'en',
    workTime: 25,
    shortBreakTime: 5,
    longBreakTime: 15,
    pomodoroCountForLongBreak: 4,
    selectedSound: 'standard'
};

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
    settingsLink: document.getElementById('settings-link')
};

// Validate DOM elements
const missingElements = Object.entries(selectors)
    .filter(([key, value]) => !value)
    .map(([key]) => key);
if (missingElements.length > 0) {
    console.error(`Missing DOM elements: ${missingElements.join(', ')}`);
}

// Amharic numerals mapping
const amharicNumerals = ['00', '፩', '፪', '፫', '፬', '፭', '፮', '፯', '፰', '፱'];

// State variables
let wasStarted = false;
let isPaused = true;
let workTime = DEFAULT_SETTINGS.workTime;

// Persistent aria-live region
const liveRegion = document.createElement('div');
liveRegion.setAttribute('aria-live', 'assertive');
liveRegion.setAttribute('style', 'position: absolute; left: -9999px;');
document.body.appendChild(liveRegion);

/**
 * Converts a number to Amharic numerals.
 * @param {number} number - The number to convert.
 * @returns {string} The number in Amharic numerals.
 */
function toAmharicNumerals(number) {
    return number.toString().split('').map(digit => amharicNumerals[parseInt(digit)]).join('');
}

/**
 * Announces timer updates to screen readers.
 * @param {string} timeStr - The formatted time string.
 * @param {string} mode - The current mode ('work' or 'break').
 * @param {string} lang - The language code ('en', 'am').
 */
function ariaLiveUpdate(timeStr, mode, lang) {
    const modeText = lang === 'am' ? (mode === 'work' ? 'ፖም' : 'ዶሮ') : mode.charAt(0).toUpperCase() + mode.slice(1);
    liveRegion.textContent = `${modeText}: ${timeStr}`;
}

/**
 * Updates the display elements based on the current timer state.
 * @param {object} state - The timer state object.
 */
function updateDisplay({ timeLeft, pomodoroCount, isPaused: pausedState, mode }) {
    const { timerDisplay, sessionInfo, sessionType, startBtn, pauseBtn } = selectors;
    if (!timerDisplay || !sessionInfo || !sessionType || !startBtn || !pauseBtn) return;

    isPaused = pausedState;
    const lang = selectors.languageSelect?.value || 'en';
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
}

/**
 * Resets the timer display to the initial work amount.
 */
function resetTimerDisplay() {
    const { timerDisplay, sessionInfo, sessionType, startBtn, pauseBtn } = selectors;
    if (!timerDisplay || !sessionInfo || !sessionType || !startBtn || !pauseBtn) return;

    const lang = selectors.languageSelect?.value || 'en';
    const minStr = lang === 'am' ? toAmharicNumerals(workTime) : String(workTime).padStart(2, '0');
    timerDisplay.textContent = `${minStr}:00`;
    timerDisplay.classList.remove('break-mode');
    timerDisplay.classList.add('work-mode');
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    sessionInfo.textContent = lang === 'am' ? 'ክፍለ-ጊዜ: ፩' : 'Session: 1';
    sessionType.textContent = lang === 'am' ? 'ፖም' : 'Work';
    startBtn.textContent = lang === 'am' ? 'ጀምር' : 'Start';
    startBtn.setAttribute('aria-label', startBtn.textContent);
}

/**
 * Applies the selected theme to the document body and modal.
 * @param {string} theme - The theme name.
 */
function applyTheme(theme) {
    if (!selectors.themeSelect) return;
    document.body.className = `theme-${theme}`;
    selectors.themeSelect.value = theme;
    // Ensure modal styles update if open
    if (selectors.aboutModal && selectors.aboutModal.getAttribute('aria-hidden') === 'false') {
        console.log(`Reapplying theme-${theme} to modal`);
        selectors.aboutModal.classList.remove('theme-light', 'theme-dark', 'theme-ocean', 'theme-forest', 'theme-ethiopian');
        selectors.aboutModal.classList.add(`theme-${theme}`);
    }
}

/**
 * Applies the selected language to UI elements.
 * @param {string} lang - The language code ('en', 'am').
 */
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
    else chrome.runtime.sendMessage({ action: 'getTimerState' }, updateDisplay);
}

// Initialize settings
chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
    if (chrome.runtime.lastError) {
        console.error('Failed to load settings:', chrome.runtime.lastError.message);
        return;
    }
    applyTheme(settings.theme);
    applyLanguage(settings.language);
    workTime = settings.workTime;
    if (isPaused) resetTimerDisplay();
});

// Request initial timer state
chrome.runtime.sendMessage({ action: 'getTimerState' }, (response) => {
    if (chrome.runtime.lastError) {
        console.error('Failed to get timer state:', chrome.runtime.lastError.message);
        resetTimerDisplay();
        return;
    }
    if (response && typeof response === 'object' && response !== null) {
        updateDisplay(response);
    } else {
        resetTimerDisplay();
    }
});

// Event Listeners
// Timer controls
if (selectors.startBtn) {
    selectors.startBtn.addEventListener('click', () => {
        console.log('Start button clicked');
        wasStarted = true;
        chrome.runtime.sendMessage({ action: 'start' }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Failed to start timer:', chrome.runtime.lastError.message);
            }
        });
    });
}

if (selectors.pauseBtn) {
    selectors.pauseBtn.addEventListener('click', () => {
        console.log('Pause button clicked');
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
        console.log('Reset button clicked');
        wasStarted = false;
        chrome.runtime.sendMessage({ action: 'reset' }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Failed to reset timer:', chrome.runtime.lastError.message);
            }
            resetTimerDisplay();
        });
    });
}

// Theme and language changes
if (selectors.themeSelect) {
    selectors.themeSelect.addEventListener('change', () => {
        console.log('Theme changed:', selectors.themeSelect.value);
        const selectedTheme = selectors.themeSelect.value;
        applyTheme(selectedTheme);
        chrome.storage.sync.set({ theme: selectedTheme }, () => {
            if (chrome.runtime.lastError) {
                console.error('Failed to save theme:', chrome.runtime.lastError.message);
            }
        });
    });
}

if (selectors.languageSelect) {
    selectors.languageSelect.addEventListener('change', () => {
        console.log('Language changed:', selectors.languageSelect.value);
        const selectedLanguage = selectors.languageSelect.value;
        applyLanguage(selectedLanguage);
        chrome.storage.sync.set({ language: selectedLanguage }, () => {
            if (chrome.runtime.lastError) {
                console.error('Failed to save language:', chrome.runtime.lastError.message);
            }
        });
    });
}

// Settings link
if (selectors.settingsLink) {
    selectors.settingsLink.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Settings link clicked');
        chrome.runtime.openOptionsPage();
    });
}

// Storage change listener
chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    if (changes.theme) applyTheme(changes.theme.newValue);
    if (changes.language) applyLanguage(changes.language.newValue);
    if (changes.workTime) {
        workTime = changes.workTime.newValue;
        if (isPaused) resetTimerDisplay();
    }
});

// Modal controls
function toggleModal(show) {
    const { aboutModal, aboutBtn, closeAbout } = selectors;
    if (!aboutModal || !aboutBtn || !closeAbout) {
        console.error('Modal elements missing:', { aboutModal, aboutBtn, closeAbout });
        return;
    }
    console.log(`Toggling modal: ${show ? 'show' : 'hide'}`);
    aboutModal.setAttribute('aria-hidden', show ? 'false' : 'true');
    if (show) {
        trapFocus(aboutModal);
        closeAbout.focus();
        // Apply current theme to modal
        const currentTheme = selectors.themeSelect?.value || 'light';
        aboutModal.classList.add(`theme-${currentTheme}`);
        console.log(`Applied theme-${currentTheme} to modal on open`);
    } else {
        aboutBtn.focus();
        aboutModal.classList.remove('theme-light', 'theme-dark', 'theme-ocean', 'theme-forest', 'theme-ethiopian');
    }
}

if (selectors.aboutBtn) {
    selectors.aboutBtn.addEventListener('click', () => {
        console.log('About button clicked');
        toggleModal(true);
    });
}

if (selectors.closeAbout) {
    selectors.closeAbout.addEventListener('click', () => {
        console.log('Close modal button clicked');
        toggleModal(false);
    });

    selectors.closeAbout.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === 'Space') {
            console.log('Close modal via keyboard');
            e.preventDefault();
            toggleModal(false);
        }
    });
}

if (selectors.aboutModal) {
    selectors.aboutModal.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            console.log('Escape key pressed in modal');
            e.preventDefault();
            toggleModal(false);
        }
    });

    selectors.aboutModal.addEventListener('click', (e) => {
        if (e.target === selectors.aboutModal) {
            console.log('Clicked outside modal content');
            toggleModal(false);
        }
    });
}

// Focus trapping for modal
function trapFocus(modal) {
    if (!modal) return;
    const focusableElements = modal.querySelectorAll('button, [tabindex="0"]');
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (!firstElement || !lastElement) {
        console.warn('No focusable elements in modal');
        return;
    }

    console.log('Trapping focus in modal');
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

// Timer update listener
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'timerUpdate') {
        console.log('Received timer update:', msg);
        updateDisplay(msg);
    }
});