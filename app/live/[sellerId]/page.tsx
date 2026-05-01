'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClientSideSupabase, type Product, type Seller, type StreamSession, type PlatformConnection } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
// Note: Using button-based selector instead of Tabs component
import { 
  Video, 
  ShoppingCart, 
  Calendar, 
  ExternalLink, 
  Radio, 
  Clock,
  AlertCircle,
  ChevronRight,
  Play,
  MonitorPlay,
  Smartphone
} from 'lucide-react';

// Platform icon components (lucide-react doesn't have these)
function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import posthog from 'posthog-js';

export default function LiveShowPage() {
  const params = useParams();
  const sellerId = params.sellerId as string;

  const [seller, setSeller] = useState<Seller | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  
  // Stream data
  const [activeStreams, setActiveStreams] = useState<StreamSession[]>([]);
  const [upcomingShows, setUpcomingShows] = useState<StreamSession[]>([]);
  const [platformConnections, setPlatformConnections] = useState<PlatformConnection[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    loadData();
  }, [sellerId]);

  const loadData = async () => {
    try {
      const supabase = createClientSideSupabase();

      // Get seller info
      const { data: sellerData } = await supabase
        .from('sellers')
        .select('*')
        .eq('id', sellerId)
        .single();

      if (!sellerData || sellerData.approval_status !== 'approved') {
        setError('This seller page is not available');
        return;
      }

      setSeller(sellerData);

      // Get active products
      const { data: productsData } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', sellerId)
        .eq('status', 'active')
        .gt('stock_quantity', 0)
        .order('created_at', { ascending: false });

      setProducts(productsData || []);

      // Get active streams
      const now = new Date().toISOString();
      const { data: streamsData } = await supabase
        .from('stream_sessions')
        .select('*')
        .eq('seller_id', sellerId)
        .or(`status.eq.live,and(status.eq.scheduled,scheduled_start.lte.${now},actual_end.is.null)`)
        .order('actual_start', { ascending: false });

      const active = streamsData?.filter(s => s.status === 'live') || [];
      const upcoming = streamsData?.filter(s => s.status === 'scheduled') || [];
      
      setActiveStreams(active);
      setUpcomingShows(upcoming);
      setIsLive(active.length > 0);

      // Get platform connections for embed URLs
      const { data: connectionsData } = await supabase
        .from('platform_connections')
        .select('*')
        .eq('seller_id', sellerId)
        .eq('status', 'connected');

      setPlatformConnections(connectionsData || []);
    } catch (error) {
      console.error('Error loading live show:', error);
      setError('Failed to load seller page');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuyNow = async () => {
    if (!selectedProduct) return;

    setCheckoutLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct.id,
          quantity,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      posthog.capture('checkout_initiated', {
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        product_price: selectedProduct.price,
        quantity,
        total: selectedProduct.price * quantity,
        seller_id: sellerId,
      });

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err: any) {
      posthog.captureException(err);
      setError(err.message || 'Failed to initiate checkout');
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Get embed URL for a platform
  const getPlatformEmbedUrl = (platform: string) => {
    const connection = platformConnections.find(c => c.platform === platform);
    if (!connection) return null;
    
    // Return platform-specific embed URLs
    switch (platform) {
      case 'youtube':
        // YouTube embed: https://www.youtube.com/embed/LIVE_STREAM_ID
        return connection.metadata?.embedUrl || connection.metadata?.channelUrl?.replace('youtube.com/@', 'youtube.com/embed/live_stream?channel=');
      case 'facebook':
        // Facebook Video embed
        return connection.metadata?.embedUrl || `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(connection.metadata?.pageUrl || '')}&show_text=false`;
      default:
        return null;
    }
  };

  // Check if platform supports embedding
  const supportsEmbed = (platform: string) => {
    return ['youtube', 'facebook'].includes(platform);
  };

  // Get platform icon
  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'youtube': return <YoutubeIcon className="w-4 h-4" />;
      case 'facebook': return <FacebookIcon className="w-4 h-4" />;
      case 'tiktok': return <Smartphone className="w-4 h-4" />;
      case 'whatnot': return <MonitorPlay className="w-4 h-4" />;
      case 'instagram': return <Smartphone className="w-4 h-4" />;
      default: return <Radio className="w-4 h-4" />;
    }
  };

  // Get platform external link
  const getPlatformLink = (platform: string) => {
    const connection = platformConnections.find(c => c.platform === platform);
    if (!connection) return '#';
    
    switch (platform) {
      case 'youtube':
        return connection.metadata?.channelUrl || `https://youtube.com/@${connection.platform_username}`;
      case 'facebook':
        return connection.metadata?.pageUrl || `https://facebook.com/${connection.platform_username}`;
      case 'tiktok':
        return `https://tiktok.com/@${connection.platform_username}`;
      case 'whatnot':
        return `https://www.whatnot.com/user/${connection.platform_username}`;
      case 'instagram':
        return `https://instagram.com/${connection.platform_username}`;
      default:
        return '#';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Stream Section with Multi-Platform Support */}
      <div className="bg-black">
        {isLive ? (
          <div className="max-w-7xl mx-auto">
            {/* Platform Selector */}
            {activeStreams.length > 0 && activeStreams[0].platforms.length > 1 && (
              <div className="bg-gray-900 border-b border-gray-800 px-4 py-2">
                <div className="flex gap-2 overflow-x-auto">
                  <button
                    onClick={() => setSelectedPlatform('all')}
                    className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedPlatform === 'all' 
                        ? 'bg-gray-800 text-white' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                    }`}
                  >
                    <Radio className="w-4 h-4 mr-2" />
                    All Platforms
                  </button>
                  {activeStreams[0].platforms.map((platform) => (
                    <button
                      key={platform}
                      onClick={() => setSelectedPlatform(platform)}
                      className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                        selectedPlatform === platform 
                          ? 'bg-gray-800 text-white' 
                          : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                      }`}
                    >
                      {getPlatformIcon(platform)}
                      <span className="ml-2">{platform}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Stream Player Area */}
            <div className="aspect-video relative bg-black">
              {selectedPlatform === 'all' ? (
                // Show primary stream or grid
                <div className="w-full h-full flex items-center justify-center">
                  {activeStreams[0]?.platforms[0] && supportsEmbed(activeStreams[0].platforms[0]) ? (
                    <iframe
                      src={getPlatformEmbedUrl(activeStreams[0].platforms[0]) || ''}
                      className="w-full h-full"
                      allowFullScreen
                      allow="autoplay; fullscreen"
                      title={`Live Stream - ${activeStreams[0].platforms[0]}`}
                    />
                  ) : (
                    <div className="text-center text-white p-8">
                      <Radio className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <h2 className="text-xl font-semibold mb-2">Live on {activeStreams[0]?.platforms.join(', ')}</h2>
                      <p className="text-sm opacity-75 mb-4">This stream is available on external platforms</p>
                      <div className="flex gap-3 justify-center flex-wrap">
                        {activeStreams[0]?.platforms.map((platform) => (
                          <a
                            key={platform}
                            href={getPlatformLink(platform)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            {getPlatformIcon(platform)}
                            <span className="ml-2 capitalize">Watch on {platform}</span>
                            <ExternalLink className="w-3 h-3 ml-2" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // Single platform view
                <div className="w-full h-full">
                  {supportsEmbed(selectedPlatform) ? (
                    <iframe
                      src={getPlatformEmbedUrl(selectedPlatform) || ''}
                      className="w-full h-full"
                      allowFullScreen
                      allow="autoplay; fullscreen"
                      title={`Live Stream - ${selectedPlatform}`}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white">
                      <div className="text-center p-8">
                        {getPlatformIcon(selectedPlatform)}
                        <h2 className="text-xl font-semibold mt-4 mb-2 capitalize">{selectedPlatform} Live</h2>
                        <p className="text-sm opacity-75 mb-4">This platform requires the mobile app or external viewer</p>
                        <a
                          href={getPlatformLink(selectedPlatform)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Open {selectedPlatform}
                          <ExternalLink className="w-3 h-3 ml-2" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Live Badge */}
              <div className="absolute top-4 left-4">
                <Badge className="bg-red-600 text-white px-3 py-1">
                  <span className="animate-pulse mr-2">●</span> LIVE
                </Badge>
              </div>
            </div>
          </div>
        ) : (
          // Offline State
          <div className="max-w-7xl mx-auto aspect-video relative bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
            <div className="text-center text-white p-8">
              <Video className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h2 className="text-2xl font-semibold mb-2">Not Currently Live</h2>
              <p className="text-gray-400 mb-6">Check the schedule below for upcoming shows</p>
              
              {/* Upcoming Shows Preview */}
              {upcomingShows.length > 0 && (
                <div className="bg-gray-800 rounded-lg p-4 max-w-md mx-auto">
                  <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    Next Show
                  </h3>
                  <div className="text-left">
                    <p className="font-semibold">{upcomingShows[0].title}</p>
                    <p className="text-sm text-gray-400">
                      {new Date(upcomingShows[0].scheduled_start || '').toLocaleString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </p>
                    <div className="flex gap-2 mt-2">
                      {upcomingShows[0].platforms.map(p => (
                        <Badge key={p} variant="outline" className="text-xs border-gray-600 text-gray-400 capitalize">
                          {p}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Seller Info & Schedule */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{seller?.email}&apos;s Live Shop</h1>
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>
              {isLive 
                ? `Currently live on ${activeStreams[0]?.platforms.join(', ')}` 
                : upcomingShows.length > 0
                  ? `Next show: ${new Date(upcomingShows[0].scheduled_start || '').toLocaleString()}`
                  : 'No upcoming shows scheduled'}
            </span>
          </div>
          
          {/* Connected Platforms */}
          {platformConnections.length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {platformConnections.map((conn) => (
                <a
                  key={conn.platform}
                  href={getPlatformLink(conn.platform)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-sm transition-colors"
                >
                  {getPlatformIcon(conn.platform)}
                  <span className="ml-2 capitalize">{conn.platform}</span>
                  <ExternalLink className="w-3 h-3 ml-1 text-gray-400" />
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Shows Section */}
        {upcomingShows.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Upcoming Shows
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingShows.slice(0, 3).map((show) => (
                <Card key={show.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{show.title}</CardTitle>
                    <CardDescription>
                      {new Date(show.scheduled_start || '').toLocaleString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 flex-wrap">
                      {show.platforms.map((platform) => (
                        <Badge key={platform} variant="outline" className="capitalize text-xs">
                          {getPlatformIcon(platform)}
                          <span className="ml-1">{platform}</span>
                        </Badge>
                      ))}
                    </div>
                    {show.description && (
                      <p className="text-sm text-gray-600 mt-3 line-clamp-2">{show.description}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Products Grid */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Available Products</h2>
          
          {products.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ShoppingCart className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">No products available at the moment</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <Card key={product.id} className="overflow-hidden">
                  {/* Product Image */}
                  <div className="aspect-square relative bg-gray-100">
                    {product.images && product.images.length > 0 ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingCart className="h-12 w-12 text-gray-300" />
                      </div>
                    )}
                    
                    {/* Stock Badge */}
                    {product.stock_quantity <= 5 && product.stock_quantity > 0 && (
                      <Badge className="absolute top-2 right-2 bg-orange-500">
                        Only {product.stock_quantity} left!
                      </Badge>
                    )}
                  </div>

                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{product.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {product.description || 'No description'}
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-2xl font-bold">${product.price.toFixed(2)}</span>
                      <Badge variant="outline">{product.category}</Badge>
                    </div>

                    <Dialog>
                      <DialogTrigger
                        render={
                          <Button 
                            className="w-full" 
                            disabled={product.stock_quantity === 0}
                            onClick={() => setSelectedProduct(product)}
                          >
                            {product.stock_quantity === 0 ? 'Out of Stock' : 'Buy Now'}
                          </Button>
                        }
                      />

                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Purchase {product.name}</DialogTitle>
                          <DialogDescription>
                            Complete your purchase securely via Stripe
                          </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                          {product.images && product.images.length > 0 && (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="w-full h-48 object-cover rounded"
                            />
                          )}

                          <div className="flex justify-between items-center">
                            <span className="font-semibold">Price:</span>
                            <span className="text-xl font-bold">${product.price.toFixed(2)}</span>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="quantity">Quantity</Label>
                            <Input
                              id="quantity"
                              type="number"
                              min={1}
                              max={product.stock_quantity}
                              value={quantity}
                              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                            />
                            <p className="text-sm text-gray-500">
                              {product.stock_quantity} available
                            </p>
                          </div>

                          <div className="border-t pt-4">
                            <div className="flex justify-between items-center text-lg font-bold">
                              <span>Total:</span>
                              <span>${(product.price * quantity).toFixed(2)}</span>
                            </div>
                          </div>

                          {error && (
                            <Alert variant="destructive">
                              <AlertDescription>{error}</AlertDescription>
                            </Alert>
                          )}

                          <Button 
                            className="w-full" 
                            size="lg"
                            onClick={handleBuyNow}
                            disabled={checkoutLoading}
                          >
                            {checkoutLoading ? 'Processing...' : 'Proceed to Checkout'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
