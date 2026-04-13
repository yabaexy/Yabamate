import { useState, useCallback } from 'react';
import { GoogleGenAI, Type } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export function useMuseAI(address: string | null) {
  const [isGenerating, setIsGenerating] = useState(false);

const getCoachAdvice = useCallback(async (museData: any, missions: any[]) => {
    // [수선 4] ai 객체나 주소가 없으면 즉시 리턴하여 에러 방지
    if (!address || !ai) return "Stay Here!"; 
    
    try {
      const prompt = `
        You are an AI Idol Coach for a Muse character named "${museData.name}".
        Current Stats: Level ${museData.level}, Charm ${museData.charm}, Talent ${museData.talent}, Fanbase ${museData.fanbase}.
        Today's Mission Progress: ${JSON.stringify(missions)}.
        
        Provide a short, encouraging, and cute anime-style dialogue (max 2 sentences).
        Give specific advice based on their stats or mission progress.
        Use emojis and a friendly "waifu/idol" tone.
      `;

      // [수선] 존재하지 않는 'gemini-3' 대신 안정적인 'gemini-1.5-flash' 사용
      const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      const response = await result.response;

      // [수선] .text는 속성이 아니라 함수로 호출해야 하는 경우가 많습니다.
      return response.text(); 
      
    } catch (error) {
      console.error('Coach AI Error:', error);
      return "Your Muse is waiting♡";
    }
  }, [address]);

  const generateMuseImage = useCallback(async (concept: string) => {
    if (!address) return null;
    setIsGenerating(true);
    try {
      const prompt = `A cute anime-style girl idol character, ${concept}, high quality, vibrant colors, detailed background, masterpiece.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1"
          }
        }
      });

      let base64Data = "";
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          base64Data = part.inlineData.data;
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
        return saveData.url;
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
    try {
      const prompt = `
        Write a short "Growth Story" episode for an idol Muse named "${name}" who just reached Level ${level}.
        The story should be about a specific event (e.g., first street performance, recording a song, meeting a fan).
        Tone: Emotional, inspiring, anime-style.
        Return as JSON: { "title": "Episode Title", "content": "Story content..." }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              content: { type: Type.STRING }
            },
            required: ["title", "content"]
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

  const getRecommendedMission = useCallback(async (museData: any) => {
    if (!address) return null;
    try {
      const prompt = `
        Based on a Muse with Level ${museData.level} and stats (Charm: ${museData.charm}, Talent: ${museData.talent}),
        recommend a "Special AI Challenge" for today.
        It should be related to sponsoring creators or interacting with the community.
        Return as JSON: { "challenge": "Challenge description", "reward": "Reward description" }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              challenge: { type: Type.STRING },
              reward: { type: Type.STRING }
            },
            required: ["challenge", "reward"]
          }
        }
      });

      return JSON.parse(response.text);
    } catch (error) {
      console.error('Recommendation AI Error:', error);
      return null;
    }
  }, [address]);

  return {
    isGenerating,
    getCoachAdvice,
    generateMuseImage,
    getStory,
    getRecommendedMission
  };
}