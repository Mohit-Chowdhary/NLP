export const generateMoM = async (transcript, apiKey) => {
    const prompt = `
    Analyze the following meeting transcript and generate a structured Minutes of Meeting (MoM) and a list of action items.
    
    The output must BE PROFESSIONAL and CLASSY.
    NO EMOJIS in the output.
    
    Transcript:
    ${transcript}
    
    JSON Output Format:
    {
      "mom": {
        "date": "...",
        "attendees": ["..."],
        "agenda": "...",
        "decisions": ["..."],
        "summary": "..."
      },
      "actionItems": [
        {
          "task": "...",
          "owner": "...",
          "deadline": "...",
          "priority": "High/Medium/Low"
        }
      ]
    }
  `;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: 'You are a professional secretary specializing in precision meeting minutes.' },
                { role: 'user', content: prompt }
            ],
            response_format: { type: 'json_object' }
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Summarization failed');
    }

    const result = await response.json();
    return JSON.parse(result.choices[0].message.content);
};
