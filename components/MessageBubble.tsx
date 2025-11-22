import React from 'react';
import { Message, MessageRole } from '../types';
import MarkdownRenderer from './MarkdownRenderer';
import { Bot, User, AlertCircle, FileText, Globe, PlayCircle } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  bubbleSize?: string; // 'x-compact' | 'compact' | 'normal' | 'large' | 'x-large'
  bubbleMaxWidth?: string; // 'x-narrow' | 'narrow' | 'standard' | 'wide' | 'full'
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, bubbleSize = 'normal', bubbleMaxWidth = 'standard' }) => {
  const isUser = message.role === MessageRole.User;
  const isSystem = message.role === MessageRole.System;
  const isError = message.isError;

  if (isSystem) return null;

  const getPaddingClass = () => {
    switch (bubbleSize) {
      case 'x-compact': return 'px-1.5 py-0.5 gap-1';
      case 'compact': return 'px-2 py-1';
      case 'large': return 'px-4 py-3';
      case 'x-large': return 'px-6 py-4';
      default: return 'px-3 py-2'; // normal
    }
  };

  const getMaxWidthClass = () => {
    if (isUser) return 'max-w-[95%] md:max-w-[90%]'; // User messages always same width
    switch (bubbleMaxWidth) {
        case 'x-narrow': return 'max-w-[80%] md:max-w-[60%]';
        case 'narrow': return 'max-w-[90%] md:max-w-[75%]';
        case 'wide': return 'max-w-[98%] md:max-w-[98%]';
        case 'full': return 'max-w-full';
        default: return 'max-w-[95%] md:max-w-[90%]'; // standard
    }
  };

  return (
    <div className={`flex w-full mb-4 ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      <div className={`flex ${getMaxWidthClass()} gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'} min-w-0`}>
        
        {/* Avatar */}
        <div className={`flex-shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center shadow-sm border border-white/5 mt-0.5 ${
          isUser 
            ? 'bg-gradient-to-br from-blue-600 to-blue-700' 
            : isError 
              ? 'bg-red-600' 
              : 'bg-gradient-to-br from-emerald-600 to-emerald-700'
        }`}>
          {isUser ? (
            <User size={14} className="text-white" />
          ) : isError ? (
            <AlertCircle size={14} className="text-white" />
          ) : (
            <Bot size={14} className="text-white" />
          )}
        </div>

        {/* Content Bubble */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} w-full min-w-0`}>
          
          <div className={`relative ${getPaddingClass()} shadow-sm w-full md:w-auto transition-all max-w-full ${
            isUser 
              ? 'bg-blue-600/20 text-gray-100 rounded-xl rounded-tr-none border border-blue-500/20 backdrop-blur-sm' 
              : isError
                ? 'bg-red-900/20 border border-red-500/30 text-red-200 rounded-xl rounded-tl-none'
                : 'bg-gray-800/40 text-gray-100 border border-gray-700/50 rounded-xl rounded-tl-none backdrop-blur-sm'
          }`}>
            
            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {message.attachments.map((att) => {
                   if (att.type === 'image') {
                     return (
                      <img 
                        key={att.id}
                        src={att.data} 
                        alt={att.fileName} 
                        className="max-w-full h-auto max-h-48 rounded-md border border-white/10 shadow-sm"
                      />
                     );
                   } else if (att.mimeType.startsWith('audio/')) {
                     // Audio Player
                     return (
                       <div key={att.id} className="w-full max-w-[200px] bg-gray-900/50 p-2 rounded-lg border border-white/10 flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mb-0.5">
                            <PlayCircle size={12} />
                            <span className="truncate max-w-[150px]">{att.fileName}</span>
                          </div>
                          <audio controls src={att.data} className="w-full h-6 rounded opacity-80 hover:opacity-100 transition-opacity" />
                       </div>
                     );
                   } else {
                     // Generic File
                     return (
                      <div key={att.id} className="flex items-center gap-2 bg-gray-900/50 p-2 rounded-md border border-white/10 max-w-full hover:bg-gray-900/80 transition-colors">
                         <div className="p-1.5 bg-blue-500/20 rounded">
                           <FileText size={14} className="text-blue-400" />
                         </div>
                         <div className="overflow-hidden flex flex-col">
                            <p className="text-xs font-medium truncate max-w-[150px] text-gray-200">{att.fileName}</p>
                            <p className="text-[9px] text-gray-400 uppercase tracking-wider">{att.mimeType.split('/')[1] || 'FILE'}</p>
                         </div>
                      </div>
                     );
                   }
                })}
              </div>
            )}

            {/* Text Content */}
            <div className="prose prose-invert prose-sm max-w-none leading-snug w-full break-words overflow-hidden min-w-0">
              {message.content ? (
                <MarkdownRenderer content={message.content} />
              ) : (
                message.isStreaming && (
                   <div className="flex items-center gap-1 h-5">
                     <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                     <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                     <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                   </div>
                )
              )}
            </div>

            {/* Grounding / Search Sources */}
            {message.groundingMetadata && message.groundingMetadata.groundingChunks && message.groundingMetadata.groundingChunks.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-700/50 animate-in fade-in">
                <p className="text-[9px] font-semibold text-gray-400 mb-1 flex items-center gap-1">
                   <Globe size={10} /> 搜索来源
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {message.groundingMetadata.groundingChunks
                    .filter(chunk => chunk.web)
                    .map((chunk, idx) => (
                      <a 
                        key={idx} 
                        href={chunk.web?.uri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block max-w-full bg-gray-900/50 hover:bg-gray-700 px-1.5 py-1 rounded text-[10px] text-blue-300 truncate border border-gray-700 transition-colors hover:border-blue-500/30"
                        title={chunk.web?.title}
                      >
                        {chunk.web?.title || chunk.web?.uri}
                      </a>
                  ))}
                </div>
              </div>
            )}

          </div>
          
          {/* Timestamp */}
          {!message.isStreaming && (
             <span className={`text-[9px] text-gray-600 mt-1 px-0.5 select-none ${isUser ? 'mr-0.5' : 'ml-0.5'}`}>
               {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
             </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;