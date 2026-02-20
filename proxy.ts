import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "sfc_token";

// Em produção, JWT_SECRET tem que existir. Em dev, permite fallback.
const JWT_SECRET = process.env.JWT_SECRET || null;
const DEV_FALLBACK_SECRET = "dev_secret_change_in_prod";

// Rotas públicas (nav não cobre isso, mas o app cobre)
const PUBLIC_ROUTES_EXACT = new Set<string>(["/", "/login"]);
const PUBLIC_ROUTE_PREFIXES: string[] = []; // se tiver algo público com prefixo, põe aqui

// Admin-only baseado no nav: tudo que começa com /admin
const ADMIN_PREFIX = "/admin";

// Coisas que sempre passam
const ALWAYS_ALLOW_PREFIXES = ["/_next", "/api", "/assets"];
const ALWAYS_ALLOW_EXACT = ["/favicon.ico", "/robots.txt", "/sitemap.xml"];

// Mantém compatibilidade: “qualquer path com ponto” era liberado antes.
// Agora: liberamos isso somente se for request de asset (não HTML document).
const ANY_DOT_FILE = /\.(.*)$/;

type Decoded = { sub: string; role: string };

function isAlwaysAllowed(pathname: string) {
  if (ALWAYS_ALLOW_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  if (ALWAYS_ALLOW_EXACT.includes(pathname)) return true;
  return false;
}

function isPublic(pathname: string) {
  if (PUBLIC_ROUTES_EXACT.has(pathname)) return true;
  if (PUBLIC_ROUTE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) return true;
  return false;
}

function isAdmin(pathname: string) {
  return pathname === ADMIN_PREFIX || pathname.startsWith(ADMIN_PREFIX + "/");
}

// Diferencia navegação (HTML) de asset (imagem/css/js/font/json via fetch etc.)
function isAssetRequest(req: NextRequest) {
  const dest = (req.headers.get("sec-fetch-dest") || "").toLowerCase();
  // Quando presente, é bem confiável
  if (dest && dest !== "document" && dest !== "iframe") return true;

  const accept = (req.headers.get("accept") || "").toLowerCase();
  // Navegação de página geralmente pede text/html.
  // Asset/fetch de dados geralmente NÃO precisa de text/html.
  const looksLikeHtmlNav = accept.includes("text/html");
  return !looksLikeHtmlNav;
}

// Evita open redirect / loops / paths estranhos
function safeNext(path: string) {
  if (!path.startsWith("/")) return "/dashboard";
  if (path.startsWith("//")) return "/dashboard";
  if (path.startsWith("/login")) return "/dashboard";
  return path;
}

async function verifyToken(token: string): Promise<Decoded | null> {
  try {
    // fail-closed em produção se não tiver secret
    if (!JWT_SECRET && process.env.NODE_ENV === "production") return null;

    const secretValue = JWT_SECRET ?? DEV_FALLBACK_SECRET;
    const secret = new TextEncoder().encode(secretValue);

    const { payload } = await jwtVerify(token, secret);

    const sub = typeof payload.sub === "string" ? payload.sub : null;
    const role = typeof (payload as any).role === "string" ? (payload as any).role : null;

    if (!sub || !role) return null;
    return { sub, role };
  } catch {
    return null;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // 1) Libera coisas que sempre passaram
  if (isAlwaysAllowed(pathname)) return NextResponse.next();

  // 2) Mantém compat com “arquivos com ponto”, mas sem bypass de página:
  //    Só libera se for request de asset (não documento HTML).
  if (ANY_DOT_FILE.test(pathname) && isAssetRequest(req)) {
    return NextResponse.next();
  }

  // 3) Rotas públicas
  //    Extra robustez: se já logado e cair em /login, manda pra dashboard/next
  if (isPublic(pathname)) {
    if (pathname === "/login") {
      const token = req.cookies.get(COOKIE_NAME)?.value;
      if (token) {
        const decoded = await verifyToken(token);
        if (decoded) {
          const nextParam = req.nextUrl.searchParams.get("next");
          const dest = safeNext(nextParam || "/dashboard");
          return NextResponse.redirect(new URL(dest, req.url));
        }
      }
    }
    return NextResponse.next();
  }

  // 4) Protegidas: exige cookie
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", safeNext(pathname + search));
    return NextResponse.redirect(url);
  }

  const decoded = await verifyToken(token);
  if (!decoded) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", safeNext(pathname + search));

    // Limpa cookie inválido (reduz loop e melhora UX)
    const res = NextResponse.redirect(url);
    res.cookies.set(COOKIE_NAME, "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 0,
    });
    return res;
  }

  // 5) RBAC alinhado ao nav: tudo em /admin é ADMIN-only
  if (isAdmin(pathname) && decoded.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  // Mantém sua ideia original: proxy não roda em /api, _next, assets, etc.
  matcher: ["/((?!api|_next|assets|favicon.ico|robots.txt|sitemap.xml).*)"],
};
