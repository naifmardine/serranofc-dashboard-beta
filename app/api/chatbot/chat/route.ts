// app/api/chatbot/chat/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

type ChatRequest = {
  conversation_id?: string | null;
  messages: ChatMessage[];
  context?: Record<string, any>;
};

function safeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return { rawText: text };
  }
}

function normalizeUpstream(body: ChatRequest, data: any) {
  const obj = data && typeof data === "object" ? data : {};
  return {
    conversation_id: obj.conversation_id ?? body.conversation_id ?? null,
    assistant_message: obj.assistant_message ?? obj.assistant ?? obj.message ?? "",
    citations: Array.isArray(obj.citations) ? obj.citations : [],
    tool_traces: Array.isArray(obj.tool_traces) ? obj.tool_traces : [],
    raw: data,
  };
}

export async function POST(req: Request) {
  const baseUrl =
    process.env.SERRANO_CHATBOT_BASE_URL?.trim() ?? "http://127.0.0.1:8001";
  const key = process.env.SERRANO_INTERNAL_API_KEY?.trim();

  if (!key) {
    return NextResponse.json(
      { error: "Missing SERRANO_INTERNAL_API_KEY" },
      { status: 500 },
    );
  }

  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body?.messages?.length) {
    return NextResponse.json(
      { error: "messages[] is required" },
      { status: 400 },
    );
  }

  // Timeout para LLM — queries complexas podem levar ~30s, margem de segurança em 150s
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 150_000);

  try {
    const upstream = await fetch(`${baseUrl}/v1/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Api-Key": key,
      },
      body: JSON.stringify({
        conversation_id: body.conversation_id ?? null,
        messages: body.messages,
        context: body.context ?? {},
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    const text = await upstream.text();
    const data = safeJson(text);

    // ✅ se upstream deu erro, devolve o corpo pra você ver no UI
    if (!upstream.ok) {
      return NextResponse.json(
        {
          error: "Upstream error",
          status: upstream.status,
          contentType: upstream.headers.get("content-type") ?? "",
          body: data,
          rawText: text.slice(0, 4000),
        },
        { status: upstream.status },
      );
    }

    const normalized = normalizeUpstream(body, data);
    return NextResponse.json(normalized, { status: upstream.status });
  } catch (err: any) {
    const isAbort = err?.name === "AbortError";
    return NextResponse.json(
      {
        error: isAbort ? "Upstream timeout" : "Upstream fetch failed",
        detail: String(err?.message ?? err),
        baseUrl,
      },
      { status: isAbort ? 504 : 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}