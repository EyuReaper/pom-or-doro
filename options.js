const DEFAULT_SETTINGS = {
    workTime: 25,
    shortBreakTime: 5,
    longBreakTime: 15,
    pomodoroCountForLongBreak: 4,
    soundVolume: 1.0,
    theme: 'light',
    language: 'en'
};

const workInput = document.getElementById('workInput');
const shortBreakInput = document.getElementById('shortBreakInput');
const longBreakInput = document.getElementById('longBreakInput');
const pomosBeforeLongInput = document.getElementById('pomosBeforeLongInput');
const soundVolume = document.getElementById('soundVolume'); // Fixed to match HTML id
const themeSelect = document.getElementById('themeSelect');
const languageSelect = document.getElementById('languageSelect');
const saveBtn = document.getElementById('saveBtn');
const resetBtn = document.getElementById('resetBtn');
const statusMsg = document.getElementById('statusMsg');
const form = document.getElementById('options-form');

/**
 * Applies the selected language to the UI elements using data-amharic attributes.
 * @param {string} lang - The language code ('en' or 'am').
 */
function applyLanguage(lang) {
    document.documentElement.setAttribute('data-lang', lang);
    document.querySelectorAll('[data-amharic]').forEach(el => {
        el.textContent = lang === 'am' ? el.dataset.amharic : el.dataset.english || el.textContent;
        el.setAttribute('lang', lang);
    });
    document.querySelectorAll('option[data-amharic]').forEach(opt => {
        opt.textContent = lang === 'am' ? opt.dataset.amharic : opt.dataset.english;
        opt.setAttribute('lang', lang);
    });
    document.title = lang === 'am' ? document.querySelector('title').dataset.amharic : document.querySelector('title').dataset.english;
}

/**
 * Applies the selected theme to the document body.
 * @param {string} theme - The theme name (e.g., 'light', 'ethiopian', 'waillord', 'ivy').
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
    if (statusMsg) {
        statusMsg.textContent = lang === 'am' ? message.am : message.en;
        statusMsg.classList.add('show');
        setTimeout(() => statusMsg.classList.remove('show'), 3000);
    }
}

// Load settings on page load
chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
    if (chrome.runtime.lastError) {
        console.error('Failed to load settings:', chrome.runtime.lastError.message);
        showStatusMessage({ en: 'Error loading settings.', am: 'ቅንብሮችን መጫን አልተሳካም።' }, settings.language || 'en');
        return;
    }
    workInput.value = settings.workTime;
    shortBreakInput.value = settings.shortBreakTime;
    longBreakInput.value = settings.longBreakTime;
    pomosBeforeLongInput.value = settings.pomodoroCountForLongBreak;
    soundVolume.value = settings.soundVolume; // Updated to use corrected variable
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
    const soundVolume = parseFloat(soundVolume.value); // Updated to use corrected variable
    const theme = themeSelect.value;
    const language = languageSelect.value;

    if (workTime < 1 || shortBreakTime < 1 || longBreakTime < 1 || pomodoroCountForLongBreak < 1) {
        showStatusMessage({ en: 'Please enter valid durations (minimum 1).', am: 'እባክዎ ተገቢ ጊዜዎችን ያስገቡ (ቢያንስ 1)።' }, language);
        return;
    }
    if (soundVolume < 0 || soundVolume > 1) {
        showStatusMessage({ en: 'Sound volume must be between 0 and 1.', am: 'የድምፅ መጠን ከ0 እስከ 1 መሆን አለበት።' }, language);
        return;
    }

    const settings = {
        workTime,
        shortBreakTime,
        longBreakTime,
        pomodoroCountForLongBreak,
        soundVolume,
        theme,
        language
    };

    chrome.runtime.sendMessage({ action: 'saveSettings', settings }, () => {
        if (chrome.runtime.lastError) {
            showStatusMessage({ en: 'Error saving settings.', am: 'ቅንብሮችን በማስቀመጥ ላይ ስህተት ተከስቷል።' }, language);
            return;
        }
        applyTheme(theme);
        applyLanguage(language);
        showStatusMessage({ en: 'Settings saved!', am: 'ቅንብሮች ተቀምጠዋል!' }, language);
    });
});

// Reset settings to defaults
resetBtn.addEventListener('click', () => {
    chrome.storage.sync.set(DEFAULT_SETTINGS, () => {
        if (chrome.runtime.lastError) {
            showStatusMessage({ en: 'Error resetting settings.', am: 'ቅንብሮችን ዳግም ለማስጀመር ስህተት ተከስቷል።' }, languageSelect.value);
            return;
        }
        workInput.value = DEFAULT_SETTINGS.workTime;
        shortBreakInput.value = DEFAULT_SETTINGS.shortBreakTime;
        longBreakInput.value = DEFAULT_SETTINGS.longBreakTime;
        pomosBeforeLongInput.value = DEFAULT_SETTINGS.pomodoroCountForLongBreak;
        soundVolume.value = DEFAULT_SETTINGS.soundVolume; // Updated to use corrected variable
        themeSelect.value = DEFAULT_SETTINGS.theme;
        languageSelect.value = DEFAULT_SETTINGS.language;
        applyTheme(DEFAULT_SETTINGS.theme);
        applyLanguage(DEFAULT_SETTINGS.language);
        chrome.runtime.sendMessage({ action: 'saveSettings', settings: DEFAULT_SETTINGS });
        showStatusMessage({ en: 'Settings reset to defaults!', am: 'ቅንብሮች ወደ ቀድሞ ተመልሰዋል!' }, DEFAULT_SETTINGS.language);
    });
});

// Update language dynamically
languageSelect.addEventListener('change', () => {
    const language = languageSelect.value;
    applyLanguage(language);
    chrome.storage.sync.set({ language }, () => {
        chrome.runtime.sendMessage({ action: 'saveSettings', settings: { language } });
    });
});

// Update theme dynamically
themeSelect.addEventListener('change', () => {
    const theme = themeSelect.value;
    applyTheme(theme);
    chrome.storage.sync.set({ theme }, () => {
        chrome.runtime.sendMessage({ action: 'saveSettings', settings: { theme } });
    });
});