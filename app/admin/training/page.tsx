import { createServerSideSupabase } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
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

async function getTrainingAnalytics() {
  const supabase = await createServerSideSupabase();

  // Check if user is admin
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: admin } = await supabase
    .from("admins")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!admin) {
    return { error: "Not authorized" };
  }

  // Fetch all sellers with their training progress
  const { data: sellers, error: sellersError } = await supabase
    .from("sellers")
    .select("id, email, created_at")
    .order("created_at", { ascending: false });

  if (sellersError) {
    console.error("Error fetching sellers:", sellersError);
    return { error: "Failed to fetch sellers" };
  }

  // Fetch all training progress
  const { data: progress, error: progressError } = await supabase
    .from("training_progress")
    .select("*")
    .eq("completed", true);

  if (progressError) {
    console.error("Error fetching progress:", progressError);
  }

  // Calculate seller progress
  const sellerProgress = sellers.map((seller) => {
    const completed =
      progress?.filter((p) => p.seller_id === seller.id).length || 0;
    return {
      ...seller,
      completed,
      percentage: Math.round((completed / modules.length) * 100),
    };
  });

  // Calculate stats
  const stats = {
    totalSellers: sellers.length,
    completedTraining: sellerProgress.filter((s) => s.percentage === 100).length,
    inProgress: sellerProgress.filter(
      (s) => s.percentage > 0 && s.percentage < 100
    ).length,
    notStarted: sellerProgress.filter((s) => s.percentage === 0).length,
    averageProgress:
      sellerProgress.length > 0
        ? Math.round(
            sellerProgress.reduce((sum, s) => sum + s.percentage, 0) /
              sellerProgress.length
          )
        : 0,
  };

  // Get module completion stats
  const moduleStats = modules.map((moduleId) => {
    const completed =
      progress?.filter((p) => p.module_id === moduleId).length || 0;
    return {
      id: moduleId,
      completed,
      percentage:
        sellers.length > 0 ? Math.round((completed / sellers.length) * 100) : 0,
    };
  });

  return {
    sellerProgress,
    stats,
    moduleStats,
  };
}

export default async function TrainingAdminPage() {
  const { sellerProgress, stats, moduleStats, error } =
    await getTrainingAnalytics();

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
                        <form action="/api/email/training-reminder" method="POST">
                          <input type="hidden" name="email" value={seller.email} />
                          <Button
                            type="submit"
                            size="sm"
                            variant="outline"
                            className="text-blue-600 hover:bg-blue-50"
                          >
                            Send Reminder
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
