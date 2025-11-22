import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, Eye, Code, Terminal, Maximize2, X, ChevronDown, ChevronRight, ChevronUp } from 'lucide-react';

interface CodeBlockProps {
  language: string;
  code: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  const [isPreview, setIsPreview] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false); // Header collapse (minimize entire block)
  
  // State for Footer expansion (View All vs Fixed Height)
  // Default false = fixed height (restricted)
  const [isExpanded, setIsExpanded] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Handle Esc key to exit fullscreen
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isFullScreen]);

  const canPreview = language === 'html' || language === 'svg';
  
  const lines = code.split('\n');
  if (lines.length > 1 && lines[lines.length - 1] === '') {
    lines.pop();
  }

  // Threshold for showing the bottom expander
  const showFooter = lines.length > 15;

  // Auto-scroll to bottom when code updates and we are in restricted view mode.
  // This ensures the user sees the latest generated code line in real-time.
  useLayoutEffect(() => {
    if (scrollRef.current && !isExpanded && showFooter) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [code, isExpanded, showFooter]);

  const FullScreenPreview = () => (
    <div className="fixed inset-0 z-[9999] bg-gray-900 flex flex-col animate-in fade-in duration-200">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700 shrink-0">
        <div className="flex items-center gap-2 text-gray-300">
           <Eye size={16} className="text-blue-400" />
           <span className="font-medium">全屏预览</span>
        </div>
        <button 
          onClick={() => setIsFullScreen(false)}
          className="p-2 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>
      </div>
      <div className="flex-1 bg-white w-full h-full relative">
        <iframe
          srcDoc={code}
          className="w-full h-full border-0 absolute inset-0"
          sandbox="allow-scripts allow-modals allow-forms allow-popups"
          title="FullScreen Code Preview"
        />
      </div>
    </div>
  );

  return (
    <>
      {isFullScreen && createPortal(<FullScreenPreview />, document.body)}
      
      <div 
        className={`my-4 w-full max-w-full rounded-lg border border-gray-700 bg-[#0d1117] group shadow-sm flex flex-col relative min-w-0 transition-all duration-200`}
      >
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-2 bg-gray-800/90 border-b border-gray-700/50 backdrop-blur-md select-none h-[42px] shrink-0 rounded-t-lg">
          <div 
            className="flex items-center gap-2 cursor-pointer hover:text-gray-200 transition-colors"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? "展开代码块" : "最小化代码块"}
          >
             {isCollapsed ? <ChevronRight size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
             <Terminal size={14} className="text-gray-500" />
             <span className="text-xs font-medium text-gray-400 uppercase font-mono">{language || 'text'}</span>
          </div>
          
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              {canPreview && (
                <>
                  <button
                    onClick={() => setIsPreview(!isPreview)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
                      isPreview 
                        ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/50' 
                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
                    }`}
                  >
                    {isPreview ? (
                      <><Code size={14} /> 查看代码</>
                    ) : (
                      <><Eye size={14} /> 运行预览</>
                    )}
                  </button>
                </>
              )}
              <button
                onClick={handleCopy}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-md transition-all"
                title="复制"
              >
                {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              </button>
            </div>
          )}
        </div>

        {/* Content Area */}
        {!isCollapsed && (
          <div className="relative flex-1 flex flex-col min-w-0">
            {isPreview && canPreview ? (
              <div className="w-full bg-white relative flex-1 min-w-0 h-[400px] rounded-b-lg overflow-hidden">
                <button
                  onClick={() => setIsFullScreen(true)}
                  className="absolute top-2 right-2 z-10 p-2 bg-gray-900/80 text-white rounded-md hover:bg-blue-600 transition-colors backdrop-blur-sm shadow-lg"
                  title="全屏预览"
                >
                  <Maximize2 size={16} />
                </button>
                <iframe
                  srcDoc={code}
                  className="w-full h-full border-0"
                  sandbox="allow-scripts allow-modals allow-forms allow-popups"
                  title="Code Preview"
                />
              </div>
            ) : (
              <>
                <div 
                  ref={scrollRef}
                  className={`flex-1 bg-[#0d1117] w-full scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent ${
                    !isExpanded && showFooter ? 'overflow-y-auto max-h-[320px]' : 'overflow-visible h-auto'
                  }`}
                >
                  {/* Using Flex Column to enforce width constraints */}
                  <div className="flex flex-col min-w-full w-fit font-mono text-[13px] leading-6 pb-2">
                    {lines.map((line, index) => {
                      // Indentation guide logic
                      const leadingSpaces = line.search(/\S|$/);
                      const indentGuides = [];
                      for (let i = 2; i <= leadingSpaces; i += 2) {
                        indentGuides.push(i);
                      }

                      return (
                        <div key={index} className="flex hover:bg-white/[0.04] transition-colors relative group/line min-w-full">
                          {/* Line Number - Sticky Left */}
                          <div className="flex-shrink-0 text-right pr-4 pl-3 select-none text-gray-600 w-[50px] border-r border-gray-800 bg-[#0d1117] sticky left-0 z-10">
                            {index + 1}
                          </div>
                          
                          {/* Code Content */}
                          <div className="flex-1 pl-4 pr-4 text-gray-300 whitespace-pre relative">
                            {/* Indentation Guides */}
                            {indentGuides.map((pos) => (
                              <div
                                key={pos}
                                className="absolute top-0 bottom-0 border-l border-gray-700/30 pointer-events-none"
                                style={{ left: `calc(1rem + ${pos - 2}ch)` }} 
                              />
                            ))}
                            {line || '\n'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Expand/Collapse Toggle (Only if long enough) */}
                {showFooter && (
                  <div 
                    className="h-7 bg-gray-800/50 border-t border-gray-700 hover:bg-gray-800 flex items-center justify-center cursor-pointer transition-colors rounded-b-lg group/footer select-none"
                    onClick={() => setIsExpanded(!isExpanded)}
                    title={isExpanded ? "收起代码" : "展开全部"}
                  >
                     <div className="flex items-center gap-1.5 text-gray-500 group-hover/footer:text-blue-400 transition-colors">
                        {isExpanded ? (
                          <>
                             <span className="text-[10px] font-medium">收起</span>
                             <ChevronUp size={14} />
                          </>
                        ) : (
                          <>
                             <span className="text-[10px] font-medium">展开更多</span>
                             <ChevronDown size={14} />
                          </>
                        )}
                     </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default CodeBlock;