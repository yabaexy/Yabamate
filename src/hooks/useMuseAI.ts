import { useState, useCallback } from 'react';
import { GoogleGenAI, Type } from "@google/genai";

// 1. 중복 선언을 제거하고 하나로 합칩니다.
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export function useMuseAI(address: string | null) {
  const [isGenerating, setIsGenerating] = useState(false);

  const getCoachAdvice = useCallback(async (museData: any, missions: any[]) => {
    // 2. ai 객체가 없으면 바로 종료하여 에러를 방지합니다.
    if (!address || !ai) return "오늘도 힘내세요! 당신의 Muse가 기다리고 있어요♡";
    
    try {
      const prompt = `
        You are an AI Idol Coach for a Muse character named "${museData.name}".
        Current Stats: Level ${museData.level}, Charm ${museData.charm}, Talent ${museData.talent}, Fanbase ${museData.fanbase}.
        Today's Mission Progress: ${JSON.stringify(missions)}.
        
        Provide a short, encouraging, and cute anime-style dialogue (max 2 sentences).
        Give specific advice based on their stats or mission progress.
        Use emojis and a friendly "waifu/idol" tone.
      `;

      // 3. ai.models 사용 시 ai가 null이 아님을 확실히 합니다.
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview", // 모델명이 정확한지 확인 필요 (일반적으로 gemini-1.5-flash 등)
        contents: prompt,
      });

      return response.text;
    } catch (error) {
      console.error('Coach AI Error:', error);
      return "오늘도 힘내세요! 당신의 Muse가 기다리고 있어요♡";
    }
  }, [address]);

  // generateMuseImage, getStory, getRecommendedMission 함수들도 
  // 내부에서 if (!ai) return null; 처리를 반드시 추가해주어야 합니다.

  return {
    isGenerating,
    getCoachAdvice,
    generateMuseImage,
    getStory,
    getRecommendedMission
  };
}
