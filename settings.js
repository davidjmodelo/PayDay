// #24 - full settings page (privacy/notifications)
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const API_BASE = 'http://localhost:3000';

let currentUser = null;
let currentSettings = null;
let hasUnsavedChanges = false;

// DOM Elements
let settingsLoading;
let settingsContainer;
let notLoggedIn;
let saveStatus;

// Initialize Firebase auth listener
document.addEventListener('DOMContentLoaded', async () => {
    // Get DOM elements after page loads
    settingsLoading = document.getElementById('settingsLoading');
    settingsContainer = document.getElementById('settingsContainer');
    notLoggedIn = document.getElementById('notLoggedIn');
    saveStatus = document.getElementById('saveStatus');

    // Use global auth from window (set by Firebase script in HTML)
    const auth = window.auth;
    
    if (!auth) {
        console.error('Firebase auth not initialized');
        showNotLoggedIn();
        return;
    }
    
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            await loadSettings();
            setupEventListeners();
        } else {
            currentUser = null;
            showNotLoggedIn();
        }
    });

    // Login prompt button
    const loginPromptBtn = document.getElementById('loginPromptBtn');
    if (loginPromptBtn) {
        loginPromptBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
});

// Show not logged in state
function showNotLoggedIn() {
    settingsLoading.style.display = 'none';
    settingsContainer.style.display = 'none';
    notLoggedIn.style.display = 'block';
}

// Load user settings from server
async function loadSettings() {
    try {
        const response = await fetch(`${API_BASE}/api/users/${currentUser.uid}/settings`);
        const data = await response.json();

        if (data.success) {
            currentSettings = data.settings;
            populateSettings(currentSettings);
            settingsLoading.style.display = 'none';
            settingsContainer.style.display = 'block';
        } else {
            showError('Failed to load settings');
        }
    } catch (error) {
        console.error('Error loading settings:', error);
        showError('Failed to load settings');
    }
}

// Populate form with current settings
function populateSettings(settings) {
    // Privacy settings
    setSelectValue('profileVisibility', settings.privacy?.profileVisibility || 'public');
    setCheckboxValue('showBettingHistory', settings.privacy?.showBettingHistory ?? true);
    setCheckboxValue('showWalletBalance', settings.privacy?.showWalletBalance ?? false);
    setSelectValue('allowDirectMessages', settings.privacy?.allowDirectMessages || 'everyone');
    setCheckboxValue('showOnlineStatus', settings.privacy?.showOnlineStatus ?? true);
    setCheckboxValue('showActivityStatus', settings.privacy?.showActivityStatus ?? true);

    // Notification settings
    setCheckboxValue('emailNotifications', settings.notifications?.emailNotifications ?? true);
    setCheckboxValue('betResults', settings.notifications?.betResults ?? true);
    setCheckboxValue('newFollowers', settings.notifications?.newFollowers ?? true);
    setCheckboxValue('directMessages', settings.notifications?.directMessages ?? true);
    setCheckboxValue('robSuggestions', settings.notifications?.robSuggestions ?? true);
    setCheckboxValue('promotions', settings.notifications?.promotions ?? false);
    setCheckboxValue('weeklyDigest', settings.notifications?.weeklyDigest ?? true);

    // Display settings
    setSelectValue('theme', settings.display?.theme || 'light');
    setSelectValue('oddsFormat', settings.display?.oddsFormat || 'american');
    setSelectValue('timezone', settings.display?.timezone || 'America/Los_Angeles');

    // Betting settings
    setNumberValue('defaultStake', settings.betting?.defaultStake || 10);
    setCheckboxValue('confirmBets', settings.betting?.confirmBets ?? true);
    setCheckboxValue('showOddsChanges', settings.betting?.showOddsChanges ?? true);
    setCheckboxValue('autoAcceptOddsChanges', settings.betting?.autoAcceptOddsChanges ?? false);
}

// Helper functions for setting values
function setSelectValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
}

function setCheckboxValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.checked = value;
}

function setNumberValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
}

// Setup event listeners
function setupEventListeners() {
    // Track changes on all inputs
    document.querySelectorAll('.setting-select, .toggle-switch input, .setting-number').forEach(input => {
        input.addEventListener('change', () => {
            hasUnsavedChanges = true;
        });
    });

    // Save button
    const saveBtn = document.getElementById('saveSettingsBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveSettings);
    }

    // Reset button
    const resetBtn = document.getElementById('resetSettingsBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetSettings);
    }

    // Export data button
    const exportBtn = document.getElementById('exportDataBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportData);
    }

    // Warn before leaving with unsaved changes
    window.addEventListener('beforeunload', (e) => {
        if (hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
}

// Gather all settings from form
function gatherSettings() {
    return {
        privacy: {
            profileVisibility: document.getElementById('profileVisibility')?.value || 'public',
            showBettingHistory: document.getElementById('showBettingHistory')?.checked ?? true,
            showWalletBalance: document.getElementById('showWalletBalance')?.checked ?? false,
            allowDirectMessages: document.getElementById('allowDirectMessages')?.value || 'everyone',
            showOnlineStatus: document.getElementById('showOnlineStatus')?.checked ?? true,
            showActivityStatus: document.getElementById('showActivityStatus')?.checked ?? true
        },
        notifications: {
            emailNotifications: document.getElementById('emailNotifications')?.checked ?? true,
            betResults: document.getElementById('betResults')?.checked ?? true,
            newFollowers: document.getElementById('newFollowers')?.checked ?? true,
            directMessages: document.getElementById('directMessages')?.checked ?? true,
            robSuggestions: document.getElementById('robSuggestions')?.checked ?? true,
            promotions: document.getElementById('promotions')?.checked ?? false,
            weeklyDigest: document.getElementById('weeklyDigest')?.checked ?? true
        },
        display: {
            theme: document.getElementById('theme')?.value || 'light',
            oddsFormat: document.getElementById('oddsFormat')?.value || 'american',
            timezone: document.getElementById('timezone')?.value || 'America/Los_Angeles'
        },
        betting: {
            defaultStake: parseInt(document.getElementById('defaultStake')?.value) || 10,
            confirmBets: document.getElementById('confirmBets')?.checked ?? true,
            showOddsChanges: document.getElementById('showOddsChanges')?.checked ?? true,
            autoAcceptOddsChanges: document.getElementById('autoAcceptOddsChanges')?.checked ?? false
        }
    };
}

// Save settings to server
async function saveSettings() {
    const saveBtn = document.getElementById('saveSettingsBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
        const settings = gatherSettings();
        
        const response = await fetch(`${API_BASE}/api/users/${currentUser.uid}/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });

        const data = await response.json();

        if (data.success) {
            currentSettings = data.settings;
            hasUnsavedChanges = false;
            showSaveStatus('Settings saved successfully!', 'success');
        } else {
            showSaveStatus('Failed to save settings', 'error');
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        showSaveStatus('Failed to save settings', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Changes';
    }
}

// Reset settings to defaults
async function resetSettings() {
    if (!confirm('Are you sure you want to reset all settings to defaults?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/users/${currentUser.uid}/settings/reset`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });

        const data = await response.json();

        if (data.success) {
            currentSettings = data.settings;
            populateSettings(currentSettings);
            hasUnsavedChanges = false;
            showSaveStatus('Settings reset to defaults', 'success');
        } else {
            showSaveStatus('Failed to reset settings', 'error');
        }
    } catch (error) {
        console.error('Error resetting settings:', error);
        showSaveStatus('Failed to reset settings', 'error');
    }
}

// Export user data
async function exportData() {
    const exportBtn = document.getElementById('exportDataBtn');
    exportBtn.disabled = true;
    exportBtn.textContent = 'Exporting...';

    try {
        const response = await fetch(`${API_BASE}/api/users/${currentUser.uid}/export-data`);
        const data = await response.json();

        if (data.success) {
            // Create and download JSON file
            const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `payday-data-export-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showSaveStatus('Data exported successfully!', 'success');
        } else {
            showSaveStatus('Failed to export data', 'error');
        }
    } catch (error) {
        console.error('Error exporting data:', error);
        showSaveStatus('Failed to export data', 'error');
    } finally {
        exportBtn.disabled = false;
        exportBtn.textContent = 'Export My Data';
    }
}

// Show save status message
function showSaveStatus(message, type) {
    saveStatus.textContent = message;
    saveStatus.className = `save-status ${type}`;
    saveStatus.style.display = 'block';

    setTimeout(() => {
        saveStatus.style.display = 'none';
    }, 3000);
}

// Show error state
function showError(message) {
    settingsLoading.innerHTML = `
        <p style="color: #dc2626;">❌ ${message}</p>
        <button onclick="location.reload()" class="btn btn-primary" style="margin-top: 15px;">Retry</button>
    `;
}
