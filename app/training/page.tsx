import { createServerSideSupabase } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  Play,
  FileText,
  Download,
  ChevronRight,
  Video,
  Smartphone,
  Settings,
  BookOpen,
  ListCheck,
  DollarSign,
  HelpCircle,
} from "lucide-react";

const trainingModules = [
  {
    id: "getting-started",
    title: "Getting Started",
    description: "Welcome to TikTok Shop Fast Track",
    icon: Video,
    videoUrl: "https://www.youtube.com/embed/placeholder1",
    content: [
      "Welcome to the program",
      "Platform overview",
      "What to expect",
      "Support channels",
    ],
    resources: [
      { name: "Program Overview PDF", type: "pdf" },
      { name: "Getting Started Checklist", type: "checklist" },
    ],
    duration: "15 min",
  },
  {
    id: "tiktok-setup",
    title: "TikTok Shop Setup",
    description: "Create and configure your TikTok Shop account",
    icon: Smartphone,
    videoUrl: "https://www.youtube.com/embed/placeholder2",
    content: [
      "Creating your TikTok Shop seller account",
      "Linking your bank account",
      "Understanding the seller dashboard",
      "Setting up shipping preferences",
    ],
    resources: [
      { name: "TikTok Shop Setup Guide", type: "pdf" },
      { name: "Account Checklist", type: "checklist" },
    ],
    duration: "25 min",
  },
  {
    id: "obs-setup",
    title: "OBS Studio Setup",
    description: "Configure OBS for professional streaming",
    icon: Settings,
    videoUrl: "https://www.youtube.com/embed/placeholder3",
    content: [
      "Downloading and installing OBS",
      "Configuring settings for TikTok Live",
      "Setting up scenes and sources",
      "Testing your stream",
    ],
    resources: [
      { name: "OBS Profile Template", type: "download" },
      { name: "OBS Setup Checklist", type: "checklist" },
      { name: "Scene Layout Guide", type: "pdf" },
    ],
    duration: "30 min",
  },
  {
    id: "best-practices",
    title: "Live Selling Best Practices",
    description: "Learn proven techniques for successful live sales",
    icon: BookOpen,
    videoUrl: "https://www.youtube.com/embed/placeholder4",
    content: [
      "Scripting your intro",
      "Engaging viewers and building rapport",
      "Product demonstration techniques",
      "Handling objections and questions",
      "Creating urgency and closing sales",
      "Sample scripts and templates",
    ],
    resources: [
      { name: "Live Selling Scripts", type: "pdf" },
      { name: "Product Demo Checklist", type: "checklist" },
      { name: "Objection Handling Guide", type: "pdf" },
    ],
    duration: "45 min",
  },
  {
    id: "product-upload",
    title: "Product Upload",
    description: "Upload and manage your products",
    icon: FileText,
    videoUrl: "https://www.youtube.com/embed/placeholder5",
    content: [
      "Taking great product photos",
      "Writing compelling descriptions",
      "Pricing strategies",
      "Inventory management",
    ],
    resources: [
      { name: "Product Photo Guide", type: "pdf" },
      { name: "Description Templates", type: "pdf" },
    ],
    duration: "20 min",
  },
  {
    id: "going-live",
    title: "Going Live Checklist",
    description: "Everything you need before your first stream",
    icon: ListCheck,
    videoUrl: "https://www.youtube.com/embed/placeholder6",
    content: [
      "Pre-stream checklist",
      "During stream best practices",
      "Post-stream tasks",
      "Troubleshooting common issues",
    ],
    resources: [
      { name: "Pre-Stream Checklist", type: "pdf" },
      { name: "Stream Day Planner", type: "pdf" },
    ],
    duration: "15 min",
  },
  {
    id: "commissions",
    title: "Commissions & Payouts",
    description: "Understand how you get paid",
    icon: DollarSign,
    videoUrl: "https://www.youtube.com/embed/placeholder7",
    content: [
      "How commissions work (80/20 split)",
      "Weekly payout schedule",
      "Viewing your earnings",
      "Tax information (1099)",
    ],
    resources: [
      { name: "Commission Guide", type: "pdf" },
      { name: "Tax Information", type: "pdf" },
    ],
    duration: "10 min",
  },
  {
    id: "faq",
    title: "FAQs & Support",
    description: "Common questions and getting help",
    icon: HelpCircle,
    videoUrl: "https://www.youtube.com/embed/placeholder8",
    content: [
      "Frequently asked questions",
      "How to get support",
      "Discord community access",
      "Continuing education",
    ],
    resources: [
      { name: "FAQ Document", type: "pdf" },
      { name: "Support Contact Info", type: "pdf" },
    ],
    duration: "10 min",
  },
];

async function getTrainingData() {
  const supabase = await createServerSideSupabase();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Get seller record
  const { data: seller } = await supabase
    .from("sellers")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!seller) {
    return { error: "Seller not found" };
  }

  // Get training progress
  const { data: progress, error: progressError } = await supabase
    .from("training_progress")
    .select("*")
    .eq("seller_id", seller.id);

  if (progressError) {
    console.error("Error fetching progress:", progressError);
  }

  const completedModules = new Set(
    progress?.filter((p) => p.completed).map((p) => p.module_id) || []
  );

  const totalModules = trainingModules.length;
  const completedCount = completedModules.size;
  const progressPercentage = Math.round((completedCount / totalModules) * 100);

  return {
    sellerId: seller.id,
    completedModules,
    progressPercentage,
    totalModules,
    completedCount,
  };
}

export default async function TrainingPage() {
  const {
    sellerId,
    completedModules,
    progressPercentage,
    totalModules,
    completedCount,
    error,
  } = await getTrainingData();

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Training Hub
              </h1>
              <p className="text-gray-600">
                Complete your training to start selling on TikTok Shop
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Your Progress</p>
              <p className="text-2xl font-bold text-red-600">
                {completedCount}/{totalModules}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Progress value={progressPercentage ?? 0} className="h-3" />
            </div>
            <span className="text-sm font-medium text-gray-600">
              {progressPercentage}%
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Module List */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="text-lg">Training Modules</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {trainingModules.map((module, index) => {
                    const isCompleted = completedModules?.has(module.id) ?? false;
                    const Icon = module.icon;

                    return (
                      <a
                        key={module.id}
                        href={`#${module.id}`}
                        className={`flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors ${
                          isCompleted ? "bg-green-50/50" : ""
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            isCompleted
                              ? "bg-green-500 text-white"
                              : "bg-gray-200 text-gray-600"
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle className="w-5 h-5" />
                          ) : (
                            <span className="text-sm font-medium">
                              {index + 1}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`font-medium text-sm truncate ${
                              isCompleted
                                ? "text-green-800"
                                : "text-gray-900"
                            }`}
                          >
                            {module.title}
                          </p>
                          <p className="text-xs text-gray-500">
                            {module.duration}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </a>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Module Content */}
          <div className="lg:col-span-2 space-y-8">
            {trainingModules.map((module) => {
              const isCompleted = completedModules?.has(module.id) ?? false;
              const Icon = module.icon;

              return (
                <Card key={module.id} id={module.id} className="scroll-mt-28">
                  <CardHeader className="border-b">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                          <Icon className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{module.title}</CardTitle>
                          <p className="text-sm text-gray-600">
                            {module.description}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={isCompleted ? "default" : "secondary"}
                        className={
                          isCompleted
                            ? "bg-green-500"
                            : ""
                        }
                      >
                        {isCompleted ? "Completed" : "Not Started"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    {/* Video Placeholder */}
                    <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Play className="w-8 h-8 text-white" />
                        </div>
                        <p className="text-gray-400">Video tutorial</p>
                        <p className="text-sm text-gray-500">{module.duration}</p>
                      </div>
                    </div>

                    {/* Content List */}
                    <div>
                      <h4 className="font-semibold mb-3">In this module:</h4>
                      <ul className="space-y-2">
                        {module.content.map((item, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-gray-600"
                          >
                            <span className="text-red-500 mt-1">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Resources */}
                    <div>
                      <h4 className="font-semibold mb-3">Resources:</h4>
                      <div className="flex flex-wrap gap-2">
                        {module.resources.map((resource, i) => (
                          <Button
                            key={i}
                            variant="outline"
                            size="sm"
                            className="gap-2"
                          >
                            {resource.type === "pdf" && (
                              <FileText className="w-4 h-4" />
                            )}
                            {resource.type === "download" && (
                              <Download className="w-4 h-4" />
                            )}
                            {resource.type === "checklist" && (
                              <ListCheck className="w-4 h-4" />
                            )}
                            {resource.name}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    {/* Complete Button */}
                    <form action="/api/training/complete-module" method="POST">
                      <input type="hidden" name="moduleId" value={module.id} />
                      <input
                        type="hidden"
                        name="sellerId"
                        value={sellerId}
                      />
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={isCompleted}
                        variant={isCompleted ? "outline" : "default"}
                      >
                        {isCompleted ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Completed
                          </>
                        ) : (
                          <>
                            Mark as Complete
                            <ChevronRight className="w-4 h-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
