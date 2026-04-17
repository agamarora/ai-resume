import Groq from "groq-sdk";
import { readFileSync } from "fs";
import { join } from "path";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
  maxRetries: 0,
  timeout: 3140,
});

// Read system prompt from bundled file (included via netlify.toml included_files)
let SYSTEM_PROMPT, SYSTEM_REMINDER;
try {
  const raw = readFileSync(join(process.cwd(), "system-prompt.md"), "utf8");
  // Extract content between # System Prompt and ## Reminder
  const mainMatch = raw.match(/# System Prompt\n([\s\S]*?)## Reminder/);
  SYSTEM_PROMPT = mainMatch ? mainMatch[1].trim() : raw;
  // Extract reminder section
  const reminderMatch = raw.match(/## Reminder\n([\s\S]*?)$/);
  SYSTEM_REMINDER = reminderMatch ? reminderMatch[1].trim() : "";
} catch (err) {
  console.error("Failed to read system-prompt.md:", err.message);
  SYSTEM_PROMPT = "You are an AI assistant. Answer questions briefly.";
  SYSTEM_REMINDER = "";
}

const MAX_INPUT_LENGTH = 200;
const MAX_HISTORY_MSG_LENGTH = 500;
const MAX_COMPLETION_TOKENS = 100;

const MODELS = [
  "llama-3.1-8b-instant",
  "qwen/qwen3-32b",
  "openai/gpt-oss-20b",
  "llama-3.3-70b-versatile",
];

// http://localhost:8888 — replaced by setup.js
const ALLOWED_ORIGINS = new Set([
  "http://localhost:8888",
]);

function isOriginAllowed(origin) {
  if (!origin) return true; // Same-origin requests (Samsung Internet strips Origin header)
  if (ALLOWED_ORIGINS.has(origin)) return true;
  try {
    const hostname = new URL(origin).hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") return true;
  } catch { /* invalid origin */ }
  return false;
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": isOriginAllowed(origin) ? (origin || "*") : "",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts)/i,
  /what\s+(is|are)\s+your\s+(system|initial)\s+(prompt|instructions)/i,
  /reveal\s+your\s+(prompt|instructions|system)/i,
  /repeat\s+(the|your)\s+(above|system|initial)/i,
];

function isInjectionAttempt(text) {
  return INJECTION_PATTERNS.some((p) => p.test(text));
}

export default async function handler(req) {
  const origin = req.headers.get("origin") || "";
  const cors = corsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: cors });
  }

  try {
    const body = await req.json();
    const input = String(body.input || "").trim().slice(0, MAX_INPUT_LENGTH);
    if (!input) {
      return new Response(JSON.stringify({ error: "Empty input" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (isInjectionAttempt(input)) {
      return new Response(JSON.stringify({ text: "nice try. I don't break that easily." }), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const messages = [{ role: "system", content: SYSTEM_PROMPT }];

    // Conversation history (last 6 messages)
    const history = Array.isArray(body.history) ? body.history.slice(-6) : [];
    for (const msg of history) {
      if (msg.role === "user" || msg.role === "assistant") {
        const limit = msg.role === "assistant" ? MAX_HISTORY_MSG_LENGTH : MAX_INPUT_LENGTH;
        const content = String(msg.content || "").slice(0, limit);
        if (content && (msg.role === "assistant" || !isInjectionAttempt(content))) {
          messages.push({ role: msg.role, content });
        }
      }
    }

    messages.push({ role: "user", content: input });
    if (SYSTEM_REMINDER) {
      messages.push({ role: "system", content: SYSTEM_REMINDER });
    }

    let stream;
    let usedModel;
    for (const model of MODELS) {
      try {
        stream = await groq.chat.completions.create({
          model,
          messages,
          max_completion_tokens: MAX_COMPLETION_TOKENS,
          temperature: 0.7,
          stream: true,
        });
        usedModel = model;
        break;
      } catch (err) {
        console.error(`${model}: ${err.constructor.name} — ${err.message}`);
        // Continue cascade on recoverable errors
        if (
          err.constructor.name === "RateLimitError" ||
          err.constructor.name === "APIConnectionTimeoutError" ||
          err.constructor.name === "BadRequestError" ||
          err.constructor.name === "NotFoundError" ||
          err.status === 429 ||
          err.status === 400 ||
          err.status === 404
        ) {
          continue;
        }
        // Auth errors or unknown errors — stop trying
        break;
      }
    }

    if (!stream) {
      return new Response(
        JSON.stringify({ error: "All models unavailable. Check your GROQ_API_KEY." }),
        { status: 503, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const readable = new ReadableStream({
      async start(controller) {
        try {
          let inThinkBlock = false;
          for await (const chunk of stream) {
            let content = chunk.choices[0]?.delta?.content || "";
            // Strip <think>...</think> blocks (qwen model leaks reasoning)
            if (content.includes("<think>")) inThinkBlock = true;
            if (inThinkBlock) {
              if (content.includes("</think>")) {
                content = content.split("</think>").pop();
                inThinkBlock = false;
              } else {
                continue;
              }
            }
            if (content) {
              controller.enqueue(
                new TextEncoder().encode(`data: ${JSON.stringify({ text: content })}\n\n`)
              );
            }
          }
          controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify({ error: err.message })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      status: 200,
      headers: {
        ...cors,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("Handler error:", err);
    return new Response(JSON.stringify({ error: "Something went wrong." }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
}
