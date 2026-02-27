import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/authOptions";
import { sanitizeUserCustomProfileInput, type UserCustomProfile } from "@/lib/userCustomProfile";
import { getUserProfileByEmail, updateUserProfileByEmail } from "@/lib/supabaseUserProfileStore";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();
  const fallbackName = session?.user?.name ?? null;
  if (!email) return unauthorized();

  const profile = await getUserProfileByEmail(email, fallbackName);
  if (!profile) {
    return NextResponse.json({ error: "Profile unavailable. Check Supabase configuration." }, { status: 503 });
  }

  return NextResponse.json({ profile });
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();
  const fallbackName = session?.user?.name ?? null;
  if (!email) return unauthorized();

  let body: Partial<UserCustomProfile>;
  try {
    body = (await request.json()) as Partial<UserCustomProfile>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const sanitized = sanitizeUserCustomProfileInput(body);
  const updated = await updateUserProfileByEmail(email, sanitized, fallbackName);

  if (!updated) {
    return NextResponse.json({ error: "Failed to update profile. Check Supabase configuration." }, { status: 503 });
  }

  return NextResponse.json({ profile: updated });
}
