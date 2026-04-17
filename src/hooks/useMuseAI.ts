import { useState, useCallback } from 'react';
import { GoogleGenAI, Type } from '@google/genai';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

type MuseData = {
  name: string;
  level: number;
  charm: number;
  talent: number;
  fanbase: number;
};

export function useMuseAI(address: string | null) {
  const [isGenerating, setIsGenerating] = useState(false);

  const getCoachAdvice = useCallback(async (museData: MuseData, missions: any[]) => {
    if (!address) return null;
    if (!ai) {
      return 'AI 기능이 비활성화되어 있어요. 환경변수 VITE_GEMINI_API_KEY를 설정하면 코치 조언을 사용할 수 있습니다.';
    }

    try {
      const prompt = `
You are an AI Idol Coach for a Muse character named "${museData.name}".
Current Stats: Level ${museData.level}, Charm ${museData.charm}, Talent ${museData.talent}, Fanbase ${museData.fanbase}.
Today's Mission Progress: ${JSON.stringify(missions)}.
Provide a short, encouraging, cute anime-style dialogue (max 2 sentences). Use emojis and a friendly idol tone.
`;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      return response.text;
    } catch (error) {
      console.error('Coach AI Error:', error);
      return '오늘도 힘내세요! 당신의 Muse가 기다리고 있어요♡';
    }
  }, [address]);

  const generateMuseImage = useCallback(async (concept: string) => {
    if (!address) return null;
    if (!ai) return null;

    setIsGenerating(true);
    try {
      const prompt = `A cute anime-style girl idol character, ${concept}, high quality, vibrant colors, detailed background, masterpiece.`;
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }] },
        config: { imageConfig: { aspectRatio: '1:1' } }
      });

      let base64Data = '';
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if ((part as any).inlineData) {
          base64Data = (part as any).inlineData.data;
          break;
        }
      }

      if (base64Data) {
        const saveRes = await fetch('/api/muse/ai/save-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address, prompt: concept, base64Data }),
        });
        const saveData = await saveRes.json();
        return saveData.url ?? null;
      }

      return null;
    } catch (error) {
      console.error('Image AI Error:', error);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [address]);

  const getStory = useCallback(async (level: number, name: string) => {
    if (!address) return null;
    if (!ai) {
      return {
        title: 'AI Story Disabled',
        content: 'VITE_GEMINI_API_KEY가 설정되지 않아 스토리 생성이 비활성화되어 있습니다.'
      };
    }

    try {
      const prompt = `
Write a short "Growth Story" episode for an idol Muse named "${name}" who just reached Level ${level}.
The story should be about a specific event. Tone: emotional, inspiring, anime-style.
Return as JSON: { "title": "Episode Title", "content": "Story content..." }
`;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              content: { type: Type.STRING }
            },
            required: ['title', 'content']
          }
        }
      });

      const story = JSON.parse(response.text);
      await fetch('/api/muse/ai/save-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, level, ...story }),
      });
      return story;
    } catch (error) {
      console.error('Story AI Error:', error);
      return null;
    }
  }, [address]);

  const getRecommendedMission = useCallback(async (museData: MuseData) => {
    if (!address) return null;
    if (!ai) {
      return {
        challenge: 'AI 기능이 비활성화되어 있습니다.',
        reward: '0 YMP'
      };
    }

    try {
      const prompt = `
Based on a Muse with Level ${museData.level} and stats (Charm: ${museData.charm}, Talent: ${museData.talent}),
recommend a "Special AI Challenge" for today.
Return as JSON: { "challenge": "Challenge description", "reward": "Reward description" }
`;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              challenge: { type: Type.STRING },
              reward: { type: Type.STRING }
            },
            required: ['challenge', 'reward']
          }
        }
      });
      return JSON.parse(response.text);
    } catch (error) {
      console.error('Recommendation AI Error:', error);
      return null;
    }
  }, [address]);

  return { isGenerating, getCoachAdvice, generateMuseImage, getStory, getRecommendedMission };
}
