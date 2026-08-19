import type { Plugin } from 'vite';
import { config as loadEnv } from 'dotenv';

loadEnv();

type AiProviderId = 'anthropic' | 'deepseek' | 'openrouter';

interface ChatMessage {
  role: string;
  content: string;
}

interface ChatRequestBody {
  provider: AiProviderId;
  model: string;
  apiKey?: string;
  messages: ChatMessage[];
  responseFormat?: 'json' | 'text';
}

interface EmbeddingsRequestBody {
  texts: string[];
  model?: string;
}

function readBody(req: import('http').IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function sendJson(res: import('http').ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function resolveApiKey(provider: AiProviderId): string {
  const envKeys: Record<AiProviderId, string | undefined> = {
    anthropic: process.env.ANTHROPIC_API_KEY,
    deepseek: process.env.DEEPSEEK_API_KEY,
    openrouter: process.env.OPENROUTER_API_KEY,
  };
  const key = envKeys[provider];
  if (!key) {
    throw new Error(`API key not configured for ${provider}. Set ${provider.toUpperCase()}_API_KEY in .env`);
  }
  return key;
}

async function callAnthropic(apiKey: string, model: string, messages: ChatMessage[]) {
  const system = messages.find((m) => m.role === 'system')?.content;
  const chatMessages = messages.filter((m) => m.role !== 'system');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      system,
      messages: chatMessages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  const payload = (await response.json()) as {
    error?: { message?: string };
    content?: { type: string; text?: string }[];
  };

  if (!response.ok) {
    throw new Error(payload.error?.message ?? `Anthropic error (${response.status})`);
  }

  const text = payload.content?.find((c) => c.type === 'text')?.text;
  if (!text) throw new Error('Anthropic returned empty content');
  return text;
}

async function callOpenAiCompatible(
  url: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  extraHeaders: Record<string, string> = {},
  responseFormat: 'json' | 'text' = 'json',
) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    body: JSON.stringify({
      model,
      messages,
      ...(responseFormat === 'json' ? { response_format: { type: 'json_object' } } : {}),
      temperature: 0.4,
    }),
  });

  const payload = (await response.json()) as {
    error?: { message?: string };
    choices?: { message?: { content?: string } }[];
  };

  if (!response.ok) {
    throw new Error(payload.error?.message ?? `Provider error (${response.status})`);
  }

  const text = payload.choices?.[0]?.message?.content;
  if (!text) throw new Error('Provider returned empty content');
  return text;
}

async function forwardChat(body: ChatRequestBody): Promise<{ content: string; provider: string; model: string }> {
  const apiKey = resolveApiKey(body.provider);

  if (body.provider === 'anthropic') {
    const content = await callAnthropic(apiKey, body.model, body.messages);
    return { content, provider: body.provider, model: body.model };
  }

  if (body.provider === 'deepseek') {
    const content = await callOpenAiCompatible(
      'https://api.deepseek.com/chat/completions',
      apiKey,
      body.model,
      body.messages,
      {},
      body.responseFormat ?? 'json',
    );
    return { content, provider: body.provider, model: body.model };
  }

  const content = await callOpenAiCompatible(
    'https://openrouter.ai/api/v1/chat/completions',
    apiKey,
    body.model,
    body.messages,
    {
      'HTTP-Referer': process.env.APP_URL ?? 'http://localhost:3000',
      'X-Title': 'QBX Agent',
    },
    body.responseFormat ?? 'json',
  );
  return { content, provider: body.provider, model: body.model };
}

async function forwardEmbeddings(body: EmbeddingsRequestBody): Promise<{ embeddings: number[][]; model: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured for embeddings');
  }
  const model = body.model ?? 'text-embedding-3-small';
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, input: body.texts }),
  });
  const payload = (await response.json()) as {
    error?: { message?: string };
    data?: { embedding: number[] }[];
  };
  if (!response.ok) {
    throw new Error(payload.error?.message ?? `Embeddings error (${response.status})`);
  }
  return {
    embeddings: (payload.data ?? []).map((d) => d.embedding),
    model,
  };
}

export function aiProxyPlugin(): Plugin {
  return {
    name: 'qbx-ai-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? '';
        if (!url.startsWith('/api/ai/')) {
          next();
          return;
        }

        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }

        try {
          const raw = await readBody(req);
          const body = JSON.parse(raw) as Record<string, unknown>;

          if (url.startsWith('/api/ai/embeddings')) {
            const texts = body.texts as string[] | undefined;
            if (!Array.isArray(texts) || texts.length === 0) {
              sendJson(res, 400, { error: 'texts[] required' });
              return;
            }
            const result = await forwardEmbeddings({ texts, model: body.model as string | undefined });
            sendJson(res, 200, result);
            return;
          }

          if (url.startsWith('/api/ai/advise')) {
            // Client-side advise uses grow-agent + hybrid RAG; endpoint reserved for future server-only deploy.
            sendJson(res, 501, {
              error: 'Use in-app Grow Agent (hybrid RAG). Server advise route reserved for production edge.',
            });
            return;
          }

          if (!url.startsWith('/api/ai/chat')) {
            next();
            return;
          }

          const chatBody = body as unknown as ChatRequestBody;
          if (!chatBody.provider || !chatBody.model || !Array.isArray(chatBody.messages)) {
            sendJson(res, 400, { error: 'Invalid request body' });
            return;
          }

          const result = await forwardChat(chatBody);
          sendJson(res, 200, result);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'AI proxy error';
          sendJson(res, 502, { error: message });
        }
      });
    },
  };
}
