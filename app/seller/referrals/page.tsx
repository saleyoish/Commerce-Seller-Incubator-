'use client';

import { useState, useEffect } from 'react';
import { createClientSideSupabase } from "@/lib/supabase-client";
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
  CheckCircle,
  TrendingUp,
  Check,
} from "lucide-react";

// Client component for referrals page
export default function ReferralsPage() {
  const [seller, setSeller] = useState<any>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    total: 0,
    approved: 0,
    active: 0,
    paid: 0,
    totalEarnings: 0,
    pendingEarnings: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const baseUrl = typeof window !== 'undefined' 
    ? `${window.location.protocol}//${window.location.host}`
    : process.env.NEXT_PUBLIC_SITE_URL;
  const referralLink = seller?.referral_code 
    ? `${baseUrl}/ref/${seller.referral_code}`
    : '';

  useEffect(() => {
    loadReferralData();
  }, []);

  const loadReferralData = async () => {
    setError(null);
    try {
      const res = await fetch('/api/seller/referrals', { credentials: 'include' });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('API Error:', errorData);
        
        if (res.status === 401) {
          setError('Please log in to view your referrals');
          // Don't auto-redirect, let user see the error
          return;
        }
        throw new Error(errorData.error || 'Failed to load referral data');
      }

      const data = await res.json();
      
      if (!data.seller) {
        setError('Seller account not found');
        return;
      }

      setSeller(data.seller);
      
      const referralsList = data.referrals || [];
      setReferrals(referralsList);

      setStats({
        total: referralsList.length,
        approved: referralsList.filter((r: any) => r.status === "approved").length,
        active: referralsList.filter((r: any) => r.status === "active").length,
        paid: referralsList.filter((r: any) => r.paid).length,
        totalEarnings: referralsList.filter((r: any) => r.paid).reduce((sum: number, r: any) => sum + (r.bonus_amount || 0), 0),
        pendingEarnings: referralsList.filter((r: any) => !r.paid && (r.status === "active" || r.status === "approved")).reduce((sum: number, r: any) => sum + (r.bonus_amount || 0), 0),
      });
    } catch (err) {
      console.error("Error loading referral data:", err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!referralLink) return;
    
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = referralLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Referrals</h2>
            <p className="text-red-600">{error}</p>
            <Button 
              variant="outline" 
              onClick={() => { setLoading(true); loadReferralData(); }}
              className="mt-4"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Referral Program</h1>
            <p className="text-gray-600">
              Invite other sellers and earn $50 for each one who makes their first sale
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => { setLoading(true); loadReferralData(); }}
            className="gap-2"
          >
            Refresh
          </Button>
        </div>
        {seller?.referral_code && (
          <p className="text-sm text-gray-500 mt-2">
            Your Referral Code: <span className="font-mono font-semibold">{seller.referral_code}</span>
          </p>
        )}
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
          <div className="flex gap-2">
            <Input
              value={referralLink}
              readOnly
              className="font-mono text-sm"
            />
            <Button
              variant="outline"
              className="shrink-0 gap-2"
              onClick={copyToClipboard}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy
                </>
              )}
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
                <Link2 className="w-6 h-6 text-blue-600" />
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
                      ) : (referral.status === "active" || referral.status === "approved") ? (
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
