// Google Meet Content Script
console.log('Smart MoM: Content script loaded');

const injectOverlay = () => {
    if (document.getElementById('smart-mom-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'smart-mom-overlay';
    overlay.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    background: #0f172a;
    border: 2px solid #334155;
    padding: 10px 15px;
    display: flex;
    align-items: center;
    gap: 12px;
    color: white;
    font-family: 'Inter', sans-serif;
    font-weight: 700;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    text-transform: uppercase;
    font-size: 12px;
    letter-spacing: 0.05em;
  `;

    const statusDot = document.createElement('div');
    statusDot.id = 'smart-mom-status-dot';
    statusDot.style.cssText = `
    width: 8px;
    height: 8px;
    background: #94a3b8;
    border-radius: 0;
  `;

    const label = document.createElement('span');
    label.innerText = 'Smart MoM';
    label.id = 'smart-mom-label';

    const btn = document.createElement('button');
    btn.innerText = 'Start Session';
    btn.style.cssText = `
    background: #38bdf8;
    color: #0f172a;
    border: none;
    border-bottom: 3px solid #0ea5e9;
    padding: 6px 12px;
    font-weight: 800;
    cursor: pointer;
    text-transform: uppercase;
    font-size: 10px;
  `;

    let isRecording = false;

    btn.onclick = () => {
        isRecording = !isRecording;
        if (isRecording) {
            btn.innerText = 'Stop Session';
            btn.style.background = '#ef4444';
            btn.style.borderBottomColor = '#b91c1c';
            statusDot.style.background = '#ef4444';
            statusDot.style.boxShadow = '0 0 8px #ef4444';
            chrome.runtime.sendMessage({ action: 'START_RECORDING' });
        } else {
            btn.innerText = 'Start Session';
            btn.style.background = '#38bdf8';
            btn.style.borderBottomColor = '#0ea5e9';
            statusDot.style.background = '#94a3b8';
            statusDot.style.boxShadow = 'none';
            chrome.runtime.sendMessage({ action: 'STOP_RECORDING' });
        }
    };

    overlay.appendChild(statusDot);
    overlay.appendChild(label);
    overlay.appendChild(btn);
    document.body.appendChild(overlay);
};

// Check if we are in a meeting
const observer = new MutationObserver(() => {
    // Google Meet layout detection
    if (document.querySelector('[data-meeting-title]') || document.querySelector('[data-conference-id]')) {
        injectOverlay();
    }
});

observer.observe(document.body, { childList: true, subtree: true });

// Initial check
if (document.querySelector('[data-meeting-title]') || document.querySelector('[data-conference-id]')) {
    injectOverlay();
}
