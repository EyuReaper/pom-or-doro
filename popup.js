// Pomodoro Timer Logic

const timerDisplay = document.getElementById('timer-display');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');
const sessionInfo = document.getElementById('session-info');
const themeSelect = document.getElementById('theme-select');
const languageSelect = document.getElementById('language-select');

// Work/Break amount controls
const workAmountSpan = document.getElementById('workAmount');
const breakAmountSpan = document.getElementById('breakAmount');
const addWorkBtn = document.getElementById('addWork');
const subWorkBtn = document.getElementById('subWork');
const addBreakBtn = document.getElementById('addBreak');
const subBreakBtn = document.getElementById('subBreak');

// Set initial values to Pomodoro defaults
let workAmount = 25;
let breakAmount = 5;
let wasStarted = false;
let isPaused = true;

// Update timer and session display
function updateDisplay({ timeLeft, pomodoroCount, isPaused: paused, mode }) {
    isPaused = paused;
    const minutes = String(Math.floor(timeLeft / 60)).padStart(2, '0');
    const seconds = String(timeLeft % 60).padStart(2, '0');
    timerDisplay.textContent = `${minutes}:${seconds}`;
    sessionInfo.textContent = `Session: ${pomodoroCount + 1}`;
    startBtn.disabled = !isPaused;
    pauseBtn.disabled = isPaused;

    // Update Start/Resume button text
    if (isPaused && wasStarted) {
        startBtn.textContent = languageSelect.value === 'am' ? 'ቀጥል' : 'Resume';
    } else {
        startBtn.textContent = languageSelect.value === 'am' ? 'ጀምር' : 'Start';
    }

    // Update timer color by mode
    if (mode === 'break') {
        timerDisplay.classList.remove('work-mode');
        timerDisplay.classList.add('break-mode');
    } else {
        timerDisplay.classList.remove('break-mode');
        timerDisplay.classList.add('work-mode');
    }
}

// Request current timer state on popup open
chrome.runtime.sendMessage({ action: 'getTimerState' }, (state) => {
    if (state) updateDisplay(state);
    else resetTimerDisplay();
});

// Listen for timer updates from background
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'timerUpdate') {
        updateDisplay(msg);
    }
});

// Button actions
startBtn.addEventListener('click', () => {
    wasStarted = true;
    chrome.runtime.sendMessage({ action: 'start' });
});
pauseBtn.addEventListener('click', () => {
    wasStarted = true;
    chrome.runtime.sendMessage({ action: 'pause' });
});
resetBtn.addEventListener('click', () => {
    wasStarted = false;
    chrome.runtime.sendMessage({ action: 'reset' });
    startBtn.textContent = languageSelect.value === 'am' ? 'ጀምር' : 'Start';
    resetTimerDisplay();
});

// Theme logic
function applyTheme(theme) {
    document.body.className = `theme-${theme}`;
    themeSelect.value = theme;
}

// Load theme on popup open
chrome.storage.sync.get({ theme: 'light' }, ({ theme }) => {
    applyTheme(theme);
});

// Change theme on select
themeSelect.addEventListener('change', () => {
    const selectedTheme = themeSelect.value;
    applyTheme(selectedTheme);
    chrome.storage.sync.set({ theme: selectedTheme });
});

// Apply language to popup UI
function applyLanguage(lang) {
    document.querySelector('h1').textContent = lang === 'am' ? 'ፖሞር-ዶሮ' : 'Pom-or-doro';
    // Set Start/Resume button text based on state
    if (isPaused && wasStarted) {
        startBtn.textContent = lang === 'am' ? 'ቀጥል' : 'Resume';
    } else {
        startBtn.textContent = lang === 'am' ? 'ጀምር' : 'Start';
    }
    pauseBtn.textContent = lang === 'am' ? 'አቁም' : 'Pause';
    resetBtn.textContent = lang === 'am' ? 'ዳግም አስጀምር' : 'Reset';
    sessionInfo.textContent = lang === 'am' ? 'ክፍለ-ጊዜ: 1' : 'Session: 1';
    document.querySelector('.theme-switcher label').textContent = lang === 'am' ? 'ገጽታ' : 'Themes';
    document.querySelector('.language-switcher label').textContent = lang === 'am' ? 'ቋንቋ' : 'Language';
    document.getElementById('about-btn').textContent = lang === 'am' ? 'ስለ ፖሞር-ዶሮ' : 'About Pom-or-doro';
    document.getElementById('about-title').textContent = lang === 'am'
        ? '“ፖም” እና “ዶሮ” ምን ማለት ናቸው?'
        : 'What do "Pom" and "Doro" mean?';
}

// Load language on popup open
chrome.storage.sync.get({ language: 'en' }, ({ language }) => {
    applyLanguage(language);
    languageSelect.value = language;
});

// Change language on select
languageSelect.addEventListener('change', () => {
    const selectedLang = languageSelect.value;
    chrome.storage.sync.set({ language: selectedLang });
    applyLanguage(selectedLang);
});

// Load settings and apply on popup open
chrome.storage.sync.get(
    {
        theme: 'light',
        language: 'en',
        workTime: 25,
        shortBreakTime: 5,
        longBreakTime: 15,
        pomodoroCountForLongBreak: 4,
        selectedSound: 'standard'
    },
    (settings) => {
        if (chrome.runtime.lastError) {
            alert('Failed to load settings.');
            return;
        }
        // Apply theme
        applyTheme(settings.theme);
        // Apply language
        applyLanguage(settings.language);
        // Set work/break amounts if stored
        workAmount = settings.workTime;
        breakAmount = settings.shortBreakTime;
        workAmountSpan.textContent = workAmount;
        breakAmountSpan.textContent = breakAmount;
        resetTimerDisplay();
    }
);

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync') {
        if (changes.theme) applyTheme(changes.theme.newValue);
        if (changes.language) applyLanguage(changes.language.newValue);
    }
});

// About modal logic
const aboutBtn = document.getElementById('about-btn');
const aboutModal = document.getElementById('about-modal');
const closeAbout = document.getElementById('close-about');

aboutBtn.addEventListener('click', () => {
    aboutModal.style.display = 'flex';
});
closeAbout.addEventListener('click', () => {
    aboutModal.style.display = 'none';
});
closeAbout.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        aboutModal.style.display = 'none';
    }
});
window.addEventListener('click', (e) => {
    if (e.target === aboutModal) aboutModal.style.display = 'none';
});
window.addEventListener('keydown', (e) => {
    if (aboutModal.style.display === 'flex' && e.key === 'Escape') {
        aboutModal.style.display = 'none';
    }
});

// Reset timer display to initial work amount
function resetTimerDisplay() {
    timerDisplay.textContent = `${String(workAmount).padStart(2, '0')}:00`;
    timerDisplay.classList.remove('break-mode');
    timerDisplay.classList.add('work-mode');
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    sessionInfo.textContent = languageSelect.value === 'am' ? 'ክፍለ-ጊዜ: 1' : 'Session: 1';
    if (isPaused && wasStarted) {
        startBtn.textContent = languageSelect.value === 'am' ? 'ቀጥል' : 'Resume';
    } else {
        startBtn.textContent = languageSelect.value === 'am' ? 'ጀምር' : 'Start';
    }
}

// Update storage and UI
function updateAmounts() {
    workAmountSpan.textContent = workAmount;
    breakAmountSpan.textContent = breakAmount;
    chrome.storage.sync.set({
        workTime: workAmount,
        shortBreakTime: breakAmount
    });
    // Pause/stop timer if running
    wasStarted = false;
    isPaused = true;
    chrome.runtime.sendMessage({ action: 'reset' });
    resetTimerDisplay();
}

// Button events for amount controls
addWorkBtn.addEventListener('click', () => {
    if (workAmount < 120) {
        workAmount++;
        updateAmounts();
    }
});
subWorkBtn.addEventListener('click', () => {
    if (workAmount > 1) {
        workAmount--;
        updateAmounts();
    }
});
addBreakBtn.addEventListener('click', () => {
    if (breakAmount < 60) {
        breakAmount++;
        updateAmounts();
    }
});
subBreakBtn.addEventListener('click', () => {
    if (breakAmount > 1) {
        breakAmount--;
        updateAmounts();
    }
});

function startWorkSession() {
    let timeLeft = workAmount * 60; }

function startBreakSession() {
    let timeLeft = breakAmount * 60; 
}

function startTimer(mode) {
    let timeLeft;
    if (mode === 'work') {
        timeLeft = workAmount * 60;
    } else if (mode === 'break') {
        timeLeft = breakAmount * 60;
    }
}