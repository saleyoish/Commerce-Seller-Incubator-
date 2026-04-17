import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { 
  Video,
  DollarSign, 
  Users, 
  Sparkles, 
  CheckCircle, 
  Clock, 
  Smartphone,
  Send,
  Play,
  TrendingUp,
  Zap,
  Headphones,
  ArrowRight
} from "lucide-react";
import { SubmitButton } from "@/components/ui/submit-button";
import { submitWaitlistAction } from "./actions";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section - Navbar is in layout.tsx */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        <div className="absolute top-20 right-0 w-96 h-96 bg-gradient-to-br from-red-500/20 to-pink-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-tr from-purple-500/20 to-pink-500/20 rounded-full blur-3xl"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-red-500/20 text-red-300 border-red-500/30">
                <Sparkles className="w-3 h-3 mr-1" />
                Now accepting applications
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                Turn Your Products Into
                <span className="block bg-gradient-to-r from-red-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                  Live Sales on TikTok Shop
                </span>
              </h1>
              <p className="text-xl text-gray-300 mb-8 max-w-xl">
                Join our seller incubator. We handle training, tools, and commissions. 
                Start selling on TikTok Live immediately with zero upfront costs.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="#waitlist">
                  <Button size="lg" className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-lg px-8">
                    Join Waitlist
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link href="#how-it-works">
                  <Button size="lg" variant="outline" className="border-gray-600 text-white hover:bg-gray-800 text-lg px-8">
                    <Play className="mr-2 w-5 h-5" />
                    See How It Works
                  </Button>
                </Link>
              </div>
              
              {/* Trust badges */}
              <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>No upfront costs</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>80/20 commission split</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>Weekly payouts</span>
                </div>
              </div>
            </div>
            
            {/* Hero visual */}
            <div className="relative hidden lg:block">
              <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 shadow-2xl border border-gray-700">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="ml-auto text-xs text-gray-500">LIVE</span>
                </div>
                <div className="aspect-video bg-gradient-to-br from-red-600/20 to-pink-600/20 rounded-lg flex items-center justify-center mb-4">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-2 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center">
                      <Video className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-sm text-gray-400">Live Selling Session</p>
                  </div>
                </div>
                <div className="flex justify-between text-sm text-gray-400">
                  <span>1,234 viewers</span>
                  <span>$5,678 sold today</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-gray-50 border-y">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl md:text-4xl font-bold text-gray-900">50+</div>
              <div className="text-sm text-gray-600 mt-1">Sellers Active</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-gray-900">$125K</div>
              <div className="text-sm text-gray-600 mt-1">GMV This Month</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-gray-900">$2.4K</div>
              <div className="text-sm text-gray-600 mt-1">Avg Seller Earnings</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-gray-900">24h</div>
              <div className="text-sm text-gray-600 mt-1">Avg Time to First Sale</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600">Three simple steps to start selling</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 pt-6">
            <Card className="relative border-2 border-red-100 overflow-visible">
              <div className="absolute -top-4 left-6">
                <div className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center font-bold">
                  1
                </div>
              </div>
              <CardHeader className="pt-8">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4">
                  <Send className="w-6 h-6 text-red-600" />
                </div>
                <CardTitle className="text-xl">Apply & Get Approved</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Submit your application with details about your products and experience. 
                  Our team reviews and approves qualified sellers within 48 hours.
                </p>
              </CardContent>
            </Card>

            <Card className="relative border-2 border-pink-100 overflow-visible">
              <div className="absolute -top-4 left-6">
                <div className="w-8 h-8 bg-pink-600 text-white rounded-full flex items-center justify-center font-bold">
                  2
                </div>
              </div>
              <CardHeader className="pt-8">
                <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-pink-600" />
                </div>
                <CardTitle className="text-xl">Complete Training</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Access our comprehensive training hub covering TikTok Shop setup, 
                  OBS configuration, live selling best practices, and more.
                </p>
              </CardContent>
            </Card>

            <Card className="relative border-2 border-purple-100 overflow-visible">
              <div className="absolute -top-4 left-6">
                <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                  3
                </div>
              </div>
              <CardHeader className="pt-8">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <CardTitle className="text-xl">Go Live & Earn</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Start streaming on TikTok Live, showcase your products, and earn 
                  with our 80/20 commission split. Get paid weekly via Stripe.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Sell With Us?
            </h2>
            <p className="text-xl text-gray-600">Everything you need to succeed on TikTok Shop</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <CardTitle className="text-lg">No Upfront Costs</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Start selling with zero investment. We provide the platform, training, and tools.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                  <GraduationCap className="w-5 h-5 text-blue-600" />
                </div>
                <CardTitle className="text-lg">Full Training Provided</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Step-by-step training on TikTok Shop setup, OBS streaming, and live selling tactics.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
                  <Smartphone className="w-5 h-5 text-purple-600" />
                </div>
                <CardTitle className="text-lg">Multi-Platform Streaming</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Stream to TikTok, Whatnot, YouTube, and more from a single setup.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mb-3">
                  <Percent className="w-5 h-5 text-red-600" />
                </div>
                <CardTitle className="text-lg">80/20 Commission Split</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  You keep 80% of every sale. The best split in the industry.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mb-3">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <CardTitle className="text-lg">Weekly Payouts</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Get paid weekly via Stripe. No minimum threshold for active sellers.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mb-3">
                  <Headphones className="w-5 h-5 text-indigo-600" />
                </div>
                <CardTitle className="text-lg">Dedicated Support</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Access to our Discord community and direct support from our team.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Waitlist Form Section */}
      <section id="waitlist" className="py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Join the Waitlist
            </h2>
            <p className="text-xl text-gray-600">
              Limited spots available. Apply now to secure your place.
            </p>
          </div>

          <Card className="border-2 border-gray-200 shadow-lg">
            <CardContent className="p-8">
              <form action={submitWaitlistAction} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input 
                      id="name" 
                      name="name" 
                      placeholder="John Doe" 
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input 
                      id="email" 
                      name="email" 
                      type="email" 
                      placeholder="john@example.com" 
                      required 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input 
                    id="phone" 
                    name="phone" 
                    type="tel" 
                    placeholder="+1 (555) 123-4567" 
                    required 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whatYouSell">What do you sell? *</Label>
                  <Textarea 
                    id="whatYouSell" 
                    name="whatYouSell" 
                    placeholder="Describe your products, categories, and typical price range..." 
                    required 
                    rows={4}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Have you done live selling before? *</Label>
                  <RadioGroup name="hasLiveExperience" defaultValue="no" className="flex gap-6">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="yes-experience" />
                      <Label htmlFor="yes-experience" className="cursor-pointer">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="no-experience" />
                      <Label htmlFor="no-experience" className="cursor-pointer">No</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox id="consent" name="consent" required />
                  <Label htmlFor="consent" className="text-sm leading-tight cursor-pointer">
                    I agree to receive emails about my application and the TikTok Shop Fast Track program. 
                    You can unsubscribe at any time.
                  </Label>
                </div>

                <SubmitButton 
                  className="w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-lg py-6"
                >
                  Submit Application
                </SubmitButton>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What is TikTok Shop?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  TikTok Shop is TikTok's integrated e-commerce platform that allows sellers to showcase 
                  and sell products directly through live streams and videos. Viewers can purchase items 
                  without leaving the app.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Do I need my own products?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Yes, you need your own products to sell. We work with sellers who have existing inventory 
                  in categories like Fashion, Beauty, Electronics, Home Goods, and more.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">How much do I earn?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  You keep 80% of every sale. Our platform takes a 20% commission to cover payment processing, 
                  platform tools, training, and support. Top sellers earn $5,000+ per month.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">When do I get paid?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  We process payouts weekly via Stripe. Once you're an active seller, there's no minimum 
                  threshold—you get paid every week for the sales you've made.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What equipment do I need?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  At minimum: a smartphone with a good camera and stable internet. We recommend adding 
                  a ring light and microphone as you grow. Our training covers equipment setup in detail.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">How long until I can go live?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Most approved sellers complete training and go live within 3-5 days. The training is 
                  self-paced, but we recommend completing it within your first week.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-gradient-to-br from-red-600 to-pink-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Turn Your Products Into Live Sales?
          </h2>
          <p className="text-xl mb-8 text-red-100">
            Join our community of sellers already growing with TikTok Shop
          </p>
          <Link href="#waitlist">
            <Button size="lg" className="bg-white text-red-600 hover:bg-gray-100 text-lg px-12 py-6">
              Join Waitlist Now
            </Button>
          </Link>
          <p className="mt-4 text-sm text-red-200">
            Limited spots available. Applications reviewed within 48 hours.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <Video className="w-4 h-4 text-white" />
                </div>
                <span className="text-white font-bold">TikTok Shop Fast Track</span>
              </div>
              <p className="text-sm">
                Empowering sellers to succeed on TikTok Shop with training, tools, and support.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#how-it-works" className="hover:text-white transition-colors">How It Works</Link></li>
                <li><Link href="/training" className="hover:text-white transition-colors">Training</Link></li>
                <li><Link href="/dashboard/tiktok-shop" className="hover:text-white transition-colors">TikTok Shop</Link></li>
                <li><Link href="/dashboard/referrals" className="hover:text-white transition-colors">My Referrals</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Admin</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/admin/waitlist" className="hover:text-white transition-colors">Waitlist</Link></li>
                <li><Link href="/admin/applications" className="hover:text-white transition-colors">Applications</Link></li>
                <li><Link href="/admin/referrals" className="hover:text-white transition-colors">Referrals</Link></li>
                <li><Link href="/admin/training" className="hover:text-white transition-colors">Training Analytics</Link></li>
                <li><Link href="/admin/tiktok" className="hover:text-white transition-colors">TikTok Shops</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Referral Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>© 2026 TikTok Shop Fast Track. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Additional icon components
function GraduationCap({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0v7" />
    </svg>
  );
}

function Percent({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}
