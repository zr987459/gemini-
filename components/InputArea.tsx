import React, { useState, useRef, KeyboardEvent } from 'react';
import { Send, Paperclip, X, StopCircle, Mic, FileText, Globe, Volume2, VolumeX } from 'lucide-react';
import { Attachment } from '../types';

interface InputAreaProps {
  onSend: (text: string, attachments: Attachment[], useSearch: boolean) => void;
  onStop: () => void;
  isLoading: boolean;
  enableTTS: boolean;
  onToggleTTS: () => void;
}

const InputArea: React.FC<InputAreaProps> = ({ onSend, onStop, isLoading, enableTTS, onToggleTTS }) => {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [useSearch, setUseSearch] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const isCancelledRef = useRef<boolean>(false);

  const handleSend = () => {
    if ((!input.trim() && attachments.length === 0)) return;
    onSend(input, attachments, useSearch);
    setInput('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files) as File[];
      console.log(`[InputArea] Selected ${files.length} files`);
      
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            const dataUrl = event.target.result as string;
            const isImage = file.type.startsWith('image/');
            
            console.log(`[InputArea] Processed file: ${file.name} (${file.type}, ${file.size} bytes)`);

            setAttachments(prev => [...prev, {
              id: Math.random().toString(36).substring(7),
              type: isImage ? 'image' : 'file',
              mimeType: file.type || 'application/octet-stream',
              data: dataUrl,
              fileName: file.name
            }]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
  };

  const adjustTextareaHeight = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
  };

  // --- Voice Recording Logic (Push-to-Talk) ---

  const startRecording = async () => {
    if (isLoading) return;
    if (!window.isSecureContext) {
      alert("麦克风仅在 HTTPS 或 localhost 环境下可用。");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      setIsRecording(true);
      isCancelledRef.current = false;
      recordingStartTimeRef.current = Date.now();
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      
      mediaRecorder.onstop = () => {
        // Stop all tracks to release microphone immediately
        stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
        mediaRecorderRef.current = null;

        if (isCancelledRef.current) {
          return; // Do not process audio if cancelled
        }

        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          const audioAttachment: Attachment = {
            id: Date.now().toString(),
            type: 'file',
            mimeType: 'audio/webm',
            data: base64data,
            fileName: `语音消息 ${new Date().toLocaleTimeString()}.webm`
          };
          
          console.log("[InputArea] Voice message recorded and processed.");
          // Auto-send the voice message immediately
          onSend('', [audioAttachment], useSearch);
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorder.start();

    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("无法访问麦克风，请检查权限设置。");
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') return;

    const duration = Date.now() - recordingStartTimeRef.current;
    
    // Short press detection (< 500ms)
    if (duration < 500) {
      isCancelledRef.current = true;
    }
    
    mediaRecorderRef.current.stop();
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-2 pb-4 relative">
      
      {/* Recording Indicator */}
      {isRecording && (
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 animate-in fade-in slide-in-from-bottom-4 pointer-events-none">
          <div className="flex items-center gap-3 px-6 py-3 bg-gray-900/95 backdrop-blur-xl border border-red-500/30 rounded-full shadow-2xl shadow-red-500/10">
            <div className="flex items-center gap-1 h-5">
               <div className="w-1 h-2 bg-red-500 rounded-full animate-[pulse_0.8s_ease-in-out_infinite]" style={{animationDelay: '0ms'}}></div>
               <div className="w-1 h-4 bg-red-500 rounded-full animate-[pulse_1.1s_ease-in-out_infinite]" style={{animationDelay: '100ms'}}></div>
               <div className="w-1 h-3 bg-red-500 rounded-full animate-[pulse_1s_ease-in-out_infinite]" style={{animationDelay: '200ms'}}></div>
               <div className="w-1 h-5 bg-red-500 rounded-full animate-[pulse_0.9s_ease-in-out_infinite]" style={{animationDelay: '300ms'}}></div>
               <div className="w-1 h-2 bg-red-500 rounded-full animate-[pulse_0.8s_ease-in-out_infinite]" style={{animationDelay: '400ms'}}></div>
            </div>
            <span className="text-sm font-medium text-red-100 tracking-wide">
              {Date.now() - recordingStartTimeRef.current < 500 ? "按住说话..." : "松开手指发送"}
            </span>
          </div>
        </div>
      )}

      {/* Attachment Previews (Floating above input) */}
      {attachments.length > 0 && (
        <div className="flex gap-2 mb-2 overflow-x-auto px-2 scrollbar-none">
          {attachments.map((att) => (
            <div key={att.id} className="relative group flex-shrink-0 flex items-center gap-2 bg-gray-800/90 backdrop-blur border border-gray-700 rounded-xl p-2 pr-8 shadow-lg animate-in slide-in-from-bottom-2">
              {att.type === 'image' ? (
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-900">
                  <img src={att.data} alt={att.fileName} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <FileText size={20} className="text-blue-400" />
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-xs font-medium text-gray-200 max-w-[120px] truncate">{att.fileName}</span>
                <span className="text-[10px] text-gray-400 uppercase">{att.mimeType.split('/').pop()}</span>
              </div>
              <button
                onClick={() => removeAttachment(att.id)}
                className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main Input Container */}
      <div className={`relative flex items-end gap-2 backdrop-blur-xl p-2 rounded-[26px] shadow-2xl shadow-black/50 ring-1 transition-all duration-300 ${
        isRecording 
          ? 'bg-red-950/20 border border-red-500/30 ring-red-500/20 scale-[1.02]' 
          : 'bg-gray-900/80 border border-gray-700/50 ring-white/5'
      }`}>
        
        {/* Left Actions */}
        <div className="flex items-center pb-1 pl-1 gap-1">
          <button
            onClick={() => setUseSearch(!useSearch)}
            className={`p-2.5 rounded-full transition-all ${
              useSearch
                ? 'text-blue-400 bg-blue-500/10 ring-1 ring-blue-500/30'
                : 'text-gray-400 hover:text-blue-400 hover:bg-gray-800/80'
            }`}
            title={useSearch ? "关闭联网搜索" : "开启联网搜索"}
            disabled={isLoading || isRecording}
          >
            <Globe size={20} />
          </button>

           {/* TTS Toggle Button */}
           <button
            onClick={onToggleTTS}
            className={`p-2.5 rounded-full transition-all ${
              enableTTS
                ? 'text-emerald-400 bg-emerald-500/10 ring-1 ring-emerald-500/30'
                : 'text-gray-400 hover:text-emerald-400 hover:bg-gray-800/80'
            }`}
            title={enableTTS ? "关闭自动朗读" : "开启自动朗读"}
            disabled={isLoading || isRecording}
          >
            {enableTTS ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 text-gray-400 hover:text-blue-400 hover:bg-gray-800/80 rounded-full transition-all"
            title="上传文件 (支持图片、文档、压缩包、音视频等)"
            disabled={isLoading || isRecording}
          >
            <Paperclip size={20} />
          </button>
          
          {/* Push-to-Talk Mic Button */}
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onMouseLeave={stopRecording}
            onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
            onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
            className={`p-2.5 rounded-full transition-all duration-200 select-none ${
              isRecording 
                ? 'text-white bg-red-600 shadow-lg shadow-red-600/40 scale-110' 
                : 'text-gray-400 hover:text-blue-400 hover:bg-gray-800/80'
            }`}
            title="按住说话，松开发送"
            disabled={isLoading}
          >
            <Mic size={20} fill={isRecording ? "currentColor" : "none"} />
          </button>
        </div>

        {/* Expanded accept attribute to support archives and media */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          accept="image/*,audio/*,video/*,application/pdf,text/*,.zip,.rar,.7z,.tar,.gz,.js,.jsx,.ts,.tsx,.py,.java,.cpp,.c,.h,.json,.md"
          className="hidden"
        />

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={adjustTextareaHeight}
          onKeyDown={handleKeyDown}
          placeholder={isRecording ? "正在录音..." : useSearch ? "搜索并询问..." : "按住麦克风说话..."}
          disabled={isLoading} 
          className="flex-1 bg-transparent text-gray-100 placeholder-gray-500 py-3.5 px-2 min-h-[52px] max-h-[200px] resize-none outline-none text-base"
          rows={1}
        />

        {/* Right Actions (Send/Stop) */}
        <div className="pb-1 pr-1">
          {isLoading ? (
            <button
              onClick={onStop}
              className="p-2.5 bg-gray-800 text-gray-300 rounded-full hover:bg-gray-700 hover:text-white transition-all shadow-lg border border-gray-700 active:scale-95"
              title="停止生成"
            >
              <div className="relative">
                 <div className="absolute inset-0 bg-current opacity-20 rounded-sm animate-ping" />
                 <StopCircle size={20} fill="currentColor" className="text-red-500" />
              </div>
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={(!input.trim() && attachments.length === 0) || isRecording}
              className={`p-2.5 rounded-full transition-all duration-200 ${
                (!input.trim() && attachments.length === 0) || isRecording
                  ? 'bg-gray-800/50 text-gray-600'
                  : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20 active:scale-95'
              }`}
            >
              <Send size={20} className={input.trim() || attachments.length > 0 ? 'ml-0.5' : ''} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InputArea;