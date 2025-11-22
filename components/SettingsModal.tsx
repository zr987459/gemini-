import React, { useState, useEffect } from 'react';
import { X, Key, Settings, Zap, Type, Layout, CheckCircle2, AlertCircle, Loader2, Volume2, Maximize, Globe, Server, ChevronDown, ChevronRight, LogIn, MessageSquare, Play } from 'lucide-react';
import { validateApiKey } from '../services/geminiService';
import { validateDoubaoSession } from '../services/doubaoService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  textSize: string;
  bubbleSize: string;
  bubbleMaxWidth: string;
  enableTTS: boolean;
  ttsSpeed: number;
  baseUrl: string;
  customHeaders: string;
  doubaoSessionId: string;
  onSave: (
    key: string, 
    textSize: string, 
    bubbleSize: string, 
    bubbleMaxWidth: string, 
    enableTTS: boolean, 
    ttsSpeed: number,
    baseUrl: string,
    customHeaders: string,
    doubaoSessionId: string
  ) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, onClose, apiKey, textSize, bubbleSize, bubbleMaxWidth, enableTTS, ttsSpeed, baseUrl, customHeaders, doubaoSessionId, onSave 
}) => {
  const [inputKey, setInputKey] = useState(apiKey);
  const [inputTextSize, setInputTextSize] = useState(textSize);
  const [inputBubbleSize, setInputBubbleSize] = useState(bubbleSize);
  const [inputBubbleMaxWidth, setInputBubbleMaxWidth] = useState(bubbleMaxWidth);
  const [inputEnableTTS, setInputEnableTTS] = useState(enableTTS);
  const [inputTtsSpeed, setInputTtsSpeed] = useState(ttsSpeed);
  const [inputBaseUrl, setInputBaseUrl] = useState(baseUrl);
  const [inputCustomHeaders, setInputCustomHeaders] = useState(customHeaders);
  const [inputDoubaoSession, setInputDoubaoSession] = useState(doubaoSessionId);

  const [showAIStudioBtn, setShowAIStudioBtn] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isDoubaoOpen, setIsDoubaoOpen] = useState(false);
  const [loginUrl, setLoginUrl] = useState('');
  
  // Validation State
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [headerError, setHeaderError] = useState('');

  // Doubao Validation
  const [isDoubaoValidating, setIsDoubaoValidating] = useState(false);
  const [doubaoStatus, setDoubaoStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Maps for slider values (0-4) to internal string IDs
  const textSizeMap = ['x-small', 'small', 'normal', 'large', 'x-large'];
  const bubbleSizeMap = ['x-compact', 'compact', 'normal', 'large', 'x-large'];
  const maxWidthMap = ['x-narrow', 'narrow', 'standard', 'wide', 'full'];
  
  const textSizeLabels: Record<string, string> = {
    'x-small': '极小', 'small': '小', 'normal': '标准', 'large': '大', 'x-large': '特大'
  };

  const bubbleSizeLabels: Record<string, string> = {
    'x-compact': '极紧凑', 'compact': '紧凑', 'normal': '标准', 'large': '宽敞', 'x-large': '极宽敞'
  };

  const maxWidthLabels: Record<string, string> = {
    'x-narrow': '极窄', 'narrow': '窄', 'standard': '标准', 'wide': '宽', 'full': '全宽'
  };

  useEffect(() => {
    if (isOpen) {
        setInputKey(apiKey);
        setInputTextSize(textSize);
        setInputBubbleSize(bubbleSize);
        setInputBubbleMaxWidth(bubbleMaxWidth);
        setInputEnableTTS(enableTTS);
        setInputTtsSpeed(ttsSpeed);
        setInputBaseUrl(baseUrl);
        setInputCustomHeaders(customHeaders);
        setInputDoubaoSession(doubaoSessionId);
        setValidationStatus('idle');
        setDoubaoStatus('idle');
        setHeaderError('');
        if (typeof window !== 'undefined' && (window as any).aistudio) {
          setShowAIStudioBtn(true);
        }
        
        if (!loginUrl) {
             const clientId = "547392155908-4kv6u2k3Ww4f1p3c5e7r8t9u0.apps.googleusercontent.com";
             const redirectUri = window.location.origin + window.location.pathname;
             const scope = "https://www.googleapis.com/auth/generativelanguage";
             const defaultUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${scope}`;
             setLoginUrl(defaultUrl);
        }
    }
  }, [apiKey, textSize, bubbleSize, bubbleMaxWidth, enableTTS, ttsSpeed, baseUrl, customHeaders, doubaoSessionId, isOpen]);

  const handleVerifyKey = async () => {
    if (!inputKey.trim()) return;
    setIsValidating(true);
    setValidationStatus('idle');
    const isValid = await validateApiKey(inputKey, inputBaseUrl.trim() || undefined);
    setIsValidating(false);
    setValidationStatus(isValid ? 'success' : 'error');
    if (isValid) setTimeout(() => setValidationStatus('idle'), 3000);
  };

  const handleVerifyDoubao = async () => {
    if (!inputDoubaoSession.trim()) return;
    setIsDoubaoValidating(true);
    setDoubaoStatus('idle');
    const isValid = await validateDoubaoSession(inputDoubaoSession.trim());
    setIsDoubaoValidating(false);
    setDoubaoStatus(isValid ? 'success' : 'error');
    if (isValid) setTimeout(() => setDoubaoStatus('idle'), 3000);
  }

  if (!isOpen) return null;

  const handleSave = () => {
    if (inputCustomHeaders.trim()) {
        try {
            JSON.parse(inputCustomHeaders);
        } catch (e) {
            setHeaderError('Headers 必须是有效的 JSON 格式');
            return;
        }
    }
    onSave(
        inputKey, 
        inputTextSize, 
        inputBubbleSize, 
        inputBubbleMaxWidth, 
        inputEnableTTS, 
        inputTtsSpeed, 
        inputBaseUrl, 
        inputCustomHeaders,
        inputDoubaoSession
    );
    onClose();
  };

  const handleAIStudio = async () => {
    try {
      if ((window as any).aistudio) await (window as any).aistudio.openSelectKey();
    } catch (e) {
      console.error("AI Studio key selection failed", e);
    }
  };
  
  const handleGetToken = () => {
      if (loginUrl) {
          window.location.href = loginUrl;
      }
  };

  const SliderGroup = ({ label, icon: Icon, value, map, onChange, minLabel, maxLabel, labels }: any) => {
    const currentIndex = map.indexOf(value);
    return (
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
           <label className="text-xs font-medium text-gray-300 flex items-center gap-1.5">
              <Icon size={14} className="text-gray-500" />
              {label}
           </label>
           <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
              {labels[value] || value}
           </span>
        </div>
        <input 
          type="range" 
          min="0" 
          max="4" 
          step="1" 
          value={currentIndex === -1 ? 2 : currentIndex}
          onChange={(e) => onChange(map[parseInt(e.target.value)])}
          className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
        <div className="flex justify-between text-[10px] text-gray-600 mt-1 px-0.5">
           <span>{minLabel}</span>
           <span>{maxLabel}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-[380px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto scrollbar-none">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Settings size={16} className="text-blue-400" />
            全局设置
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-gray-800">
            <X size={18} />
          </button>
        </div>
        
        <div className="p-5 space-y-5">
          
          {/* API Key */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-2">Gemini API Key</label>
            <div className="relative flex items-center">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                <Key size={14} className="text-gray-500" />
              </div>
              <input
                type="password"
                value={inputKey}
                onChange={(e) => { setInputKey(e.target.value); setValidationStatus('idle'); }}
                placeholder="sk-..."
                className="w-full bg-gray-950 border border-gray-700 rounded-md pl-8 pr-16 py-2 text-gray-100 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder-gray-700 text-xs font-mono"
              />
              <div className="absolute right-1 top-1/2 -translate-y-1/2">
                 <button
                   onClick={handleVerifyKey}
                   disabled={!inputKey || isValidating}
                   className={`px-2 py-1 rounded text-[10px] font-medium transition-all flex items-center gap-1 ${
                     validationStatus === 'success' ? 'bg-emerald-500/20 text-emerald-400 cursor-default' : 
                     validationStatus === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                   }`}
                 >
                   {isValidating ? <Loader2 size={10} className="animate-spin" /> : 
                    validationStatus === 'success' ? <><CheckCircle2 size={10} /> 有效</> : 
                    validationStatus === 'error' ? <><AlertCircle size={10} /> 无效</> : "验证"}
                 </button>
              </div>
            </div>
            {showAIStudioBtn && (
               <button onClick={handleAIStudio} className="mt-2 w-full py-1.5 px-3 bg-gray-800/50 hover:bg-gray-800 text-blue-300 text-xs rounded-md transition-colors flex items-center justify-center gap-1.5 border border-gray-700/50 border-dashed">
                 <Zap size={12} className="text-yellow-500" /> 使用 Google AI Studio 配置
               </button>
            )}
          </div>

          <div className="border-t border-gray-800/50 pt-4">
            <SliderGroup 
              label="界面字体" icon={Type} 
              value={inputTextSize} map={textSizeMap} onChange={setInputTextSize} 
              minLabel="极小" maxLabel="特大"
              labels={textSizeLabels}
            />
            
            <SliderGroup 
              label="气泡间距" icon={Layout} 
              value={inputBubbleSize} map={bubbleSizeMap} onChange={setInputBubbleSize} 
              minLabel="极紧凑" maxLabel="极宽敞"
              labels={bubbleSizeLabels}
            />
            
            <SliderGroup 
              label="气泡宽度" icon={Maximize} 
              value={inputBubbleMaxWidth} map={maxWidthMap} onChange={setInputBubbleMaxWidth} 
              minLabel="极窄" maxLabel="全宽"
              labels={maxWidthLabels}
            />
          </div>

          {/* TTS Settings */}
          <div className="border-t border-gray-800/50 pt-4">
             <div className="flex items-center justify-between mb-4">
               <label className="text-xs font-medium text-gray-300 flex items-center gap-1.5">
                 <Volume2 size={14} className="text-gray-500" />
                 自动朗读
               </label>
               <button 
                 onClick={() => setInputEnableTTS(!inputEnableTTS)}
                 className={`w-9 h-5 rounded-full relative transition-colors ${inputEnableTTS ? 'bg-blue-600' : 'bg-gray-700'}`}
               >
                 <div className={`absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform ${inputEnableTTS ? 'translate-x-4' : 'translate-x-0'}`} />
               </button>
             </div>

             {inputEnableTTS && (
                <div className="animate-in fade-in slide-in-from-top-1 bg-gray-950/50 rounded-lg p-3 border border-gray-800/50">
                   <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] text-gray-400">语速</span>
                      <span className="text-[10px] font-mono text-blue-400">{inputTtsSpeed.toFixed(1)}x</span>
                   </div>
                   <input 
                      type="range" min="0.5" max="3.0" step="0.1" 
                      value={inputTtsSpeed}
                      onChange={(e) => setInputTtsSpeed(parseFloat(e.target.value))}
                      className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                   />
                   <div className="flex justify-between text-[9px] text-gray-600 mt-1">
                      <span>0.5x</span><span>1.8x</span><span>3.0x</span>
                   </div>
                </div>
             )}
          </div>

          {/* Doubao Settings */}
          <div className="border-t border-gray-800/50 pt-4">
             <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setIsDoubaoOpen(!isDoubaoOpen)}
            >
                <label className="text-xs font-medium text-gray-300 flex items-center gap-1.5 select-none">
                    <MessageSquare size={14} className="text-blue-400" />
                    豆包配置 (Doubao)
                </label>
                {isDoubaoOpen ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronRight size={14} className="text-gray-500" />}
            </div>
            
            {isDoubaoOpen && (
                <div className="mt-3 animate-in fade-in slide-in-from-top-1 bg-gray-950/50 rounded-lg p-3 border border-gray-800/50">
                    <div className="flex justify-between items-center mb-1.5">
                       <label className="block text-[10px] font-medium text-gray-400">
                          Cookie 字符串
                       </label>
                       <button
                         onClick={handleVerifyDoubao}
                         disabled={!inputDoubaoSession.trim() || isDoubaoValidating}
                         className={`px-2 py-0.5 rounded text-[9px] font-medium transition-all flex items-center gap-1 ${
                           doubaoStatus === 'success' ? 'bg-emerald-500/20 text-emerald-400 cursor-default' : 
                           doubaoStatus === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                         }`}
                       >
                         {isDoubaoValidating ? <Loader2 size={9} className="animate-spin" /> : 
                          doubaoStatus === 'success' ? <><CheckCircle2 size={9} /> 有效</> : 
                          doubaoStatus === 'error' ? <><AlertCircle size={9} /> 无效</> : <><Play size={9} /> 验证</>}
                       </button>
                    </div>
                    <textarea 
                        value={inputDoubaoSession}
                        onChange={(e) => { setInputDoubaoSession(e.target.value); setDoubaoStatus('idle'); }}
                        placeholder="粘贴完整的 Cookie (包含 sessionid, uid 等)..."
                        rows={3}
                        className="w-full bg-gray-900 border border-gray-700 rounded-md px-2 py-1.5 text-xs font-mono text-gray-200 focus:ring-1 focus:ring-blue-500 outline-none placeholder-gray-700 resize-none"
                    />
                    <p className="text-[9px] text-gray-500 mt-1 leading-relaxed">
                       在豆包官网 F12 → Network → 复制任意请求的 <code>Cookie</code> 值。
                    </p>
                </div>
            )}
          </div>

          {/* Advanced Settings */}
          <div className="border-t border-gray-800/50 pt-4">
            <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            >
                <label className="text-xs font-medium text-gray-300 flex items-center gap-1.5 select-none">
                    <Server size={14} className="text-gray-500" />
                    高级配置 (代理/Cookie)
                </label>
                {isAdvancedOpen ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronRight size={14} className="text-gray-500" />}
            </div>

            {isAdvancedOpen && (
                <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-1 bg-gray-950/50 rounded-lg p-3 border border-gray-800/50">
                    <div>
                        <label className="block text-[10px] font-medium text-gray-400 mb-1.5 flex items-center gap-1">
                            <Globe size={10} /> Base URL (可选)
                        </label>
                        <input 
                            type="text"
                            value={inputBaseUrl}
                            onChange={(e) => setInputBaseUrl(e.target.value)}
                            placeholder="https://my-proxy-api.com"
                            className="w-full bg-gray-900 border border-gray-700 rounded-md px-2 py-1.5 text-xs text-gray-200 focus:ring-1 focus:ring-blue-500 outline-none placeholder-gray-700"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-medium text-gray-400 mb-1.5">
                            自定义 Headers (JSON 格式)
                        </label>
                        <textarea 
                            value={inputCustomHeaders}
                            onChange={(e) => { setInputCustomHeaders(e.target.value); setHeaderError(''); }}
                            placeholder='{"Cookie": "session=123", "X-Custom": "value"}'
                            rows={2}
                            className="w-full bg-gray-900 border border-gray-700 rounded-md px-2 py-1.5 text-xs font-mono text-gray-200 focus:ring-1 focus:ring-blue-500 outline-none placeholder-gray-700 resize-none"
                        />
                        {headerError && <p className="text-[10px] text-red-400 mt-1">{headerError}</p>}
                    </div>

                    {/* Auto Get Token Section */}
                    <div className="pt-2 border-t border-gray-800/50">
                        <label className="block text-[10px] font-medium text-gray-400 mb-1.5">
                            自动获取 Token (登录网站)
                        </label>
                        <div className="flex gap-2">
                             <input 
                                type="text"
                                value={loginUrl}
                                onChange={(e) => setLoginUrl(e.target.value)}
                                placeholder="https://accounts.google.com/..."
                                className="flex-1 bg-gray-900 border border-gray-700 rounded-md px-2 py-1.5 text-xs text-gray-200 focus:ring-1 focus:ring-blue-500 outline-none placeholder-gray-700"
                            />
                            <button 
                                onClick={handleGetToken}
                                className="px-3 py-1.5 bg-gray-800 hover:bg-blue-600 text-white text-xs rounded-md transition-colors flex items-center gap-1 whitespace-nowrap"
                            >
                                <LogIn size={12} /> 获取
                            </button>
                        </div>
                        <p className="text-[9px] text-gray-500 mt-1">
                            登录后会自动将 Token 配置到 Headers 中。
                        </p>
                    </div>
                </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white transition-colors hover:bg-gray-800 rounded-md">
              取消
            </button>
            <button onClick={handleSave} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-md shadow-lg shadow-blue-600/20 transition-all active:scale-95">
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;