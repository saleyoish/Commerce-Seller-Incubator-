import { createAdminSupabase } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

interface PageProps {
  params: { code: string };
}

export default async function ReferralRedirectPage({ params }: PageProps) {
  const { code } = params;
  const supabase = createAdminSupabase();

  // Find seller by referral code
  const { data: seller } = await supabase
    .from("sellers")
    .select("id, referral_code")
    .eq("referral_code", code)
    .single();

  if (!seller) {
    // Invalid code, redirect to home
    redirect("/");
  }

  // Store referral code in cookie
  const cookieStore = await cookies();
  cookieStore.set("referral_code", code, {
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });

  // Redirect to landing page with referral info
  redirect(`/?ref=${code}`);
}
