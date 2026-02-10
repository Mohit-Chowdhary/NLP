// Background Service Worker
import { createCalendarEvent } from './src/services/calendar.js';

const OFFSCREEN_PATH = 'offscreen.html';

async function createOffscreenDocument() {
    if (await chrome.offscreen.hasDocument()) return;

    await chrome.offscreen.createDocument({
        url: OFFSCREEN_PATH,
        reasons: ['USER_MEDIA'],
        justification: 'Capturing meeting audio for transcription'
    });
}

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.action === 'START_RECORDING') {
        await chrome.storage.local.set({ isRecording: true, status: 'Recording...' });
        await createOffscreenDocument();

        chrome.tabCapture.getMediaStreamId({ targetTabId: sender.tab.id }, (streamId) => {
            chrome.runtime.sendMessage({
                target: 'offscreen',
                type: 'START_RECORDING',
                data: streamId
            });
        });
    } else if (message.action === 'STOP_RECORDING') {
        await chrome.storage.local.set({ isRecording: false, status: 'Processing...' });
        chrome.runtime.sendMessage({
            target: 'offscreen',
            type: 'STOP_RECORDING'
        });
    } else if (message.action === 'MOM_GENERATED') {
        // Process action items for calendar
        const actionItems = message.data.actionItems;
        let syncedCount = 0;
        for (const item of actionItems) {
            try {
                await createCalendarEvent(item);
                syncedCount++;
            } catch (err) {
                console.error('TaskFlow: Calendar sync failed for item:', item, err);
            }
        }
        await chrome.storage.local.set({ status: `Ready - ${syncedCount} tasks synced` });
    } else if (message.action === 'PROCESSING_ERROR') {
        console.error('TaskFlow: Processing error:', message.error);
        await chrome.storage.local.set({ status: 'Error', lastError: message.error });
    }
});
