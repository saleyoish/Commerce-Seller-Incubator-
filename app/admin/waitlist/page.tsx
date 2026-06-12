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
import { Mail, Users, Loader2 } from "lucide-react";

export default function WaitlistAdminPage() {
  const [waitlist, setWaitlist] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWaitlistData();
  }, []);

  const loadWaitlistData = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/waitlist', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || 'Failed to load waitlist');
      }

      const data = await res.json();
      setWaitlist(data.waitlist || []);
      setStats(data.stats);
    } catch (err: any) {
      console.error('Error loading waitlist:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
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
        <h1 className="text-3xl font-bold mb-2">Approved Sellers</h1>
        <p className="text-gray-600">View approved sellers who have received email notifications</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-gray-600">Total Approved</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats?.total ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Active Stripe</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats?.activeStripe ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Approved Sellers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Approved Sellers</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Stripe Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {waitlist?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    No approved sellers yet
                  </TableCell>
                </TableRow>
              ) : (
                waitlist?.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{entry.email}</TableCell>
                    <TableCell>{entry.phone || '—'}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          entry.stripe_onboarding_status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }
                      >
                        {entry.stripe_onboarding_status || 'Pending'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(entry.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-blue-600 hover:bg-blue-50"
                      >
                        <Mail className="w-4 h-4" />
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
