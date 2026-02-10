import { transcribeAudio } from './src/services/transcription.js';
import { generateMoM } from './src/services/summarizer.js';
import { CONFIG } from './src/config.js';

let recorder;
let data = [];

chrome.runtime.onMessage.addListener(async (message) => {
    if (message.target !== 'offscreen') return;

    if (message.type === 'START_RECORDING') {
        startRecording(message.data);
    } else if (message.type === 'STOP_RECORDING') {
        stopRecording();
    }
});

async function startRecording(streamId) {
    if (recorder?.state === 'recording') return;

    const media = await navigator.mediaDevices.getUserMedia({
        audio: {
            mandatory: {
                chromeMediaSource: 'tab',
                chromeMediaSourceId: streamId
            }
        },
        video: false
    });

    const output = new AudioContext();
    const source = output.createMediaStreamSource(media);
    source.connect(output.destination);

    recorder = new MediaRecorder(media, { mimeType: 'audio/webm' });
    recorder.ondataavailable = (event) => data.push(event.data);
    recorder.onstop = async () => {
        const blob = new Blob(data, { type: 'audio/webm' });
        data = [];

        try {
            const { openai_api_key: storageKey } = await chrome.storage.local.get('openai_api_key');
            const apiKey = storageKey || CONFIG.OPENAI_API_KEY;

            if (!apiKey) throw new Error('OpenAI API Key not found. Please set it in config.js or the extension popup.');

            const transcriptData = await transcribeAudio(blob, apiKey);
            const momResult = await generateMoM(transcriptData.text, apiKey);

            // Save result and notify
            await chrome.storage.local.set({
                lastMoM: momResult,
                status: 'MoM generated'
            });

            chrome.runtime.sendMessage({
                action: 'MOM_GENERATED',
                data: momResult
            });

        } catch (error) {
            console.error('TaskFlow Processing error:', error);
            chrome.runtime.sendMessage({ action: 'PROCESSING_ERROR', error: error.message });
        }
    };

    recorder.start();
}

function stopRecording() {
    recorder?.stop();
    recorder?.stream.getTracks().forEach((t) => t.stop());
}
