// Pomodoro Timer Logic

const timerDisplay = document.getElementById('timer-display');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');
const sessionInfo = document.getElementById('session-info');
const themeSelect = document.getElementById('theme-select');
const languageSelect = document.getElementById('language-select');

// Update timer and session display
function updateDisplay({ timeLeft, pomodoroCount, isPaused }) {
    const minutes = String(Math.floor(timeLeft / 60)).padStart(2, '0');
    const seconds = String(timeLeft % 60).padStart(2, '0');
    timerDisplay.textContent = `${minutes}:${seconds}`;
    sessionInfo.textContent = `Session: ${pomodoroCount + 1}`;
    startBtn.disabled = !isPaused;
    pauseBtn.disabled = isPaused;
}

// Request current timer state on popup open
chrome.runtime.sendMessage({ action: 'getTimerState' }, (state) => {
    if (state) updateDisplay(state);
});

// Listen for timer updates from background
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'timerUpdate') {
        updateDisplay(msg);
    }
});

// Button actions
startBtn.addEventListener('click', () => chrome.runtime.sendMessage({ action: 'start' }));
pauseBtn.addEventListener('click', () => chrome.runtime.sendMessage({ action: 'pause' }));
resetBtn.addEventListener('click', () => chrome.runtime.sendMessage({ action: 'reset' }));

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
    // Example: update static text (expand as needed)
    document.querySelector('h1').textContent = lang === 'am' ? 'ፖሞር-ዶሮ' : 'Pom-or-doro';
    document.getElementById('start-btn').textContent = lang === 'am' ? 'ጀምር' : 'Start';
    document.getElementById('pause-btn').textContent = lang === 'am' ? 'አቁም' : 'Pause';
    document.getElementById('reset-btn').textContent = lang === 'am' ? 'ዳግም አስጀምር' : 'Reset';
    document.querySelector('.session-info').textContent = lang === 'am' ? 'ክፍለ-ጊዜ: 1' : 'Session: 1';
    document.querySelector('.theme-switcher label').textContent = lang === 'am' ? 'ገጽታ' : 'Themes';
    document.querySelector('.language-switcher label').textContent = lang === 'am' ? 'ቋንቋ' : 'Language';
    // Add more translations as needed
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
    // Apply theme
    applyTheme(settings.theme);
    // Apply language
    applyLanguage(settings.language);
  }
);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync') {
    if (changes.theme) applyTheme(changes.theme.newValue);
    if (changes.language) applyLanguage(changes.language.newValue);
  }
});