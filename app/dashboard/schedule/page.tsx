'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientSideSupabase, type StreamSession, type Seller, type Product } from '@/lib/supabase-client';
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
  Edit,
  Trash2,
  Copy
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
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

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

  const loadData = async () => {
    try {
      const supabase = createClientSideSupabase();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: sellerData } = await supabase
        .from('sellers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!sellerData) {
        router.push('/signup');
        return;
      }

      setSeller(sellerData);

      // Get products
      const { data: productsData } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', sellerData.id)
        .eq('status', 'active');

      setProducts(productsData || []);

      // Get scheduled shows
      const { data: showsData } = await supabase
        .from('stream_sessions')
        .select('*')
        .eq('seller_id', sellerData.id)
        .in('status', ['scheduled', 'live'])
        .order('scheduled_start', { ascending: true });

      setScheduledShows(showsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadShowToDuplicate = async (id: string) => {
    try {
      const supabase = createClientSideSupabase();
      const { data: show } = await supabase
        .from('stream_sessions')
        .select('*')
        .eq('id', id)
        .single();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seller) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = createClientSideSupabase();

      // Combine date and time
      const scheduledStart = new Date(`${formData.date}T${formData.time}`);
      
      if (scheduledStart < new Date()) {
        throw new Error('Scheduled time must be in the future');
      }

      const { error: submitError } = await supabase
        .from('stream_sessions')
        .insert({
          seller_id: seller.id,
          title: formData.title,
          description: formData.description,
          scheduled_start: scheduledStart.toISOString(),
          status: 'scheduled',
          platforms: formData.platforms,
          products_featured: formData.selectedProducts,
        });

      if (submitError) throw submitError;

      // Reset form and reload
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
      const supabase = createClientSideSupabase();
      const { error } = await supabase
        .from('stream_sessions')
        .update({ status: 'cancelled' })
        .eq('id', showId);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error cancelling show:', error);
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
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Schedule Shows</h1>
        <p className="text-gray-600">Plan and manage your upcoming live streams</p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Schedule New Show Button */}
      <div className="mb-6">
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? (
            <>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Schedule New Show
            </>
          )}
        </Button>
      </div>

      {/* Schedule Form */}
      {showForm && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Schedule New Live Show</CardTitle>
            <CardDescription>Plan your upcoming stream</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Show Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Weekend Collectibles Auction"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time">Time *</Label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Duration *</Label>
                  <select
                    id="duration"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  >
                    {DURATION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Platforms *</Label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((platform) => (
                    <button
                      key={platform.id}
                      type="button"
                      onClick={() => togglePlatform(platform.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        formData.platforms.includes(platform.id)
                          ? platform.color
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                <Label>Products to Feature</Label>
                <div className="max-h-40 overflow-y-auto border rounded-lg p-3 space-y-2">
                  {products.length === 0 ? (
                    <p className="text-sm text-gray-500">No active products. Add products first.</p>
                  ) : (
                    products.map((product) => (
                      <label
                        key={product.id}
                        className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.selectedProducts.includes(product.id)}
                          onChange={() => toggleProduct(product.id)}
                          className="rounded"
                        />
                        <span className="font-medium">{product.name}</span>
                        <span className="text-sm text-gray-500">${product.price}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="What's this show about? What will you be selling?"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={isSubmitting || formData.platforms.length === 0}>
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
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Calendar View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                  const newDate = new Date(currentMonth);
                  newDate.setMonth(newDate.getMonth() - 1);
                  setCurrentMonth(newDate);
                }}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>
                  Today
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  const newDate = new Date(currentMonth);
                  newDate.setMonth(newDate.getMonth() + 1);
                  setCurrentMonth(newDate);
                }}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {getDaysInMonth().map((day, index) => {
                if (day === null) {
                  return <div key={`empty-${index}`} className="h-24 bg-gray-50 rounded-lg" />;
                }

                const shows = getShowsForDate(day);
                const isToday = new Date().toDateString() === 
                  new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).toDateString();

                return (
                  <div
                    key={day}
                    className={`h-24 border rounded-lg p-2 ${
                      isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-600' : ''}`}>
                      {day}
                    </div>
                    <div className="space-y-1">
                      {shows.slice(0, 2).map((show) => (
                        <div
                          key={show.id}
                          className="text-xs bg-blue-100 text-blue-700 px-1 py-0.5 rounded truncate cursor-pointer"
                          title={show.title}
                        >
                          {new Date(show.scheduled_start || '').toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </div>
                      ))}
                      {shows.length > 2 && (
                        <div className="text-xs text-gray-500">+{shows.length - 2} more</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Shows List */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Shows</CardTitle>
            <CardDescription>
              {scheduledShows.filter(s => s.status === 'scheduled').length} scheduled
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {scheduledShows.filter(s => s.status === 'scheduled').length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Video className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No upcoming shows</p>
                </div>
              ) : (
                scheduledShows
                  .filter(s => s.status === 'scheduled')
                  .map((show) => (
                    <div key={show.id} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{show.title}</p>
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(show.scheduled_start || '')}
                          </p>
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {show.platforms.map((p) => (
                              <Badge key={p} variant="outline" className="text-xs capitalize">
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
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600"
                            onClick={() => cancelShow(show.id)}
                          >
                            <Trash2 className="w-3 h-3" />
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
  );
}

export default function SchedulePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
      <ScheduleContent />
    </Suspense>
  );
}
