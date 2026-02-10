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
    const actionItemsList = document.getElementById('action-items-list');
    const taskCount = document.getElementById('task-count');

    const setApiKeyBtn = document.getElementById('set-api-key-btn');
    const changeKeyBtn = document.getElementById('change-key-btn');

    function updateUI() {
        chrome.storage.local.get(['isRecording', 'status', 'lastMoM', 'openai_api_key'], (result) => {
            const isRecording = result.isRecording || false;
            const status = result.status || 'Ready';
            const lastMoM = result.lastMoM || null;
            const storageKey = result.openai_api_key || '';
            const apiKey = storageKey || CONFIG.OPENAI_API_KEY;

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
                maskedKey.innerText = `API Key: ••••••••${apiKey.slice(-4)}`;
            }

            // MoM Result
            if (lastMoM) {
                momResult.style.display = 'block';
                momSummaryText.innerText = lastMoM.mom.summary;
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
        const key = prompt('Enter your OpenAI API Key:');
        if (key) {
            chrome.storage.local.set({ openai_api_key: key }, updateUI);
        }
    }

    setApiKeyBtn.addEventListener('click', saveApiKey);
    changeKeyBtn.addEventListener('click', saveApiKey);

    // Initial update
    updateUI();

    // Storage changes
    chrome.storage.onChanged.addListener(updateUI);
});
