import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_in_prod";
const COOKIE_NAME = "sfc_token";

type Decoded = { sub: string; role: "ADMIN" | "CLIENT" };

function extractBearerToken(authHeader?: string | null): string | null {
  if (!authHeader) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  return match?.[1] ?? null;
}

export function getTokenFromReq(req: NextRequest): string | null {
  const bearer = extractBearerToken(req.headers.get("authorization"));
  if (bearer) return bearer;
  return req.cookies.get(COOKIE_NAME)?.value ?? null;
}

export function verifyToken(token: string): Decoded | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    const sub = typeof payload?.sub === "string" ? payload.sub : null;
    const role = payload?.role === "ADMIN" || payload?.role === "CLIENT" ? payload.role : null;
    if (!sub || !role) return null;
    return { sub, role };
  } catch {
    return null;
  }
}

/** Returns userId string or null if unauthenticated */
export function getUserId(req: NextRequest): string | null {
  const token = getTokenFromReq(req);
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded?.sub ?? null;
}
