import { createAdminSupabase } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";
export const dynamicParams = true;

interface PageProps {
  params: Promise<{ code: string }>;
}

export default async function ReferralRedirectPage({ params }: PageProps) {
  // Next.js 15/16: params is a Promise, must await it
  const { code } = await params;
  console.log("[Ref Page] Received code:", code);
  
  if (!code) {
    console.log("[Ref Page] No code provided, redirecting to home");
    redirect("/");
  }
  
  const supabase = createAdminSupabase();

  // Find seller by referral code
  const { data: seller, error } = await supabase
    .from("sellers")
    .select("id, referral_code")
    .eq("referral_code", code)
    .single();
  
  console.log("[Ref Page] Seller lookup result:", { seller, error });

  if (!seller) {
    console.log("[Ref Page] Seller not found for code:", code, "redirecting to home");
    redirect("/");
  }

  // Redirect to API route that will set cookie and then redirect to signup
  const apiUrl = `/api/ref/${code}`;
  console.log("[Ref Page] Redirecting to API route:", apiUrl);
  redirect(apiUrl);
}
