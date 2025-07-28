const workInput = document.getElementById('workInput');
const shortBreakInput = document.getElementById('shortBreakInput');
const longBreakInput = document.getElementById('longBreakInput');
const pomosBeforeLongInput = document.getElementById('pomosBeforeLongInput');
const themeSelect = document.getElementById('themeSelect');
const languageSelect = document.getElementById('languageSelect');
const saveBtn = document.getElementById('saveBtn');
const resetBtn = document.getElementById('resetBtn');
const statusMsg = document.getElementById('statusMsg');
const form = document.getElementById('options-form');

// Default settings
const defaultSettings = {
    workTime: 25,
    shortBreakTime: 5,
    longBreakTime: 15,
    pomodoroCountForLongBreak: 4,
    theme: 'light',
    selectedSound: 'standard',
    language: 'en'
};

/**
 * Applies the selected language to the UI elements using data-amharic attributes.
 * @param {string} lang - The language code ('en' or 'am').
 */
function applyLanguage(lang) {
    document.querySelectorAll('[data-amharic]').forEach(el => {
        el.textContent = lang === 'am' ? el.dataset.amharic : el.dataset.english || el.textContent;
    });
    // Update select options
    document.querySelectorAll('option[data-amharic]').forEach(opt => {
        opt.textContent = lang === 'am' ? opt.dataset.amharic : opt.dataset.english;
    });
    // Update document title
    document.title = lang === 'am' ? document.querySelector('title').dataset.amharic : document.querySelector('title').dataset.english;
}

/**
 * Applies the selected theme to the document body.
 * @param {string} theme - The theme name (e.g., 'light', 'ethiopian').
 */
function applyTheme(theme) {
    document.body.className = `theme-${theme}`;
    themeSelect.value = theme;
}

/**
 * Displays a status message with the specified text.
 * @param {string} message - The message to display.
 * @param {string} lang - The language code ('en' or 'am').
 */
function showStatusMessage(message, lang) {
    statusMsg.textContent = lang === 'am' ? message.am : message.en;
    statusMsg.classList.add('show');
    setTimeout(() => statusMsg.classList.remove('show'), 3000);
}

// Load settings on page load
chrome.storage.sync.get(defaultSettings, (settings) => {
    workInput.value = settings.workTime;
    shortBreakInput.value = settings.shortBreakTime;
    longBreakInput.value = settings.longBreakTime;
    pomosBeforeLongInput.value = settings.pomodoroCountForLongBreak;
    themeSelect.value = settings.theme;
    languageSelect.value = settings.language;
    applyTheme(settings.theme);
    applyLanguage(settings.language);
});

// Save settings on form submit
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const workTime = parseInt(workInput.value);
    const shortBreakTime = parseInt(shortBreakInput.value);
    const longBreakTime = parseInt(longBreakInput.value);
    const pomodoroCountForLongBreak = parseInt(pomosBeforeLongInput.value);
    const theme = themeSelect.value;
    const language = languageSelect.value;

    if (workTime < 1 || shortBreakTime < 1 || longBreakTime < 1 || pomodoroCountForLongBreak < 1) {
        showStatusMessage({ en: 'Please enter valid durations (minimum 1).', am: 'እባክዎ ተገቢ ጊዜዎችን ያስገቡ (ቢያንስ 1)።' }, language);
        return;
    }

    const settings = {
        workTime,
        shortBreakTime,
        longBreakTime,
        pomodoroCountForLongBreak,
        theme,
        selectedSound,
        language
    };

    chrome.storage.sync.set(settings, () => {
        if (chrome.runtime.lastError) {
            showStatusMessage({ en: 'Error saving settings.', am: 'ቅንብሮችን በማስቀመጥ ላይ ስህተት ተከስቷል።' }, language);
            return;
        }
        applyTheme(theme);
        applyLanguage(language);
        chrome.runtime.sendMessage({
            action: 'updateSettings',
            settings
        });
        showStatusMessage({ en: 'Settings saved!', am: 'ቅንብሮች ተቀምጠዋል!' }, language);
    });
});

// Reset settings to defaults
resetBtn.addEventListener('click', () => {
    chrome.storage.sync.set(defaultSettings, () => {
        if (chrome.runtime.lastError) {
            showStatusMessage({ en: 'Error resetting settings.', am: 'ቅንብሮችን ዳግም ለማስጀመር ስህተት ተከስቷል።' }, languageSelect.value);
            return;
        }
        workInput.value = defaultSettings.workTime;
        shortBreakInput.value = defaultSettings.shortBreakTime;
        longBreakInput.value = defaultSettings.longBreakTime;
        pomosBeforeLongInput.value = defaultSettings.pomodoroCountForLongBreak;
        themeSelect.value = defaultSettings.theme;
        languageSelect.value = defaultSettings.language;
        applyTheme(defaultSettings.theme);
        applyLanguage(defaultSettings.language);
        chrome.runtime.sendMessage({
            action: 'updateSettings',
            settings: defaultSettings
        });
        showStatusMessage({ en: 'Settings reset to defaults!', am: 'ቅንብሮች ወደ ቀድሞ ተመልሰዋል!' }, defaultSettings.language);
    });
});

// Update language dynamically
languageSelect.addEventListener('change', () => {
    const language = languageSelect.value;
    applyLanguage(language);
    chrome.storage.sync.set({ language }, () => {
        chrome.runtime.sendMessage({ action: 'updateSettings', settings: { language } });
    });
});

// Update theme dynamically
themeSelect.addEventListener('change', () => {
    const theme = themeSelect.value;
    applyTheme(theme);
    chrome.storage.sync.set({ theme }, () => {
        chrome.runtime.sendMessage({ action: 'updateSettings', settings: { theme } });
    });
});