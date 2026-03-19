import { useState, useEffect } from 'react'

function App() {
    console.log('--- AUTOMEETO POPUP v1.7 ---');
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [statusText, setStatusText] = useState('Ready');
    const [momResult, setMomResult] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const [apiKey, setApiKey] = useState('');
    const [showSettings, setShowSettings] = useState(false);

    const [volume, setVolume] = useState(0);

    useEffect(() => {
        // Sync with background on open
        chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
            if (response) {
                setIsRecording(response.isRecording);
                setTranscript(response.transcript);
                setStatusText(response.statusText);
            }
        });

        // Load API key
        chrome.storage.local.get(['geminiApiKey'], (result) => {
            if (result.geminiApiKey) setApiKey(result.geminiApiKey);
        });

        const listener = (message) => {
            if (message.type === 'STATE_UPDATE') {
                setIsRecording(message.state.isRecording);
                setTranscript(message.state.transcript);
                setStatusText(message.state.statusText);
                if (message.state.volume !== undefined) setVolume(message.state.volume);
            }
        };

        chrome.runtime.onMessage.addListener(listener);
        return () => chrome.runtime.onMessage.removeListener(listener);
    }, []);

    const toggleRecording = () => {
        if (!apiKey && !isRecording) {
            alert('Please enter your Gemini API Key first!');
            setShowSettings(true);
            return;
        }
        if (isRecording) {
            chrome.runtime.sendMessage({ type: 'STOP_RECORDING' });
        } else {
            chrome.runtime.sendMessage({ type: 'START_RECORDING' });
        }
    };

    const handleKeyChange = (e) => {
        const val = e.target.value;
        setApiKey(val);
        chrome.storage.local.set({ geminiApiKey: val });
    };

    const handleGenerateMoM = async () => {
        if (!transcript) {
            alert('Transcript is empty. Record something first!');
            return;
        }
        setIsGenerating(true);
        setStatusText('Analyzing...');
        try {
            const { generateMoMWithGemini } = await import('./services/gemini');
            const result = await generateMoMWithGemini(transcript);
            setMomResult(result);
            setStatusText('Analysis Complete');
        } catch (error) {
            console.error(error);
            setStatusText('Error');
            alert(error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            backdropFilter: 'blur(10px)',
            minHeight: '520px'
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{
                    margin: 0,
                    fontSize: '24px',
                    fontWeight: '800',
                    color: 'var(--accent-color)',
                    letterSpacing: '-1px',
                    textTransform: 'lowercase'
                }}>automeeto <span style={{ fontSize: '10px', opacity: 0.3 }}>v1.9</span></h1>
            </div>

            {/* Gemini API Key Bar - Now always visible */}
            <div style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--glass-border)',
                borderRadius: '12px',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '12px'
            }}>
                <span style={{ fontSize: '18px', opacity: 0.6 }}>🔑</span>
                <input
                    type="password"
                    placeholder="Gemini API Key"
                    value={apiKey}
                    onChange={(e) => {
                        setApiKey(e.target.value);
                        chrome.storage.local.set({ geminiApiKey: e.target.value });
                    }}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-main)',
                        fontSize: '13px',
                        width: '100%',
                        outline: 'none',
                        fontFamily: 'monospace'
                    }}
                />
            </div>

            {/* Status Card & Volume */}
            <div style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--glass-border)',
                borderRadius: '16px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                boxShadow: isRecording ? '0 0 20px var(--accent-glow)' : 'none',
                transition: 'all 0.3s ease'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: isRecording ? '#ef4444' : '#22c55e',
                        animation: isRecording ? 'pulse 1.5s infinite' : 'none'
                    }} />
                    <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-main)' }}>
                        {statusText}
                    </span>
                </div>

                {isRecording && (
                    <div style={{
                        height: '4px',
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: '2px',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            height: '100%',
                            width: `${Math.min(volume * 500, 100)}%`,
                            background: 'var(--accent-color)',
                            transition: 'width 0.1s ease'
                        }} />
                    </div>
                )}
            </div>

            {/* Control Section */}
            <div style={{ display: 'flex', gap: '8px' }}>
                <button
                    onClick={toggleRecording}
                    style={{
                        flex: 1,
                        padding: '16px',
                        borderRadius: '12px',
                        backgroundColor: isRecording ? '#ef44441a' : 'var(--accent-color)',
                        color: isRecording ? '#ef4444' : 'white',
                        fontSize: '16px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        border: isRecording ? '1px solid #ef4444' : 'none',
                        boxShadow: isRecording ? 'none' : '0 4px 15px var(--accent-glow)'
                    }}
                >
                    {isRecording ? 'Stop Recording' : 'Start Session'}
                </button>

                {!isRecording && transcript && (
                    <button
                        onClick={handleGenerateMoM}
                        disabled={isGenerating}
                        style={{
                            padding: '12px 20px',
                            borderRadius: '12px',
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            border: '1px solid var(--glass-border)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            opacity: isGenerating ? 0.5 : 1
                        }}
                    >
                        {isGenerating ? '...' : '📝 Generate MoM'}
                    </button>
                )}
            </div>

            {/* Results Section */}
            {momResult && (
                <div style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--accent-color)',
                    borderRadius: '16px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    animation: 'fadeIn 0.3s ease'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--accent-color)' }}>Meeting Intelligence</h3>
                        <button onClick={() => setMomResult(null)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>✕</button>
                    </div>

                    <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '4px' }}>Summary</div>
                        <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.4' }}>{momResult.summary}</p>
                    </div>

                    <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '4px' }}>Action Items</div>
                        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px' }}>
                            {momResult.actionItems.map((item, i) => <li key={i} style={{ marginBottom: '4px' }}>{item}</li>)}
                        </ul>
                    </div>
                </div>
            )}

            {/* Transcript Container */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                    Live Transcript
                </label>
                <div style={{
                    flex: 1,
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '12px',
                    padding: '12px',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    border: '1px solid var(--glass-border)',
                    color: transcript ? 'var(--text-main)' : 'var(--text-dim)'
                }}>
                    {transcript || "Transcription will appear here..."}
                </div>
            </div>

            <style>{`
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.2); opacity: 0.5; }
                    100% { transform: scale(1); opacity: 1; }
                }
                ::-webkit-scrollbar { width: 4px; }
                ::-webkit-scrollbar-thumb { background: var(--glass-border); border-radius: 10px; }
            `}</style>
        </div>
    )
}

export default App;
