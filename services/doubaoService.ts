import { Message, MessageRole, GroundingMetadata, Attachment } from '../types';

interface StreamDoubaoParams {
  prompt: string;
  attachments?: Attachment[];
  sessionId: string; // This is now the full Cookie string
  onStream: (text: string) => void;
  onDone: () => void;
  onError: (err: Error) => void;
  signal?: AbortSignal;
}

export const validateDoubaoSession = async (cookie: string): Promise<boolean> => {
  try {
    if (!cookie || !cookie.trim()) return false;

    console.log("🔍 [Doubao] Validating cookie...");
    // 注意：在普通浏览器环境中，fetch 无法设置 'Cookie' 请求头 (Forbidden Header Name)
    // 除非在 Electron、Project IDX 后端、或安装了修改 Header 插件的环境下运行。
    // 否则这里会抛出 'Failed to fetch' 或被浏览器静默拦截 Cookie。
    const res = await fetch('https://www.doubao.com/chat/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookie,
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: "test" }],
        model: "doubao-pro-128k"
      })
    });
    
    if (res.ok) {
        console.log("✅ [Doubao] Validation success");
        return true;
    }
    console.warn("⚠️ [Doubao] Validation failed with status:", res.status);
    return false;
  } catch (e) {
    console.error("❌ [Doubao] Cookie validation failed:", e);
    // 返回 false 表示验证失败，前端 UI 会显示“无效”
    return false;
  }
};

export const streamDoubaoResponse = async ({
  prompt,
  attachments,
  sessionId,
  onStream,
  onDone,
  onError,
  signal
}: StreamDoubaoParams) => {
  const startTime = Date.now();
  console.groupCollapsed(`🟢 [Doubao] Request`);
  console.log("Prompt:", prompt);
  if (attachments && attachments.length > 0) {
    console.table(attachments.map(a => ({ name: a.fileName, type: a.mimeType })));
    console.warn("⚠️ Attachments provided, but Doubao HTTP adapter only supports text. Appending file info to prompt.");
  }
  console.groupEnd();

  if (!sessionId) {
    onError(new Error("请先在设置中配置豆包 Cookie"));
    return;
  }

  try {
    // Since we can't upload files easily via this reverse-engineered fetch without multipart support or internal APIs,
    // we append a text note about the file to the prompt.
    let finalPrompt = prompt;
    if (attachments && attachments.length > 0) {
       const fileNames = attachments.map(a => `[File: ${a.fileName} (${a.mimeType})]`).join(', ');
       finalPrompt = `${prompt}\n\n(User attached files: ${fileNames})`;
    }

    const response = await fetch('https://www.doubao.com/chat/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionId,
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: finalPrompt }],
        model: "doubao-pro-128k",
        stream: false 
      }),
      signal
    });

    if (!response.ok) {
      let errText = '';
      try {
        errText = await response.text();
      } catch (e) {}
      
      const status = response.status;
      if (status === 0 || status === 403) {
         throw new Error("请求被拦截。请检查网络或环境（浏览器通常禁止直接设置 Cookie，需使用 Electron 或代理环境）。");
      }
      throw new Error(`Doubao API Error (${status}): ${errText.substring(0, 100)}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';

    if (!text) {
        throw new Error("豆包返回了空内容");
    }

    // Simulate streaming for UI consistency
    const chunkSize = 10;
    for (let i = 0; i < text.length; i += chunkSize) {
        if (signal?.aborted) break;
        const chunk = text.substring(0, i + chunkSize);
        onStream(chunk);
        await new Promise(r => setTimeout(r, 10));
    }
    onStream(text); // Ensure completion
    
    const duration = Date.now() - startTime;
    console.log(`✅ [Doubao] Completed in ${(duration / 1000).toFixed(2)}s`);
    
    onDone();

  } catch (error: any) {
    if (error.name === 'AbortError') {
        console.log("⚠️ [Doubao] Aborted by user");
        onDone();
        return;
    }
    // Check for the common "Failed to fetch" error which usually implies CORS/Network block
    if (error.message === 'Failed to fetch') {
        onError(new Error("连接失败 (Failed to fetch)。这是因为浏览器安全策略阻止了 Cookie 发送。此功能需在 Electron/插件/代理环境中运行。"));
    } else {
        console.error("❌ [Doubao Fetch Error]:", error);
        onError(error);
    }
  }
};