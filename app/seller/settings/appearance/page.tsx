'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useTheme } from '@/components/theme-provider';
import { Moon, Sun } from 'lucide-react';

export default function AppearanceSettingsPage() {
  const { theme, setTheme, mounted } = useTheme();

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-[var(--text-primary)]">Appearance</h1>
          <p className="text-[var(--text-muted)]">Customize your dashboard theme</p>
        </div>
        <Card className="card-premium">
          <CardContent className="p-8">
            <div className="animate-pulse flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-[var(--bg-raised)]"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-[var(--bg-raised)] rounded w-1/4"></div>
                <div className="h-3 bg-[var(--bg-raised)] rounded w-1/3"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isDarkMode = theme === 'dark';

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-[var(--text-primary)]">Appearance</h1>
        <p className="text-[var(--text-muted)]">Customize your dashboard theme</p>
      </div>

      {/* Theme Card */}
      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="text-[var(--text-primary)] flex items-center gap-2">
            {isDarkMode ? (
              <Moon className="w-5 h-5 text-[var(--accent-primary)]" />
            ) : (
              <Sun className="w-5 h-5 text-[var(--accent-primary)]" />
            )}
            Theme
          </CardTitle>
          <CardDescription className="text-[var(--text-muted)]">
            Choose between light and dark mode for your dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border border-[var(--border-default)] rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--bg-raised)] flex items-center justify-center">
                {isDarkMode ? (
                  <Moon className="w-5 h-5 text-[var(--text-primary)]" />
                ) : (
                  <Sun className="w-5 h-5 text-[var(--text-primary)]" />
                )}
              </div>
              <div>
                <p className="font-medium text-[var(--text-primary)]">
                  {isDarkMode ? 'Dark Mode' : 'Light Mode'}
                </p>
                <p className="text-sm text-[var(--text-muted)]">
                  {isDarkMode 
                    ? 'Easier on the eyes in low-light environments' 
                    : 'Clean and crisp look for bright environments'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--text-muted)]">Light</span>
              <Switch
                checked={isDarkMode}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              />
              <span className="text-sm text-[var(--text-muted)]">Dark</span>
            </div>
          </div>

          {/* Theme Preview */}
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div 
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                !isDarkMode 
                  ? 'border-[var(--accent-primary)]' 
                  : 'border-[var(--border-default)] hover:border-[var(--border-bright)]'
              }`}
              onClick={() => setTheme('light')}
            >
              <div className="h-20 rounded-md bg-[#F5F5FA] mb-3 flex items-center justify-center">
                <Sun className="w-8 h-8 text-[#7C3AED]" />
              </div>
              <p className="font-medium text-[var(--text-primary)] text-center">Light</p>
            </div>
            <div 
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                isDarkMode 
                  ? 'border-[var(--accent-primary)]' 
                  : 'border-[var(--border-default)] hover:border-[var(--border-bright)]'
              }`}
              onClick={() => setTheme('dark')}
            >
              <div className="h-20 rounded-md bg-[#0A0A0F] mb-3 flex items-center justify-center">
                <Moon className="w-8 h-8 text-[#7C3AED]" />
              </div>
              <p className="font-medium text-[var(--text-primary)] text-center">Dark</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
