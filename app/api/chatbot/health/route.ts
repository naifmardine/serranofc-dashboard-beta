import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl = process.env.SERRANO_CHATBOT_BASE_URL ?? "http://127.0.0.1:8001";
  const key = process.env.INTERNAL_API_KEY;

  if (!key) {
    return NextResponse.json({ error: "Missing INTERNAL_API_KEY" }, { status: 500 });
  }

  // Debug seguro: tamanho + primeiros/últimos chars
  console.log("[health/db] baseUrl =", baseUrl);
  console.log("[health/db] key len =", key.length);
  console.log("[health/db] key head/tail =", key.slice(0, 6), key.slice(-6));
  console.log("[health/db] key has whitespace =", /\s/.test(key));

  const r = await fetch(`${baseUrl}/v1/health/db`, {
    headers: { "X-Internal-Api-Key": key.trim() }, // trim é importante
    cache: "no-store",
  });

  const text = await r.text(); // não assume JSON
  let data: any;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  return NextResponse.json(
    { upstream_status: r.status, upstream: data },
    { status: r.status }
  );
}