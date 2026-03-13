/**
 * Vocabulary AI Worker
 * Provides TTS pronunciation and AI word analysis via Cloudflare Workers AI
 */

export interface Env {
  AI: Ai;
}

// CORS headers for frontend access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Handle CORS preflight
function handleOptions(): Response {
  return new Response(null, { headers: corsHeaders });
}

// Text-to-Speech endpoint
async function handleTTS(request: Request, env: Env): Promise<Response> {
  try {
    const { text, lang = 'en' } = await request.json() as { text: string; lang?: string };

    if (!text) {
      return new Response(JSON.stringify({ error: 'Text is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = await env.AI.run('@cf/myshell-ai/melotts', {
      prompt: text,
      lang: lang,
    }) as { audio: string };

    // Return audio as base64
    return new Response(JSON.stringify({ audio: response.audio }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('TTS Error:', error);
    return new Response(JSON.stringify({ error: 'TTS generation failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// AI Word Analysis endpoint
async function handleAnalysis(request: Request, env: Env): Promise<Response> {
  try {
    const { word, definition, example, targetLang = 'zh' } = await request.json() as {
      word: string;
      definition: string;
      example?: string;
      targetLang?: string;
    };

    if (!word) {
      return new Response(JSON.stringify({ error: 'Word is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const langMap: Record<string, string> = {
      zh: '中文',
      en: 'English',
      ja: '日本語',
      ko: '한국어',
      es: 'Español',
      de: 'Deutsch',
      pt: 'Português',
      ru: 'Русский',
      ar: 'العربية',
      ms: 'Bahasa Melayu',
    };

    const outputLang = langMap[targetLang] || '中文';

    const systemPrompt = `你是英语词汇专家。直接输出JSON，不要解释。用${outputLang}回答。`;

    const userPrompt = `分析单词 "${word}" (${definition})，直接返回JSON:
{"etymology":"词源(简短)","memory_tip":"记忆技巧","synonyms":["近义词"],"antonyms":["反义词"],"collocations":["常见搭配"],"example_sentences":["例句"],"usage_notes":"用法注意"}`;

    const aiResponse = await env.AI.run('@cf/zai-org/glm-4.7-flash' as any, {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 2048,
      temperature: 0.7,
    });

    // Handle OpenAI-compatible response format
    let responseText = '';
    if (typeof aiResponse === 'string') {
      responseText = aiResponse;
    } else if (aiResponse && typeof aiResponse === 'object') {
      const resp = aiResponse as any;
      // OpenAI format: choices[0].message.content or reasoning_content
      if (resp.choices && resp.choices[0]?.message) {
        const msg = resp.choices[0].message;
        responseText = msg.content || msg.reasoning_content || msg.reasoning || '';
      } else {
        // Fallback to other formats
        responseText = resp.response || resp.result?.response || resp.generated_text || resp.text || '';
      }
    }

    // Try to parse the JSON response
    let analysis;
    try {
      // Extract JSON from the response (it might be wrapped in markdown code blocks)
      const jsonMatch = responseText.match(/\{[\s\S]*?\}(?=\s*$|\s*```|\s*\n\n)/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        // Try to find the last complete JSON object
        const allJsonMatches = responseText.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
        if (allJsonMatches && allJsonMatches.length > 0) {
          // Try parsing from the last match backwards
          for (let i = allJsonMatches.length - 1; i >= 0; i--) {
            try {
              analysis = JSON.parse(allJsonMatches[i]);
              break;
            } catch {
              continue;
            }
          }
        }
        if (!analysis) {
          analysis = { raw: responseText };
        }
      }
    } catch {
      analysis = { raw: responseText };
    }

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Analysis Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
    return new Response(JSON.stringify({ error: errorMessage, details: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// AI Chat endpoint
async function handleChat(request: Request, env: Env): Promise<Response> {
  try {
    const { message, context, targetLang = 'zh' } = await request.json() as {
      message: string;
      context: string;
      targetLang?: string;
    };

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const langMap: Record<string, string> = {
      zh: '中文',
      en: 'English',
      ja: '日本語',
      ko: '한국어',
      es: 'Español',
      de: 'Deutsch',
      pt: 'Português',
      ru: 'Русский',
      ar: 'العربية',
      ms: 'Bahasa Melayu',
    };

    const outputLang = langMap[targetLang] || '中文';

    const systemPrompt = `You are a vocabulary tutor. Reply in ${outputLang} only. Keep answer under 60 words. Be direct and friendly. No markdown symbols like * or #. No bullet points.`;

    const userPrompt = `Word: ${context.split('\n')[0]?.replace('当前学习的单词: ', '') || 'unknown'}
Question: ${message}
Answer in ${outputLang}:`;

    const aiResponse = await env.AI.run('@cf/zai-org/glm-4.7-flash' as any, {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 256,
      temperature: 0.7,
      // Disable thinking/reasoning mode to get direct answer
      thinking: { type: 'disabled' },
    });

    // Handle OpenAI-compatible response format
    let responseText = '';
    if (typeof aiResponse === 'string') {
      responseText = aiResponse;
    } else if (aiResponse && typeof aiResponse === 'object') {
      const resp = aiResponse as any;
      if (resp.choices && resp.choices[0]?.message) {
        const msg = resp.choices[0].message;
        // Get content (final answer), not reasoning_content (thinking process)
        responseText = msg.content || '';
      } else {
        responseText = resp.response || resp.result?.response || resp.generated_text || resp.text || '';
      }
    }

    // Clean up response - remove markdown symbols and numbering
    responseText = responseText
      .replace(/^\s*\d+\.\s*/gm, '')
      .replace(/^\s*[\*\-]\s*/gm, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/#{1,6}\s*/g, '')
      .trim();

    return new Response(JSON.stringify({ reply: responseText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Chat Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Chat failed';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Main request handler
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleOptions();
    }

    // Route requests
    if (url.pathname === '/tts' && request.method === 'POST') {
      return handleTTS(request, env);
    }

    if (url.pathname === '/analyze' && request.method === 'POST') {
      return handleAnalysis(request, env);
    }

    if (url.pathname === '/chat' && request.method === 'POST') {
      return handleChat(request, env);
    }

    // Health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', timestamp: Date.now() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  },
};
