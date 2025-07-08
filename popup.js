// Pomodoro Timer Logic

const timerDisplay = document.getElementById('timer-display');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');
const sessionInfo = document.getElementById('session-info');
const themeSelect = document.getElementById('theme-select');

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