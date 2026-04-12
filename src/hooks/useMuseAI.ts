import { useState, useCallback } from 'react';
import { GoogleGenAI, Type } from "@google/genai";

// 1. 환경 변수 참조를 Vite 방식(import.meta.env)으로 수정하고, 키가 있을 때만 생성
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export function useMuseAI(address: string | null) {
  const [isGenerating, setIsGenerating] = useState(false);

  const getCoachAdvice = useCallback(async (museData: any, missions: any[]) => {
    // 2. 주소나 AI 객체가 없으면 에러를 내지 않고 기본 메시지 반환
    if (!address || !ai) {
      console.warn("AI Key is missing or address is null");
      return "오늘도 힘내세요! 당신의 Muse가 기다리고 있어요♡";
    }

    try {
      const prompt = `
        You are an AI Idol Coach for a Muse character named "${museData.name}".
        Current Stats: Level ${museData.level}, Charm ${museData.charm}, Talent ${museData.talent}, Fanbase ${museData.fanbase}.
        Today's Mission Progress: ${JSON.stringify(missions)}.
        
        Provide a short, encouraging, and cute anime-style dialogue (max 2 sentences).
        Give specific advice based on their stats or mission progress.
        Use emojis and a friendly "waifu/idol" tone.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash", // 모델명을 안정적인 버전으로 수정
        contents: prompt,
      });

      return response.text;
    } catch (error) {
      console.error('Coach AI Error:', error);
      return "오늘도 힘내세요! 당신의 Muse가 기다리고 있어요♡";
    }
  }, [address]);

  const generateMuseImage = useCallback(async (concept: string) => {
    if (!address || !ai) return null; // ai 체크 추가
    setIsGenerating(true);
    try {
      const prompt = `A cute anime-style girl idol character, ${concept}, high quality, vibrant colors, detailed background, masterpiece.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash', // 이미지 생성 모델명이 프로젝트 설정과 맞는지 확인 필요
        contents: {
          parts: [{ text: prompt }],
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
    if (!address || !ai) return null; // ai 체크 추가
    try {
      const prompt = `
        Write a short "Growth Story" episode for an idol Muse named "${name}" who just reached Level ${level}.
        The story should be about a specific event (e.g., first street performance, recording a song, meeting a fan).
        Tone: Emotional, inspiring, anime-style.
        Return as JSON: { "title": "Episode Title", "content": "Story content..." }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: prompt,
      });

     return JSON.parse(response.text);
    } catch (error) {
       return "오늘도 힘내세요! 당신의 Muse가 기다리고 있어요♡";;
    }
  }, [address]);

  return {
    isGenerating,
    getCoachAdvice,
    generateMuseImage,
    getStory
  };
}
"오늘도 힘내세요! 당신의 Muse가 기다리고 있어요♡";