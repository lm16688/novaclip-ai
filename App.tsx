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
  Globe
} from 'lucide-react';
import { AppStatus, SubtitleSegment, VideoMetadata, SUPPORTED_LANGUAGES, LanguageOption } from './types';
import { analyzeVideoWithGemini } from './services/geminiService';

// ... (keep existing interfaces and constants)

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('zh');
  const [targetLanguage, setTargetLanguage] = useState<string>('en'); // Default to English
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  
  // ... (keep all existing state)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const validationError = validateVideoFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    
    const url = URL.createObjectURL(file);
    
    // Get video metadata
    const video = document.createElement('video');
    video.src = url;
    await new Promise((resolve) => {
      video.onloadedmetadata = () => {
        setVideo({ 
          name: file.name, 
          size: file.size, 
          duration: video.duration, 
          url, 
          file,
          resolution: { width: video.videoWidth, height: video.videoHeight },
          fps: 30 // approximate
        });
        resolve(null);
      };
    });
    
    setStatus(AppStatus.ANALYZING);
    setProcessingMsg(t.removingFillerWords, 0);
    
    try {
      const result = await analyzeVideoWithGemini(
        file, 
        targetLanguage,
        (msg: string, progress?: number) => {
          setProcessingMsg(msg);
          if (progress !== undefined) {
            // Update progress if needed
          }
        }
      );
      
      setSegments(result);
      // Auto-select non-redundant segments
      const meaningfulSegments = result.filter(s => !s.isRedundant && s.confidence > 0.5);
      setSelectedSegments(meaningfulSegments);
      setStatus(AppStatus.READY);
      setProcessingMsg(t.processingComplete.replace('{count}', meaningfulSegments.length.toString()));
    } catch (err: any) {
      if (err.message.includes('401') || err.message.toLowerCase().includes('auth')) {
        setError(t.authError);
        setIsKeySelected(false);
      } else {
        setError(err.message);
      }
      setStatus(AppStatus.IDLE);
    }
  };

  // Language selector component
  const LanguageSelector = () => (
    <div className="relative">
      <button
        onClick={() => setShowLanguageSelector(!showLanguageSelector)}
        className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 rounded-lg border border-slate-800 text-xs font-bold hover:bg-slate-800 transition-all"
      >
        <Globe className="w-4 h-4" />
        <span>{SUPPORTED_LANGUAGES.find(l => l.code === targetLanguage)?.name || 'English'}</span>
      </button>
      
      {showLanguageSelector && (
        <div className="absolute right-0 mt-2 w-64 bg-[#111827] border border-slate-800 rounded-xl shadow-2xl z-[100] max-h-96 overflow-y-auto custom-scrollbar">
          <div className="p-2">
            <h3 className="text-xs font-bold px-3 py-2 text-slate-400">Select Language</h3>
            {SUPPORTED_LANGUAGES.map((langOption) => (
              <button
                key={langOption.code}
                onClick={() => {
                  setTargetLanguage(langOption.code);
                  setShowLanguageSelector(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                  targetLanguage === langOption.code 
                    ? 'bg-indigo-600 text-white' 
                    : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{langOption.name}</span>
                  <span className="text-[9px] text-slate-500">{langOption.nativeName}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // Enhanced subtitle rendering with language support
  const renderSubtitles = (text: string, isModal: boolean = false) => {
    const fontSize = isModal 
      ? Math.max(12, 20 * subSizeScale)
      : Math.max(12, 28 * subSizeScale);
    
    return (
      <div 
        style={{ 
          color: subColor, 
          WebkitTextStroke: `${2 * subSizeScale}px ${subStrokeColor}`,
          fontSize: `${fontSize}px`,
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
        {text}
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-[#030712] text-slate-100 overflow-hidden font-sans relative">
      <header className="h-14 lg:h-16 flex items-center justify-between px-4 lg:px-8 glass-nav z-[60] shrink-0">
        {/* ... (keep existing header content) */}
        
        <div className="flex items-center gap-2 lg:gap-4">
          {/* Language selector */}
          {status !== AppStatus.IDLE && (
            <LanguageSelector />
          )}
          
          {/* ... (keep other header buttons) */}
        </div>
      </header>

      <main className="flex-grow flex flex-col lg:flex-row overflow-hidden relative">
        {/* ... (keep existing sidebar and main content) */}
        
        {/* Enhanced video player with subtitle rendering */}
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
          {isPreviewSubVisible && currentPreviewText && (
            <div className="absolute inset-x-0 bottom-[10%] pointer-events-none flex items-center justify-center px-6">
              {renderSubtitles(currentPreviewText)}
            </div>
          )}
          
          {/* Language indicator */}
          {targetLanguage && (
            <div className="absolute top-3 right-3 bg-indigo-600/80 text-[8px] px-2 py-1 rounded-full font-bold">
              {SUPPORTED_LANGUAGES.find(l => l.code === targetLanguage)?.nativeName}
            </div>
          )}
          
          {/* ... (keep existing loading overlays) */}
        </div>
        
        {/* ... (keep timeline and sidebar) */}
      </main>

      {/* Edit modal with language support */}
      {editingIndex !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 lg:p-8">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl lg:rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col lg:flex-row h-[85vh] lg:h-auto max-h-[90vh]">
            <div className="w-full lg:w-[60%] bg-black relative flex items-center justify-center overflow-hidden shrink-0 lg:shrink">
              <video 
                ref={modalVideoRef} 
                src={video?.url} 
                className="w-full h-full object-contain" 
                playsInline 
              />
              <div className="absolute top-3 left-3 bg-indigo-600/90 text-[9px] px-2 py-1 rounded font-bold uppercase">
                {t.textVideoSync} · {SUPPORTED_LANGUAGES.find(l => l.code === targetLanguage)?.nativeName}
              </div>
              <div className="absolute inset-x-0 bottom-[10%] pointer-events-none flex items-center justify-center px-4">
                {renderSubtitles(tempEditText, true)}
              </div>
            </div>
            {/* ... (rest of edit modal) */}
          </div>
        </div>
      )}

      {/* ... (keep existing modals and error handling) */}
    </div>
  );
};

export default App;