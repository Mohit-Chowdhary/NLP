import React, { useState, useEffect } from 'react';
import { Calendar, CheckSquare, Clock, Layout, Play, Square, History, Settings, FileText, User, AlertCircle } from 'lucide-react';

function App() {
    const [isRecording, setIsRecording] = useState(false);
    const [status, setStatus] = useState('Ready');
    const [lastMoM, setLastMoM] = useState(null);
    const [apiKey, setApiKey] = useState('');

    useEffect(() => {
        // Load initial state
        chrome.storage.local.get(['isRecording', 'status', 'lastMoM', 'openai_api_key'], (result) => {
            setIsRecording(result.isRecording || false);
            setStatus(result.status || 'Ready');
            setLastMoM(result.lastMoM || null);
            setApiKey(result.openai_api_key || '');
        });

        // Listen for storage changes
        const listener = (changes) => {
            if (changes.isRecording) setIsRecording(changes.isRecording.newValue);
            if (changes.status) setStatus(changes.status.newValue);
            if (changes.lastMoM) setLastMoM(changes.lastMoM.newValue);
        };
        chrome.storage.onChanged.addListener(listener);
        return () => chrome.storage.onChanged.removeListener(listener);
    }, []);

    const saveApiKey = () => {
        const key = prompt('Enter your OpenAI API Key:');
        if (key) {
            chrome.storage.local.set({ openai_api_key: key });
            setApiKey(key);
        }
    };

    return (
        <div className="container">
            <header className="header">
                <h1 className="title">Smart MoM</h1>
                <div className="status-indicator">
                    <div className={`status-dot ${isRecording ? 'active' : ''}`}></div>
                    <span>{status}</span>
                </div>
            </header>

            <main style={{ padding: '0 1rem' }}>
                {!apiKey && (
                    <div className="card" style={{ borderColor: '#f59e0b' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b', fontSize: '0.875rem', fontWeight: '700' }}>
                            <AlertCircle size={16} />
                            API KEY REQUIRED
                        </div>
                        <button className="button" style={{ marginTop: '0.5rem', width: '100%', backgroundColor: '#f59e0b', borderBottomColor: '#d97706' }} onClick={saveApiKey}>
                            Set OpenAI Key
                        </button>
                    </div>
                )}

                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h2 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>SESSION CONTROL</h2>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Status: {status}</p>
                        </div>
                    </div>
                    {apiKey ? (
                        <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>API Key: ••••••••{apiKey.slice(-4)}</span>
                            <button
                                onClick={saveApiKey}
                                style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: '700', fontSize: '0.625rem' }}
                            >
                                CHANGE
                            </button>
                        </div>
                    ) : (
                        <div style={{ marginTop: '1rem' }}>
                            <button className="button" style={{ width: '100%', backgroundColor: '#f59e0b', borderBottomColor: '#d97706' }} onClick={saveApiKey}>
                                SET OPENAI KEY
                            </button>
                        </div>
                    )}
                </div>

                {lastMoM && (
                    <div className="card">
                        <h2 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--accent-primary)', marginBottom: '1rem' }}>LATEST MINUTES</h2>
                        <div style={{ fontSize: '0.875rem' }}>
                            <div style={{ marginBottom: '0.5rem' }}>
                                <strong style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>SUMMARY</strong>
                                {lastMoM.mom.summary}
                            </div>
                            <div>
                                <strong style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>ACTION ITEMS</strong>
                                {lastMoM.actionItems.map((item, i) => (
                                    <div key={i} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                                        {item.owner}: {item.task}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                    <div className="card" style={{ textAlign: 'center' }}>
                        <Calendar size={24} style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem' }} />
                        <div style={{ fontSize: '1.5rem', fontWeight: '800' }}>{lastMoM?.actionItems?.length || 0}</div>
                        <div style={{ fontSize: '0.625rem', color: 'var(--text-secondary)', fontWeight: '700' }}>DETECTED TASKS</div>
                    </div>
                    <div className="card" style={{ textAlign: 'center' }}>
                        <History size={24} style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem' }} />
                        <div style={{ fontSize: '1.5rem', fontWeight: '800' }}>-</div>
                        <div style={{ fontSize: '0.625rem', color: 'var(--text-secondary)', fontWeight: '700' }}>PAST MEETINGS</div>
                    </div>
                </div>
            </main>

            <footer style={{ marginTop: '2rem', padding: '1rem', borderTop: '2px solid var(--border-color)', textAlign: 'center', fontSize: '0.625rem', color: 'var(--text-secondary)' }}>
                SMART MOM V0.1.0 // CLASSY BOXY UI
            </footer>
        </div>
    );
}

export default App;
