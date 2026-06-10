'use client';

import { useState } from 'react';
import { BookOpen, Video, FileText, Award, Play, Clock, ChevronRight, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const trainingModules = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Learn the basics of selling on our platform',
    lessons: 5,
    duration: '30 min',
    icon: BookOpen,
    color: '#7C3AED',
    videoUrl: 'https://www.youtube.com/embed/ScMzIvxBS4',
  },
  {
    id: 'live-streaming',
    title: 'Live Streaming Mastery',
    description: 'How to host engaging live shopping events',
    lessons: 8,
    duration: '1 hr 15 min',
    icon: Video,
    color: '#06B6D4',
    videoUrl: 'https://www.youtube.com/embed/wnHW6o4Bd_0',
  },
  {
    id: 'product-optimization',
    title: 'Product Optimization',
    description: 'Create listings that convert viewers to buyers',
    lessons: 6,
    duration: '45 min',
    icon: FileText,
    color: '#10B981',
    videoUrl: 'https://www.youtube.com/embed/9bZkp7q19f0',
  },
  {
    id: 'platform-integrations',
    title: 'Platform Integrations',
    description: 'Connect TikTok Shop and other platforms',
    lessons: 4,
    duration: '25 min',
    icon: Award,
    color: '#F59E0B',
    videoUrl: 'https://www.youtube.com/embed/1j2kN5iXG8',
  },
];

const quickTips = [
  { 
    id: 'best-times',
    title: 'Best times to go live', 
    readTime: '2 min read',
    content: 'The optimal times to go live are typically between 6-9 PM on weekdays and 2-5 PM on weekends. Consider your target audience\'s timezone and schedule accordingly. Tuesday through Thursday generally see the highest engagement rates.'
  },
  { 
    id: 'obs-setup',
    title: 'OBS Studio Setup Guide', 
    readTime: '10 min read',
    content: 'OBS (Open Broadcaster Software) is free, professional streaming software. Download from obsproject.com. Steps: 1) Open OBS and go to Settings → Stream. 2) Select Service: Custom. 3) Server: rtmp://live.restream.io/live. 4) Stream Key: Copy from your dashboard. 5) Click Start Streaming to go live. OBS allows you to customize your stream with multiple scenes, overlays, and sources. You can add your webcam, screen share, or product displays.'
  },
  { 
    id: 'engaging-audience',
    title: 'Engaging with your audience', 
    readTime: '3 min read',
    content: 'Start with a strong hook in the first 30 seconds. Use viewers\' names when they comment. Ask questions to encourage interaction. Run polls and Q&A sessions. Acknowledge new followers and thank viewers for sharing your stream.'
  },
  { 
    id: 'pricing-strategies',
    title: 'Pricing strategies that work', 
    readTime: '4 min read',
    content: 'Offer exclusive live-only discounts to create urgency. Use tiered pricing: "Early bird" pricing for first 10 buyers, regular pricing after. Bundle related products for better value perception. Always show the original price strikethrough next to your live price.'
  },
  { 
    id: 'building-brand',
    title: 'Building your brand', 
    readTime: '5 min read',
    content: 'Consistency is key - use the same colors, fonts, and style across all your content. Develop a unique selling proposition (USP) that sets you apart. Share your story and behind-the-scenes content. Create a memorable tagline and use it in every stream.'
  },
];

export default function TrainingPage() {
  const [activeModule, setActiveModule] = useState<typeof trainingModules[0] | null>(null);
  const [activeTip, setActiveTip] = useState<typeof quickTips[0] | null>(null);
  const [completedModules, setCompletedModules] = useState<Set<string>>(new Set());

  const handlePlayModule = (module: typeof trainingModules[0]) => {
    setActiveModule(module);
  };

  const closeVideo = () => {
    setActiveModule(null);
  };

  const handleOpenTip = (tip: typeof quickTips[0]) => {
    setActiveTip(tip);
  };

  const closeTip = () => {
    setActiveTip(null);
  };

  const markModuleComplete = (moduleId: string) => {
    setCompletedModules(prev => new Set([...prev, moduleId]));
    closeVideo();
  };

  const completedCount = completedModules.size;
  const totalModules = trainingModules.length;

  // Calculate time invested based on completed modules only
  const calculateTimeInvested = () => {
    let totalMinutes = 0;
    completedModules.forEach(moduleId => {
      const module = trainingModules.find(m => m.id === moduleId);
      if (module) {
        // Parse duration from string (e.g., "30 min", "1 hr 15 min")
        const duration = module.duration;
        if (duration.includes('hr')) {
          const hours = parseInt(duration.split('hr')[0].trim());
          const minutes = duration.includes('min') ? parseInt(duration.split('min')[1].trim()) : 0;
          totalMinutes += (hours * 60) + minutes;
        } else {
          const minutes = parseInt(duration.split('min')[0].trim());
          totalMinutes += minutes;
        }
      }
    });
    
    if (totalMinutes >= 60) {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    }
    return `${totalMinutes}m`;
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Training Center</h1>
        <p className="text-[var(--text-muted)] mt-1">Master the art of live commerce selling</p>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="card-premium">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[rgba(124,58,237,0.15)] flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-[#7C3AED]" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-[var(--text-primary)]">{completedCount}/{totalModules}</p>
                <p className="text-xs text-[var(--text-muted)]">Modules Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-premium">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[rgba(6,182,212,0.15)] flex items-center justify-center">
                <Clock className="w-5 h-5 text-[#06B6D4]" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-[var(--text-primary)]">{calculateTimeInvested()}</p>
                <p className="text-xs text-[var(--text-muted)]">Time Invested</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-premium">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[rgba(16,185,129,0.15)] flex items-center justify-center">
                <Award className="w-5 h-5 text-[#10B981]" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-[var(--text-primary)]">Bronze</p>
                <p className="text-xs text-[var(--text-muted)]">Current Level</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Training Modules */}
      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-[var(--text-primary)]">
            Training Modules
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {trainingModules.map((module, index) => (
            <div
              key={index}
              className="flex items-center gap-4 p-4 rounded-lg bg-[var(--bg-raised)] hover:bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--accent-primary)] transition-all cursor-pointer group"
            >
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${module.color}20` }}
              >
                <module.icon className="w-6 h-6" style={{ color: module.color }} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-[var(--text-primary)]">{module.title}</h3>
                  {completedModules.has(module.id) && (
                    <span className="pill pill-success text-[10px]">Completed</span>
                  )}
                </div>
                <p className="text-sm text-[var(--text-muted)] mt-0.5">{module.description}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-[var(--text-muted)]">
                  <span>{module.lessons} lessons</span>
                  <span>{module.duration}</span>
                </div>
              </div>

              <button 
                onClick={() => handlePlayModule(module)}
                className="w-10 h-10 rounded-lg bg-[var(--bg-surface)] group-hover:bg-[var(--accent-primary)] flex items-center justify-center transition-colors shrink-0"
              >
                <Play className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-white" />
              </button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Quick Tips */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-[var(--text-primary)]">
              Quick Tips
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {quickTips.map((tip, index) => (
              <div
                key={index}
                onClick={() => handleOpenTip(tip)}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--bg-raised)] cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[rgba(124,58,237,0.1)] flex items-center justify-center">
                    <FileText className="w-4 h-4 text-[#7C3AED]" />
                  </div>
                  <span className="text-sm text-[var(--text-secondary)]">{tip.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-muted)]">{tip.readTime}</span>
                  <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-[var(--text-primary)]">
              Live Workshop Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-[rgba(124,58,237,0.08)] border border-[rgba(124,58,237,0.2)]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="pill pill-approved text-[10px]">Tomorrow</span>
                  <span className="text-xs text-[var(--text-muted)]">2:00 PM EST</span>
                </div>
                <h4 className="font-medium text-[var(--text-primary)]">Mastering TikTok Shop Integration</h4>
                <p className="text-sm text-[var(--text-muted)] mt-1">Learn how to sync your products seamlessly</p>
              </div>

              <div className="p-4 rounded-lg bg-[var(--bg-raised)] border border-[var(--border-default)]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="pill pill-pending text-[10px]">Next Week</span>
                  <span className="text-xs text-[var(--text-muted)]">11:00 AM EST</span>
                </div>
                <h4 className="font-medium text-[var(--text-primary)]">Advanced Live Selling Techniques</h4>
                <p className="text-sm text-[var(--text-muted)] mt-1">Boost your conversion rates with proven strategies</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Video Player Modal */}
      {activeModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="relative w-full max-w-4xl bg-black rounded-lg overflow-hidden">
            {/* Close button */}
            <button
              onClick={closeVideo}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            {/* Video info */}
            <div className="p-4 bg-[var(--bg-surface)] border-b border-[var(--border-default)]">
              <h3 className="font-semibold text-[var(--text-primary)]">{activeModule.title}</h3>
              <p className="text-sm text-[var(--text-muted)]">{activeModule.description}</p>
            </div>

            {/* Video iframe */}
            <div className="aspect-video">
              <iframe
                src={activeModule.videoUrl}
                title={activeModule.title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            {/* Action buttons */}
            <div className="p-4 bg-[var(--bg-surface)] flex items-center justify-between">
              <div className="text-sm text-[var(--text-muted)]">
                Duration: {activeModule.duration}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={closeVideo}>
                  Close
                </Button>
                {!completedModules.has(activeModule.id) && (
                  <Button 
                    className="btn-primary"
                    onClick={() => markModuleComplete(activeModule.id)}
                  >
                    Mark as Complete
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Tip Modal */}
      {activeTip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="relative w-full max-w-lg bg-[var(--bg-surface)] rounded-lg overflow-hidden">
            {/* Close button */}
            <button
              onClick={closeTip}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-[var(--bg-raised)] hover:bg-[var(--border-default)] flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-[var(--text-secondary)]" />
            </button>

            {/* Tip content */}
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-[rgba(124,58,237,0.15)] flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[#7C3AED]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)]">{activeTip.title}</h3>
                  <p className="text-xs text-[var(--text-muted)]">{activeTip.readTime}</p>
                </div>
              </div>
              
              <div className="prose prose-sm max-w-none">
                <p className="text-[var(--text-secondary)] leading-relaxed">
                  {activeTip.content}
                </p>
              </div>

              <div className="mt-6 flex justify-end">
                <Button onClick={closeTip}>
                  Got it
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
