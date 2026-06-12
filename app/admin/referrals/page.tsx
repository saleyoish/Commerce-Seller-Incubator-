"use client";

import { useEffect, useState } from "react";
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
import { DollarSign, Users, Trophy, CheckCircle, Loader2 } from "lucide-react";

export default function ReferralsAdminPage() {
  const [referrals, setReferrals] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [topReferrers, setTopReferrers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReferralsData();
  }, []);

  const loadReferralsData = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/referrals', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || 'Failed to load referrals');
      }

      const data = await res.json();
      setReferrals(data.referrals || []);
      setStats(data.stats);
      setTopReferrers(data.topReferrers || []);
    } catch (err: any) {
      console.error('Error loading referrals:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkPaid = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/referrals/mark-paid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || 'Failed to mark as paid');
      }

      await loadReferralsData();
    } catch (err: any) {
      console.error('Error marking as paid:', err);
      alert(err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
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
                referrals?.map((referral: any) => (
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
                        <Button
                          onClick={() => handleMarkPaid(referral.id)}
                          size="sm"
                          variant="outline"
                          className="text-green-600 hover:bg-green-50"
                        >
                          Mark Paid
                        </Button>
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
