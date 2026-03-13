import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/authOptions";
import { getAdminSettings, type AdminSettings, updateAdminSettings } from "@/lib/adminSettings";
import { getConfiguredAdminEmails, isAdminEmail } from "@/lib/adminAccess";

function notFoundResponse() {
  return NextResponse.json({ error: "Not Found" }, { status: 404 });
}

async function requireAdminSession() {
  const session = await getServerSession(authOptions);
  if (!isAdminEmail(session?.user?.email, getConfiguredAdminEmails())) {
    return null;
  }

  return session;
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await requireAdminSession();
  if (!session) return notFoundResponse();

  const payload = getAdminSettings();
  return NextResponse.json(payload);
}

export async function PUT(request: NextRequest) {
  const session = await requireAdminSession();
  if (!session) return notFoundResponse();

  let body: Partial<AdminSettings>;
  try {
    body = (await request.json()) as Partial<AdminSettings>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const payload = updateAdminSettings(body);
  return NextResponse.json(payload);
}
