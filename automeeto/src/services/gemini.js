const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

export async function generateMoMWithGemini(transcript) {
    const apiKey = await getApiKey();
    if (!apiKey) throw new Error('Gemini API Key not found. Please set it in settings.');

    const prompt = `
    Convert the following meeting transcript into professionally structured Minutes of Meeting (MoM).
    
    Transcript:
    ${transcript}
    
    Return the response as a JSON object with the following structure:
    {
      "summary": "3-4 sentence overview",
      "actionItems": ["Task 1 - Assigned to X", "Task 2 - Assigned to Y"],
      "decisions": ["Decision 1", "Decision 2"],
      "discussionPoints": ["Point 1", "Point 2"]
    }
  `;

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' }
        })
    });

    const data = await response.json();
    return JSON.parse(data.candidates[0].content.parts[0].text);
}

async function getApiKey() {
    const result = await chrome.storage.local.get(['geminiApiKey']);
    return result.geminiApiKey;
}
