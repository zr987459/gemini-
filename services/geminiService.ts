import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { Message, MessageRole, Part, Attachment, GroundingMetadata } from '../types';

export const MODELS = {
  PRO: 'gemini-3-pro-preview',
  FLASH: 'gemini-2.5-flash'
};

interface SendMessageParams {
  model: string;
  history: Message[];
  newMessage: string;
  attachments?: Attachment[];
  useSearch?: boolean;
  onStream: (text: string, metadata?: GroundingMetadata) => void;
  signal?: AbortSignal;
  apiKey?: string;
  baseUrl?: string;
  customHeaders?: Record<string, string>;
}

export const validateApiKey = async (apiKey: string, baseUrl?: string): Promise<boolean> => {
  if (!apiKey) return false;
  try {
    const options: any = { apiKey };
    if (baseUrl) options.baseUrl = baseUrl;
    
    const ai = new GoogleGenAI(options);
    // Attempt a minimal generation to verify the key
    await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [{ text: 'test' }] },
    });
    return true;
  } catch (error) {
    console.error("API Key validation failed:", error);
    return false;
  }
};

export const streamGeminiResponse = async ({
  model,
  history,
  newMessage,
  attachments,
  useSearch,
  onStream,
  signal,
  apiKey,
  baseUrl,
  customHeaders
}: SendMessageParams): Promise<string> => {
  const startTime = Date.now();
  
  console.groupCollapsed(`🔵 [Gemini] Request: ${model}`);
  console.log("Prompt:", newMessage || "(No Text)");
  console.log("History Length:", history.length);
  if (attachments && attachments.length > 0) {
    console.table(attachments.map(a => ({ name: a.fileName, type: a.mimeType, size: `${(a.data.length / 1024).toFixed(2)} KB` })));
  }
  console.log("Settings:", { useSearch, baseUrl: baseUrl || 'default' });
  console.groupEnd();

  try {
    // Initialize Gemini Client dynamically with User Key or Fallback to Env Key
    const keyToUse = apiKey || process.env.API_KEY;
    
    if (!keyToUse) {
        throw new Error("API Key 未配置。请点击设置按钮配置您的 Gemini API Key。");
    }

    const clientOptions: any = { apiKey: keyToUse };
    if (baseUrl) {
      clientOptions.baseUrl = baseUrl;
    }
    if (customHeaders) {
      clientOptions.customHeaders = customHeaders;
    }

    const ai = new GoogleGenAI(clientOptions);

    // Convert internal message history to Gemini Chat format
    const chatHistory = history
      .filter(msg => !msg.isError && msg.role !== MessageRole.System)
      .map(msg => {
        const parts: Part[] = [];
        
        if (msg.attachments && msg.attachments.length > 0) {
           msg.attachments.forEach(att => {
             // Gemini accepts base64 data for inlineData
             // Note: Large files or archives might trigger API limits if not handled via File API
             // but for this implementation we pass them as inlineData.
             parts.push({
               inlineData: {
                 mimeType: att.mimeType,
                 data: att.data.split(',')[1] // Remove data URL header
               }
             });
           });
        }
        
        if (msg.content) {
          parts.push({ text: msg.content });
        }

        return {
          role: msg.role === MessageRole.User ? 'user' : 'model',
          parts: parts
        };
      });

    // Create chat session
    const chat: Chat = ai.chats.create({
      model: model,
      history: chatHistory,
      config: {
        systemInstruction: "你是一个智能、乐于助人且知识渊博的 AI 助手。请始终使用中文（简体）进行回复。你的回答应该准确、有条理，并且语气亲切。如果是代码问题，请提供清晰的代码示例。如果用户要求预览、运行代码或制作网页/小游戏，请务必提供一个包含完整 CSS 和 JS 的单文件 HTML 代码块（<!DOCTYPE html>...），以便用户可以直接在预览窗口中查看效果。",
        temperature: 0.7,
        tools: useSearch ? [{ googleSearch: {} }] : undefined,
      },
    });

    // Prepare current message parts
    const currentParts: (string | { inlineData: { mimeType: string; data: string } } | { text: string })[] = [];
    
    if (attachments && attachments.length > 0) {
      attachments.forEach(att => {
        currentParts.push({
          inlineData: {
            mimeType: att.mimeType,
            data: att.data.split(',')[1]
          }
        });
      });
    }
    
    if (newMessage) {
      currentParts.push({ text: newMessage });
    }
    
    let messagePayload: any = newMessage;
    if (attachments && attachments.length > 0) {
         messagePayload = currentParts;
    } else {
         messagePayload = newMessage;
    }

    const resultStream = await chat.sendMessageStream({ message: messagePayload });

    let fullText = '';
    let finalMetadata: GroundingMetadata | undefined;

    for await (const chunk of resultStream) {
      // Check for abort signal
      if (signal?.aborted) {
        break;
      }
      
      const chunkResponse = chunk as GenerateContentResponse;
      const text = chunkResponse.text;
      
      // Extract grounding metadata if present
      if (chunkResponse.candidates?.[0]?.groundingMetadata) {
        finalMetadata = chunkResponse.candidates[0].groundingMetadata as GroundingMetadata;
      }

      if (text) {
        fullText += text;
      }
      
      // Stream back text and potentially metadata
      onStream(fullText, finalMetadata);
    }

    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [Gemini] Completed in ${(duration / 1000).toFixed(2)}s. Length: ${fullText.length} chars.`);

    return fullText;

  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
       console.log("⚠️ [Gemini] Generation stopped by user");
       return "Generation stopped."; 
    }
    console.error("❌ [Gemini API Error]:", error);
    throw error;
  }
};