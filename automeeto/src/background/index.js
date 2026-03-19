let currentStreamId = null;
let state = {
    isRecording: false,
    transcript: '',
    statusText: 'Ready',
    downloadProgress: 0
};

// Broadcast state to any open popups
function broadcastState() {
    chrome.runtime.sendMessage({ type: 'STATE_UPDATE', state });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'START_RECORDING') {
        state.isRecording = true;
        state.transcript = '';
        state.statusText = 'Starting...';
        broadcastState();
        startCapture();
    } else if (message.type === 'STOP_RECORDING') {
        state.isRecording = false;
        state.statusText = 'Finished';
        broadcastState();
        stopCapture();
    } else if (message.type === 'GET_STATUS') {
        sendResponse(state);
    } else if (message.type === 'STATUS_UPDATE') {
        state.statusText = message.text;
        broadcastState();
    } else if (message.type === 'VOLUME_UPDATE') {
        state.volume = message.rms;
        broadcastState();
    } else if (message.type === 'TRANSCRIPTION_UPDATE') {
        state.transcript += (state.transcript ? ' ' : '') + message.text;
        broadcastState();
    } else if (message.type === 'OFFSCREEN_READY') {
        console.log('Offscreen document is READY');
        if (currentStreamId) {
            chrome.runtime.sendMessage({
                type: 'START_OFFSCREEN_RECORDING',
                streamId: currentStreamId
            });
        }
    }
});

async function startCapture() {
    console.log('Starting Audio Capture...');
    try {
        currentStreamId = await new Promise((resolve, reject) => {
            chrome.tabCapture.getMediaStreamId({ targetTabId: undefined }, (id) => {
                if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
                else resolve(id);
            });
        });

        const existingContexts = await chrome.runtime.getContexts({
            contextTypes: ['OFFSCREEN_DOCUMENT']
        });
        if (existingContexts.length > 0) {
            await chrome.offscreen.closeDocument();
        }

        await chrome.offscreen.createDocument({
            url: 'src/offscreen/index.html',
            reasons: ['USER_MEDIA'],
            justification: 'Recording audio for transcription'
        });
    } catch (error) {
        console.error('Capture failed:', error);
        state.statusText = 'Capture Error';
        state.isRecording = false;
        broadcastState();
    }
}

function stopCapture() {
    currentStreamId = null;
    chrome.runtime.sendMessage({ type: 'STOP_OFFSCREEN_RECORDING' });
}
