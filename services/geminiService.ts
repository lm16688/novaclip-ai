
import { GoogleGenAI, Type } from "@google/genai";
import { SubtitleSegment } from "../types";

/**
 * Use Gemini AI to analyze video content with extreme synchronization precision.
 * Instantiates the client immediately before use to ensure the latest API Key is used.
 */
export const analyzeVideoWithGemini = async (
  videoFile: File,
  onProgress: (msg: string) => void
): Promise<SubtitleSegment[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  onProgress("Initializing high-precision analysis...");
  const base64Video = await fileToBase64(videoFile);

  onProgress("Acoustic wave pattern analysis...");
  
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
            text: `Perform a professional-grade video transcription and 'Frame-Perfect' synchronization:
              1. TRANSCRIPTION: Extract every spoken word with 100% verbal fidelity.
              2. PRECISION SYNC: 
                 - 'startTime': Must align exactly with the initial pressure wave of the first phoneme.
                 - 'endTime': Must align exactly with the atmospheric decay of the final syllable.
                 - CROSS-REFERENCE: Use visual lip movement (if visible) to verify audio onset.
                 - ZERO-LATENCY: Transcription models often have a 100ms-300ms look-ahead buffer; you MUST compensate for this and ensure timestamps are NOT shifted forward. 
                 - Accuracy Target: ±10ms.
              3. REDUNDANCY DETECTION: Flag filler words (um, uh, like) and segments with zero semantic value or dead air.
              4. SEGMENTATION: Break into readable chunks (max 8-10 words) following natural prosodic boundaries.
              
              Return a strictly formatted JSON array: [{"id":"uuid","startTime":number,"endTime":number,"text":"string","isRedundant":boolean,"confidence":number}]`,
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
    return JSON.parse(text?.trim() || "[]");
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "AI Analysis failed. Please check your API Key and network connection.");
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
