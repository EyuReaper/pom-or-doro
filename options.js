// Elements
const workInput = document.getElementById('work-duration');
const breakInput = document.getElementById('break-duration');
const saveBtn = document.getElementById('save-btn');
const statusMsg = document.getElementById('status-msg');

// Load saved options
function loadOptions() {
    chrome.storage.sync.get(
        { workDuration: 25, breakDuration: 5 },
        ({ workDuration, breakDuration }) => {
            workInput.value = workDuration;
            breakInput.value = breakDuration;
        }
    );
}

// Save options
function saveOptions() {
    const workDuration = parseInt(workInput.value, 10);
    const breakDuration = parseInt(breakInput.value, 10);

    chrome.storage.sync.set(
        { workDuration, breakDuration },
        () => {
            statusMsg.textContent = 'Options saved!';
            setTimeout(() => (statusMsg.textContent = ''), 2000);
        }
    );
}

// Event listeners
document.addEventListener('DOMContentLoaded', loadOptions);
saveBtn.addEventListener('click', saveOptions);