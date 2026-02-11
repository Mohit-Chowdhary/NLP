// Popup Script
import { CONFIG } from './src/config.js';

document.addEventListener('DOMContentLoaded', () => {
    const statusText = document.getElementById('status-text');
    const statusDot = document.getElementById('status-dot');
    const controlStatus = document.getElementById('control-status');
    const apiKeySection = document.getElementById('api-key-section');
    const apiKeyStatus = document.getElementById('api-key-status');
    const maskedKey = document.getElementById('masked-key');
    const momResult = document.getElementById('mom-result');
    const momSummaryText = document.getElementById('mom-summary-text');
    const sessionTitle = document.getElementById('session-title');
    const summaryLabel = document.getElementById('summary-label');
    const actionItemsList = document.getElementById('action-items-list');
    const transcriptPreview = document.getElementById('transcript-preview');
    const taskCount = document.getElementById('task-count');
    const healthGemini = document.getElementById('health-gemini');
    const healthCalendar = document.getElementById('health-calendar');
    const connectCalendarBtn = document.getElementById('connect-calendar-btn');
    const downloadMomBtn = document.getElementById('download-mom-btn');
    const downloadTranscriptBtn = document.getElementById('download-transcript-btn');

    const setApiKeyBtn = document.getElementById('set-api-key-btn');
    const changeKeyBtn = document.getElementById('change-key-btn');

    async function checkHealth() {
        const result = await chrome.storage.local.get('gemini_api_key');
        const geminiKey = result.gemini_api_key || CONFIG.GEMINI_API_KEY;

        // Gemini Check
        if (geminiKey) {
            try {
                const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`);
                healthGemini.style.backgroundColor = resp.ok ? '#22c55e' : '#ef4444';
            } catch {
                healthGemini.style.backgroundColor = '#ef4444';
            }
        } else {
            healthGemini.style.backgroundColor = '#94a3b8';
        }

        // Calendar Check
        chrome.identity.getAuthToken({ interactive: false }, (token) => {
            healthCalendar.style.backgroundColor = token ? '#22c55e' : '#ef4444';
            connectCalendarBtn.innerText = token ? 'Connected' : 'Connect';
            connectCalendarBtn.style.background = token ? '#22c55e' : '#64748b';
        });
    }

    function updateUI() {
        chrome.storage.local.get(['isRecording', 'status', 'lastMoM', 'gemini_api_key'], (result) => {
            const isRecording = result.isRecording || false;
            const status = result.status || 'Ready';
            const lastMoM = result.lastMoM || null;
            const apiKey = result.gemini_api_key || CONFIG.GEMINI_API_KEY;

            // Status
            statusText.innerText = status;
            controlStatus.innerText = `Status: ${status}`;
            if (isRecording) {
                statusDot.classList.add('active');
            } else {
                statusDot.classList.remove('active');
            }

            // API Key
            if (!apiKey) {
                apiKeySection.style.display = 'block';
                apiKeyStatus.style.display = 'none';
            } else {
                apiKeySection.style.display = 'none';
                apiKeyStatus.style.display = 'flex';
                maskedKey.innerText = `Gemini Key: ••••••••${apiKey.slice(-4)}`;
            }

            // MoM Result
            if (lastMoM) {
                momResult.style.display = 'block';
                momSummaryText.innerText = lastMoM.mom.summary;
                transcriptPreview.innerText = lastMoM.transcript || 'No transcript generated for this session.';
                actionItemsList.innerHTML = '';
                lastMoM.actionItems.forEach(item => {
                    const div = document.createElement('div');
                    div.style.padding = '0.5rem 0';
                    div.style.borderBottom = '1px solid #334155';
                    div.innerText = `${item.owner}: ${item.task}`;
                    actionItemsList.appendChild(div);
                });
                taskCount.innerText = lastMoM.actionItems.length;
            } else {
                momResult.style.display = 'none';
                taskCount.innerText = '0';
            }
        });
    }

    function saveApiKey() {
        const key = prompt('Enter your Gemini API Key:');
        if (key) {
            chrome.storage.local.set({ gemini_api_key: key }, () => {
                updateUI();
                checkHealth();
            });
        }
    }

    function connectCalendar() {
        chrome.identity.getAuthToken({ interactive: true }, (token) => {
            if (chrome.runtime.lastError) {
                console.error('TaskFlow: Calendar connect error. This is usually due to an incorrect Client ID in manifest.json linked to a different Extension ID.', chrome.runtime.lastError);
                alert(`Failed to connect to Google Calendar: ${chrome.runtime.lastError.message}\n\nPlease check the Calendar Setup Guide for instructions on linking your local Extension ID.`);
            } else {
                checkHealth();
            }
        });
    }

    function downloadMoM() {
        chrome.storage.local.get('lastMoM', (result) => {
            const mom = result.lastMoM;
            if (!mom) return;

            const content = `
MINUTES OF MEETING
-----------------
Date: ${mom.mom.date || new Date().toLocaleDateString()}
Attendees: ${mom.mom.attendees?.join(', ') || 'N/A'}
Agenda: ${mom.mom.agenda || 'N/A'}

SUMMARY:
${mom.mom.summary}

DECISIONS:
${mom.mom.decisions?.map(d => `- ${d}`).join('\n') || 'None'}

ACTION ITEMS:
${mom.actionItems.map(item => `- [${item.priority}] ${item.task} (Owner: ${item.owner}, Deadline: ${item.deadline})`).join('\n')}
            `.trim();

            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `MoM_${new Date().toISOString().slice(0, 10)}.txt`;
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    function downloadTranscript() {
        chrome.storage.local.get('lastMoM', (result) => {
            const mom = result.lastMoM;
            if (!mom || !mom.transcript) {
                alert('No transcript available yet. Please run a new session to generate a transcript with the new 100% Gemini engine.');
                return;
            }

            const blob = new Blob([mom.transcript], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Transcript_${new Date().toISOString().slice(0, 10)}.txt`;
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    setApiKeyBtn.addEventListener('click', saveApiKey);
    changeKeyBtn.addEventListener('click', saveApiKey);
    connectCalendarBtn.addEventListener('click', connectCalendar);
    downloadMomBtn.addEventListener('click', downloadMoM);
    downloadTranscriptBtn.addEventListener('click', downloadTranscript);

    // Initial update
    updateUI();
    checkHealth();

    // Periodic checks
    setInterval(checkHealth, 30000);

    // Storage changes
    chrome.storage.onChanged.addListener(() => {
        updateUI();
        checkHealth();
    });
});
