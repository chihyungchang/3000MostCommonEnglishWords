/**
 * Vocabulary AI Worker
 * Provides TTS pronunciation and AI chat via Cloudflare Workers AI
 * With R2 caching for TTS and Supabase caching for word definitions
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

export interface Env {
  AI: Ai;
  TTS_CACHE: R2Bucket;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
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

// m2m100 translation model language codes
const m2mLangCode: Record<string, string> = {
  zh: "zh",
  en: "en",
  ja: "ja",
  ko: "ko",
  es: "es",
  de: "de",
  pt: "pt",
  ru: "ru",
  ar: "ar",
  ms: "ms",
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

// Get Supabase client
function getSupabaseClient(env: Env): SupabaseClient | null {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    return null;
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
}

// Generate TTS cache key using SHA-256 hash
async function generateTTSCacheKey(
  text: string,
  lang: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `tts/${lang}/${hashHex.slice(0, 16)}.mp3`;
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
        if (typeof message.content === "string" && message.content) {
          return message.content;
        }
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

async function handleTTS(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  try {
    const { text, lang = "en" } = (await request.json()) as {
      text: string;
      lang?: string;
    };

    if (!text) {
      return jsonResponse({ error: "Text is required" }, 400);
    }

    // Generate cache key
    const cacheKey = await generateTTSCacheKey(text, lang);

    // Check R2 cache
    if (env.TTS_CACHE) {
      try {
        const cached = await env.TTS_CACHE.get(cacheKey);
        if (cached) {
          const audioBuffer = await cached.arrayBuffer();
          const base64 = btoa(
            String.fromCharCode(...new Uint8Array(audioBuffer)),
          );
          return jsonResponse({ audio: base64, cached: true });
        }
      } catch (err) {
        console.error("R2 cache read error:", err);
      }
    }

    // Call AI to generate audio
    const response = (await env.AI.run("@cf/myshell-ai/melotts", {
      prompt: text,
      lang: lang,
    })) as { audio: string };

    // Store in R2 cache using waitUntil to ensure completion
    if (env.TTS_CACHE && response.audio) {
      ctx.waitUntil(
        (async () => {
          try {
            const audioBuffer = Uint8Array.from(atob(response.audio), (c) =>
              c.charCodeAt(0),
            );
            await env.TTS_CACHE.put(cacheKey, audioBuffer, {
              httpMetadata: {
                contentType: "audio/mpeg",
                cacheControl: "public, max-age=31536000",
              },
              customMetadata: {
                text: text.slice(0, 100),
                lang,
                createdAt: new Date().toISOString(),
              },
            });
            console.log("R2 cache saved:", cacheKey);
          } catch (err) {
            console.error("R2 cache write error:", err);
          }
        })(),
      );
    }

    return jsonResponse({ audio: response.audio, cached: false });
  } catch (error) {
    console.error("TTS Error:", error);
    return jsonResponse({ error: "TTS generation failed" }, 500);
  }
}

// Word lookup endpoint - returns structured word info with Supabase caching
async function handleLookup(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  try {
    const { word, targetLang = "zh" } = (await request.json()) as {
      word: string;
      targetLang?: string;
    };

    if (!word) {
      return jsonResponse({ error: "Word is required" }, 400);
    }

    const normalizedWord = word.toLowerCase().trim();
    const supabase = getSupabaseClient(env);

    // 1. Check Supabase cache
    if (supabase) {
      try {
        const { data: cached } = await supabase
          .from("word_definitions")
          .select("*")
          .eq("word", normalizedWord)
          .eq("target_lang", targetLang)
          .single();

        if (cached) {
          // Update hit count using waitUntil
          ctx.waitUntil(
            (async () => {
              try {
                await supabase
                  .from("word_definitions")
                  .update({ hit_count: (cached.hit_count || 0) + 1 })
                  .eq("id", cached.id);
                console.log("Hit count updated for:", normalizedWord);
              } catch (err) {
                console.error("Hit count update error:", err);
              }
            })(),
          );

          return jsonResponse({
            phonetic: cached.phonetic,
            pos: cached.pos,
            definition: cached.definition,
            example: cached.example,
            isPhrase: cached.is_phrase,
            cached: true,
          });
        }
      } catch (err) {
        // Cache miss or error, continue to AI
        console.log("Supabase cache miss or error:", err);
      }
    }

    // 2. Call AI to generate phonetic, pos, example (definition from translation model)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const aiResponse = await env.AI.run("@cf/meta/llama-3.2-3b-instruct", {
      messages: [
        {
          role: "system",
          content: "You are a dictionary API that returns strict JSON.",
        },
        {
          role: "user",
          content: `For the English word "${word}", return JSON:

{
  "phonetic": "/.../",
  "pos": ["..."],
  "example": "...",
  "cached": false
}

Return JSON with these fields:

- phonetic: IPA pronunciation of the word
- pos: array of part of speech (e.g. noun, verb, adjective, adverb, preposition)
- example: an English sentence using the word "${word}"
- cached: always false

Rules:
- phonetic must be the correct IPA for "${word}"
- pos must match the actual part of speech of "${word}"
- example must contain the word "${word}"
- output JSON only`,
        },
      ],
      max_tokens: 80,
      temperature: 0.1,
    });

    const responseText = extractContent(aiResponse);

    // 3. Parse JSON response
    let parsed: {
      phonetic?: string;
      pos?: string[];
      definition?: string;
      example?: string;
      isPhrase?: boolean;
    } | null = null;

    try {
      const jsonMatches = responseText.match(
        /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g,
      );
      if (jsonMatches && jsonMatches.length > 0) {
        for (let i = jsonMatches.length - 1; i >= 0; i--) {
          try {
            const result = JSON.parse(jsonMatches[i]);
            if (
              result.phonetic !== undefined ||
              result.pos !== undefined ||
              result.example !== undefined
            ) {
              parsed = result;
              break;
            }
          } catch {
            continue;
          }
        }
      }
    } catch {
      // JSON parsing failed
    }

    if (!parsed) {
      parsed = {};
    }

    // 3.5 Translate word using dedicated translation model
    const targetCode = m2mLangCode[targetLang] || "zh";
    try {
      const translationResponse = (await env.AI.run("@cf/meta/m2m100-1.2b", {
        text: normalizedWord,
        source_lang: "en",
        target_lang: targetCode,
      })) as { translated_text?: string };

      if (translationResponse.translated_text) {
        parsed.definition = translationResponse.translated_text;
      }
    } catch (err) {
      console.error("Translation error:", err);
      parsed.definition = normalizedWord; // Fallback to original word
    }

    // 4. Store in Supabase cache using waitUntil
    if (supabase && parsed.definition) {
      ctx.waitUntil(
        (async () => {
          try {
            await supabase.from("word_definitions").insert({
              word: normalizedWord,
              target_lang: targetLang,
              phonetic: parsed.phonetic || null,
              pos: Array.isArray(parsed.pos) ? parsed.pos : null,
              definition: parsed.definition,
              example: parsed.example || null,
              is_phrase: parsed.isPhrase || false,
            });
            console.log("Cached word definition:", normalizedWord);
          } catch (err) {
            console.error("Supabase insert error:", err);
          }
        })(),
      );
    }

    return jsonResponse({
      ...parsed,
      cached: false,
    });
  } catch (error) {
    console.error("Lookup Error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: msg }, 500);
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
      ? `Output ONLY one English sentence using the word "${word}".`
      : `English tutor. Answer in ${outputLang}. Max 30 words.`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const aiResponse = await env.AI.run(
      "@cf/meta/llama-3.2-3b-instruct" as any,
      {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        max_tokens: 100,
        temperature: 0.5,
      },
    );

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
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return handleOptions();
    }

    switch (url.pathname) {
      case "/tts":
        if (request.method === "POST") return handleTTS(request, env, ctx);
        break;
      case "/chat":
        if (request.method === "POST") return handleChat(request, env);
        break;
      case "/lookup":
        if (request.method === "POST") return handleLookup(request, env, ctx);
        break;
      case "/health":
        return jsonResponse({ status: "ok", timestamp: Date.now() });
    }

    return jsonResponse({ error: "Not found" }, 404);
  },
};
