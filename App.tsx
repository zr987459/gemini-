import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Message, MessageRole, Attachment, GroundingMetadata } from './types';
import { streamGeminiResponse, MODELS } from './services/geminiService';
import { streamDoubaoResponse } from './services/doubaoService';
import MessageBubble from './components/MessageBubble';
import InputArea from './components/InputArea';
import SettingsModal from './components/SettingsModal';
import { Maximize, Minimize, Sparkles, Trash2, AlertTriangle, Info, Settings, ArrowDown, MessageSquare } from 'lucide-react';

const STORAGE_KEY_GEMINI = 'gemini_chat_history';
const STORAGE_KEY_DOUBAO = 'doubao_chat_history';
const API_KEY_STORAGE_KEY = 'gemini_api_key';
const UI_TEXT_SIZE_STORAGE_KEY = 'gemini_ui_text_size';
const UI_BUBBLE_SIZE_STORAGE_KEY = 'gemini_ui_bubble_size';
const UI_BUBBLE_WIDTH_STORAGE_KEY = 'gemini_ui_bubble_max_width';
const ENABLE_TTS_STORAGE_KEY = 'gemini_enable_tts';
const TTS_SPEED_STORAGE_KEY = 'gemini_tts_speed';
const BASE_URL_STORAGE_KEY = 'gemini_base_url';
const CUSTOM_HEADERS_STORAGE_KEY = 'gemini_custom_headers';
const ACTIVE_TAB_STORAGE_KEY = 'gemini_active_tab';
const DOUBAO_SESSION_STORAGE_KEY = 'doubao_session_id';

// Simple Toast Component
const Toast = ({ message, type, onClose }: { message: string, type: 'info' | 'error', onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 px-4 py-2 rounded-lg shadow-xl border backdrop-blur-md animate-in fade-in slide-in-from-top-5 ${
      type === 'error' 
        ? 'bg-red-900/80 border-red-500/50 text-red-100' 
        : 'bg-gray-800/90 border-blue-500/30 text-blue-100'
    }`}>
      {type === 'error' ? <AlertTriangle size={16} /> : <Info size={16} />}
      <span className="text-sm font-medium truncate max-w-[300px]">{message}</span>
    </div>
  );
};

const App: React.FC = () => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentModel, setCurrentModel] = useState<string>(MODELS.PRO);
  const [toast, setToast] = useState<{ message: string, type: 'info' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<'gemini' | 'doubao'>('gemini');
  
  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [textSize, setTextSize] = useState<string>('normal');
  const [bubbleSize, setBubbleSize] = useState<string>('normal');
  const [bubbleMaxWidth, setBubbleMaxWidth] = useState<string>('standard');
  const [enableTTS, setEnableTTS] = useState(false);
  const [ttsSpeed, setTtsSpeed] = useState(1.8); 
  const [baseUrl, setBaseUrl] = useState('');
  const [customHeaders, setCustomHeaders] = useState('');
  const [doubaoSessionId, setDoubaoSessionId] = useState('');

  // Refs for real-time state access
  const enableTTSRef = useRef(enableTTS);

  // Scroll & Layout Logic State
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [footerHeight, setFooterHeight] = useState(0);
  
  const scrollContainerRef = useRef<HTMLElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // TTS Refs
  const lastReadIndexRef = useRef(0);
  const isInsideCodeBlockRef = useRef(false); 
  const ttsBufferRef = useRef(''); 

  // Sync ref
  useEffect(() => {
    enableTTSRef.current = enableTTS;
  }, [enableTTS]);

  // 1. Initialize Global Settings
  useEffect(() => {
    const savedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (savedKey) setApiKey(savedKey);

    const savedTextSize = localStorage.getItem(UI_TEXT_SIZE_STORAGE_KEY);
    if (savedTextSize) setTextSize(savedTextSize);

    const savedBubbleSize = localStorage.getItem(UI_BUBBLE_SIZE_STORAGE_KEY);
    if (savedBubbleSize) setBubbleSize(savedBubbleSize);

    const savedBubbleWidth = localStorage.getItem(UI_BUBBLE_WIDTH_STORAGE_KEY);
    if (savedBubbleWidth) setBubbleMaxWidth(savedBubbleWidth);

    const savedTTS = localStorage.getItem(ENABLE_TTS_STORAGE_KEY);
    if (savedTTS) {
      const isEnabled = savedTTS === 'true';
      setEnableTTS(isEnabled);
      enableTTSRef.current = isEnabled;
    }

    const savedSpeed = localStorage.getItem(TTS_SPEED_STORAGE_KEY);
    if (savedSpeed) setTtsSpeed(parseFloat(savedSpeed));

    const savedBaseUrl = localStorage.getItem(BASE_URL_STORAGE_KEY);
    if (savedBaseUrl) setBaseUrl(savedBaseUrl);

    const savedHeaders = localStorage.getItem(CUSTOM_HEADERS_STORAGE_KEY);
    if (savedHeaders) setCustomHeaders(savedHeaders);

    const savedDoubaoSession = localStorage.getItem(DOUBAO_SESSION_STORAGE_KEY);
    if (savedDoubaoSession) setDoubaoSessionId(savedDoubaoSession);
    
    // Determine Initial Tab
    const savedTab = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
    if (savedTab === 'gemini' || savedTab === 'doubao') {
        setActiveTab(savedTab);
    }

    setIsInitialized(true);

    // Check for OAuth callback
    const hash = window.location.hash;
    if (hash && hash.includes('access_token=')) {
      try {
        const params = new URLSearchParams(hash.substring(1));
        const token = params.get('access_token');
        if (token) {
          const newHeaders = JSON.stringify({ "Authorization": `Bearer ${token}` }, null, 2);
          setCustomHeaders(newHeaders);
          localStorage.setItem(CUSTOM_HEADERS_STORAGE_KEY, newHeaders);
          window.history.replaceState(null, '', window.location.pathname);
          setTimeout(() => setToast({ message: "Token 获取成功！已自动配置到 Headers", type: 'info' }), 500);
        }
      } catch (e) {
        console.error("Error parsing access_token", e);
      }
    }
  }, []);

  // 2. Load Messages based on Active Tab
  useEffect(() => {
    if (!isInitialized) return;

    const storageKey = activeTab === 'gemini' ? STORAGE_KEY_GEMINI : STORAGE_KEY_DOUBAO;
    const savedData = localStorage.getItem(storageKey);
    
    if (savedData) {
        try {
            setMessages(JSON.parse(savedData));
        } catch (e) {
            console.error("Failed to parse history", e);
            setMessages([]);
        }
    } else {
        setMessages([]);
    }
  }, [activeTab, isInitialized]);

  // 3. Save Messages when they change (debounced slightly by effect nature)
  useEffect(() => {
    if (!isInitialized) return;
    
    const storageKey = activeTab === 'gemini' ? STORAGE_KEY_GEMINI : STORAGE_KEY_DOUBAO;
    try {
        localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch (e) {
        console.error("Failed to save history", e);
    }
  }, [messages, activeTab, isInitialized]);
  
  const switchTab = (tab: 'gemini' | 'doubao') => {
    if (isLoading) {
        showToast("请先停止当前生成", "error");
        return;
    }
    setActiveTab(tab);
    localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, tab);
  };

  // --- Dynamic Layout Logic (ResizeObserver) ---
  useLayoutEffect(() => {
    if (!footerRef.current) return;

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const height = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
        setFooterHeight(height);
        
        if (!showScrollButton && scrollContainerRef.current) {
           scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
      }
    });

    observer.observe(footerRef.current);
    return () => observer.disconnect();
  }, [showScrollButton]);

  const handleSaveSettings = (
      key: string, size: string, bSize: string, bWidth: string, tts: boolean, speed: number, 
      bUrl: string, headers: string, dSession: string
  ) => {
    setApiKey(key);
    setTextSize(size);
    setBubbleSize(bSize);
    setBubbleMaxWidth(bWidth);
    setEnableTTS(tts);
    setTtsSpeed(speed);
    setBaseUrl(bUrl);
    setCustomHeaders(headers);
    setDoubaoSessionId(dSession);

    localStorage.setItem(API_KEY_STORAGE_KEY, key);
    localStorage.setItem(UI_TEXT_SIZE_STORAGE_KEY, size);
    localStorage.setItem(UI_BUBBLE_SIZE_STORAGE_KEY, bSize);
    localStorage.setItem(UI_BUBBLE_WIDTH_STORAGE_KEY, bWidth);
    localStorage.setItem(ENABLE_TTS_STORAGE_KEY, String(tts));
    localStorage.setItem(TTS_SPEED_STORAGE_KEY, String(speed));
    localStorage.setItem(BASE_URL_STORAGE_KEY, bUrl);
    localStorage.setItem(CUSTOM_HEADERS_STORAGE_KEY, headers);
    localStorage.setItem(DOUBAO_SESSION_STORAGE_KEY, dSession);
    
    showToast("设置已保存", "info");
  };

  const getTextSizeClass = () => {
    switch (textSize) {
      case 'x-small': return 'text-xs';
      case 'small': return 'text-sm';
      case 'large': return 'text-lg';
      case 'x-large': return 'text-xl';
      default: return 'text-base'; 
    }
  };

  const toggleFullScreen = async () => {
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
      } catch (e) {
        showToast("全屏模式被浏览器拦截", "error");
      }
    } else {
      if (document.exitFullscreen) await document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullScreenChange = () => setIsFullScreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
  }, []);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    if (isAtBottom) {
      if (showScrollButton) setShowScrollButton(false);
    } else {
      if (!showScrollButton) setShowScrollButton(true);
    }
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: behavior
      });
    }
    setShowScrollButton(false);
  };

  // Auto-scroll
  useLayoutEffect(() => {
    if (!showScrollButton && scrollContainerRef.current) {
      const lastMessage = messages[messages.length - 1];
      const isStreaming = lastMessage?.isStreaming;

      if (isStreaming) {
        requestAnimationFrame(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
          }
        });
      } else {
        scrollContainerRef.current.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  }, [messages, showScrollButton, footerHeight]);


  const showToast = (msg: string, type: 'info' | 'error' = 'info') => {
    setToast({ message: msg, type });
  };

  const switchModel = (model: string) => {
    if (isLoading) return;
    setCurrentModel(model);
    const name = model === MODELS.PRO ? "Gemini 3.0 Pro" : "Gemini 2.5 Flash";
    showToast(`已切换至 ${name}`, 'info');
  };

  const clearHistory = () => {
    if (window.confirm('确定要清空当前对话历史吗？')) {
      setMessages([]);
      const storageKey = activeTab === 'gemini' ? STORAGE_KEY_GEMINI : STORAGE_KEY_DOUBAO;
      localStorage.removeItem(storageKey);
      showToast("历史记录已清空", "info");
    }
  };

  const speakText = (text: string) => {
    if (!text.trim()) return;
    
    let cleanText = text
      .replace(/`[^`]*`/g, '')
      .replace(/<[^>]*>/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
      .replace(/^#+\s+/gm, '')
      .replace(/(\*\*|__)(.*?)\1/g, '$2')
      .replace(/(\*|_)(.*?)\1/g, '$2')
      .replace(/^>\s+/gm, '')
      .replace(/^[\*\-]\s+/gm, '')
      .replace(/^\d+\.\s+/gm, '')
      .replace(/\n+/g, '. ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voices = window.speechSynthesis.getVoices();
    const zhVoice = voices.find(v => v.lang.includes('zh'));
    if (zhVoice) utterance.voice = zhVoice;
    
    utterance.rate = ttsSpeed; 
    window.speechSynthesis.speak(utterance);
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      showToast("生成已停止", "info");
      window.speechSynthesis.cancel();

      setMessages(prev => {
        const newMsgs = [...prev];
        const lastMsg = newMsgs[newMsgs.length - 1];
        if (lastMsg && lastMsg.role === MessageRole.Model && lastMsg.isStreaming) {
           return [ ...newMsgs.slice(0, -1), { ...lastMsg, isStreaming: false } ];
        }
        return newMsgs;
      });
    }
  };
  
  const toggleTTS = () => {
    const newState = !enableTTS;
    setEnableTTS(newState);
    enableTTSRef.current = newState;
    localStorage.setItem(ENABLE_TTS_STORAGE_KEY, String(newState));
    if (!newState) window.speechSynthesis.cancel();
    showToast(newState ? "自动朗读已开启" : "自动朗读已关闭", "info");
  };

  // Main Send Handler (Routing)
  const handleSend = async (text: string, attachments: Attachment[], useSearch: boolean) => {
    if (isLoading) return;
    
    console.log("📤 [App] User sending message:", { text, attachments: attachments.length, useSearch, tab: activeTab });

    // Reset TTS State
    lastReadIndexRef.current = 0;
    isInsideCodeBlockRef.current = false;
    ttsBufferRef.current = '';
    window.speechSynthesis.cancel();

    // Add User Message
    const newMessageId = Date.now().toString();
    const newUserMessage: Message = {
       id: newMessageId,
       role: MessageRole.User,
       content: text,
       timestamp: Date.now(),
       attachments: attachments
    };
    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);
    setShowScrollButton(false); 

    // Add AI Placeholder
    const modelMessageId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, {
       id: modelMessageId,
       role: MessageRole.Model,
       content: '',
       timestamp: Date.now(),
       isStreaming: true
    }]);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Stream Handler (Common for both)
    const onStreamCallback = (text: string, metadata?: GroundingMetadata) => {
        setMessages(prev => {
            const newMsgs = [...prev];
            const index = newMsgs.findIndex(m => m.id === modelMessageId);
            if (index !== -1) {
                newMsgs[index] = {
                    ...newMsgs[index],
                    content: text,
                    groundingMetadata: metadata
                };
            }
            return newMsgs;
        });
        
        // TTS Processing
        if (enableTTSRef.current) {
            const delta = text.slice(lastReadIndexRef.current);
            if (delta.length > 0) {
            lastReadIndexRef.current += delta.length;
            
            let i = 0;
            while (i < delta.length) {
                const remaining = delta.slice(i);
                if (remaining.startsWith('```')) {
                isInsideCodeBlockRef.current = !isInsideCodeBlockRef.current;
                i += 3;
                continue;
                }
                if (!isInsideCodeBlockRef.current) ttsBufferRef.current += delta[i];
                i++;
            }

            const delimiters = ['。', '！', '？', '\n', '.', '?', '!'];
            let lastDelimIndex = -1;
            for (const d of delimiters) {
                const idx = ttsBufferRef.current.lastIndexOf(d);
                if (idx > lastDelimIndex) lastDelimIndex = idx;
            }
            
            if (lastDelimIndex !== -1) {
                const segment = ttsBufferRef.current.substring(0, lastDelimIndex + 1);
                if (segment.trim()) speakText(segment);
                ttsBufferRef.current = ttsBufferRef.current.substring(lastDelimIndex + 1);
            }
            }
        } else {
            lastReadIndexRef.current = text.length;
            ttsBufferRef.current = '';
        }
    };

    try {
       if (activeTab === 'gemini') {
           // --- GEMINI SERVICE ---
           let headersObj: Record<string, string> | undefined;
           if (customHeaders.trim()) {
               try { headersObj = JSON.parse(customHeaders); } catch (e) { console.error(e); }
           }

           await streamGeminiResponse({
               model: currentModel,
               history: messages,
               newMessage: text,
               attachments: attachments,
               useSearch: useSearch,
               apiKey: apiKey,
               baseUrl: baseUrl.trim() || undefined,
               customHeaders: headersObj,
               signal: abortController.signal,
               onStream: onStreamCallback
           });
       } else {
           // --- DOUBAO SERVICE ---
           await new Promise<void>((resolve, reject) => {
               streamDoubaoResponse({
                   prompt: text,
                   attachments: attachments, // Pass attachments to Doubao (logs only for now)
                   sessionId: doubaoSessionId.trim(),
                   signal: abortController.signal,
                   onStream: onStreamCallback,
                   onDone: resolve,
                   onError: reject
               });
           });
       }
    } catch (error: any) {
        if (error.message === "Generation stopped." || error.name === 'AbortError') {
            // handled
        } else {
            console.error(error);
            let errorMessage = error.message || "未知错误";
            
            // Handle Object errors
            if (errorMessage === '[object Object]') {
                errorMessage = "连接失败，请检查网络或 Cookie 是否有效";
            }
            // Parse Gemini Errors
            try {
                if (errorMessage.includes('{')) {
                   const parsed = JSON.parse(errorMessage.substring(errorMessage.indexOf('{')));
                   if (parsed.error) errorMessage = `API 错误 (${parsed.error.code}): ${parsed.error.message}`;
                }
            } catch (e) { }

            showToast("发送失败: " + errorMessage, "error");
            setMessages(prev => {
                const newMsgs = [...prev];
                const index = newMsgs.findIndex(m => m.id === modelMessageId);
                if (index !== -1) {
                    newMsgs[index] = {
                        ...newMsgs[index],
                        isError: true,
                        content: "请求失败: " + errorMessage,
                        isStreaming: false
                    };
                }
                return newMsgs;
            });
        }
    } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
        setMessages(prev => {
            const newMsgs = [...prev];
            const index = newMsgs.findIndex(m => m.id === modelMessageId);
            if (index !== -1) {
                if (enableTTSRef.current && ttsBufferRef.current.trim()) {
                   speakText(ttsBufferRef.current);
                }
                newMsgs[index] = { ...newMsgs[index], isStreaming: false };
            }
            return newMsgs;
        });
    }
  };

  if (!isInitialized) return null;

  return (
    <div className={`flex flex-col h-screen bg-gray-950 text-gray-100 font-sans selection:bg-blue-500/30 ${getTextSizeClass()}`}>
      {/* Header */}
      <header className="flex items-center justify-between px-3 py-2.5 border-b border-gray-800 bg-gray-900/50 backdrop-blur-md z-50 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Sparkles size={18} className="text-white" />
          </div>
          
          {/* Service Switcher Tab */}
          <div className="flex bg-gray-800 rounded-lg p-1 border border-gray-700">
            <button
                onClick={() => switchTab('gemini')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    activeTab === 'gemini' 
                    ? 'bg-gray-700 text-white shadow-sm ring-1 ring-white/10' 
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
                }`}
            >
                <Sparkles size={12} />
                Gemini
            </button>
            <button
                onClick={() => switchTab('doubao')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    activeTab === 'doubao' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
                }`}
            >
                <MessageSquare size={12} />
                豆包
            </button>
          </div>

          {activeTab === 'gemini' && (
            <div className="flex items-center bg-gray-800 rounded-lg p-0.5 border border-gray-700 hidden sm:flex">
                <button 
                onClick={() => switchModel(MODELS.PRO)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${currentModel === MODELS.PRO ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                >
                3.0 Pro
                </button>
                <button 
                onClick={() => switchModel(MODELS.FLASH)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${currentModel === MODELS.FLASH ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                >
                2.5 Flash
                </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={clearHistory} className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-full transition-colors" title="清空历史">
            <Trash2 size={18} />
          </button>
          <button onClick={() => setShowSettings(true)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors" title="设置">
            <Settings size={18} />
          </button>
          <button onClick={toggleFullScreen} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors hidden md:block" title="全屏模式">
            {isFullScreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
        </div>
      </header>

      {/* Unified Native Chat Area */}
      <main 
          className="flex-1 overflow-y-auto relative scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
          ref={scrollContainerRef}
          onScroll={handleScroll}
          style={{ paddingBottom: footerHeight ? `${footerHeight}px` : '150px' }}
      >
          {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center opacity-0 animate-in fade-in zoom-in duration-500 delay-100 fill-mode-forwards">
              <div className={`w-20 h-20 bg-gradient-to-tr rounded-3xl flex items-center justify-center mb-6 border border-white/5 shadow-2xl ${activeTab === 'gemini' ? 'from-blue-500/20 to-purple-500/20 shadow-blue-900/20' : 'from-red-500/20 to-orange-500/20 shadow-red-900/20'}`}>
                  {activeTab === 'gemini' ? <Sparkles size={40} className="text-blue-400" /> : <MessageSquare size={40} className="text-red-400" />}
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                  你好，我是 {activeTab === 'gemini' ? 'Gemini' : '豆包'}
              </h2>
              <p className="text-gray-400 max-w-md mb-8 text-sm md:text-base">
                 {activeTab === 'gemini' ? '支持 Gemini 3.0 Pro 模型、多模态文件分析与联网搜索。' : '基于字节跳动豆包大模型，提供流畅的中文对话体验。'}
              </p>
              
              {/* Example Prompts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                  {["写一个贪吃蛇游戏", "解释量子纠缠", "分析这张图片", "今日科技新闻"].map((q, i) => (
                  <button 
                      key={i} 
                      onClick={() => handleSend(q, [], false)}
                      className="px-4 py-3 bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 rounded-xl text-sm text-left text-gray-300 hover:text-white transition-all"
                  >
                      {q}
                  </button>
                  ))}
              </div>
          </div>
          ) : (
          <div className="max-w-4xl mx-auto px-4 py-6">
              {messages.map(msg => (
                <MessageBubble key={msg.id} message={msg} bubbleSize={bubbleSize as any} bubbleMaxWidth={bubbleMaxWidth} />
              ))}
              <div ref={messagesEndRef} />
          </div>
          )}
          
          {showScrollButton && (
          <button 
              onClick={() => scrollToBottom('smooth')}
              className="fixed bottom-32 right-6 z-40 p-3 bg-gray-800 text-blue-400 rounded-full shadow-xl border border-gray-700 hover:bg-gray-700 transition-all animate-in fade-in slide-in-from-bottom-4"
          >
              <ArrowDown size={20} />
          </button>
          )}
      </main>

      <footer ref={footerRef} className="fixed bottom-0 left-0 right-0 z-40">
          <div className="bg-gradient-to-t from-gray-950 via-gray-950/90 to-transparent pt-10 pb-4 px-2">
          <InputArea 
              onSend={handleSend} 
              onStop={handleStopGeneration} 
              isLoading={isLoading}
              enableTTS={enableTTS}
              onToggleTTS={toggleTTS}
          />
          <p className="text-center text-[10px] text-gray-600 mt-2">
              {activeTab === 'gemini' ? 'Gemini 可能会生成不准确的信息，请核实。' : '豆包生成内容仅供参考，请以实际为准。'}
          </p>
          </div>
      </footer>
      
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
        apiKey={apiKey} 
        textSize={textSize} 
        bubbleSize={bubbleSize}
        bubbleMaxWidth={bubbleMaxWidth}
        enableTTS={enableTTS}
        ttsSpeed={ttsSpeed}
        baseUrl={baseUrl}
        customHeaders={customHeaders}
        doubaoSessionId={doubaoSessionId}
        onSave={handleSaveSettings} 
      />
    </div>
  );
};

export default App;