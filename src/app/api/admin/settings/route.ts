import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/authOptions";
import { getAdminSettings, type AdminSettings, updateAdminSettings } from "@/lib/adminSettings";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const payload = getAdminSettings();
  return NextResponse.json(payload);
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return unauthorized();

  let body: Partial<AdminSettings>;
  try {
    body = (await request.json()) as Partial<AdminSettings>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const payload = updateAdminSettings(body);
  return NextResponse.json(payload);
}
