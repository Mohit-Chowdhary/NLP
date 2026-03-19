import { generateMoMWithGemini } from './gemini.js';

/**
 * Centrally manages MoM generation.
 * Currently uses Gemini (Phase 1/2), will be replaced by local models later.
 */
export async function generateMoM(transcript) {
    console.log('Generating MoM for transcript...');
    try {
        // In Phase 1, we use Gemini for everything post-transcription
        const mom = await generateMoMWithGemini(transcript);
        return mom;
    } catch (error) {
        console.error('Error in generateMoM:', error);
        return {
            summary: 'Error generating summary.',
            actionItems: [],
            decisions: []
        };
    }
}
