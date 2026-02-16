import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  Upload, 
  Type as FontIcon, 
  CheckCircle, 
  Download, 
  Loader2, 
  AlertCircle,
  Plus,
  Zap,
  RotateCcw,
  RotateCw,
  Trash2,
  Video as VideoIcon,
  Play,
  Layers,
  Settings,
  Palette,
  Maximize2,
  Eye,
  EyeOff,
  Languages,
  GripVertical,
  MonitorPlay,
  Menu,
  X,
  Save,
  Clock,
  Scissors,
  Square,
  Key,
  Undo,
  Redo,
  Info,
  Film,
  Sparkles,
  Volume2,
  Mic,
  Subtitles,
  Activity,
  Radio,
  Globe,
  VolumeX,
  Volume1
} from 'lucide-react';
import { AppStatus, SubtitleSegment, VideoMetadata } from './types';
import { analyzeVideoWithGemini, SubtitleLanguage } from './services/geminiService';

type Language = 'en' | 'zh';

// Video quality presets
type VideoQuality = 'low' | 'medium' | 'high' | 'ultra';

interface QualityPreset {
  label: string;
  bitrate: number;
  resolution: 'source' | '1080p' | '720p' | '480p';
  description: string;
}

const qualityPresets: Record<VideoQuality, QualityPreset> = {
  low: {
    label: 'Low (480p)',
    bitrate: 1000000,
    resolution: '480p',
    description: 'Fast export, smaller file'
  },
  medium: {
    label: 'Medium (720p)',
    bitrate: 2500000,
    resolution: '720p',
    description: 'Balanced quality and size'
  },
  high: {
    label: 'High (1080p)',
    bitrate: 8000000,
    resolution: '1080p',
    description: 'Good quality for sharing'
  },
  ultra: {
    label: 'Ultra (Source)',
    bitrate: 15000000,
    resolution: 'source',
    description: 'Maximum quality'
  }
};

const translations = {
  en: {
    title: 'NovaClip',
    subtitle: 'AI Smart Editor',
    export: 'Export',
    styling: 'Style',
    previewSubs: 'Show Subtitles',
    hideSubs: 'Hide Subtitles',
    clearProject: 'Reset',
    timeline: 'Timeline',
    selectedClips: 'Clips',
    smartSelect: 'Select All',
    aiScanResults: 'AI Transcription',
    createProject: 'New Project',
    scanning: 'AI Analyzing...',
    rendering: 'Composing...',
    exportSuccess: 'Export Ready',
    backToEditor: 'Back',
    downloadNow: 'Download',
    textColor: 'Text',
    strokeColor: 'Outline',
    shadowColor: 'Shadow',
    bgColor: 'Background',
    opacity: 'Opacity',
    shadowBlur: 'Blur',
    size: 'Size',
    weight: 'Weight',
    font: 'Font Family',
    resetDefault: 'Reset',
    captionStyle: 'Sub Styles',
    previewAll: 'Preview All',
    stopPreview: 'Stop',
    editClip: 'Edit Clip',
    editCaption: 'Edit Text',
    saveChange: 'Save & Sync',
    textVideoSync: 'Text-Video Sync',
    dragHint: 'Clips added here',
    systemAlert: 'Alert',
    apiKeyNeeded: 'Set API Key',
    authError: 'Auth Failed. Please re-select API Key.',
    undo: 'Undo',
    redo: 'Redo',
    videoSizeLimit: 'Maximum file size: 500MB',
    supportedFormats: 'Supported: MP4, MOV, AVI, MKV, WebM',
    dropVideo: 'Drop video or click to upload',
    quality: 'Video Quality',
    qualityDescription: 'Higher quality = larger file size',
    processingComplete: 'AI analysis complete! Found {count} segments',
    removingFillerWords: 'Removing filler words and silent pauses...',
    smartCleanup: 'Smart Cleanup Active',
    exportInfo: 'Exporting at {quality} quality',
    clickToSelect: 'Click to select/deselect',
    syncStatus: 'Sync Precision: ±10ms',
    audioSync: 'Audio Sync',
    allSegments: 'All Segments',
    redundant: 'Redundant',
    totalSegments: 'Total: {count} segments',
    syncDrift: 'Sync Drift: {drift}ms',
    ptsOffset: 'PTS Offset',
    subtitleLanguage: 'Subtitle Language',
    chinese: 'Chinese',
    english: 'English',
    japanese: 'Japanese',
    korean: 'Korean',
    silence: 'Silent',
    noAudio: 'No Audio',
    audioDetected: 'Audio Detected',
    invalidSegments: 'Invalid Segments Removed',
    motionStatic: 'Static Frame',
    motionActive: 'Motion Detected'
  },
  zh: {
    title: 'NovaClip',
    subtitle: 'AI 智能剪辑',
    export: '导出视频',
    styling: '样式',
    previewSubs: '显示字幕',
    hideSubs: '关闭字幕',
    clearProject: '重置',
    timeline: '剪辑轴',
    selectedClips: '个片段',
    smartSelect: '智能选取',
    aiScanResults: '转录列表',
    createProject: '开启新项目',
    scanning: 'AI 分析中...',
    rendering: '正在合成',
    exportSuccess: '合成成功',
    backToEditor: '返回编辑',
    downloadNow: '立即下载',
    textColor: '文字颜色',
    strokeColor: '描边颜色',
    shadowColor: '阴影颜色',
    bgColor: '背景底色',
    opacity: '不透明度',
    shadowBlur: '模糊',
    size: '字号',
    weight: '粗细',
    font: '字体库',
    resetDefault: '重置',
    captionStyle: '字幕样式设置',
    previewAll: '全片预览',
    stopPreview: '停止',
    editClip: '剪辑片段',
    editCaption: '编辑文字',
    saveChange: '保存同步',
    textVideoSync: '文剪视频预览',
    dragHint: '请从右侧添加片段',
    systemAlert: '系统提示',
    apiKeyNeeded: '设置 API Key',
    authError: '认证失败，请重新选择有效的 API Key。',
    undo: '撤销',
    redo: '重做',
    videoSizeLimit: '最大文件大小：500MB',
    supportedFormats: '支持格式：MP4, MOV, AVI, MKV, WebM',
    dropVideo: '拖拽视频或点击上传',
    quality: '视频清晰度',
    qualityDescription: '更高清晰度 = 更大文件体积',
    processingComplete: 'AI分析完成！找到 {count} 个片段',
    removingFillerWords: '正在移除语气词和静音部分...',
    smartCleanup: '智能清理已开启',
    exportInfo: '正在以 {quality} 质量导出',
    clickToSelect: '点击选择/取消选择',
    syncStatus: '同步精度: ±10ms',
    audioSync: '音频同步',
    allSegments: '所有片段',
    redundant: '冗余',
    totalSegments: '共 {count} 个片段',
    syncDrift: '同步偏移: {drift}ms',
    ptsOffset: 'PTS偏移',
    subtitleLanguage: '字幕语言',
    chinese: '中文',
    english: '英文',
    japanese: '日文',
    korean: '韩文',
    silence: '静音',
    noAudio: '无音频',
    audioDetected: '有音频',
    invalidSegments: '已移除无效片段',
    motionStatic: '画面静止',
    motionActive: '画面运动'
  }
};

const fontOptions = [
  { label: 'Sans-serif', value: '"Inter", "Microsoft YaHei", sans-serif' },
  { label: 'Serif', value: '"Georgia", "Source Han Serif SC", serif' },
  { label: 'Monospace', value: '"JetBrains Mono", monospace' }
];

const MAX_HISTORY = 50;
const MAX_FILE_SIZE = 500 * 1024 * 1024;
const SUPPORTED_FORMATS = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/webm'];

// 音频能量阈值 - 用于判断是否有声音
const AUDIO_ENERGY_THRESHOLD = 0.01;
const SYNC_TOLERANCE_MS = 10;
const PTS_OFFSET_CHECK_INTERVAL = 1000;

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('zh');
  const t = useMemo(() => translations[lang], [lang]);

  // 字幕语言选择
  const [subtitleLanguage, setSubtitleLanguage] = useState<SubtitleLanguage>('zh');
  const [showLanguagePanel, setShowLanguagePanel] = useState(false);

  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [video, setVideo] = useState<VideoMetadata | null>(null);
  const [segments, setSegments] = useState<SubtitleSegment[]>([]);
  const [selectedSegments, setSelectedSegments] = useState<SubtitleSegment[]>([]);
  
  const [videoQuality, setVideoQuality] = useState<VideoQuality>('high');
  const [showQualityPanel, setShowQualityPanel] = useState(false);
  
  const [history, setHistory] = useState<SubtitleSegment[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const [processingMsg, setProcessingMsg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);
  
  const [isKeySelected, setIsKeySelected] = useState(true);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showStylePanel, setShowStylePanel] = useState(false);

  const [subColor, setSubColor] = useState('#ffffff');
  const [subStrokeColor, setSubStrokeColor] = useState('#000000');
  const [subShadowColor, setSubShadowColor] = useState('#000000');
  const [subBgColor, setSubBgColor] = useState('#000000');
  const [subBgOpacity, setSubBgOpacity] = useState(0.5);
  const [subShadowBlur, setSubShadowBlur] = useState(8);
  const [subSizeScale, setSubSizeScale] = useState(1);
  const [subFontWeight, setSubFontWeight] = useState(700);
  const [subFontFamily, setSubFontFamily] = useState(fontOptions[0].value);
  const [isPreviewSubVisible, setIsPreviewSubVisible] = useState(true);
  
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [tempEditText, setTempEditText] = useState('');
  const [tempStartTime, setTempStartTime] = useState(0);
  const [tempEndTime, setTempEndTime] = useState(0);

  const [currentPreviewText, setCurrentPreviewText] = useState('');
  const [isPreviewingProject, setIsPreviewingProject] = useState(false);
  const [activeClipIndex, setActiveClipIndex] = useState(-1);

  // 音频能量检测
  const [currentAudioLevel, setCurrentAudioLevel] = useState(0);
  const [hasAudioCurrently, setHasAudioCurrently] = useState(true);

  // PTS同步
  const [audioSyncOffset, setAudioSyncOffset] = useState(0);
  const [ptsOffsetHistory, setPtsOffsetHistory] = useState<number[]>([]);
  const [isAudioSynced, setIsAudioSynced] = useState(true);
  const [syncDrift, setSyncDrift] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const modalVideoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef<number>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const lastSyncTimeRef = useRef<number>(0);
  const lastPtsCheckRef = useRef<number>(0);

  const updateSegmentsWithHistory = useCallback((newSegments: SubtitleSegment[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newSegments);
    
    if (newHistory.length > MAX_HISTORY) {
      newHistory.shift();
    } else {
      setHistoryIndex(newHistory.length - 1);
    }
    
    setHistory(newHistory);
    setSelectedSegments(newSegments);
  }, [history, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setSelectedSegments(history[newIndex]);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setSelectedSegments(history[newIndex]);
    }
  }, [history, historyIndex]);

  const ensureAudioEnabled = (v: HTMLVideoElement | null) => {
    if (!v) return;
    v.muted = false;
    v.volume = 1.0;
  };

  useEffect(() => {
    const checkKey = async () => {
      const hasKey = await (window as any).aistudio?.hasSelectedApiKey?.();
      setIsKeySelected(!!hasKey);
    };
    checkKey();
  }, []);

  const handleOpenKeyDialog = async () => {
    await (window as any).aistudio?.openSelectKey?.();
    setIsKeySelected(true);
  };

  const wrapText = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, drawBg: boolean) => {
    const words = text.split('');
    let line = '';
    const lines = [];
    
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        lines.push(line);
        line = words[n];
      } else {
        line = testLine;
      }
    }
    lines.push(line);

    if (drawBg && subBgOpacity > 0) {
      const totalHeight = lines.length * lineHeight;
      const maxLineWidth = Math.max(...lines.map(l => ctx.measureText(l).width));
      const padding = 20;
      const bgX = x - maxLineWidth / 2 - padding;
      const bgY = y - (lines.length - 1) * lineHeight - lineHeight + 5;
      const bgWidth = maxLineWidth + padding * 2;
      const bgHeight = totalHeight + padding;
      
      ctx.save();
      ctx.fillStyle = subBgColor;
      ctx.globalAlpha = subBgOpacity;
      ctx.fillRect(bgX, bgY, bgWidth, bgHeight);
      ctx.restore();
    }

    ctx.save();
    ctx.shadowColor = subShadowColor;
    ctx.shadowBlur = subShadowBlur;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    for (let i = lines.length - 1; i >= 0; i--) {
      const lineY = y - (lines.length - 1 - i) * lineHeight;
      ctx.strokeText(lines[i], x, lineY);
      ctx.fillText(lines[i], x, lineY);
    }
    ctx.restore();
  };

  /**
   * 音频能量检测 - 用于判断是否有声音
   */
  const setupAudioAnalysis = useCallback((videoElement: HTMLVideoElement) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const audioCtx = audioContextRef.current;
    
    if (!analyserRef.current) {
      analyserRef.current = audioCtx.createAnalyser();
      analyserRef.current.fftSize = 256;
    }
    
    if (!sourceRef.current && videoElement) {
      try {
        sourceRef.current = audioCtx.createMediaElementSource(videoElement);
        sourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(audioCtx.destination);
      } catch (e) {
        console.warn('Audio analysis setup failed:', e);
      }
    }
  }, []);

  /**
   * 获取当前音频能量
   */
  const getAudioLevel = useCallback((): number => {
    if (!analyserRef.current) return 0;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const average = sum / dataArray.length;
    const normalizedLevel = average / 255;
    
    return normalizedLevel;
  }, []);

  /**
   * 计算PTS偏移
   */
  const calculatePTSOffset = useCallback((videoElement: HTMLVideoElement): number => {
    if (!videoElement || !videoElement.readyState) return 0;
    
    const currentTime = videoElement.currentTime;
    
    if (audioContextRef.current && audioContextRef.current.state === 'running') {
      const audioTime = audioContextRef.current.currentTime;
      const offset = (currentTime - audioTime) * 1000;
      return offset;
    }
    
    return 0;
  }, []);

  /**
   * 动态同步容差
   */
  const calculateDynamicTolerance = useCallback((): number => {
    if (ptsOffsetHistory.length === 0) return SYNC_TOLERANCE_MS / 1000;
    
    const avg = ptsOffsetHistory.reduce((a, b) => a + b, 0) / ptsOffsetHistory.length;
    const variance = ptsOffsetHistory.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / ptsOffsetHistory.length;
    const stdDev = Math.sqrt(variance);
    
    if (stdDev < 5) {
      return SYNC_TOLERANCE_MS / 1000;
    } else if (stdDev < 15) {
      return (SYNC_TOLERANCE_MS * 2) / 1000;
    } else {
      return (SYNC_TOLERANCE_MS * 3) / 1000;
    }
  }, [ptsOffsetHistory]);

  /**
   * 优化版字幕同步 - 静音时隐藏字幕
   */
  const syncSubtitles = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;

    const now = performance.now();
    const currentTime = v.currentTime;
    
    // 检测音频能量
    const audioLevel = getAudioLevel();
    setCurrentAudioLevel(audioLevel);
    const hasAudio = audioLevel > AUDIO_ENERGY_THRESHOLD;
    setHasAudioCurrently(hasAudio);
    
    // PTS偏移检查
    if (now - lastPtsCheckRef.current > PTS_OFFSET_CHECK_INTERVAL) {
      lastPtsCheckRef.current = now;
      
      const ptsOffset = calculatePTSOffset(v);
      setPtsOffsetHistory(prev => {
        const newHistory = [...prev, ptsOffset];
        return newHistory.slice(-10);
      });
      
      if (ptsOffsetHistory.length > 0) {
        const avgOffset = ptsOffsetHistory.reduce((a, b) => a + b, 0) / ptsOffsetHistory.length;
        setSyncDrift(Math.round(avgOffset));
        setIsAudioSynced(Math.abs(avgOffset) < 30);
      }
    }
    
    if (isPreviewingProject && selectedSegments.length > 0) {
      const currentClip = selectedSegments[activeClipIndex];
      if (currentClip) {
        const tolerance = calculateDynamicTolerance();
        const adjustedEndTime = currentClip.endTime - tolerance;
        
        if (currentTime >= adjustedEndTime) {
          if (activeClipIndex < selectedSegments.length - 1) {
            const nextIdx = activeClipIndex + 1;
            const nextClip = selectedSegments[nextIdx];
            
            setActiveClipIndex(nextIdx);
            
            const ptsOffset = ptsOffsetHistory.length > 0 
              ? ptsOffsetHistory[ptsOffsetHistory.length - 1] / 1000 
              : 0;
            v.currentTime = Math.max(0, nextClip.startTime + ptsOffset);
            
            v.play().catch(() => {});
          } else {
            setIsPreviewingProject(false);
            v.pause();
          }
        } else if (currentTime < currentClip.startTime - tolerance) {
          const ptsOffset = ptsOffsetHistory.length > 0 
            ? ptsOffsetHistory[ptsOffsetHistory.length - 1] / 1000 
            : 0;
          v.currentTime = Math.max(0, currentClip.startTime + ptsOffset);
        }
      } else {
        setIsPreviewingProject(false);
      }
    }

    // 查找当前应该显示的字幕 - 关键逻辑：只有有音频时才显示字幕
    const tolerance = calculateDynamicTolerance();
    
    const searchSegments = isPreviewingProject && activeClipIndex !== -1
      ? [selectedSegments[activeClipIndex]]
      : segments;
    
    // 根据音频能量决定是否显示字幕
    let newText = '';
    
    if (hasAudio) {
      // 有音频时才查找匹配的字幕
      const activeSeg = searchSegments.find(s => {
        const ptsOffset = ptsOffsetHistory.length > 0 
          ? ptsOffsetHistory[ptsOffsetHistory.length - 1] / 1000 
          : 0;
        
        const adjustedStart = s.startTime + ptsOffset;
        const adjustedEnd = s.endTime + ptsOffset;
        
        return currentTime >= (adjustedStart - tolerance) && 
               currentTime <= (adjustedEnd + tolerance) &&
               s.hasAudio;
      });
      
      newText = activeSeg ? activeSeg.text : '';
    } else {
      // 无音频时清空字幕
      newText = '';
    }
    
    if (newText !== currentPreviewText) {
      setCurrentPreviewText(newText);
    }

    requestRef.current = requestAnimationFrame(syncSubtitles);
  }, [
    isPreviewingProject, activeClipIndex, selectedSegments, 
    segments, currentPreviewText, calculatePTSOffset, 
    calculateDynamicTolerance, ptsOffsetHistory, getAudioLevel
  ]);

  useEffect(() => {
    if (videoRef.current) {
      setupAudioAnalysis(videoRef.current);
    }
  }, [setupAudioAnalysis]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(syncSubtitles);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [syncSubtitles]);

  useEffect(() => {
    const v = modalVideoRef.current;
    if (!v || editingIndex === null) return;
    ensureAudioEnabled(v);
    v.currentTime = tempStartTime;
    v.play().catch(() => {});
    const handleModalUpdate = () => {
      if (v.currentTime >= tempEndTime || v.currentTime < tempStartTime - 0.1) {
        v.currentTime = tempStartTime;
      }
    };
    v.addEventListener('timeupdate', handleModalUpdate);
    return () => v.removeEventListener('timeupdate', handleModalUpdate);
  }, [editingIndex, tempStartTime, tempEndTime]);

  const validateVideoFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`;
    }
    if (!SUPPORTED_FORMATS.includes(file.type)) {
      return 'Unsupported video format';
    }
    return null;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const validationError = validateVideoFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    
    const url = URL.createObjectURL(file);
    setVideo({ name: file.name, size: file.size, duration: 0, url, file });
    setStatus(AppStatus.ANALYZING);
    setProcessingMsg(t.removingFillerWords);
    
    analyzeVideoWithGemini(file, subtitleLanguage, setProcessingMsg)
      .then(res => { 
        const validSegments = res.filter(s => !s.isInvalid);
        setSegments(validSegments);
        
        const meaningfulSegments = validSegments.filter(s => !s.isRedundant && s.confidence > 0.5);
        setSelectedSegments(meaningfulSegments);
        
        setStatus(AppStatus.READY);
        // 修复：使用 replace 方法处理字符串
        setProcessingMsg(t.processingComplete.replace('{count}', validSegments.length.toString()));
        
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
      })
      .catch(err => {
        if (err.message.includes('401') || err.message.toLowerCase().includes('auth')) {
          setError(t.authError); 
          setIsKeySelected(false);
        } else { 
          setError(err.message); 
        }
        setStatus(AppStatus.IDLE);
      });
  };

  const openEditModal = (index: number) => {
    const seg = selectedSegments[index];
    setEditingIndex(index);
    setTempEditText(seg.text);
    setTempStartTime(seg.startTime);
    setTempEndTime(seg.endTime);
    setActiveClipIndex(index);
    if (videoRef.current) {
      ensureAudioEnabled(videoRef.current);
      videoRef.current.currentTime = seg.startTime;
    }
  };

  const saveClipEdit = () => {
    if (editingIndex === null) return;
    const newList = [...selectedSegments];
    newList[editingIndex] = { ...newList[editingIndex], text: tempEditText, startTime: tempStartTime, endTime: tempEndTime };
    updateSegmentsWithHistory(newList);
    setEditingIndex(null);
  };

  const handleTextChange = (newText: string) => {
    const originalText = selectedSegments[editingIndex!]?.text || '';
    const originalDuration = (selectedSegments[editingIndex!]?.endTime || 0) - (selectedSegments[editingIndex!]?.startTime || 0);
    if (newText.length < originalText.length && originalText.length > 0) {
      const ratio = newText.length / originalText.length;
      setTempEndTime(tempStartTime + Math.max(0.1, originalDuration * ratio));
    }
    setTempEditText(newText);
  };

  const handleSegmentToggle = (segment: SubtitleSegment) => {
    const isSelected = selectedSegments.some(s => s.id === segment.id);
    
    if (isSelected) {
      const newSelected = selectedSegments.filter(s => s.id !== segment.id);
      updateSegmentsWithHistory(newSelected);
    } else {
      updateSegmentsWithHistory([...selectedSegments, segment]);
    }
  };

  const composeVideo = async () => {
    setStatus(AppStatus.GENERATING);
    // 修复：使用 replace 方法处理字符串
    setProcessingMsg(t.exportInfo.replace('{quality}', qualityPresets[videoQuality].label));
    
    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        const v = document.createElement('video');
        v.src = video!.url;
        v.muted = false; 
        v.crossOrigin = "anonymous";
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: false })!;

        v.onloadedmetadata = async () => {
          const quality = qualityPresets[videoQuality];
          let targetWidth = v.videoWidth;
          let targetHeight = v.videoHeight;
          
          if (quality.resolution !== 'source') {
            const targetHeightNum = parseInt(quality.resolution);
            if (!isNaN(targetHeightNum)) {
              const scale = targetHeightNum / targetHeight;
              targetWidth = Math.round(targetWidth * scale);
              targetHeight = targetHeightNum;
            }
          }
          
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          
          console.log(`Rendering at ${targetWidth}x${targetHeight}, bitrate: ${quality.bitrate}`);
          
          const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
          const audioCtx = new AudioContextClass();
          await audioCtx.resume();
          
          const source = audioCtx.createMediaElementSource(v);
          const destination = audioCtx.createMediaStreamDestination();
          source.connect(destination);
          source.connect(audioCtx.destination);
          
          const videoStream = canvas.captureStream(30);
          
          const tracks = [
            ...videoStream.getVideoTracks(),
            ...destination.stream.getAudioTracks()
          ];
          const combinedStream = new MediaStream(tracks);

          const mimeTypes = [
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus',
            'video/webm'
          ];
          
          let selectedMimeType = '';
          for (const mimeType of mimeTypes) {
            if (MediaRecorder.isTypeSupported(mimeType)) {
              selectedMimeType = mimeType;
              break;
            }
          }
          
          if (!selectedMimeType) {
            reject(new Error('No supported video mime type found'));
            return;
          }

          const recorder = new MediaRecorder(combinedStream, {
            mimeType: selectedMimeType,
            videoBitsPerSecond: quality.bitrate,
            audioBitsPerSecond: 192000
          });

          const chunks: Blob[] = [];
          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
              chunks.push(e.data);
            }
          };
          
          recorder.onstop = () => { 
            audioCtx.close(); 
            const finalBlob = new Blob(chunks, { type: 'video/webm' });
            console.log(`Recording complete: ${chunks.length} chunks, total size: ${finalBlob.size}`);
            resolve(finalBlob); 
          };
          
          recorder.onerror = (event) => {
            console.error('Recorder error:', event);
            reject(new Error('Recording failed'));
          };
          
          recorder.start(100);

          const exportSegments = selectedSegments.filter(s => !s.isRedundant);
          
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          for (const seg of exportSegments) {
            setProcessingMsg(`${t.rendering}: ${seg.text.slice(0, 12)}...`);
            
            v.currentTime = seg.startTime;
            v.muted = false;
            v.volume = 1.0;
            
            await new Promise<void>((resolveSeek) => {
              const onSeeked = () => {
                v.removeEventListener('seeked', onSeeked);
                resolveSeek();
              };
              v.addEventListener('seeked', onSeeked);
              setTimeout(resolveSeek, 100);
            });
            
            try {
              await v.play();
            } catch (playError) {
              console.warn('Play error:', playError);
            }
            
            await new Promise<void>((resolveSegment) => {
              let lastFrameTime = performance.now();
              const targetFPS = 30;
              const frameInterval = 1000 / targetFPS;
              
              const renderFrame = () => {
                const now = performance.now();
                const deltaTime = now - lastFrameTime;
                
                if (v.currentTime >= seg.endTime - 0.01 || v.paused || v.ended) {
                  v.pause();
                  resolveSegment();
                  return;
                }
                
                if (deltaTime >= frameInterval) {
                  lastFrameTime = now;
                  
                  ctx.fillStyle = '#000000';
                  ctx.fillRect(0, 0, canvas.width, canvas.height);
                  
                  try {
                    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
                  } catch (drawError) {
                    console.warn('Draw error:', drawError);
                  }
                  
                  if (isPreviewSubVisible && seg.hasAudio) {
                    try {
                      const fontSize = Math.max(16, Math.floor(canvas.height / 20)) * subSizeScale;
                      ctx.font = `${subFontWeight} ${fontSize}px ${subFontFamily}`;
                      ctx.lineWidth = Math.max(2, fontSize / 8);
                      ctx.strokeStyle = subStrokeColor; 
                      ctx.fillStyle = subColor;
                      ctx.textAlign = 'center'; 
                      ctx.lineJoin = 'round';
                      ctx.shadowColor = subShadowColor; 
                      ctx.shadowBlur = subShadowBlur;

                      wrapText(
                        ctx, 
                        seg.text, 
                        canvas.width / 2, 
                        canvas.height * 0.88, 
                        canvas.width * 0.9, 
                        fontSize * 1.3, 
                        subBgOpacity > 0
                      );
                    } catch (textError) {
                      console.warn('Text rendering error:', textError);
                    }
                  }
                }
                
                requestAnimationFrame(renderFrame);
              };
              
              requestAnimationFrame(renderFrame);
            });
          }
          
          setTimeout(() => {
            if (recorder.state === 'recording') {
              recorder.stop();
            }
          }, 500);
        };
        
        v.onerror = (error) => {
          console.error('Video load error:', error);
          reject(new Error("Video load failed"));
        };
      });

      setFinalVideoUrl(URL.createObjectURL(blob));
      setStatus(AppStatus.COMPLETED);
    } catch (e: any) {
      console.error('Export error:', e);
      setError(e.message || 'Export failed');
      setStatus(AppStatus.READY);
    }
  };

  const hexToRgba = (hex: string, opacity: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  const languageOptions = [
    { value: 'zh', label: t.chinese, icon: '🇨🇳' },
    { value: 'en', label: t.english, icon: '🇺🇸' },
    { value: 'ja', label: t.japanese, icon: '🇯🇵' },
    { value: 'ko', label: t.korean, icon: '🇰🇷' }
  ];

  const validSegmentsCount = useMemo(() => segments.length, [segments]);

  return (
    <div className="h-screen flex flex-col bg-[#030712] text-slate-100 overflow-hidden font-sans relative">
      <header className="h-14 lg:h-16 flex items-center justify-between px-4 lg:px-8 glass-nav z-[60] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
            <Sparkles className="text-white w-5 h-5 lg:w-6 lg:h-6" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-base lg:text-lg font-bold tracking-tight">{t.title} <span className="text-indigo-500">AI</span></h1>
            {status === AppStatus.READY && (
              <div className="flex items-center gap-1 text-[8px] text-emerald-500 mt-0.5">
                <Zap className="w-2.5 h-2.5" />
                <span>{t.smartCleanup}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 lg:gap-4">
          {/* 音频能量指示器 */}
          {status !== AppStatus.IDLE && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] ${
              hasAudioCurrently ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'
            }`}>
              {hasAudioCurrently ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
              <span>{hasAudioCurrently ? t.audioDetected : t.silence}</span>
              <div className="w-16 h-1 bg-slate-700 rounded-full ml-1">
                <div 
                  className="h-full bg-indigo-500 rounded-full transition-all"
                  style={{ width: `${currentAudioLevel * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* 同步状态 */}
          {status !== AppStatus.IDLE && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] ${
              isAudioSynced ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
            }`}>
              <Radio className="w-3 h-3" />
              <span>{t.audioSync}</span>
              <span className="font-mono ml-1">{syncDrift}ms</span>
            </div>
          )}

          {/* 语言选择器 */}
          <div className="relative">
            <button
              onClick={() => setShowLanguagePanel(!showLanguagePanel)}
              className="p-2 bg-slate-900 rounded-lg border border-slate-800 text-slate-400 hover:bg-slate-800 transition-all flex items-center gap-1"
              title={t.subtitleLanguage}
            >
              <Globe className="w-4 h-4" />
              <span className="hidden lg:inline text-xs">
                {languageOptions.find(l => l.value === subtitleLanguage)?.icon} {languageOptions.find(l => l.value === subtitleLanguage)?.label}
              </span>
            </button>
            
            {showLanguagePanel && (
              <div className="absolute right-0 mt-2 w-48 bg-[#111827] border border-slate-800 rounded-xl shadow-2xl z-[100] p-2">
                <h3 className="text-xs font-bold px-3 py-2 text-slate-400">{t.subtitleLanguage}</h3>
                {languageOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setSubtitleLanguage(option.value as SubtitleLanguage);
                      setShowLanguagePanel(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-all flex items-center gap-2 ${
                      subtitleLanguage === option.value 
                        ? 'bg-indigo-600 text-white' 
                        : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <span className="text-base">{option.icon}</span>
                    <span className="text-xs font-medium">{option.label}</span>
                    {subtitleLanguage === option.value && <CheckCircle className="w-3 h-3 ml-auto" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button 
            onClick={handleOpenKeyDialog}
            className={`p-2 rounded-lg border transition-all flex items-center gap-2 text-xs font-bold ${!isKeySelected ? 'bg-red-600 border-red-600 animate-pulse' : 'bg-slate-900 border-slate-800 text-indigo-400 hover:bg-slate-800'}`}
          >
            <Key className="w-4 h-4" />
            <span className="hidden lg:inline">{t.apiKeyNeeded}</span>
          </button>

          {/* 质量选择器 */}
          <div className="relative">
            <button
              onClick={() => setShowQualityPanel(!showQualityPanel)}
              className="p-2 bg-slate-900 rounded-lg border border-slate-800 text-slate-400 hover:bg-slate-800 transition-all flex items-center gap-1"
              title={t.quality}
            >
              <Film className="w-4 h-4" />
              <span className="hidden lg:inline text-xs">{qualityPresets[videoQuality].label}</span>
            </button>
            
            {showQualityPanel && (
              <div className="absolute right-0 mt-2 w-64 bg-[#111827] border border-slate-800 rounded-xl shadow-2xl z-[100] p-2">
                <h3 className="text-xs font-bold px-3 py-2 text-slate-400">{t.quality}</h3>
                {Object.entries(qualityPresets).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setVideoQuality(key as VideoQuality);
                      setShowQualityPanel(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                      videoQuality === key 
                        ? 'bg-indigo-600 text-white' 
                        : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">{preset.label}</span>
                      {videoQuality === key && <CheckCircle className="w-3 h-3" />}
                    </div>
                    <p className="text-[9px] text-slate-500 mt-0.5">{preset.description}</p>
                  </button>
                ))}
                <p className="text-[8px] text-slate-600 px-3 pt-2 border-t border-slate-800 mt-2">
                  {t.qualityDescription}
                </p>
              </div>
            )}
          </div>

          <button 
            onClick={() => setIsPreviewSubVisible(!isPreviewSubVisible)}
            className={`p-2 rounded-lg border transition-all flex items-center gap-2 text-xs font-bold ${isPreviewSubVisible ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'}`}
            title={isPreviewSubVisible ? t.hideSubs : t.previewSubs}
          >
            {isPreviewSubVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            <span className="hidden lg:inline">{isPreviewSubVisible ? t.hideSubs : t.previewSubs}</span>
          </button>

          <button onClick={() => setLang(lang === 'en' ? 'zh' : 'en')} className="p-2 bg-slate-900 rounded-lg text-xs font-bold text-slate-400 border border-slate-800 transition-all hover:bg-slate-800">
            <Languages className="w-4 h-4" /> 
          </button>
          <button onClick={() => setShowStylePanel(!showStylePanel)} className={`p-2 rounded-lg border transition-all ${showStylePanel ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-800 text-slate-400'}`}>
            <Palette className="w-4 h-4" />
          </button>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`p-2 rounded-lg border lg:hidden transition-all ${isSidebarOpen ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-800 text-slate-400'}`}>
            <FontIcon className="w-4 h-4" />
          </button>
          <div className="h-6 w-px bg-slate-800 hidden lg:block"></div>
          <button 
            onClick={() => {
              if(!isPreviewingProject) {
                setActiveClipIndex(0);
                if(videoRef.current) {
                  ensureAudioEnabled(videoRef.current);
                  videoRef.current.currentTime = selectedSegments[0]?.startTime || 0;
                  videoRef.current.play().catch(() => {});
                }
              }
              setIsPreviewingProject(!isPreviewingProject);
            }}
            disabled={selectedSegments.length === 0}
            className={`flex items-center gap-2 px-3 py-1.5 lg:px-4 lg:py-2 rounded-lg text-xs font-bold transition-all border ${isPreviewingProject ? 'bg-amber-500 border-amber-500 text-black' : 'border-slate-700 text-slate-300 disabled:opacity-20'}`}
          >
            {isPreviewingProject ? <RotateCcw className="w-3 h-3 animate-spin" /> : <MonitorPlay className="w-3 h-3" />}
            <span className="hidden sm:inline">{isPreviewingProject ? t.stopPreview : t.previewAll}</span>
          </button>
          <button disabled={selectedSegments.length === 0 || status === AppStatus.GENERATING} onClick={composeVideo} className="bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 lg:px-6 lg:py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-xl disabled:opacity-20 transition-all active:scale-95">
            {status === AppStatus.GENERATING ? <Loader2 className="w-3 h-3 lg:w-4 lg:h-4 animate-spin" /> : <CheckCircle className="w-3 h-3 lg:w-4 lg:h-4" />}
            {t.export}
          </button>
        </div>
      </header>

      <main className="flex-grow flex flex-col lg:flex-row overflow-hidden relative">
        <aside className={`absolute inset-y-0 left-0 w-72 bg-[#111827] border-r border-slate-800 z-[70] transition-transform duration-300 transform ${showStylePanel ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 lg:flex ${showStylePanel ? 'flex' : 'hidden'} flex-col shrink-0`}>
          <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
            <section className="space-y-4">
              <h3 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{t.textColor}</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <input type="color" value={subColor} onChange={(e) => setSubColor(e.target.value)} className="w-full h-6 bg-transparent cursor-pointer" title={t.textColor} />
                </div>
                <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <input type="color" value={subStrokeColor} onChange={(e) => setSubStrokeColor(e.target.value)} className="w-full h-6 bg-transparent cursor-pointer" title={t.strokeColor} />
                </div>
              </div>
            </section>
            <section className="space-y-4">
              <h3 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{t.shadowColor}</h3>
              <div className="space-y-3">
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <input type="color" value={subShadowColor} onChange={(e) => setSubShadowColor(e.target.value)} className="w-full h-6 bg-transparent cursor-pointer" title={t.shadowColor} />
                </div>
                <div>
                  <div className="flex justify-between text-[9px] text-slate-500 mb-1"><span>{t.shadowBlur}</span><span>{subShadowBlur}px</span></div>
                  <input type="range" min="0" max="20" step="1" value={subShadowBlur} onChange={(e) => setSubShadowBlur(parseInt(e.target.value))} className="w-full" />
                </div>
              </div>
            </section>
            <section className="space-y-4">
              <h3 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{t.font}</h3>
              <div className="space-y-3">
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <select value={subFontFamily} onChange={(e) => setSubFontFamily(e.target.value)} className="w-full bg-transparent text-[11px] text-slate-200 outline-none cursor-pointer">
                    {fontOptions.map(opt => <option key={opt.value} value={opt.value} className="bg-[#111827]">{opt.label}</option>)}
                  </select>
                </div>
                <div>
                  <div className="flex justify-between text-[9px] text-slate-500 mb-1"><span>{t.weight}</span><span>{subFontWeight}</span></div>
                  <input type="range" min="300" max="900" step="100" value={subFontWeight} onChange={(e) => setSubFontWeight(parseInt(e.target.value))} className="w-full" />
                </div>
              </div>
            </section>
            <section className="space-y-4">
              <h3 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{t.bgColor}</h3>
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <input type="color" value={subBgColor} onChange={(e) => setSubBgColor(e.target.value)} className="w-full h-6 bg-transparent cursor-pointer" />
                </div>
                <div>
                  <div className="flex justify-between text-[9px] text-slate-500 mb-1"><span>{t.opacity}</span><span>{Math.round(subBgOpacity * 100)}%</span></div>
                  <input type="range" min="0" max="1" step="0.1" value={subBgOpacity} onChange={(e) => setSubBgOpacity(parseFloat(e.target.value))} className="w-full" />
                </div>
              </div>
            </section>
            <section className="space-y-4">
              <h3 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{t.size}</h3>
              <input type="range" min="0.5" max="2.5" step="0.1" value={subSizeScale} onChange={(e) => setSubSizeScale(parseFloat(e.target.value))} className="w-full" />
            </section>
            <button onClick={() => {setSubColor('#ffffff'); setSubStrokeColor('#000000'); setSubShadowColor('#000000'); setSubBgOpacity(0.5); setSubSizeScale(1); setSubFontWeight(700); setSubShadowBlur(8);}} className="w-full py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10px] font-bold transition-all">{t.resetDefault}</button>
          </div>
        </aside>

        <div className="flex-grow flex flex-col min-w-0 bg-[#030712] overflow-hidden">
          <div className="flex-grow p-4 lg:p-8 flex items-center justify-center overflow-hidden min-h-[280px]">
            {status === AppStatus.IDLE ? (
              <div onClick={() => fileInputRef.current?.click()} className="w-full max-w-xl aspect-video border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center hover:border-indigo-500 transition-all cursor-pointer bg-slate-900/20 group relative">
                <Upload className="text-slate-500 w-10 h-10 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-base font-bold text-white mb-1">{t.dropVideo}</h3>
                <p className="text-[10px] text-slate-500 mt-2 max-w-[250px] text-center">{t.supportedFormats}</p>
                <p className="text-[9px] text-amber-500/80 mt-1 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  {t.videoSizeLimit}
                </p>
                <input ref={fileInputRef} type="file" className="hidden" accept="video/*" onChange={handleFileUpload} />
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center max-w-4xl relative">
                <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-800 relative">
                  <video 
                    ref={videoRef} 
                    src={video?.url} 
                    className="w-full h-full object-contain" 
                    controls={!isPreviewingProject} 
                    playsInline 
                    onPlay={() => {
                      if (videoRef.current) {
                        videoRef.current.muted = false;
                        videoRef.current.volume = 1.0;
                      }
                    }}
                  />
                  {isPreviewSubVisible && hasAudioCurrently && currentPreviewText && (
                    <div className="absolute inset-x-0 bottom-[10%] pointer-events-none flex items-center justify-center px-6">
                       <div 
                        style={{ 
                          color: subColor, 
                          WebkitTextStroke: `${2 * subSizeScale}px ${subStrokeColor}`,
                          fontSize: `${Math.max(12, 28 * subSizeScale)}px`,
                          textShadow: `${subShadowColor} 0px 0px ${subShadowBlur}px`,
                          backgroundColor: subBgOpacity > 0 ? hexToRgba(subBgColor, subBgOpacity) : 'transparent',
                          fontFamily: subFontFamily, 
                          fontWeight: subFontWeight,
                          maxWidth: '90%', 
                          padding: '0.2em 0.5em', 
                          borderRadius: '4px',
                          wordBreak: 'break-word', 
                          lineHeight: '1.2'
                        }}
                        className="text-center select-none whitespace-pre-wrap transition-all shadow-sm"
                       >
                         {currentPreviewText}
                       </div>
                    </div>
                  )}
                  {isPreviewSubVisible && !hasAudioCurrently && (
                    <div className="absolute inset-x-0 bottom-[10%] pointer-events-none flex items-center justify-center">
                      <div className="bg-slate-800/50 text-slate-400 text-[10px] px-3 py-1 rounded-full backdrop-blur-sm flex items-center gap-1">
                        <VolumeX className="w-3 h-3" />
                        <span>{t.silence}</span>
                      </div>
                    </div>
                  )}
                  {status === AppStatus.ANALYZING && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 z-50 backdrop-blur-md p-4">
                      <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
                      <h3 className="text-sm font-bold tracking-widest uppercase text-center">{t.scanning}</h3>
                      <p className="text-[10px] text-indigo-400 mt-2 text-center max-w-[300px]">{processingMsg}</p>
                    </div>
                  )}
                  {status === AppStatus.GENERATING && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 z-50 backdrop-blur-md p-4">
                      <Loader2 className="w-10 h-10 text-amber-500 animate-spin mb-4" />
                      <h3 className="text-sm font-bold tracking-widest uppercase text-center">{t.rendering}</h3>
                      <p className="text-[10px] text-amber-400 mt-2 text-center max-w-[300px]">{processingMsg}</p>
                      <div className="w-48 h-1 bg-slate-800 rounded-full mt-4 overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="h-52 lg:h-72 bg-[#0d1117] border-t border-slate-800 flex flex-col shrink-0">
            <div className="h-10 border-b border-slate-800 flex items-center justify-between px-4 lg:px-6 bg-slate-900/50 shrink-0">
              <div className="flex items-center gap-3">
                <Layers className="w-3 h-3 text-indigo-500" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{t.timeline}</span>
                {selectedSegments.length > 0 && (
                  <span className="text-[8px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full">
                    {selectedSegments.length} {t.selectedClips}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 border-r border-slate-700 pr-4">
                  <button 
                    disabled={historyIndex === 0}
                    onClick={undo}
                    className="p-1 text-slate-500 hover:text-white disabled:opacity-20 transition-all"
                    title={t.undo}
                  >
                    <Undo className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    disabled={historyIndex >= history.length - 1}
                    onClick={redo}
                    className="p-1 text-slate-500 hover:text-white disabled:opacity-20 transition-all"
                    title={t.redo}
                  >
                    <Redo className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button onClick={() => updateSegmentsWithHistory([])} className="text-[9px] font-bold text-slate-600 hover:text-white uppercase"><RotateCcw className="w-3 h-3" /></button>
              </div>
            </div>
            <div className="flex-grow overflow-y-auto custom-scrollbar p-3 space-y-2 timeline-bg">
              {selectedSegments.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-700 text-[10px]">
                  {t.dragHint}
                </div>
              ) : (
                selectedSegments.map((seg, i) => (
                  <div key={`${seg.id}-${i}`} onClick={() => openEditModal(i)} className={`flex items-center gap-3 bg-[#161b22] border rounded-lg p-3 transition-all cursor-pointer group ${activeClipIndex === i ? 'border-indigo-500 ring-1 ring-indigo-500/30' : 'border-slate-800 hover:border-slate-700'}`}>
                    <div className="w-6 h-6 bg-slate-800 rounded flex items-center justify-center font-bold text-slate-600 text-[10px] shrink-0">{i+1}</div>
                    <div className="flex-grow min-w-0">
                      <p className="text-[11px] text-slate-300 font-medium truncate">{seg.text}</p>
                      <div className="flex items-center gap-2 mt-1 text-[9px] text-slate-500 font-mono">
                        <Clock className="w-2.5 h-2.5" /> 
                        <span>{seg.startTime.toFixed(1)}s - {seg.endTime.toFixed(1)}s</span>
                        {seg.hasAudio ? (
                          <Volume2 className="w-2.5 h-2.5 text-emerald-500" />
                        ) : (
                          <VolumeX className="w-2.5 h-2.5 text-slate-600" />
                        )}
                        {seg.confidence && (
                          <span className={`ml-1 ${seg.confidence > 0.8 ? 'text-emerald-500' : 'text-amber-500'}`}>
                            {Math.round(seg.confidence * 100)}%
                          </span>
                        )}
                      </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); updateSegmentsWithHistory(selectedSegments.filter((_, idx) => idx !== i)); }} className="p-1.5 text-slate-600 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <aside className={`fixed lg:relative inset-y-0 right-0 w-72 bg-[#111827] border-l border-slate-800 z-[80] transition-transform duration-300 transform lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col shadow-2xl lg:shadow-none`}>
          <div className="p-4 border-b border-slate-800 bg-slate-900/30 flex justify-between items-center shrink-0">
            <h2 className="text-[10px] font-bold flex items-center gap-2 text-white uppercase tracking-widest">
              <FontIcon className="w-3.5 h-3.5 text-indigo-500" /> 
              {t.aiScanResults}
              <span className="text-[8px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded-full">
                {validSegmentsCount} {t.totalSegments.replace('{count}', validSegmentsCount.toString())}
              </span>
            </h2>
            <button className="lg:hidden" onClick={() => setIsSidebarOpen(false)}><X className="w-4 h-4" /></button>
          </div>
          <div className="flex-grow overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {segments.map((seg) => {
              const isSelected = selectedSegments.some(s => s.id === seg.id);
              return (
                <div 
                  key={seg.id} 
                  onClick={() => handleSegmentToggle(seg)} 
                  className={`group p-3 rounded-lg border transition-all cursor-pointer relative overflow-hidden ${
                    seg.isRedundant 
                      ? 'bg-red-500/5 border-red-500/10 opacity-60 hover:opacity-80' 
                      : isSelected
                        ? 'bg-indigo-500/20 border-indigo-500 ring-1 ring-indigo-500/30'
                        : 'bg-[#030712] border-slate-800 hover:border-indigo-500'
                  }`}
                  title={t.clickToSelect}
                >
                  {!seg.isRedundant && <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${isSelected ? 'bg-indigo-500' : 'bg-indigo-500/50'}`}></div>}
                  {seg.isRedundant && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-red-500"></div>}
                  <div className="flex justify-between items-center mb-1.5">
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded flex items-center gap-1 ${
                      seg.isRedundant 
                        ? 'bg-red-500/10 text-red-400' 
                        : isSelected
                          ? 'bg-indigo-500 text-white'
                          : 'bg-indigo-500/10 text-indigo-400 font-bold'
                    }`}>
                      {seg.hasAudio ? (
                        <Volume2 className="w-2.5 h-2.5" />
                      ) : (
                        <VolumeX className="w-2.5 h-2.5" />
                      )}
                      {seg.startTime.toFixed(1)}s
                    </span>
                    {isSelected ? (
                      <CheckCircle className="w-3 h-3 text-indigo-500" />
                    ) : (
                      !seg.isRedundant && (
                        <Plus className="w-3 h-3 text-indigo-500 opacity-0 group-hover:opacity-100" />
                      )
                    )}
                    {seg.isRedundant && (
                      <span className="text-[8px] text-red-400">{t.redundant}</span>
                    )}
                  </div>
                  <p className={`text-[10px] leading-relaxed line-clamp-2 ${
                    seg.isRedundant ? 'text-slate-600' : isSelected ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                  }`}>
                    {seg.text}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-1">
                      {seg.hasMotion ? (
                        <Activity className="w-2.5 h-2.5 text-emerald-500/50" />
                      ) : (
                        <span className="text-[8px] text-slate-600">{t.motionStatic}</span>
                      )}
                      <span className="text-[8px] text-slate-600">
                        {Math.round(seg.confidence * 100)}%
                      </span>
                    </div>
                    {ptsOffsetHistory.length > 0 && isSelected && (
                      <span className="text-[8px] text-indigo-500/70 font-mono">
                        {t.ptsOffset}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </main>

      {editingIndex !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 lg:p-8">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl lg:rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col lg:flex-row h-[85vh] lg:h-auto max-h-[90vh]">
            <div className="w-full lg:w-[60%] bg-black relative flex items-center justify-center overflow-hidden shrink-0 lg:shrink">
               <video 
                ref={modalVideoRef} 
                src={video?.url} 
                className="w-full h-full object-contain" 
                playsInline 
                onPlay={() => {
                  if (modalVideoRef.current) {
                    modalVideoRef.current.muted = false;
                    modalVideoRef.current.volume = 1.0;
                  }
                }}
               />
               <div className="absolute top-3 left-3 bg-indigo-600/90 text-[9px] px-2 py-1 rounded font-bold uppercase">{t.textVideoSync}</div>
               <div className="absolute inset-x-0 bottom-[10%] pointer-events-none flex items-center justify-center px-4">
                 <p style={{ color: subColor, WebkitTextStroke: `${1 * subSizeScale}px ${subStrokeColor}`, fontSize: `${Math.max(12, 20 * subSizeScale)}px`, backgroundColor: subBgOpacity > 0 ? hexToRgba(subBgColor, subBgOpacity) : 'transparent', fontFamily: subFontFamily, fontWeight: subFontWeight, padding: '0.2em 0.4em', borderRadius: '2px' }} className="text-center whitespace-pre-wrap">{tempEditText}</p>
               </div>
            </div>
            <div className="w-full lg:w-[40%] p-4 lg:p-8 flex flex-col justify-between bg-[#111827] overflow-y-auto">
              <div className="space-y-6">
                <div className="flex justify-between items-center"><h2 className="text-sm lg:text-base font-bold flex items-center gap-2"><Scissors className="text-indigo-500 w-4 h-4" /> {t.editClip} #{editingIndex + 1}</h2><button onClick={() => setEditingIndex(null)} className="text-slate-500"><X /></button></div>
                
                <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-xl border border-slate-800">
                  <button 
                    disabled={historyIndex === 0}
                    onClick={undo}
                    className="flex-grow py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-20 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all"
                  >
                    <Undo className="w-3.5 h-3.5" /> {t.undo}
                  </button>
                  <button 
                    disabled={historyIndex >= history.length - 1}
                    onClick={redo}
                    className="flex-grow py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-20 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all"
                  >
                    <Redo className="w-3.5 h-3.5" /> {t.redo}
                  </button>
                </div>

                <textarea value={tempEditText} onChange={(e) => handleTextChange(e.target.value)} className="w-full h-28 lg:h-40 bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:border-indigo-500 outline-none resize-none transition-all" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800"><span className="text-[8px] text-slate-500 block mb-1 font-bold uppercase tracking-tighter">Start (s)</span><input type="number" step="0.1" value={tempStartTime} onChange={(e) => setTempStartTime(parseFloat(e.target.value))} className="bg-transparent text-sm font-mono text-indigo-400 w-full outline-none" /></div>
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800"><span className="text-[8px] text-slate-500 block mb-1 font-bold uppercase tracking-tighter">End (s)</span><input type="number" step="0.1" value={tempEndTime} onChange={(e) => setTempEndTime(parseFloat(e.target.value))} className="bg-transparent text-sm font-mono text-indigo-400 w-full outline-none" /></div>
                </div>
              </div>
              <div className="mt-8 grid grid-cols-2 gap-3"><button onClick={() => setEditingIndex(null)} className="py-3 bg-slate-800 rounded-xl font-bold text-xs">{t.backToEditor}</button><button onClick={saveClipEdit} className="py-3 bg-indigo-600 rounded-xl font-bold text-xs flex items-center justify-center gap-2"><Save className="w-3 h-3" /> {t.saveChange}</button></div>
            </div>
          </div>
        </div>
      )}

      {status === AppStatus.COMPLETED && finalVideoUrl && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 p-4">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col shadow-3xl">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <CheckCircle className="text-emerald-500 w-4 h-4" /> {t.exportSuccess}
              </h2>
              <button onClick={() => setStatus(AppStatus.READY)}><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 lg:p-8 flex flex-col items-center">
              <div className="w-full mb-4 px-4 py-2 bg-slate-900 rounded-lg border border-slate-800">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">{t.quality}:</span>
                  <span className="text-indigo-400 font-mono">{qualityPresets[videoQuality].label}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] mt-1">
                  <span className="text-slate-400">Bitrate:</span>
                  <span className="text-indigo-400 font-mono">{(qualityPresets[videoQuality].bitrate / 1000000).toFixed(1)} Mbps</span>
                </div>
                <div className="flex items-center justify-between text-[10px] mt-1">
                  <span className="text-slate-400">{t.syncStatus}:</span>
                  <span className={`font-mono ${isAudioSynced ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {syncDrift}ms
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] mt-1">
                  <span className="text-slate-400">{t.subtitleLanguage}:</span>
                  <span className="text-indigo-400">
                    {languageOptions.find(l => l.value === subtitleLanguage)?.icon} {languageOptions.find(l => l.value === subtitleLanguage)?.label}
                  </span>
                </div>
              </div>
              <video src={finalVideoUrl} controls className="w-full aspect-video rounded-xl mb-6 bg-black" />
              <div className="flex gap-3 w-full max-sm:flex-col">
                <button onClick={() => setStatus(AppStatus.READY)} className="flex-grow py-3 bg-slate-800 rounded-xl font-bold text-xs">{t.backToEditor}</button>
                <a href={finalVideoUrl} download={`NovaClip_${qualityPresets[videoQuality].resolution}.webm`} className="flex-grow flex items-center justify-center gap-2 bg-indigo-600 py-3 rounded-xl font-bold text-white text-xs shadow-lg">
                  <Download className="w-3.5 h-3.5" /> {t.downloadNow}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-600/90 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 z-[150] animate-in slide-in-from-bottom-5">
          <AlertCircle className="w-5 h-5" />
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase">{t.systemAlert}</span>
            <span className="text-[10px] opacity-80">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="ml-4">✕</button>
        </div>
      )}
    </div>
  );
};

export default App;