import { GoogleGenAI, Type } from "@google/genai";
import { SubtitleSegment } from "../types";

const CHUNK_SIZE = 25 * 1024 * 1024; // 25MB chunks for processing
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

/**
 * Enhanced video analysis with chunking for large files
 */
export const analyzeVideoWithGemini = async (
  videoFile: File,
  targetLanguage: string,
  onProgress: (msg: string, progress?: number) => void
): Promise<SubtitleSegment[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  onProgress("Initializing high-precision analysis...", 0);
  
  try {
    // Check file size and process in chunks if needed
    if (videoFile.size > CHUNK_SIZE) {
      return await analyzeLargeVideo(videoFile, targetLanguage, ai, onProgress);
    } else {
      return await analyzeSingleVideo(videoFile, targetLanguage, ai, onProgress);
    }
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "AI Analysis failed. Please check your API Key and network connection.");
  }
};

/**
 * Analyze large video by splitting into chunks
 */
const analyzeLargeVideo = async (
  videoFile: File,
  targetLanguage: string,
  ai: GoogleGenAI,
  onProgress: (msg: string, progress?: number) => void
): Promise<SubtitleSegment[]> => {
  onProgress("Large video detected. Processing in chunks...", 5);
  
  // Extract audio for better processing
  const audioBlob = await extractAudioFromVideo(videoFile, onProgress);
  
  // Split audio into chunks
  const audioChunks = splitAudioIntoChunks(audioBlob, 60); // 60-second chunks
  const totalChunks = audioChunks.length;
  
  let allSegments: SubtitleSegment[] = [];
  let timeOffset = 0;
  
  for (let i = 0; i < audioChunks.length; i++) {
    const chunkProgress = 10 + Math.floor((i / totalChunks) * 70);
    onProgress(`Processing chunk ${i + 1}/${totalChunks}...`, chunkProgress);
    
    const chunkSegments = await analyzeAudioChunk(
      audioChunks[i],
      targetLanguage,
      ai,
      timeOffset,
      i
    );
    
    // Merge overlapping segments at chunk boundaries
    allSegments = mergeSegmentsAtBoundaries(allSegments, chunkSegments);
    
    // Update time offset for next chunk
    timeOffset += await getAudioDuration(audioChunks[i]);
  }
  
  // Final cleanup and deduplication
  onProgress("Finalizing analysis and removing duplicates...", 85);
  const finalSegments = postProcessSegments(allSegments);
  
  onProgress(`Analysis complete! Found ${finalSegments.length} meaningful segments`, 100);
  return finalSegments;
};

/**
 * Extract audio from video for better processing
 */
const extractAudioFromVideo = async (
  videoFile: File,
  onProgress: (msg: string, progress?: number) => void
): Promise<Blob> => {
  onProgress("Extracting audio for analysis...", 2);
  
  return new Promise((resolve, reject) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const video = document.createElement('video');
    video.src = URL.createObjectURL(videoFile);
    
    video.onloadedmetadata = () => {
      const duration = video.duration;
      const sampleRate = 16000; // 16kHz for speech
      const totalSamples = Math.floor(duration * sampleRate);
      
      // Create offline context for extraction
      const offlineCtx = new OfflineAudioContext(1, totalSamples, sampleRate);
      
      const source = offlineCtx.createMediaElementSource(video);
      source.connect(offlineCtx.destination);
      
      video.play();
      
      offlineCtx.startRendering().then(renderedBuffer => {
        video.pause();
        URL.revokeObjectURL(video.src);
        
        // Convert to WAV blob
        const wavBlob = audioBufferToWav(renderedBuffer);
        resolve(wavBlob);
      }).catch(reject);
    };
    
    video.onerror = reject;
  });
};

/**
 * Convert AudioBuffer to WAV blob
 */
const audioBufferToWav = (buffer: AudioBuffer): Blob => {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  
  const dataLength = buffer.length * blockAlign;
  const headerLength = 44;
  const totalLength = headerLength + dataLength;
  
  const arrayBuffer = new ArrayBuffer(totalLength);
  const view = new DataView(arrayBuffer);
  
  // WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, totalLength - 8, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, format, true); // audio format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); // byte rate
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);
  
  // Write audio data
  const channelData = buffer.getChannelData(0);
  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    const sample = Math.max(-1, Math.min(1, channelData[i]));
    const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    view.setInt16(offset, intSample, true);
    offset += 2;
  }
  
  return new Blob([arrayBuffer], { type: 'audio/wav' });
};

const writeString = (view: DataView, offset: number, string: string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

/**
 * Split audio blob into chunks
 */
const splitAudioIntoChunks = (audioBlob: Blob, chunkDurationSeconds: number): Blob[] => {
  // This is a simplified version - in production, you'd need proper audio splitting
  return [audioBlob]; // Placeholder - implement actual splitting
};

/**
 * Get audio duration in seconds
 */
const getAudioDuration = (audioBlob: Blob): Promise<number> => {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.src = URL.createObjectURL(audioBlob);
    audio.onloadedmetadata = () => {
      resolve(audio.duration);
      URL.revokeObjectURL(audio.src);
    };
  });
};

/**
 * Analyze single video chunk
 */
const analyzeAudioChunk = async (
  audioChunk: Blob,
  targetLanguage: string,
  ai: GoogleGenAI,
  timeOffset: number,
  chunkIndex: number
): Promise<SubtitleSegment[]> => {
  const base64Audio = await blobToBase64(audioChunk);
  
  const prompt = createAnalysisPrompt(targetLanguage, timeOffset, chunkIndex);
  
  const response = await ai.models.generateContent({
    model: "gemini-1.5-flash",
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: "audio/wav",
            data: base64Audio.split(',')[1],
          },
        },
        { text: prompt },
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
            originalText: { type: Type.STRING },
            isRedundant: { type: Type.BOOLEAN },
            confidence: { type: Type.NUMBER },
            speakers: { type: Type.ARRAY, items: { type: Type.STRING } },
            emotions: { type: Type.ARRAY, items: { type: Type.STRING } },
            keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["id", "startTime", "endTime", "text", "isRedundant", "confidence"],
        },
      },
    },
  });

  const text = response.text;
  let segments: SubtitleSegment[] = JSON.parse(text?.trim() || "[]");
  
  // Adjust timestamps with offset
  segments = segments.map(seg => ({
    ...seg,
    startTime: seg.startTime + timeOffset,
    endTime: seg.endTime + timeOffset,
    language: targetLanguage,
  }));
  
  return segments;
};

/**
 * Create analysis prompt based on target language
 */
const createAnalysisPrompt = (targetLanguage: string, timeOffset: number, chunkIndex: number): string => {
  const languageMap: Record<string, string> = {
    'en': 'English',
    'zh': 'Chinese (Mandarin)',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'ja': 'Japanese',
    'ko': 'Korean',
    'ru': 'Russian',
    'ar': 'Arabic',
    'hi': 'Hindi'
  };
  
  const targetLangName = languageMap[targetLanguage] || targetLanguage;
  
  return `Perform professional-grade audio transcription with advanced cleanup and synchronization:

  CHUNK INFORMATION:
  - Chunk Index: ${chunkIndex}
  - Time Offset: ${timeOffset} seconds
  - Target Language: ${targetLangName}
  
  1. TRANSCRIPTION & CLEANUP:
     - Transcribe speech in ${targetLangName} with 100% accuracy
     - AUTOMATICALLY REMOVE filler words (um, uh, like, you know, sort of, etc.)
     - Remove stutters and repetitions
     - Trim leading/trailing dead air
     - Keep original text for reference
     - Detect multiple speakers if present
  
  2. FRAME-PERFECT SYNC: 
     - 'startTime': Must align exactly with speech onset (relative to chunk start)
     - 'endTime': Must align exactly with speech end
     - Target accuracy: ±10ms
     - Account for the ${timeOffset} second offset when returning timestamps
  
  3. INTELLIGENT ANALYSIS:
     - Detect semantic importance (isRedundant=false for meaningful content)
     - Identify speaker changes
     - Detect emotional tone
     - Extract key topics/keywords
     - Calculate confidence score based on audio clarity
  
  4. SMART SEGMENTATION:
     - Break into readable chunks (max 10 words)
     - Follow natural speech boundaries
     - Keep related words together
     - Ensure each segment has semantic meaning
  
  Return JSON array with enhanced metadata:
  [{
    "id": "uuid",
    "startTime": number (relative to chunk start),
    "endTime": number,
    "text": "string (cleaned text in ${targetLangName})",
    "originalText": "string (original transcription before cleaning)",
    "isRedundant": boolean,
    "confidence": number (0-1),
    "speakers": ["speaker1", "speaker2"],
    "emotions": ["neutral", "excited"],
    "keywords": ["keyword1", "keyword2"]
  }]`;
};

/**
 * Analyze single video file
 */
const analyzeSingleVideo = async (
  videoFile: File,
  targetLanguage: string,
  ai: GoogleGenAI,
  onProgress: (msg: string, progress?: number) => void
): Promise<SubtitleSegment[]> => {
  onProgress("Extracting audio for analysis...", 10);
  const audioBlob = await extractAudioFromVideo(videoFile, onProgress);
  
  onProgress("Analyzing audio content...", 30);
  const base64Audio = await blobToBase64(audioBlob);
  
  const prompt = createAnalysisPrompt(targetLanguage, 0, 0);
  
  onProgress("AI processing with semantic analysis...", 50);
  
  const response = await ai.models.generateContent({
    model: "gemini-1.5-flash",
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: "audio/wav",
            data: base64Audio.split(',')[1],
          },
        },
        { text: prompt },
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
            originalText: { type: Type.STRING },
            isRedundant: { type: Type.BOOLEAN },
            confidence: { type: Type.NUMBER },
            speakers: { type: Type.ARRAY, items: { type: Type.STRING } },
            emotions: { type: Type.ARRAY, items: { type: Type.STRING } },
            keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["id", "startTime", "endTime", "text", "isRedundant", "confidence"],
        },
      },
    },
  });

  const text = response.text;
  let segments: SubtitleSegment[] = JSON.parse(text?.trim() || "[]");
  
  onProgress("Post-processing and cleaning segments...", 80);
  segments = postProcessSegments(segments);
  
  onProgress(`Analysis complete! Found ${segments.length} meaningful segments`, 100);
  return segments;
};

/**
 * Post-process segments for cleanup
 */
const postProcessSegments = (segments: SubtitleSegment[]): SubtitleSegment[] => {
  // Sort by start time
  segments.sort((a, b) => a.startTime - b.startTime);
  
  // Remove duplicates and overlapping segments
  const uniqueSegments: SubtitleSegment[] = [];
  for (let i = 0; i < segments.length; i++) {
    const current = segments[i];
    
    // Skip if redundant or low confidence
    if (current.isRedundant || current.confidence < 0.4) {
      continue;
    }
    
    // Check for overlap with previous segment
    if (uniqueSegments.length > 0) {
      const prev = uniqueSegments[uniqueSegments.length - 1];
      if (current.startTime < prev.endTime + 0.1) {
        // Merge or skip overlapping segment
        if (current.confidence > prev.confidence) {
          uniqueSegments[uniqueSegments.length - 1] = current;
        }
        continue;
      }
    }
    
    // Clean text
    current.text = cleanText(current.text);
    
    // Ensure minimum duration
    if (current.endTime - current.startTime >= 0.3) {
      uniqueSegments.push(current);
    }
  }
  
  return uniqueSegments;
};

/**
 * Merge segments at chunk boundaries
 */
const mergeSegmentsAtBoundaries = (
  existingSegments: SubtitleSegment[],
  newSegments: SubtitleSegment[]
): SubtitleSegment[] => {
  const merged = [...existingSegments];
  
  for (const newSeg of newSegments) {
    // Check for overlap at boundary (within 0.5 seconds)
    const overlappingIndex = merged.findIndex(
      seg => Math.abs(seg.endTime - newSeg.startTime) < 0.5
    );
    
    if (overlappingIndex >= 0) {
      // Merge overlapping segments
      const existing = merged[overlappingIndex];
      if (newSeg.confidence > existing.confidence) {
        merged[overlappingIndex] = {
          ...newSeg,
          startTime: Math.min(existing.startTime, newSeg.startTime),
          endTime: Math.max(existing.endTime, newSeg.endTime),
        };
      }
    } else {
      merged.push(newSeg);
    }
  }
  
  return merged;
};

/**
 * Clean text by removing filler words
 */
const cleanText = (text: string): string => {
  const fillerWords = [
    /\bum+\b/gi, /\buh+\b/gi, /\blike\b/gi, /\byou know\b/gi, 
    /\bsort of\b/gi, /\bkind of\b/gi, /\bactually\b/gi, /\bbasically\b/gi,
    /\bliterally\b/gi, /\bright\b/gi, /\bokay\b/gi, /\bso\b/gi, 
    /\bwell\b/gi, /\bi mean\b/gi, /\byeah\b/gi, /\bno\b/gi,
    /\bthe\s+\1\b/gi, /\b(\w+)\s+\1\b/gi
  ];
  
  let cleaned = text;
  fillerWords.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });
  
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  cleaned = cleaned.replace(/\s+([.,!?])/g, '$1');
  
  return cleaned;
};

/**
 * Convert blob to base64
 */
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
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