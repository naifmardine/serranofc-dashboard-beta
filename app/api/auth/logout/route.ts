import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isHttps(req: NextRequest) {
  const proto = req.headers.get("x-forwarded-proto");
  if (proto) return proto.includes("https");
  return req.nextUrl.protocol === "https:";
}

export async function POST(req: NextRequest) {
  const secure = process.env.NODE_ENV === "production" && isHttps(req);

  const res = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });

  // 1) delete “oficial” (Next 13+/14+/15)
  res.cookies.delete("sfc_token");

  // 2) belt-and-suspenders: seta expirado com os mesmos atributos
  res.cookies.set("sfc_token", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure,
    expires: new Date(0),
    maxAge: 0,
  });

  // 3) Se você já teve cookies com path diferente no passado, apaga também:
  // res.cookies.set("sfc_token", "", { path: "/admin", expires: new Date(0), maxAge: 0, secure, sameSite:"lax", httpOnly:true });
  // res.cookies.set("sfc_token", "", { path: "/api",   expires: new Date(0), maxAge: 0, secure, sameSite:"lax", httpOnly:true });

  return res;
}
