export const generateMoMWithGemini = async (audioBlob, apiKey) => {
  // Convert blob to base64
  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result.split(',')[1];
        resolve(base64data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const base64Audio = await blobToBase64(audioBlob);

  const prompt = `
    Analyze the following meeting audio and generate:
    1. A verbatim transcript WITH SPEAKER IDENTIFICATION (e.g., Speaker A, Speaker B).
    2. A structured Minutes of Meeting (MoM).
    3. A list of action items.
    
    The output must BE PROFESSIONAL and CLASSY.
    NO EMOJIS in the output.
    
    You MUST return a valid JSON object with the following structure:
    {
      "transcript": "...", 
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

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: "audio/webm",
              data: base64Audio
            }
          }
        ]
      }],
      generationConfig: {
        response_mime_type: "application/json"
      }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Gemini processing failed');
  }

  const result = await response.json();
  const text = result.candidates[0].content.parts[0].text;
  return JSON.parse(text);
};
