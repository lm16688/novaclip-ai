
import { GoogleGenAI, Type } from "@google/genai";
import { SubtitleSegment, SubtitleLanguage } from "../types";

/**
 * Use Gemini AI to analyze video content with extreme synchronization precision.
 * Optimized for redundancy/silence removal and filler word filtering.
 */
export const analyzeVideoWithGemini = async (
  videoFile: File,
  targetLanguage: SubtitleLanguage,
  onProgress: (msg: string) => void
): Promise<SubtitleSegment[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  onProgress("Initializing semantic scanning engine...");
  
  // For large videos, we should be careful with base64. 
  // However, in a pure frontend environment, we are limited.
  // We'll try to process the file directly if possible, or use base64 as a fallback.
  const base64Video = await fileToBase64(videoFile);

  onProgress(`Analyzing video content (Target: ${targetLanguage})...`);
  
  const languagePrompt = targetLanguage === SubtitleLanguage.AUTO 
    ? "Detect the spoken language automatically." 
    : `Transcribe and translate the content into ${targetLanguage}.`;

  try {
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
            text: `Act as a professional cinematic editor and expert linguist. Perform high-precision transcription, semantic pruning, and synchronization for this video.

              ${languagePrompt}

              CRITICAL REQUIREMENTS:
              1. AUTOMATIC PRUNING:
                 - Identify and REMOVE all "invalid" segments: silence (>0.5s), background noise, non-speech sounds.
                 - Identify and REMOVE all filler words and redundancy (e.g., 'um', 'uh', 'like', 'you know', '呃', '那个', '然后', '就是').
                 - If a segment contains ONLY filler words or is semantically empty, mark "isRedundant": true.
              
              2. PRECISION SYNCHRONIZATION:
                 - 'startTime' MUST align exactly with the first audible syllable of meaningful speech.
                 - 'endTime' MUST align exactly with the end of the last meaningful syllable.
                 - Ensure NO drift throughout the video, even for long durations.
              
              3. SEMANTIC SEGMENTATION:
                 - Break segments at natural semantic pauses or punctuation.
                 - Each segment should be a complete or meaningful partial thought.
                 - Maximum 15 words per segment for readability.
              
              4. LARGE VIDEO HANDLING:
                 - Analyze the ENTIRE video duration provided. 
                 - Ensure every spoken word is accounted for or intentionally pruned.

              Return a strictly valid JSON array of objects: 
              [{"id":"uuid","startTime":number,"endTime":number,"text":"string","isRedundant":boolean,"confidence":number}]`,
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
              confidence: { type: Type.NUMBER },
            },
            required: ["id", "startTime", "endTime", "text", "isRedundant"],
          },
        },
      },
    });

    const text = response.text;
    const parsed = JSON.parse(text?.trim() || "[]");
    
    // Sort by time to ensure timeline consistency
    return parsed.sort((a: any, b: any) => a.startTime - b.startTime);
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error?.message || "AI Analysis failed. Please check your API Key and file format.");
  }
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
