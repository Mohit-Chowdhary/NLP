import { generateMoMWithGemini } from './src/services/gemini.js';
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
            chromeMediaSource: 'tab',
            chromeMediaSourceId: streamId
        }
    });

    const output = new AudioContext();
    const source = output.createMediaStreamSource(media);

    // Visualizer Setup
    const analyser = output.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    source.connect(output.destination);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const broadcastLevel = () => {
        if (recorder?.state !== 'recording') return;
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((p, c) => p + c, 0) / bufferLength;
        chrome.runtime.sendMessage({ type: 'AUDIO_LEVEL', level: average });
        setTimeout(broadcastLevel, 100);
    };
    broadcastLevel();

    recorder = new MediaRecorder(media, { mimeType: 'audio/webm' });
    recorder.ondataavailable = (event) => {
        if (event.data.size > 0) data.push(event.data);
    };
    recorder.onstop = async () => {
        const blob = new Blob(data, { type: 'audio/webm' });
        data = [];

        try {
            await chrome.storage.local.set({ status: 'AI is thinking...' });

            const { gemini_api_key: storageGemini } = await chrome.storage.local.get('gemini_api_key');
            const geminiKey = storageGemini || CONFIG.GEMINI_API_KEY;

            if (!geminiKey) throw new Error('Gemini API Key missing. Open the extension popup and set it.');

            console.log('TaskFlow: Sending audio to Gemini...');
            const momResult = await generateMoMWithGemini(blob, geminiKey);
            console.log('TaskFlow: Gemini response received.');

            await chrome.storage.local.set({
                lastMoM: momResult,
                status: 'MoM Ready'
            });

            chrome.runtime.sendMessage({ action: 'MOM_GENERATED', data: momResult });

        } catch (error) {
            console.error('TaskFlow: Processing error:', error);
            await chrome.storage.local.set({ status: 'Error: ' + error.message });
            chrome.runtime.sendMessage({ action: 'PROCESSING_ERROR', error: error.message });
            alert('TaskFlow Error: ' + error.message);
        }
    };

    recorder.start();
}

function stopRecording() {
    recorder?.stop();
    recorder?.stream.getTracks().forEach((t) => t.stop());
}
