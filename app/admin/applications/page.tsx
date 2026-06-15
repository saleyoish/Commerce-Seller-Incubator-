"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/auth";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CheckCircle, XCircle, FileText, Eye, Users, Loader2 } from "lucide-react";

export default function ApplicationsAdminPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadApplicationsData();
  }, []);

  const loadApplicationsData = async () => {
    try {
      const res = await authFetch('/api/admin/applications');

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || 'Failed to load applications');
      }

      const data = await res.json();
      setApplications(data.applications || []);
      setStats(data.stats);
    } catch (err: any) {
      console.error('Error loading applications:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const res = await authFetch('/api/admin/applications/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || 'Failed to approve');
      }

      await loadApplicationsData();
    } catch (err: any) {
      console.error('Error approving:', err);
      alert(err.message);
    }
  };

  const handleReject = async (id: string) => {
    try {
      const res = await authFetch('/api/admin/applications/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || 'Failed to reject');
      }

      await loadApplicationsData();
    } catch (err: any) {
      console.error('Error rejecting:', err);
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
        <h1 className="text-3xl font-bold mb-2">Applications Management</h1>
        <p className="text-gray-600">
          Review and approve seller applications
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
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
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Pending</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats?.pending ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Interview</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats?.interview ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Approved</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats?.approved ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Rejected</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats?.rejected ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Applications Table */}
      <Card>
        <CardHeader>
          <CardTitle>Seller Applications</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Categories</TableHead>
                <TableHead>Experience</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No applications yet
                  </TableCell>
                </TableRow>
              ) : (
                applications?.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">
                      {app.full_name}
                    </TableCell>
                    <TableCell>{app.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {app.product_categories?.slice(0, 2).map((cat: string) => (
                          <Badge key={cat} variant="secondary" className="text-xs">
                            {cat}
                          </Badge>
                        ))}
                        {(app.product_categories?.length || 0) > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{(app.product_categories?.length || 0) - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>
                          TikTok: {app.tiktok_experience ? "Yes" : "No"}
                        </div>
                        <div>
                          Live: {app.live_experience ? "Yes" : "No"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          app.status === "approved"
                            ? "bg-green-100 text-green-800"
                            : app.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : app.status === "interview"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-red-100 text-red-800"
                        }
                      >
                        {app.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(app.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {/* View Details Dialog */}
                        <Dialog>
                          <DialogTrigger
                            render={
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-blue-600 hover:bg-blue-50"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            }
                          />
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Application Details</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 mt-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-sm text-gray-500">
                                    Full Name
                                  </p>
                                  <p className="font-medium">{app.full_name}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-500">
                                    Email
                                  </p>
                                  <p className="font-medium">{app.email}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-500">
                                    Phone
                                  </p>
                                  <p className="font-medium">{app.phone}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-500">
                                    Business Name
                                  </p>
                                  <p className="font-medium">
                                    {app.business_name || "N/A"}
                                  </p>
                                </div>
                              </div>

                              <div>
                                <p className="text-sm text-gray-500 mb-1">
                                  Product Categories
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {app.product_categories?.map((cat: string) => (
                                    <Badge key={cat} variant="secondary">
                                      {cat}
                                    </Badge>
                                  ))}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-sm text-gray-500">
                                    Inventory Value
                                  </p>
                                  <p className="font-medium">
                                    {app.inventory_value || "N/A"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-500">
                                    Price Range
                                  </p>
                                  <p className="font-medium">
                                    {app.price_range || "N/A"}
                                  </p>
                                </div>
                              </div>

                              <div>
                                <p className="text-sm text-gray-500">
                                  TikTok Username
                                </p>
                                <p className="font-medium">
                                  {app.tiktok_username || "N/A"}
                                </p>
                              </div>

                              <div>
                                <p className="text-sm text-gray-500">
                                  Monthly Goal
                                </p>
                                <p className="font-medium">
                                  {app.monthly_goal || "N/A"}
                                </p>
                              </div>

                              {app.notes && (
                                <div>
                                  <p className="text-sm text-gray-500">
                                    Admin Notes
                                  </p>
                                  <p className="text-sm">{app.notes}</p>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>

                        {app.status === "pending" && (
                          <>
                            <Button
                              onClick={() => handleApprove(app.id)}
                              size="sm"
                              variant="outline"
                              className="text-green-600 hover:bg-green-50"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>

                            <Button
                              onClick={() => handleReject(app.id)}
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:bg-red-50"
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
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
