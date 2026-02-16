import { GoogleGenAI, Type } from "@google/genai";
import { SubtitleSegment } from "../types";

// 支持的语言类型
export type SubtitleLanguage = 'zh' | 'en' | 'ja' | 'ko';

/**
 * 增强版视频分析 - 结合静音检测、画面静止分析和语义理解
 */
export const analyzeVideoWithGemini = async (
  videoFile: File,
  language: SubtitleLanguage,
  onProgress: (msg: string) => void
): Promise<SubtitleSegment[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  onProgress("正在进行多维度视频分析...");
  const base64Video = await fileToBase64(videoFile);

  onProgress("检测音频能量和静音片段...");
  
  try {
    // 语言映射
    const languageMap = {
      zh: 'Chinese (Mandarin)',
      en: 'English',
      ja: 'Japanese',
      ko: 'Korean'
    };

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: videoFile.type,
              data: base64Video.split(',')[1],
            },
          },
          {
            text: `Perform a comprehensive professional-grade video analysis with the following requirements:

            TARGET LANGUAGE: ${languageMap[language]}
            
            1. ADVANCED TRANSCRIPTION:
               - Extract every spoken word with 100% verbal fidelity in ${languageMap[language]}
               - AUTOMATICALLY REMOVE filler words (um, uh, like, you know, sort of, basically, literally, right, okay, so, well, I mean)
               - Remove stutters and repetitions
               - Keep essential punctuation for natural flow
            
            2. AUDIO-BASED SYNC:
               - 'startTime': Must align exactly with the initial sound pressure wave of the first phoneme
               - 'endTime': Must align exactly with the atmospheric decay of the final syllable
               - CRITICAL: When there is NO AUDIO (silence, pauses), DO NOT generate subtitles
               - Set 'hasAudio' = false for silent segments
               - Target accuracy: ±10ms
            
            3. INTELLIGENT INVALID SEGMENT DETECTION:
               Detect and mark segments as 'isInvalid' = true when ANY of these conditions are met:
               
               a) VISUAL STILLNESS: 
                  - Frame content unchanged for > 1 second
                  - Camera locked on static scene with no motion
                  - Blank/black frames
               
               b) AUDIO SILENCE:
                  - No speech detected
                  - Background noise only (no dialogue)
                  - Audio level below threshold
               
               c) SEMANTIC REDUNDANCY:
                  - Filler-only segments (um, uh, etc.)
                  - Zero semantic value phrases
                  - Pure dead air
               
               d) INVALID CONTENT:
                  - Camera switching/glitching
                  - Recording artifacts
                  - Unintentional content (camera drop, etc.)
            
            4. VISUAL MOTION ANALYSIS:
               - Detect scene changes
               - Identify camera movement vs static shots
               - Flag extended static periods (>1s) as potential invalid
            
            5. CONFIDENCE SCORING:
               - Calculate confidence based on:
                 * Audio clarity (0-1)
                 * Visual lip sync (if visible)
                 * Background noise level
                 * Speech clarity
            
            Return a strictly formatted JSON array with enhanced fields:
            [{
              "id": "uuid",
              "startTime": number,      // Precise start time in seconds
              "endTime": number,        // Precise end time in seconds  
              "text": string,            // Cleaned transcript text
              "isRedundant": boolean,    // True for filler words only
              "isInvalid": boolean,      // True for silent/static/invalid segments
              "hasAudio": boolean,       // False for silent segments
              "hasMotion": boolean,      // False for static frames
              "confidence": number,      // 0-1 confidence score
              "sceneType": "dialogue" | "silence" | "static" | "transition"
            }]
            
            IMPORTANT RULES:
            - If hasAudio = false, text should be empty string
            - If hasMotion = false AND hasAudio = false, mark isInvalid = true
            - Segments with confidence < 0.6 should be reviewed
            - Timestamps must be precise to 2 decimal places
            - No subtitles during silent periods`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              startTime: { type: Type.NUMBER },
              endTime: { type: Type.NUMBER },
              text: { type: Type.STRING },
              isRedundant: { type: Type.BOOLEAN },
              isInvalid: { type: Type.BOOLEAN },
              hasAudio: { type: Type.BOOLEAN },
              hasMotion: { type: Type.BOOLEAN },
              confidence: { type: Type.NUMBER },
              sceneType: { type: Type.STRING }
            },
            required: ["id", "startTime", "endTime", "text", "isRedundant", "isInvalid", "hasAudio", "hasMotion", "confidence", "sceneType"],
          },
        },
      },
    });

    const text = response.text;
    let segments: SubtitleSegment[] = JSON.parse(text?.trim() || "[]");
    
    // Post-process segments for additional cleanup
    segments = segments.map(seg => ({
      ...seg,
      // Auto-mark very low confidence as invalid
      isInvalid: seg.isInvalid || seg.confidence < 0.4 || !seg.hasAudio,
      // Empty text for no audio
      text: seg.hasAudio ? cleanText(seg.text, language) : '',
      // Ensure motion flag is set
      hasMotion: seg.hasMotion ?? true
    })).filter(seg => 
      // Filter out segments that are truly invalid
      !seg.isInvalid && 
      seg.hasAudio &&
      seg.text.trim().length > 0 &&
      (seg.endTime - seg.startTime) > 0.3
    );
    
    onProgress(`分析完成！找到 ${segments.length} 个有效片段`);
    return segments;
    
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "AI Analysis failed. Please check your API Key and network connection.");
  }
};

/**
 * 多语言文本清洗
 */
const cleanText = (text: string, language: SubtitleLanguage): string => {
  // 中英文通用填充词
  const fillerWords = [
    /\bum+\b/gi, /\buh+\b/gi, /\blike\b/gi, /\byou know\b/gi, 
    /\bsort of\b/gi, /\bkind of\b/gi, /\bactually\b/gi, /\bbasically\b/gi,
    /\bliterally\b/gi, /\bright\b/gi, /\bokay\b/gi, /\bso\b/gi, 
    /\bwell\b/gi, /\bi mean\b/gi, /\byeah\b/gi, /\bno\b/gi
  ];
  
  // 中文填充词
  const chineseFillers = [
    /呃/g, /啊/g, /嗯/g, /那个/g, /这个/g, /就是/g, /然后/g, /那个/g,
    /对吧/g, /是吧/g, /其实/g, /基本上/g, /可以说/g, /那么/g
  ];
  
  let cleaned = text;
  
  // 根据语言选择清洗规则
  if (language === 'zh') {
    chineseFillers.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });
  } else {
    fillerWords.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });
  }
  
  // 清理重复词
  cleaned = cleaned.replace(/\b(\w+)\s+\1\b/gi, '$1');
  
  // 清理多余空格
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // 清理标点符号
  cleaned = cleaned.replace(/\s+([.,!?])/g, '$1');
  
  return cleaned;
};

/**
 * Convert file to base64
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};