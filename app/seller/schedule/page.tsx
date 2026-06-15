'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { type StreamSession, type Seller, type Product } from '@/lib/supabase-client';
import { authFetch } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, 
  Calendar,
  Clock,
  Plus,
  X,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Video,
  Trash2,
  Edit,
  Play
} from 'lucide-react';

const PLATFORMS = [
  { id: 'tiktok', name: 'TikTok Shop', color: 'bg-black text-white' },
  { id: 'whatnot', name: 'Whatnot', color: 'bg-orange-500 text-white' },
  { id: 'youtube', name: 'YouTube Live', color: 'bg-red-600 text-white' },
  { id: 'facebook', name: 'Facebook Live', color: 'bg-blue-600 text-white' },
  { id: 'instagram', name: 'Instagram Live', color: 'bg-pink-500 text-white' },
];

const DURATION_OPTIONS = [
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
];

function ScheduleContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const duplicateId = searchParams.get('duplicate');
  
  const [seller, setSeller] = useState<Seller | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [scheduledShows, setScheduledShows] = useState<StreamSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isDeletingShow, setIsDeletingShow] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [now, setNow] = useState(new Date());
  const [isProcessingMissed, setIsProcessingMissed] = useState(false);
  const [autoStartedShowId, setAutoStartedShowId] = useState<string | null>(null);
  const [obsConfig, setObsConfig] = useState<{ server: string; streamKey: string } | null>(null);
  const [showOBSPopup, setShowOBSPopup] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    duration: 60,
    platforms: [] as string[],
    selectedProducts: [] as string[],
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (duplicateId) {
      loadShowToDuplicate(duplicateId);
    }
  }, [duplicateId]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isLoading && scheduledShows.length > 0) {
      processMissedShows();
      checkAndAutoStartDueShows();
    }
  }, [now, isLoading, scheduledShows]);

  const checkAndAutoStartDueShows = async () => {
    if (showOBSPopup || isSubmitting) return;

    const dueShows = scheduledShows.filter((show) => {
      if (show.status !== 'scheduled') return false;
      const scheduledStart = new Date(show.scheduled_start || '');
      return scheduledStart <= now && scheduledStart >= new Date(now.getTime() - 15 * 60000);
    });

    if (dueShows.length > 0 && !showOBSPopup) {
      const dueShow = dueShows[0];
      
      setIsSubmitting(true);
      try {
const response = await authFetch('/api/streaming/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ streamId: dueShow.id }),
        });

        const data = await response.json();
        if (response.ok && data.obsConfig) {
          setObsConfig(data.obsConfig);
          setShowOBSPopup(true);
        }
      } catch (error) {
        console.error('Auto-start failed:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  useEffect(() => {
    if (isLoading || showOBSPopup) return;

    const dueShows = scheduledShows.filter(isShowDue);
    if (dueShows.length === 0) return;

    const nextDueShow = dueShows[0];
    if (autoStartedShowId === nextDueShow.id) return;

    setAutoStartedShowId(nextDueShow.id);
    startScheduledShow(nextDueShow.id);
  }, [now, isLoading, scheduledShows, showOBSPopup, autoStartedShowId]);

  const loadData = async () => {
    try {
      const response = await authFetch('/api/auth/me');
      if (!response.ok) {
        router.push('/login');
        return;
      }

      const data = await response.json();
      const isSeller = data.isSeller || false;
      const isAdmin = data.isAdmin || false;
      const sellerData = data.seller || null;

      if (!isSeller && !isAdmin) {
        router.push('/login');
        return;
      }

      setSeller(sellerData);

      // Get seller-specific data (only if seller exists)
      if (sellerData) {
        setIsLoadingProducts(true);
        const productsResponse = await authFetch('/api/seller/products?status=active');
        if (!productsResponse.ok) {
          const errorData = await productsResponse.json();
          throw new Error(errorData.error || 'Failed to load products');
        }
        const productsData = await productsResponse.json();
        setProducts(productsData.products || []);
        setIsLoadingProducts(false);

        const showsResponse = await authFetch('/api/seller/streams?status=scheduled,live,ended,cancelled&order=scheduled_start.desc');
        if (!showsResponse.ok) {
          const errorData = await showsResponse.json();
          throw new Error(errorData.error || 'Failed to load scheduled shows');
        }
        const showsData = await showsResponse.json();
        setScheduledShows(showsData.streams || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadShowToDuplicate = async (id: string) => {
    try {
      const response = await authFetch(`/api/seller/streams?ids=${encodeURIComponent(id)}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load show');
      }
      const data = await response.json();
      const show = data.streams?.[0];
      if (show) {
        const scheduledDate = new Date(show.scheduled_start || '');
        setFormData({
          title: show.title,
          description: show.description || '',
          date: scheduledDate.toISOString().split('T')[0],
          time: scheduledDate.toTimeString().slice(0, 5),
          duration: 60, // Default, could calculate from actual_end - actual_start
          platforms: show.platforms || [],
          selectedProducts: show.products_featured || [],
        });
        setShowForm(true);
      }
    } catch (error) {
      console.error('Error loading show to duplicate:', error);
    }
  };

  const isShowDue = (show: StreamSession) => {
    if (show.status !== 'scheduled') return false;
    const scheduledStart = new Date(show.scheduled_start || '');
    return scheduledStart <= now && scheduledStart >= new Date(now.getTime() - 15 * 60000);
  };

  const isShowMissed = (show: StreamSession) => {
    if (show.status !== 'scheduled') return false;
    const scheduledStart = new Date(show.scheduled_start || '');
    return scheduledStart < new Date(now.getTime() - 15 * 60000);
  };

  const processMissedShows = async () => {
    if (isProcessingMissed || scheduledShows.length === 0) return;
    const missedShows = scheduledShows.filter(isShowMissed);
    if (missedShows.length === 0) return;

    setIsProcessingMissed(true);
    try {
      const response = await authFetch('/api/seller/streams', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: missedShows.map((show) => show.id), status: 'cancelled' }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel missed shows');
      }
      await loadData();
    } catch (error) {
      console.error('Error cancelling missed shows:', error);
    } finally {
      setIsProcessingMissed(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Stream key copied to clipboard');
  };

  const startScheduledShow = async (showId: string) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await authFetch('/api/streaming/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streamId: showId }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to start scheduled show');
      }

      if (data.obsConfig) {
        setObsConfig(data.obsConfig);
        setShowOBSPopup(true);
      }

      await loadData();
    } catch (error: any) {
      console.error('Error starting scheduled show:', error);
      setError(error.message || 'Failed to start scheduled show');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seller) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const scheduledStart = new Date(`${formData.date}T${formData.time}`);
      if (scheduledStart < new Date()) {
        throw new Error('Scheduled time must be in the future');
      }

      const response = await authFetch('/api/seller/streams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          scheduled_start: scheduledStart.toISOString(),
          status: 'scheduled',
          platforms: formData.platforms,
          products_featured: formData.selectedProducts,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to schedule show');
      }

      setFormData({
        title: '',
        description: '',
        date: '',
        time: '',
        duration: 60,
        platforms: [],
        selectedProducts: [],
      });
      setShowForm(false);
      await loadData();
    } catch (error: any) {
      console.error('Error scheduling show:', error);
      setError(error.message || 'Failed to schedule show');
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelShow = async (showId: string) => {
    try {
      setIsDeletingShow(showId);
      const response = await authFetch('/api/seller/streams', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [showId], status: 'cancelled' }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel show');
      }
      await loadData();
    } catch (error) {
      console.error('Error cancelling show:', error);
    } finally {
      setIsDeletingShow(null);
    }
  };

  const togglePlatform = (platformId: string) => {
    setFormData(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platformId)
        ? prev.platforms.filter(p => p !== platformId)
        : [...prev.platforms, platformId]
    }));
  };

  const toggleProduct = (productId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedProducts: prev.selectedProducts.includes(productId)
        ? prev.selectedProducts.filter(p => p !== productId)
        : [...prev.selectedProducts, productId]
    }));
  };

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days: (number | null)[] = [];
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const getShowsForDate = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return scheduledShows.filter(show => {
      const showDate = new Date(show.scheduled_start || '');
      return showDate.toDateString() === date.toDateString();
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Schedule Shows</h1>
        <p className="text-[var(--text-muted)] mt-1">Plan and manage your upcoming live streams</p>
      </div>

      {error && (
        <Alert className="mb-6 bg-[rgba(239,68,68,0.1)] border-[var(--accent-danger)] text-[var(--accent-danger)]">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Schedule New Show Button */}
      <div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="btn-primary flex items-center gap-2"
        >
          {showForm ? (
            <>
              <X className="w-4 h-4" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Schedule New Show
            </>
          )}
        </button>
      </div>

      {/* Schedule Form */}
      {showForm && (
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">Schedule New Live Show</CardTitle>
            <CardDescription className="text-[var(--text-muted)]">Plan your upcoming stream</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-[var(--text-secondary)]">Show Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Weekend Collectibles Auction"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="input-premium"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date" className="text-[var(--text-secondary)]">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="input-premium"
                    required
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time" className="text-[var(--text-secondary)]">Time *</Label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="input-premium"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration" className="text-[var(--text-secondary)]">Duration *</Label>
                  <select
                    id="duration"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                    required
                  >
                    {DURATION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-[var(--bg-surface)]">{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[var(--text-secondary)]">Platforms *</Label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((platform) => (
                    <button
                      key={platform.id}
                      type="button"
                      onClick={() => togglePlatform(platform.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                        formData.platforms.includes(platform.id)
                          ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-white'
                          : 'bg-transparent border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)]'
                      }`}
                    >
                      {formData.platforms.includes(platform.id) && (
                        <CheckCircle className="w-3 h-3 inline mr-1" />
                      )}
                      {platform.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[var(--text-secondary)]">Products to Feature</Label>
                <div className="max-h-40 overflow-y-auto border border-[var(--border-default)] rounded-lg p-3 space-y-2 bg-[var(--bg-input)]">
                  {isLoadingProducts ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="w-5 h-5 animate-spin text-[var(--accent-primary)]" />
                      <span className="ml-2 text-sm text-[var(--text-muted)]">Loading products...</span>
                    </div>
                  ) : products.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)]">No active products. Add products first.</p>
                  ) : (
                    products.map((product) => (
                      <label
                        key={product.id}
                        className="flex items-center gap-3 p-2 hover:bg-[var(--bg-raised)] rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.selectedProducts.includes(product.id)}
                          onChange={() => toggleProduct(product.id)}
                          className="rounded border-[var(--border-default)] bg-[var(--bg-input)]"
                        />
                        <span className="font-medium text-[var(--text-primary)]">{product.name}</span>
                        <span className="text-sm text-[var(--text-muted)]">${product.price}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-[var(--text-secondary)]">Description</Label>
                <Textarea
                  id="description"
                  placeholder="What's this show about? What will you be selling?"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="input-premium"
                />
              </div>

              <div className="flex gap-3">
                <Button 
                  type="submit" 
                  className="btn-primary"
                  disabled={isSubmitting || formData.platforms.length === 0}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Scheduling...
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4 mr-2" />
                      Schedule Show
                    </>
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowForm(false)}
                  className="btn-secondary"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Calendar View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="card-premium lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-[var(--text-primary)]">
                {currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
              </CardTitle>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    const newDate = new Date(currentMonth);
                    newDate.setMonth(newDate.getMonth() - 1);
                    setCurrentMonth(newDate);
                  }}
                  className="btn-secondary px-3"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentMonth(new Date())}
                  className="btn-secondary"
                >
                  Today
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    const newDate = new Date(currentMonth);
                    newDate.setMonth(newDate.getMonth() + 1);
                    setCurrentMonth(newDate);
                  }}
                  className="btn-secondary px-3"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center text-sm font-medium text-[var(--text-muted)] py-2">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {getDaysInMonth().map((day, index) => {
                if (day === null) {
                  return <div key={`empty-${index}`} className="h-24 bg-[var(--bg-raised)] rounded-lg" />;
                }

                const shows = getShowsForDate(day);
                const dueShows = shows.filter(isShowDue);
                const isToday = new Date().toDateString() === 
                  new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).toDateString();

                return (
                  <div
                    key={day}
                    className={`h-24 border rounded-lg p-2 ${
                      isToday 
                        ? 'border-[var(--accent-secondary)] bg-[rgba(6,182,212,0.1)]' 
                        : 'border-[var(--border-default)] hover:border-[var(--border-bright)]'
                    }`}
                  >
                    <div className={`text-sm font-medium mb-1 ${isToday ? 'text-[var(--accent-secondary)]' : 'text-[var(--text-primary)]'}`}>
                      {day}
                    </div>
                    <div className="space-y-1">
                      {shows.slice(0, 2).map((show) => (
                        <div
                          key={show.id}
                          className="text-xs bg-[var(--accent-primary)] text-white px-1.5 py-0.5 rounded truncate cursor-pointer"
                          title={show.title}
                        >
                          {new Date(show.scheduled_start || '').toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </div>
                      ))}
                      {shows.length > 2 && (
                        <div className="text-xs text-[var(--text-muted)]">+{shows.length - 2} more</div>
                      )}
                      {dueShows.length > 0 && (
                        <div className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-900">
                          <Play className="w-3 h-3" />
                          Start now
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming & Past Shows List */}
        <div className="space-y-6">
          {/* Upcoming Shows */}
          <Card className="card-premium">
            <CardHeader>
              <CardTitle className="text-[var(--text-primary)]">Upcoming Shows</CardTitle>
              <CardDescription className="text-[var(--text-muted)]">
                {scheduledShows.filter(s => s.status === 'scheduled' || s.status === 'live').length} scheduled
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {scheduledShows.filter(s => s.status === 'scheduled' || s.status === 'live').length === 0 ? (
                  <div className="text-center py-6 text-[var(--text-muted)]">
                    <div className="w-10 h-10 rounded-lg bg-[rgba(124,58,237,0.15)] flex items-center justify-center mx-auto mb-2">
                      <Video className="w-5 h-5 text-[var(--accent-primary)]" />
                    </div>
                    <p className="text-sm">No upcoming shows</p>
                  </div>
                ) : (
                  scheduledShows
                    .filter(s => s.status === 'scheduled' || s.status === 'live')
                    .sort((a, b) => new Date(a.scheduled_start || '').getTime() - new Date(b.scheduled_start || '').getTime())
                    .map((show) => {
                      const due = isShowDue(show);
                      const missed = isShowMissed(show);

                      return (
                        <div key={show.id} className="border border-[var(--border-default)] rounded-lg p-3 bg-[var(--bg-raised)]">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate text-[var(--text-primary)]">{show.title}</p>
                              <p className="text-sm text-[var(--text-muted)] flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDate(show.scheduled_start || '')}
                              </p>
                              <div className="flex gap-1 mt-2 flex-wrap">
                                {show.platforms.map((p) => (
                                  <Badge key={p} variant="outline" className="text-xs capitalize border-[var(--border-default)] text-[var(--text-muted)]">
                                    {p}
                                  </Badge>
                                ))}
                                {due && (
                                  <Badge variant="secondary" className="text-xs text-green-600 border-green-500">
                                    Live now
                                  </Badge>
                                )}
                                {missed && (
                                  <Badge variant="outline" className="text-xs text-red-500 border-red-500">
                                    Missed
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1 ml-2">
                              {due && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => startScheduledShow(show.id)}
                                  disabled={isSubmitting}
                                >
                                  <Play className="w-3 h-3 mr-1" />
                                  Go Live
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => loadShowToDuplicate(show.id)}
                                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
                                title="Edit show"
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-[var(--accent-danger)] hover:bg-[rgba(239,68,68,0.1)] disabled:opacity-50"
                                onClick={() => cancelShow(show.id)}
                                disabled={isDeletingShow === show.id}
                              >
                                {isDeletingShow === show.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3 h-3" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Past Shows */}
          <Card className="card-premium border-gray-600/30">
            <CardHeader>
              <CardTitle className="text-[var(--text-primary)] flex items-center gap-2">
                Past Shows
                <Badge variant="outline" className="text-xs text-[var(--text-muted)]">
                  {scheduledShows.filter(s => s.status === 'ended' || s.status === 'cancelled').length}
                </Badge>
              </CardTitle>
              <CardDescription className="text-[var(--text-muted)]">
                Completed and cancelled shows
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {scheduledShows.filter(s => s.status === 'ended' || s.status === 'cancelled').length === 0 ? (
                  <div className="text-center py-6 text-[var(--text-muted)]">
                    <p className="text-sm">No past shows yet</p>
                  </div>
                ) : (
                  scheduledShows
                    .filter(s => s.status === 'ended' || s.status === 'cancelled')
                    .sort((a, b) => new Date(b.scheduled_start || '').getTime() - new Date(a.scheduled_start || '').getTime())
                    .slice(0, 10)
                    .map((show) => (
                      <div key={show.id} className="border border-[var(--border-default)] rounded-lg p-3 bg-[var(--bg-raised)] opacity-75">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate text-[var(--text-primary)]">{show.title}</p>
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${
                                  show.status === 'ended' 
                                    ? 'border-green-500 text-green-400' 
                                    : 'border-red-500 text-red-400'
                                }`}
                              >
                                {show.status === 'ended' ? 'Completed' : 'Cancelled'}
                              </Badge>
                            </div>
                            <p className="text-sm text-[var(--text-muted)] flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(show.scheduled_start || '')}
                            </p>
                            <div className="flex gap-1 mt-2 flex-wrap">
                              {show.platforms.map((p) => (
                                <Badge key={p} variant="outline" className="text-xs capitalize border-[var(--border-default)] text-[var(--text-muted)]">
                                  {p}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-1 ml-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => loadShowToDuplicate(show.id)}
                              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
                              title="Edit show"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {showOBSPopup && obsConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-surface)] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[var(--border-default)]">
            <div className="flex items-center justify-between p-6 border-b border-[var(--border-default)]">
              <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">OBS Setup</h2>
                <p className="text-sm text-[var(--text-muted)]">Your scheduled stream is ready. Open OBS and configure the stream settings below.</p>
              </div>
              <button
                onClick={() => setShowOBSPopup(false)}
                className="p-2 hover:bg-[var(--bg-raised)] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-[var(--text-secondary)]" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <h3 className="font-semibold text-[var(--text-primary)] mb-3">Your Stream Key</h3>
                <div className="flex items-center gap-2 mb-3">
                  <code className="flex-1 bg-[var(--bg-base)] p-3 rounded text-sm font-mono text-[var(--text-primary)] break-all">
                    {obsConfig.streamKey}
                  </code>
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(obsConfig.streamKey)}>
                    Copy
                  </Button>
                </div>
                <p className="text-sm text-[var(--text-muted)]">Copy this key into OBS Settings → Stream → Custom Service.</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white">1</div>
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">Open OBS Studio</p>
                    <p className="text-sm text-[var(--text-muted)]">Launch OBS on your computer.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white">2</div>
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">Go to Stream Settings</p>
                    <p className="text-sm text-[var(--text-muted)]">Click Settings → Stream in OBS.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white">3</div>
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">Enter the info below</p>
                    <div className="mt-2 bg-[var(--bg-raised)] rounded-lg p-3 border border-[var(--border-default)] text-sm text-[var(--text-secondary)]">
                      <p><strong>Service:</strong> Custom</p>
                      <p><strong>Server:</strong> {obsConfig.server}</p>
                      <p><strong>Stream Key:</strong> {obsConfig.streamKey}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white">4</div>
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">Start Streaming</p>
                    <p className="text-sm text-[var(--text-muted)]">Click Start Streaming in OBS to go live.</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-[var(--border-default)]">
                <Button
                  className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                  onClick={() => setShowOBSPopup(false)}
                >
                  I&apos;m ready to stream
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => window.open('https://obsproject.com/download', '_blank')}
                >
                  Download OBS
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SchedulePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
      <ScheduleContent />
    </Suspense>
  );
}
