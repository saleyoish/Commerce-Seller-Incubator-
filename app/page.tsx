'use client';

import Link from "next/link";
import { Button } from "@/components/ui/button";
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
  TrendingUp,
  Zap,
  Headphones,
  Play,
  ArrowRight,
  Star,
} from "lucide-react";
import HeroButtons from "@/components/hero-buttons";
import DashboardNav from "@/components/DashboardNav";
import { GlobalGoLiveButton } from "@/components/streaming/GlobalGoLiveButton";
import { useState, useEffect } from 'react';

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentSellerId, setCurrentSellerId] = useState<string>('');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'omit' });
        if (res.ok) {
          const data = await res.json();
          setIsLoggedIn(true);
          setCurrentSellerId(data.seller?.id || '');
        } else {
          setIsLoggedIn(false);
        }
      } catch {
        setIsLoggedIn(false);
      }
    };
    checkAuth();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">

      {/* ─── HERO ─────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-8 pb-24 lg:pt-12 lg:pb-32">
        {/* Ambient glow blobs — purely decorative, no bg gradient */}
        <div className="pointer-events-none absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-[#7C3AED]/10 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-[#06B6D4]/8 blur-[100px]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left copy */}
            <div className="animate-fade-in-up">
              {/* Live badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] mb-6">
                <span className="live-dot" />
                <span className="text-[11px] uppercase tracking-widest font-medium text-[var(--accent-danger)]">Now Accepting Applications</span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-[var(--text-primary)] mb-6 leading-[1.1]">
                Turn Your Products Into{" "}
                <span className="gradient-text block mt-1">
                  Live Sales on TikTok Shop
                </span>
              </h1>
              <p className="text-lg text-[var(--text-secondary)] mb-8 max-w-xl leading-relaxed">
                Join our seller incubator. We handle training, tools, and commissions.
                Start selling on TikTok Live immediately with zero upfront costs.
              </p>

              <HeroButtons />
              
              
              {/* Trust badges */}
              <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-[var(--text-muted)]">
                {[
                  "No upfront costs",
                  "80/20 commission split",
                  "Weekly payouts",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[var(--accent-success)]" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero live-stream card */}
            <div className="relative hidden lg:block animate-fade-in-up">
              <div className="card-premium !p-0 overflow-hidden">
                {/* top bar */}
                <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--border-default)] bg-[var(--bg-raised)]">
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent-danger)]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent-warning)]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent-success)]" />
                  <div className="ml-auto live-indicator">
                    <span className="live-dot" />
                    <span className="live-text">Live</span>
                  </div>
                </div>
                {/* stream area */}
                <div className="aspect-video bg-[var(--bg-raised)] flex items-center justify-center relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#7C3AED]/10 via-transparent to-[#06B6D4]/10" />
                  <div className="text-center z-10">
                    <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-[#7C3AED] to-[#06B6D4] rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(124,58,237,0.4)]">
                      <Play className="w-7 h-7 text-white fill-white" />
                    </div>
                    <p className="text-sm text-[var(--text-muted)]">Live Selling Session</p>
                  </div>
                </div>
                {/* stats row */}
                <div className="flex justify-between items-center px-5 py-4 border-t border-[var(--border-default)]">
                  <div>
                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest mb-0.5">Viewers</p>
                    <p className="text-lg font-semibold text-[var(--accent-secondary)]">1,234</p>
                  </div>
                  <div className="h-8 w-px bg-[var(--border-default)]" />
                  <div>
                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest mb-0.5">Sold Today</p>
                    <p className="text-lg font-semibold text-[var(--accent-success)]">$5,678</p>
                  </div>
                  <div className="h-8 w-px bg-[var(--border-default)]" />
                  <div>
                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest mb-0.5">Commission</p>
                    <p className="text-lg font-semibold text-[var(--text-primary)]">80%</p>
                  </div>
                </div>
              </div>
              {/* floating badges */}
              <div className="absolute -bottom-4 -left-6 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl px-4 py-2.5 flex items-center gap-2 shadow-lg">
                <Star className="w-4 h-4 text-[var(--accent-warning)]" />
                <span className="text-sm font-medium text-[var(--text-primary)]">Top Seller This Week</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── STATS ────────────────────────────────────── */}
      <section className="border-y border-[var(--border-default)] bg-[var(--bg-surface)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "50+", label: "Sellers Active" },
              { value: "$125K", label: "GMV This Month" },
              { value: "$2.4K", label: "Avg Seller Earnings" },
              { value: "24h", label: "Avg Time to First Sale" },
            ].map(({ value, label }) => (
              <div key={label}>
                <div className="text-3xl md:text-4xl font-semibold gradient-text mb-1">{value}</div>
                <div className="text-sm text-[var(--text-muted)]">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─────────────────────────────── */}
      <section id="how-it-works" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] mb-3">Process</p>
            <h2 className="text-3xl md:text-4xl font-semibold text-[var(--text-primary)] mb-4">
              How It Works
            </h2>
            <p className="text-[var(--text-secondary)] text-lg">Three simple steps to start selling</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 pt-6">
            {[
              {
                step: "01",
                icon: Send,
                title: "Apply & Get Approved",
                desc: "Submit your application with product details. Our team reviews and approves qualified sellers within 48 hours.",
                color: "var(--accent-primary)",
              },
              {
                step: "02",
                icon: Zap,
                title: "Complete Training",
                desc: "Access our training hub covering TikTok Shop setup, OBS configuration, live selling best practices, and more.",
                color: "var(--accent-secondary)",
              },
              {
                step: "03",
                icon: TrendingUp,
                title: "Go Live & Earn",
                desc: "Start streaming on TikTok Live, showcase your products, and earn with our 80/20 commission split. Get paid weekly.",
                color: "var(--accent-success)",
              },
            ].map(({ step, icon: Icon, title, desc, color }) => (
              <div key={step} className="card-premium relative group">
                <div className="text-[48px] font-bold text-[var(--border-default)] leading-none mb-4 transition-colors duration-200 group-hover:text-[var(--border-bright)]">
                  {step}
                </div>
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                  style={{ background: `${color}18` }}
                >
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2">{title}</h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── BENEFITS ─────────────────────────────────── */}
      <section className="py-24 bg-[var(--bg-surface)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] mb-3">Why Us</p>
            <h2 className="text-3xl md:text-4xl font-semibold text-[var(--text-primary)] mb-4">
              Why Sell With Us?
            </h2>
            <p className="text-lg text-[var(--text-secondary)]">Everything you need to succeed on TikTok Shop</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: DollarSign, title: "No Upfront Costs", desc: "Start selling with zero investment. We provide the platform, training, and tools.", color: "var(--accent-success)" },
              { icon: GraduationCap, title: "Full Training Provided", desc: "Step-by-step training on TikTok Shop setup, OBS streaming, and live selling tactics.", color: "var(--accent-secondary)" },
              { icon: Smartphone, title: "Multi-Platform Streaming", desc: "Stream to TikTok, Whatnot, YouTube, and more from a single setup.", color: "var(--accent-primary)" },
              { icon: PercentIcon, title: "80/20 Commission Split", desc: "You keep 80% of every sale. The best split in the industry.", color: "var(--accent-danger)" },
              { icon: Clock, title: "Weekly Payouts", desc: "Get paid weekly via Stripe. No minimum threshold for active sellers.", color: "var(--accent-warning)" },
              { icon: Headphones, title: "Dedicated Support", desc: "Access to our Discord community and direct support from our team.", color: "var(--accent-primary)" },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="card-premium">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ background: `${color}18` }}>
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2">{title}</h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ──────────────────────────────────────── */}
      <section className="py-24 bg-[var(--bg-surface)]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] mb-3">FAQ</p>
            <h2 className="text-3xl font-semibold text-[var(--text-primary)] mb-4">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "What is TikTok Shop?",
                a: "TikTok Shop is TikTok's integrated e-commerce platform that allows sellers to showcase and sell products directly through live streams and videos. Viewers can purchase items without leaving the app.",
              },
              {
                q: "Do I need my own products?",
                a: "Yes, you need your own products to sell. We work with sellers who have existing inventory in categories like Fashion, Beauty, Electronics, Home Goods, and more.",
              },
              {
                q: "How much do I earn?",
                a: "You keep 80% of every sale. Our platform takes a 20% commission to cover payment processing, platform tools, training, and support. Top sellers earn $5,000+ per month.",
              },
              {
                q: "When do I get paid?",
                a: "We process payouts weekly via Stripe. Once you're an active seller, there's no minimum threshold—you get paid every week for the sales you've made.",
              },
              {
                q: "What equipment do I need?",
                a: "At minimum: a smartphone with a good camera and stable internet. We recommend adding a ring light and microphone as you grow. Our training covers equipment setup in detail.",
              },
              {
                q: "How long until I can go live?",
                a: "Most approved sellers complete training and go live within 3–5 days. The training is self-paced, but we recommend completing it within your first week.",
              },
            ].map(({ q, a }) => (
              <div key={q} className="card-premium">
                <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2">{q}</h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ────────────────────────────────── */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Decorative border card */}
          <div className="relative rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-8 py-16 overflow-hidden">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#7C3AED]/8 via-transparent to-[#06B6D4]/8" />
            <div className="relative z-10">
              <div className="live-indicator justify-center mb-6">
                <span className="live-dot" />
                <span className="live-text">Applications Open</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-semibold text-[var(--text-primary)] mb-4">
                Ready to Turn Your Products Into Live Sales?
              </h2>
              <p className="text-lg text-[var(--text-secondary)] mb-8 max-w-xl mx-auto">
                Join our community of sellers already growing with TikTok Shop
              </p>
              <Link href="/signup">
                <button className="btn-primary text-base px-8 py-3 inline-flex items-center gap-2">
                  Join Waitlist
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
              <p className="mt-4 text-sm text-[var(--text-muted)]">
                Limited spots available. Applications reviewed within 48 hours.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ───────────────────────────────────── */}
      <footer className="border-t border-[var(--border-default)] bg-[var(--bg-nav)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-[#7C3AED] to-[#06B6D4] rounded-lg flex items-center justify-center">
                  <Video className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold gradient-text">Isellish</span>
              </div>
              <p className="text-sm text-[var(--text-muted)]">
                Empowering sellers to succeed on TikTok Shop with training, tools, and support.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-4 uppercase tracking-widest">Platform</h4>
              <ul className="space-y-2 text-sm text-[var(--text-muted)]">
                <li><Link href="#how-it-works" className="hover:text-[var(--text-primary)] transition-colors">How It Works</Link></li>
                <li><Link href="/seller/training" className="hover:text-[var(--text-primary)] transition-colors">Training</Link></li>
                <li><Link href="/leaderboard" className="hover:text-[var(--text-primary)] transition-colors">Leaderboard</Link></li>
                <li><Link href="/dashboard/tiktok-shop" className="hover:text-[var(--text-primary)] transition-colors">TikTok Shop</Link></li>
                <li><Link href="/dashboard/referrals" className="hover:text-[var(--text-primary)] transition-colors">My Referrals</Link></li>
              </ul>
            </div>
            <DashboardNav />
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-4 uppercase tracking-widest">Legal</h4>
              <ul className="space-y-2 text-sm text-[var(--text-muted)]">
                <li><Link href="#" className="hover:text-[var(--text-primary)] transition-colors">Privacy Policy</Link></li>
                <li><Link href="#" className="hover:text-[var(--text-primary)] transition-colors">Terms of Service</Link></li>
                <li><Link href="#" className="hover:text-[var(--text-primary)] transition-colors">Referral Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-[var(--border-default)] pt-8 text-center text-sm text-[var(--text-muted)]">
            <p>© 2026 TikTok Shop Fast Track. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─── Inline icon helpers ─────────────────────────── */
function GraduationCap({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
    </svg>
  );
}

function PercentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6M7 8h.01M17 16h.01M6 6h.01m12 12h.01M6 18h.01M18 6h.01M6 12h.01M18 12h.01" />
      <circle cx="9" cy="9" r="2" strokeWidth={2} />
      <circle cx="15" cy="15" r="2" strokeWidth={2} />
    </svg>
  );
}
