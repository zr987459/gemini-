export enum MessageRole {
  User = 'user',
  Model = 'model',
  System = 'system'
}

export interface Attachment {
  id: string;
  type: 'image' | 'file';
  mimeType: string;
  data: string; // Base64 string (Data URL)
  fileName: string;
}

export interface GroundingMetadata {
  groundingChunks: {
    web?: {
      uri: string;
      title: string;
    };
  }[];
  groundingSupports?: {
    segment: {
      startIndex: number;
      endIndex: number;
    };
    groundingChunkIndices: number[];
  }[];
  webSearchQueries?: string[];
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  attachments?: Attachment[]; 
  isStreaming?: boolean;
  isError?: boolean;
  groundingMetadata?: GroundingMetadata;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
}

export interface FullScreenState {
  isActive: boolean;
}

export interface Part {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}