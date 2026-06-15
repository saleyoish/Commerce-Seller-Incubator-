"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BookOpen,
  CheckCircle,
  Users,
  AlertCircle,
  Clock,
  TrendingUp,
  Loader2,
} from "lucide-react";

const modules = [
  "getting-started",
  "tiktok-setup",
  "obs-setup",
  "best-practices",
  "product-upload",
  "going-live",
  "commissions",
  "faq",
];

export default function TrainingAdminPage() {
  const [sellerProgress, setSellerProgress] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [moduleStats, setModuleStats] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTrainingData();
  }, []);

  const loadTrainingData = async () => {
    try {
      const res = await authFetch('/api/admin/training');

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || 'Failed to load training data');
      }

      const data = await res.json();
      setSellerProgress(data.sellerProgress || []);
      setStats(data.stats);
      setModuleStats(data.moduleStats || []);
    } catch (err: any) {
      console.error('Error loading training data:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendReminder = async (email: string) => {
    try {
      const res = await authFetch('/api/email/training-reminder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || 'Failed to send reminder');
      }

      alert('Reminder sent successfully');
    } catch (err: any) {
      console.error('Error sending reminder:', err);
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
        <h1 className="text-3xl font-bold mb-2">Training Analytics</h1>
        <p className="text-gray-600">
          Monitor seller training progress and completion rates
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-gray-600">Total Sellers</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats?.totalSellers || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm text-gray-600">Completed</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats?.completedTraining || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              <span className="text-sm text-gray-600">In Progress</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats?.inProgress || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-sm text-gray-600">Not Started</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats?.notStarted || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              <span className="text-sm text-gray-600">Avg Progress</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats?.averageProgress || 0}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Module Completion Stats */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Module Completion Rates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {moduleStats?.map((module) => (
              <div key={module.id} className="flex items-center gap-4">
                <div className="w-48 shrink-0">
                  <p className="font-medium capitalize">
                    {module.id.replace(/-/g, " ")}
                  </p>
                </div>
                <div className="flex-1">
                  <Progress value={module.percentage} className="h-2" />
                </div>
                <div className="w-20 text-right">
                  <Badge variant={module.percentage > 50 ? "default" : "secondary"}>
                    {module.percentage}%
                  </Badge>
                </div>
                <div className="w-20 text-right text-sm text-gray-600">
                  {module.completed}/{stats?.totalSellers || 0}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Seller Progress Table */}
      <Card>
        <CardHeader>
          <CardTitle>Seller Training Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Seller</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Modules Completed</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sellerProgress?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No sellers yet
                  </TableCell>
                </TableRow>
              ) : (
                sellerProgress?.map((seller) => (
                  <TableRow key={seller.id}>
                    <TableCell className="font-medium">{seller.email}</TableCell>
                    <TableCell>
                      {new Date(seller.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={seller.percentage} className="w-24 h-2" />
                        <span className="text-sm text-gray-600">
                          {seller.percentage}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {seller.completed}/{modules.length}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          seller.percentage === 100
                            ? "bg-green-100 text-green-800"
                            : seller.percentage > 0
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }
                      >
                        {seller.percentage === 100
                          ? "Completed"
                          : seller.percentage > 0
                          ? "In Progress"
                          : "Not Started"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {seller.percentage < 100 && seller.percentage > 0 && (
                        <Button
                          onClick={() => handleSendReminder(seller.email)}
                          size="sm"
                          variant="outline"
                          className="text-blue-600 hover:bg-blue-50"
                        >
                          Send Reminder
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
