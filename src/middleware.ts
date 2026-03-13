import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const ADMIN_EMAILS_RAW = process.env.ADMIN_EMAILS ?? process.env.NEXTAUTH_ADMIN_EMAILS ?? "";
const FALLBACK_ADMIN = "wobuzhi@gmail.com";

const ADMIN_SET = new Set<string>(
  ADMIN_EMAILS_RAW
    ? ADMIN_EMAILS_RAW.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)
    : [FALLBACK_ADMIN]
);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /admin 및 모든 하위 경로 가로채기
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // ── 1단계: NextAuth JWT 토큰 검증 ──
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const email =
    typeof token?.email === "string" ? token.email.trim().toLowerCase() : "";

  // ── 2단계: 이메일 화이트리스트 대조 ──
  if (!email || !ADMIN_SET.has(email)) {
    // 비인가 → URL은 /admin 유지, 내용만 404로 위장(Stealth)
    return NextResponse.rewrite(new URL("/404", request.url));
  }

  // ── 3단계: 관리자 인증 통과 ──
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
