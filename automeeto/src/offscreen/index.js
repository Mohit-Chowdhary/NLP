import { pipeline, env } from '@xenova/transformers';

// Configuration for Chrome Extension environment
env.allowLocalModels = false;
env.useBrowserCache = true;

console.log('--- AUTOMEETO ENGINE v1.7 ---');

let transcriber = null;
let audioContext = null;
let source = null;
let processor = null;

// Audio buffer for accumulating samples
let pcmBuffer = [];
const SAMPLE_RATE = 16000;
const CHUNK_THRESHOLD = SAMPLE_RATE * 5; // 5 seconds of audio
const MIN_RMS_THRESHOLD = 0.005; // Ignore absolute silence

chrome.runtime.onMessage.addListener(async (message) => {
    if (message.type === 'START_OFFSCREEN_RECORDING') {
        startRecording(message.streamId);
    } else if (message.type === 'STOP_OFFSCREEN_RECORDING') {
        stopRecording();
    }
});

// Signal readiness to background
chrome.runtime.sendMessage({ type: 'OFFSCREEN_READY' });

async function initTranscriber() {
    if (!transcriber) {
        try {
            console.log('Initializing Whisper pipeline...');
            chrome.runtime.sendMessage({ type: 'STATUS_UPDATE', text: 'Preparing AI...' });

            transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', {
                progress_callback: (progress) => {
                    if (progress.status === 'initiate') {
                        chrome.runtime.sendMessage({
                            type: 'STATUS_UPDATE',
                            text: `Loading: ${progress.file}`
                        });
                    } else if (progress.status === 'progress') {
                        const percent = progress.progress ? Math.round(progress.progress) : Math.min(Math.round(progress.loaded), 99);
                        chrome.runtime.sendMessage({
                            type: 'STATUS_UPDATE',
                            text: `Downloading: ${percent}%`
                        });
                    }
                }
            });
            console.log('Whisper model ready.');
        } catch (err) {
            console.error('Pipeline error:', err);
            chrome.runtime.sendMessage({ type: 'STATUS_UPDATE', text: 'Model Load Failed' });
            throw err;
        }
    }
}

async function startRecording(streamId) {
    await initTranscriber();

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                mandatory: {
                    chromeMediaSource: 'tab',
                    chromeMediaSourceId: streamId
                }
            },
            video: false
        });

        audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
        source = audioContext.createMediaStreamSource(stream);

        processor = audioContext.createScriptProcessor(4096, 1, 1);

        processor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);

            // Calculate volume (RMS)
            let sum = 0;
            for (let i = 0; i < inputData.length; i++) {
                sum += inputData[i] * inputData[i];
            }
            const rms = Math.sqrt(sum / inputData.length);

            // Periodically tell the background the volume for the popup meter
            if (Date.now() % 500 < 100) {
                chrome.runtime.sendMessage({ type: 'VOLUME_UPDATE', rms });
            }

            // Buffer the audio
            pcmBuffer.push(...inputData);

            if (pcmBuffer.length >= CHUNK_THRESHOLD) {
                const chunk = new Float32Array(pcmBuffer);
                pcmBuffer = [];

                // Only transcribe if there was actually sound
                if (rms > MIN_RMS_THRESHOLD) {
                    console.log(`Processing chunk (Vol: ${rms.toFixed(4)})`);
                    processAudioChunk(chunk);
                } else {
                    console.log('Skipping silent chunk');
                    chrome.runtime.sendMessage({ type: 'STATUS_UPDATE', text: 'Watching... (Silence Detected)' });
                }
            }
        };

        source.connect(processor);
        processor.connect(audioContext.destination);

        chrome.runtime.sendMessage({ type: 'STATUS_UPDATE', text: 'Recording...' });
        console.log('Recording started with Vol-Gate');
    } catch (err) {
        console.error('Error starting capture:', err);
        chrome.runtime.sendMessage({ type: 'STATUS_UPDATE', text: 'Capture Error' });
    }
}

async function processAudioChunk(float32Data) {
    if (!transcriber) return;
    try {
        const output = await transcriber(float32Data, {
            chunk_length_s: 30,
            stride_length_s: 5,
            language: 'english',
            task: 'transcribe',
            return_timestamps: false
        });

        const cleanText = output.text.trim();
        // Ignore classic Whisper hallucinations on noise
        if (cleanText && cleanText.length > 2 && !cleanText.toLowerCase().includes('you you')) {
            chrome.runtime.sendMessage({ type: 'TRANSCRIPTION_UPDATE', text: cleanText });
        }
    } catch (err) {
        console.error('Transcription error:', err);
    }
}

function stopRecording() {
    if (processor) {
        processor.disconnect();
        source.disconnect();
        audioContext.close();
        processor = null;
        source = null;
        audioContext = null;
        console.log('Recording stopped');
    }
}
