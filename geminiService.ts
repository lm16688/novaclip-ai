import { GoogleGenAI, Type } from "@google/genai";
import { SubtitleSegment } from "../types";

/**
 * Use Gemini AI to analyze video content with extreme synchronization precision.
 * Enhanced with better redundancy detection and filler word removal.
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
            text: `Perform a professional-grade video transcription with advanced cleanup and synchronization:
              
              1. TRANSCRIPTION & CLEANUP:
                 - Extract every spoken word with 100% verbal fidelity
                 - AUTOMATICALLY REMOVE filler words (um, uh, like, you know, sort of, kind of, actually, basically, literally, right, okay, so, well, I mean)
                 - Remove stutters and repetitions (e.g., "I I I want" -> "I want")
                 - Trim leading/trailing dead air
                 - Merge short phrases for natural readability
                 - Keep essential punctuation for flow
              
              2. FRAME-PERFECT SYNC: 
                 - 'startTime': Must align exactly with the initial pressure wave of the first phoneme
                 - 'endTime': Must align exactly with the atmospheric decay of the final syllable
                 - Cross-reference visual lip movement (if visible) to verify audio onset
                 - Compensate for model look-ahead buffer (target accuracy: ±10ms)
              
              3. INTELLIGENT REDUNDANCY DETECTION:
                 - Flag segments with ZERO semantic value
                 - Detect and mark silent pauses > 0.5 seconds
                 - Identify non-essential filler words for removal
                 - Mark semantically redundant phrases
                 - Calculate confidence score based on audio clarity and lip sync
              
              4. SMART SEGMENTATION:
                 - Break into readable chunks (max 8-10 words)
                 - Follow natural prosodic boundaries
                 - Keep related words together
                 - Ensure each segment has semantic meaning
              
              Return a strictly formatted JSON array: 
              [{"id":"uuid","startTime":number,"endTime":number,"text":"string","isRedundant":boolean,"confidence":number}]
              
              IMPORTANT: 
              - Set isRedundant=true for filler-only segments or pure silence
              - Clean text should have filler words removed
              - Confidence < 0.6 indicates uncertain transcription
              - Timestamps must be precise to 2 decimal places`,
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
    let segments: SubtitleSegment[] = JSON.parse(text?.trim() || "[]");
    
    // Post-process segments for additional cleanup
    segments = segments.map(seg => ({
      ...seg,
      // Additional confidence-based filtering
      isRedundant: seg.isRedundant || seg.confidence < 0.4,
      // Ensure text is clean
      text: cleanText(seg.text)
    })).filter(seg => 
      // Filter out very low confidence segments
      seg.confidence > 0.3 && 
      // Remove empty segments
      seg.text.trim().length > 0 &&
      // Remove extremely short segments
      (seg.endTime - seg.startTime) > 0.3
    );
    
    onProgress(`Found ${segments.length} meaningful segments after cleanup`);
    return segments;
    
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "AI Analysis failed. Please check your API Key and network connection.");
  }
};

/**
 * Additional text cleaning for filler words
 */
const cleanText = (text: string): string => {
  const fillerWords = [
    /\bum+\b/gi, /\buh+\b/gi, /\blike\b/gi, /\byou know\b/gi, 
    /\bsort of\b/gi, /\bkind of\b/gi, /\bactually\b/gi, /\bbasically\b/gi,
    /\bliterally\b/gi, /\bright\b/gi, /\bokay\b/gi, /\bso\b/gi, 
    /\bwell\b/gi, /\bi mean\b/gi, /\byeah\b/gi, /\bno\b/gi,
    /\bthe\s+\1\b/gi, // Repeated "the the"
    /\b(\w+)\s+\1\b/gi // Any repeated word
  ];
  
  let cleaned = text;
  fillerWords.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });
  
  // Clean up multiple spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // Clean up punctuation
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