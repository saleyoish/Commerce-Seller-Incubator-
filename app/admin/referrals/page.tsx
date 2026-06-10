import { createAdminSupabase } from "@/lib/supabase-admin";
import { createServerSideSupabase } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DollarSign, Users, Trophy, CheckCircle } from "lucide-react";

async function getReferralsData() {
  // Use admin client for referrals table to bypass RLS
  const adminSupabase = createAdminSupabase();
  const serverSupabase = await createServerSideSupabase();

  // Check if user is admin
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: admin } = await serverSupabase
    .from("admins")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!admin) {
    return { error: "Not authorized" };
  }

  // Fetch all referrals with seller info using admin client
  console.log("[Admin] Fetching all referrals...");
  const { data: referrals, error } = await adminSupabase
    .from("referrals")
    .select(`
      *,
      referrer:referrer_id (email, referral_code)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Admin] Error fetching referrals:", error);
    return { error: "Failed to fetch referrals: " + error.message };
  }
  
  console.log("[Admin] Referrals fetched:", referrals?.length || 0, "records");
  console.log("[Admin] First few referrals:", referrals?.slice(0, 3));

  // Get top referrers using admin client
  const { data: topReferrers } = await adminSupabase.rpc("get_top_referrers", {
    limit_count: 10,
  });

  // Get stats
  const stats = {
    total: referrals?.length || 0,
    approved:
      referrals?.filter((r) => r.status === "approved").length || 0,
    active: referrals?.filter((r) => r.status === "active").length || 0,
    paid: referrals?.filter((r) => r.paid).length || 0,
    pendingPayout:
      referrals?.filter((r) => !r.paid && (r.status === "active" || r.status === "approved")).length || 0,
    totalPaid:
      referrals
        ?.filter((r) => r.paid)
        .reduce((sum, r) => sum + (r.bonus_amount || 0), 0) || 0,
    totalPending:
      referrals
        ?.filter((r) => !r.paid && (r.status === "active" || r.status === "approved"))
        .reduce((sum, r) => sum + (r.bonus_amount || 0), 0) || 0,
  };

  console.log("[Admin] Returning stats:", stats);
  return { referrals: referrals || [], stats, topReferrers: topReferrers || [] };
}

export default async function ReferralsAdminPage() {
  const { referrals, stats, topReferrers, error } = await getReferralsData();

  if (error === "Not authenticated") {
    redirect("/login");
  }

  if (error === "Not authorized") {
    redirect("/dashboard");
  }

  if (error) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Referral Management</h1>
        <p className="text-gray-600">Track and manage the referral program</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-gray-600">Total</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats?.total ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Approved</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats?.approved ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Active</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats?.active ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-purple-600" />
              <span className="text-sm text-gray-600">Paid</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats?.paid ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <span className="text-sm text-gray-600">Total Paid</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              ${(stats?.totalPaid ?? 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-yellow-600" />
              <span className="text-sm text-gray-600">Pending</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              ${(stats?.totalPending ?? 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Referrers */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Top Referrers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Referrer</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Total Referrals</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Total Earned</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topReferrers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No referrals yet
                  </TableCell>
                </TableRow>
              ) : (
                topReferrers.map((referrer: any, index: number) => (
                  <TableRow key={referrer.referrer_id}>
                    <TableCell>
                      {index === 0 && <span className="text-2xl">🥇</span>}
                      {index === 1 && <span className="text-2xl">🥈</span>}
                      {index === 2 && <span className="text-2xl">🥉</span>}
                      {index > 2 && <span className="font-bold">#{index + 1}</span>}
                    </TableCell>
                    <TableCell className="font-medium">
                      {referrer.referrer_email}
                    </TableCell>
                    <TableCell>
                      <code className="bg-gray-100 px-2 py-1 rounded text-sm text-purple-900 font-semibold">
                        {referrer.referral_code}
                      </code>
                    </TableCell>
                    <TableCell>{referrer.total_referrals}</TableCell>
                    <TableCell>{referrer.active_referrals}</TableCell>
                    <TableCell className="font-semibold text-green-600">
                      ${referrer.total_bonus_paid?.toFixed(2) || "0.00"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* All Referrals Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Referrals</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Referrer</TableHead>
                <TableHead>Referred Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>First Sale</TableHead>
                <TableHead>Bonus Amount</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {referrals?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    No referrals yet
                  </TableCell>
                </TableRow>
              ) : (
                referrals?.map((referral) => (
                  <TableRow key={referral.id}>
                    <TableCell className="font-medium">
                      {referral.referrer?.email}
                    </TableCell>
                    <TableCell>{referral.referred_email}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          referral.status === "active"
                            ? "bg-green-100 text-green-800"
                            : referral.status === "approved"
                            ? "bg-blue-100 text-blue-800"
                            : referral.status === "paid"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-yellow-100 text-yellow-800"
                        }
                      >
                        {referral.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {referral.first_sale_date
                        ? new Date(referral.first_sale_date).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell>${referral.bonus_amount}</TableCell>
                    <TableCell>
                      {referral.paid ? (
                        <Badge className="bg-green-500">Yes</Badge>
                      ) : (
                        <Badge variant="outline">No</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(referral.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {!referral.paid && referral.status === "active" && (
                        <form action="/api/admin/referrals/mark-paid" method="POST">
                          <input type="hidden" name="id" value={referral.id} />
                          <Button
                            type="submit"
                            size="sm"
                            variant="outline"
                            className="text-green-600 hover:bg-green-50"
                          >
                            Mark Paid
                          </Button>
                        </form>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
