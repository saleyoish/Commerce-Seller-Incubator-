import { createServerSideSupabase } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { ApplicationForm } from "./application-form";

interface PageProps {
  searchParams: { token?: string };
}

async function getWaitlistEntry(token: string) {
  const supabase = await createServerSideSupabase();

  const { data, error } = await supabase
    .from("waitlist")
    .select("*")
    .eq("id", token)
    .eq("status", "approved")
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

export default async function ApplyPage({ searchParams }: PageProps) {
  const { token } = searchParams;

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Invalid Application Link
          </h1>
          <p className="text-gray-600">
            Please use the link from your approval email to access the application form.
          </p>
        </div>
      </div>
    );
  }

  const waitlistEntry = await getWaitlistEntry(token);

  if (!waitlistEntry) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Application Not Found
          </h1>
          <p className="text-gray-600">
            Your waitlist entry may not be approved yet or the link has expired.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <ApplicationForm waitlistEntry={waitlistEntry} />
      </div>
    </div>
  );
}
