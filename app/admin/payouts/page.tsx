'use client';

import { useEffect, useState } from 'react';
import { createClientSideSupabase } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, DollarSign, CreditCard } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PLATFORM_CONFIG } from '@/lib/config';

interface PayoutData {
  sellerId: string;
  sellerEmail: string;
  stripeAccountId: string;
  stripeStatus: string;
  totalSales: number;
  platformFees: number;
  netAmount: number;
}

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<PayoutData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [payoutLoading, setPayoutLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    loadPayouts();
  }, []);

  const loadPayouts = async () => {
    try {
      const supabase = createClientSideSupabase();

      // Get all approved sellers with active Stripe accounts
      const { data: sellers, error: sellersError } = await supabase
        .from('sellers')
        .select('*')
        .eq('approval_status', 'approved')
        .eq('stripe_onboarding_status', 'active')
        .not('stripe_account_id', 'is', null);

      if (sellersError) throw sellersError;

      // Get completed sales for each seller
      const payoutData: PayoutData[] = [];

      for (const seller of sellers || []) {
        const { data: sales } = await supabase
          .from('sales')
          .select('amount, platform_fee')
          .eq('seller_id', seller.id)
          .eq('status', 'completed');

        const totalSales = sales?.reduce((sum, s) => sum + s.amount, 0) || 0;
        const platformFees = sales?.reduce((sum, s) => sum + s.platform_fee, 0) || 0;
        const netAmount = totalSales - platformFees;

        if (netAmount > 0) {
          payoutData.push({
            sellerId: seller.id,
            sellerEmail: seller.email,
            stripeAccountId: seller.stripe_account_id!,
            stripeStatus: seller.stripe_onboarding_status,
            totalSales,
            platformFees,
            netAmount,
          });
        }
      }

      setPayouts(payoutData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayout = async (sellerId: string, amount: number) => {
    setPayoutLoading(sellerId);
    setError(null);
    setMessage(null);

    try {
      // Check minimum threshold
      if (amount < PLATFORM_CONFIG.MIN_PAYOUT_THRESHOLD) {
        throw new Error(`Amount must be at least $${PLATFORM_CONFIG.MIN_PAYOUT_THRESHOLD}`);
      }

      const response = await fetch('/api/admin/trigger-payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sellerId, amount }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to process payout');
      }

      setMessage(`Payout of $${amount.toFixed(2)} initiated successfully`);
      loadPayouts();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPayoutLoading(null);
    }
  };

  const getStripeStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Payout Management</CardTitle>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <DollarSign className="h-4 w-4" />
            <span>Min payout: ${PLATFORM_CONFIG.MIN_PAYOUT_THRESHOLD}</span>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {message && (
            <Alert className="mb-4 bg-green-50 border-green-200">
              <AlertDescription className="text-green-800">{message}</AlertDescription>
            </Alert>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Seller</TableHead>
                <TableHead>Stripe Status</TableHead>
                <TableHead>Total Sales</TableHead>
                <TableHead>Platform Fee</TableHead>
                <TableHead>Net Amount</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payouts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                    No pending payouts
                  </TableCell>
                </TableRow>
              ) : (
                payouts.map((payout) => (
                  <TableRow key={payout.sellerId}>
                    <TableCell className="font-medium">{payout.sellerEmail}</TableCell>
                    <TableCell>{getStripeStatusBadge(payout.stripeStatus)}</TableCell>
                    <TableCell>${payout.totalSales.toFixed(2)}</TableCell>
                    <TableCell>${payout.platformFees.toFixed(2)}</TableCell>
                    <TableCell className="font-bold text-green-600">
                      ${payout.netAmount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => handlePayout(payout.sellerId, payout.netAmount)}
                        disabled={
                          payoutLoading === payout.sellerId ||
                          payout.netAmount < PLATFORM_CONFIG.MIN_PAYOUT_THRESHOLD
                        }
                      >
                        {payoutLoading === payout.sellerId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <CreditCard className="h-4 w-4 mr-2" />
                            Payout
                          </>
                        )}
                      </Button>
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
