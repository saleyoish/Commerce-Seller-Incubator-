import { createServerSideSupabase } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Copy,
  Link2,
  Users,
  DollarSign,
  Trophy,
  Share2,
  CheckCircle,
  TrendingUp,
} from "lucide-react";

async function getReferralData() {
  const supabase = await createServerSideSupabase();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Get seller record with referral code
  const { data: seller } = await supabase
    .from("sellers")
    .select("id, referral_code")
    .eq("user_id", user.id)
    .single();

  if (!seller) {
    return { error: "Seller not found" };
  }

  // Get referral stats
  const { data: referrals, error: referralsError } = await supabase
    .from("referrals")
    .select("*")
    .eq("referrer_id", seller.id)
    .order("created_at", { ascending: false });

  if (referralsError) {
    console.error("Error fetching referrals:", referralsError);
  }

  // Calculate stats
  const stats = {
    total: referrals?.length || 0,
    approved:
      referrals?.filter((r) => r.status === "approved").length || 0,
    active: referrals?.filter((r) => r.status === "active").length || 0,
    paid: referrals?.filter((r) => r.paid).length || 0,
    totalEarnings:
      referrals
        ?.filter((r) => r.paid)
        .reduce((sum, r) => sum + (r.bonus_amount || 0), 0) || 0,
    pendingEarnings:
      referrals
        ?.filter((r) => !r.paid && r.status === "active")
        .reduce((sum, r) => sum + (r.bonus_amount || 0), 0) || 0,
  };

  return {
    seller,
    referrals: referrals || [],
    stats,
  };
}

export default async function ReferralsPage() {
  const { seller, referrals, stats, error } = await getReferralData();

  if (error === "Not authenticated") {
    redirect("/login");
  }

  if (error === "Seller not found") {
    redirect("/signup");
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

  const referralLink = `${process.env.NEXT_PUBLIC_SITE_URL}/ref/${seller?.referral_code || ""}`;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Referral Program</h1>
        <p className="text-gray-600">
          Invite other sellers and earn $50 for each one who makes their first sale
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-gray-600">Total Referrals</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats?.total ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm text-gray-600">Approved</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats?.approved ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              <span className="text-sm text-gray-600">Active Sellers</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats?.active ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <span className="text-sm text-gray-600">Total Earned</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              ${(stats?.totalEarnings ?? 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Referral Link Card */}
      <Card className="mb-8 border-2 border-red-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Your Unique Referral Link
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input
              value={referralLink}
              readOnly
              className="font-mono text-sm"
            />
            <Button
              variant="outline"
              className="shrink-0"
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-2">
              <Share2 className="w-4 h-4" />
              Share on Social
            </Button>
            <Button variant="outline" className="gap-2">
              Copy Link
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Share2 className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="font-semibold mb-1">1. Share Your Link</h4>
              <p className="text-sm text-gray-600">
                Share your unique referral link with potential sellers
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <h4 className="font-semibold mb-1">2. They Sign Up</h4>
              <p className="text-sm text-gray-600">
                They apply and get approved as a seller
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
              <h4 className="font-semibold mb-1">3. You Earn $50</h4>
              <p className="text-sm text-gray-600">
                When they make their first sale, you earn $50
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referrals Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your Referrals</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Referred Seller</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>First Sale</TableHead>
                <TableHead>Bonus</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {referrals?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="text-center">
                      <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-600">
                        No referrals yet. Start sharing your link!
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                referrals?.map((referral) => (
                  <TableRow key={referral.id}>
                    <TableCell className="font-medium">
                      {referral.referred_email}
                    </TableCell>
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
                      {new Date(referral.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {referral.first_sale_date
                        ? new Date(referral.first_sale_date).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {referral.paid ? (
                        <span className="text-green-600 font-semibold">
                          ${referral.bonus_amount}
                        </span>
                      ) : referral.status === "active" ? (
                        <span className="text-yellow-600">
                          Pending ${referral.bonus_amount}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pending Earnings */}
      {(stats?.pendingEarnings ?? 0) > 0 && (
        <Card className="mt-8 bg-yellow-50 border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-800 font-semibold">
                  Pending Earnings
                </p>
                <p className="text-yellow-600 text-sm">
                  You'll receive these after your referrals complete their first
                  sale
                </p>
              </div>
              <p className="text-2xl font-bold text-yellow-800">
                ${(stats?.pendingEarnings ?? 0).toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
