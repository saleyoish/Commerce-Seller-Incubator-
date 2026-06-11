import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Clock, Mail, ArrowLeft } from "lucide-react";

export default function WaitlistSuccess() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" />
      <div className="relative z-10">
        <Card className="max-w-md w-full shadow-2xl bg-slate-800/95 border-slate-700 backdrop-blur-xl">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>

            <h1 className="text-2xl font-bold text-white mb-2">
              You're on the List!
            </h1>
            <p className="text-gray-300 mb-6">
              Thank you for your interest in TikTok Shop Fast Track. We've received your application.
            </p>

            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <Clock className="w-4 h-4 text-blue-400" />
                <span>Applications reviewed within 48 hours</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <Mail className="w-4 h-4 text-blue-400" />
                <span>Check your email for confirmation</span>
              </div>
            </div>

            <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-200">
                <strong>Next Steps:</strong> Once approved, you'll receive an email with a link to complete your full application and access the training hub.
              </p>
            </div>

            <Link href="/login">
              <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                Go to Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
