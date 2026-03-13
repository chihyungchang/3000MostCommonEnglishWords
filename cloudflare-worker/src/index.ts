/**
 * Vocabulary AI Worker
 * Provides TTS pronunciation and AI chat via Cloudflare Workers AI
 */

export interface Env {
  AI: Ai;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const langMap: Record<string, string> = {
  zh: "中文",
  en: "English",
  ja: "日本語",
  ko: "한국어",
  es: "Español",
  de: "Deutsch",
  pt: "Português",
  ru: "Русский",
  ar: "العربية",
  ms: "Bahasa Melayu",
};

function handleOptions(): Response {
  return new Response(null, { headers: corsHeaders });
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// 从 AI 响应中提取内容
function extractContent(aiResponse: unknown): string {
  if (typeof aiResponse === "string") return aiResponse;

  if (aiResponse && typeof aiResponse === "object") {
    const resp = aiResponse as Record<string, unknown>;

    if (Array.isArray(resp.choices) && resp.choices.length > 0) {
      const choice = resp.choices[0] as Record<string, unknown>;
      const message = choice.message as Record<string, unknown> | undefined;

      if (message) {
        // 优先使用 content
        if (typeof message.content === "string" && message.content) {
          return message.content;
        }
        // 如果 content 为空，使用 reasoning_content
        if (
          typeof message.reasoning_content === "string" &&
          message.reasoning_content
        ) {
          return message.reasoning_content;
        }
        if (typeof message.reasoning === "string" && message.reasoning) {
          return message.reasoning;
        }
      }
    }

    if (typeof resp.response === "string") return resp.response;
  }

  return "";
}

async function handleTTS(request: Request, env: Env): Promise<Response> {
  try {
    const { text, lang = "en" } = (await request.json()) as {
      text: string;
      lang?: string;
    };

    if (!text) {
      return jsonResponse({ error: "Text is required" }, 400);
    }

    const response = (await env.AI.run("@cf/myshell-ai/melotts", {
      prompt: text,
      lang: lang,
    })) as { audio: string };

    return jsonResponse({ audio: response.audio });
  } catch (error) {
    console.error("TTS Error:", error);
    return jsonResponse({ error: "TTS generation failed" }, 500);
  }
}

async function handleChat(request: Request, env: Env): Promise<Response> {
  try {
    const {
      message,
      context,
      targetLang = "zh",
    } = (await request.json()) as {
      message: string;
      context: string;
      targetLang?: string;
    };

    if (!message) {
      return jsonResponse({ error: "Message is required" }, 400);
    }

    const outputLang = langMap[targetLang] || "中文";
    const word = context.split("\n")[0]?.replace("当前学习的单词: ", "") || "";

    // 判断是否是要求造句
    const needsEnglish = /sentence|例句|造句|造个句/.test(message);

    const systemPrompt = needsEnglish
      ? `You are an English tutor. Output ONLY an English sentence using the word. Nothing else.`
      : `You are an English vocabulary tutor. Answer in ${outputLang}. Direct answer only, max 30 words.`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const aiResponse = await env.AI.run("@cf/zai-org/glm-4.7-flash" as any, {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Word: "${word}". ${message}` },
      ],
      max_tokens: 512,
      temperature: 0.3,
    });

    const responseText = extractContent(aiResponse);

    return jsonResponse({
      reply: responseText || "暂时无法回答",
    });
  } catch (error) {
    console.error("Chat Error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: msg }, 500);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return handleOptions();
    }

    switch (url.pathname) {
      case "/tts":
        if (request.method === "POST") return handleTTS(request, env);
        break;
      case "/chat":
        if (request.method === "POST") return handleChat(request, env);
        break;
      case "/health":
        return jsonResponse({ status: "ok", timestamp: Date.now() });
    }

    return jsonResponse({ error: "Not found" }, 404);
  },
};
