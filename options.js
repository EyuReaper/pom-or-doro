// Get elements
const workInput = document.getElementById('workInput');
const shortBreakInput = document.getElementById('shortBreakInput');
const longBreakInput = document.getElementById('longBreakInput');
const pomosBeforeLongInput = document.getElementById('pomosBeforeLongInput');
const themeSelect = document.getElementById('themeSelect');
const soundSelect = document.getElementById('soundSelect');
const languageSelect = document.getElementById('languageSelect');
const saveBtn = document.getElementById('saveBtn');
const resetBtn = document.getElementById('resetBtn');
const statusMsg = document.getElementById('statusMsg');

// Default settings
const DEFAULTS = {
    workTime: 25,
    shortBreakTime: 5,
    longBreakTime: 15,
    pomodoroCountForLongBreak: 4,
    theme: 'light',
    selectedSound: 'standard',
    language: 'en'
};

// Load options from storage
function loadOptions() {
    chrome.runtime.sendMessage({ action: 'getSettings' }, (settings) => {
        workInput.value = (settings.workTime || DEFAULTS.workTime) / 1;
        shortBreakInput.value = (settings.shortBreakTime || DEFAULTS.shortBreakTime) / 1;
        longBreakInput.value = (settings.longBreakTime || DEFAULTS.longBreakTime) / 1;
        pomosBeforeLongInput.value = settings.pomodoroCountForLongBreak || DEFAULTS.pomodoroCountForLongBreak;
        themeSelect.value = settings.theme || DEFAULTS.theme;
        soundSelect.value = settings.selectedSound || DEFAULTS.selectedSound;
        languageSelect.value = settings.language || DEFAULTS.language;
    });
}

// Save options to storage
function saveOptions() {
  const settings = {
    workTime: parseInt(workInput.value, 10),
    shortBreakTime: parseInt(shortBreakInput.value, 10),
    longBreakTime: parseInt(longBreakInput.value, 10),
    pomodoroCountForLongBreak: parseInt(pomosBeforeLongInput.value, 10),
    theme: themeSelect.value,
    selectedSound: soundSelect.value,
    language: languageSelect.value
  };
  chrome.storage.sync.set(settings, () => {
    statusMsg.textContent = 'Options saved!';
    setTimeout(() => (statusMsg.textContent = ''), 2000);
  });
}

// Reset options to defaults
function resetOptions() {
    workInput.value = DEFAULTS.workTime;
    shortBreakInput.value = DEFAULTS.shortBreakTime;
    longBreakInput.value = DEFAULTS.longBreakTime;
    pomosBeforeLongInput.value = DEFAULTS.pomodoroCountForLongBreak;
    themeSelect.value = DEFAULTS.theme;
    soundSelect.value = DEFAULTS.selectedSound;
    languageSelect.value = DEFAULTS.language;
    saveOptions();
}

// Event listeners
document.addEventListener('DOMContentLoaded', loadOptions);
saveBtn.addEventListener('click', saveOptions);
resetBtn.addEventListener('click', resetOptions);