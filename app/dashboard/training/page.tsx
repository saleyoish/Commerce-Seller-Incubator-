'use client';

import { BookOpen, Video, FileText, Award, Play, Clock, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const trainingModules = [
  {
    title: 'Getting Started',
    description: 'Learn the basics of selling on our platform',
    lessons: 5,
    duration: '30 min',
    icon: BookOpen,
    color: '#7C3AED',
    completed: true,
  },
  {
    title: 'Live Streaming Mastery',
    description: 'How to host engaging live shopping events',
    lessons: 8,
    duration: '1 hr 15 min',
    icon: Video,
    color: '#06B6D4',
    completed: false,
  },
  {
    title: 'Product Optimization',
    description: 'Create listings that convert viewers to buyers',
    lessons: 6,
    duration: '45 min',
    icon: FileText,
    color: '#10B981',
    completed: false,
  },
  {
    title: 'Platform Integrations',
    description: 'Connect TikTok Shop and other platforms',
    lessons: 4,
    duration: '25 min',
    icon: Award,
    color: '#F59E0B',
    completed: false,
  },
];

const quickTips = [
  { title: 'Best times to go live', readTime: '2 min read' },
  { title: 'Engaging with your audience', readTime: '3 min read' },
  { title: 'Pricing strategies that work', readTime: '4 min read' },
  { title: 'Building your brand', readTime: '5 min read' },
];

export default function TrainingPage() {
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
                <p className="text-2xl font-semibold text-[var(--text-primary)]">1/4</p>
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
                <p className="text-2xl font-semibold text-[var(--text-primary)]">30m</p>
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
                  {module.completed && (
                    <span className="pill pill-success text-[10px]">Completed</span>
                  )}
                </div>
                <p className="text-sm text-[var(--text-muted)] mt-0.5">{module.description}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-[var(--text-muted)]">
                  <span>{module.lessons} lessons</span>
                  <span>{module.duration}</span>
                </div>
              </div>

              <button className="w-10 h-10 rounded-lg bg-[var(--bg-surface)] group-hover:bg-[var(--accent-primary)] flex items-center justify-center transition-colors shrink-0">
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
    </div>
  );
}
