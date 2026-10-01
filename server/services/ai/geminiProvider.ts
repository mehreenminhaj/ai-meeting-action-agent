import { GoogleGenAI } from '@google/genai';
import { CONFIG } from '../../config.js';
import { WorkspaceMember } from '../../types.js';
import { EXTRACTION_SYSTEM_PROMPT, buildExtractionUserPrompt } from './prompts.js';
import { MockAIProvider, RawExtractionOutput } from './mockProvider.js';

export class GeminiAIProvider {
  private mockFallback: MockAIProvider;

  constructor() {
    this.mockFallback = new MockAIProvider();
  }

  public async extract(params: {
    transcript: string;
    meetingTitle: string;
    meetingDate?: string;
    timezone: string;
    members: WorkspaceMember[];
  }): Promise<{ data: RawExtractionOutput; providerUsed: string; modelUsed: string }> {
    const apiKey = CONFIG.geminiApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.log('No GEMINI_API_KEY detected. Using High-Fidelity Mock AI Provider.');
      const data = await this.mockFallback.extract(params);
      return { data, providerUsed: 'mock', modelUsed: 'mock-deterministic-v1' };
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = buildExtractionUserPrompt({
        transcript: params.transcript,
        meetingTitle: params.meetingTitle,
        meetingDate: params.meetingDate,
        timezone: params.timezone,
        members: params.members.map((m) => ({
          id: m.id,
          displayName: m.displayName,
          email: m.email,
          aliases: m.aliases,
        })),
      });

      const response = await ai.models.generateContent({
        model: CONFIG.geminiModel || 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction: EXTRACTION_SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          temperature: 0.1, // low temperature for deterministic structured extraction
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error('Empty response from Gemini API');
      }

      const parsed: RawExtractionOutput = JSON.parse(text);
      return {
        data: parsed,
        providerUsed: 'gemini',
        modelUsed: CONFIG.geminiModel || 'gemini-3.8-flash',
      };
    } catch (error) {
      console.warn('Gemini extraction error, falling back to mock provider:', error);
      const data = await this.mockFallback.extract(params);
      return { data, providerUsed: 'mock (fallback)', modelUsed: 'mock-deterministic-v1' };
    }
  }
}
