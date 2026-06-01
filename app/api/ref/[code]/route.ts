import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  
  if (!code) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Create response with redirect
  const response = NextResponse.redirect(
    new URL(`/signup?ref=${code}`, request.url)
  );

  // Set cookie in response
  response.cookies.set("referral_code", code, {
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });

  console.log("[API Ref] Cookie set for code:", code);

  return response;
}
