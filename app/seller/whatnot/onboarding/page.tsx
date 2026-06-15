'use client';

import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/auth';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  CheckCircle, 
  Clock, 
  XCircle,
  Store,
  User,
  Mail,
  Phone,
  MapPin
} from 'lucide-react';

export default function WhatnotOnboardingPage() {
  const router = useRouter();
  const [seller, setSeller] = useState<any>(null);
  const [sellerStatus, setSellerStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    accessToken: '',
    displayName: '',
    email: '',
    phone: '',
    businessAddress: '',
  });

  useEffect(() => {
    if (loading) return;
    if (!user || !user.isSeller) {
      router.push('/login');
      return;
    }
    loadData();
  }, [loading, user]);

  const loadData = async () => {
    try {
      const response = await authFetch('/api/auth/me');
      if (!response.ok) {
        router.push('/login');
        return;
      }
      const data = await response.json();
      const isSeller = data.isSeller || false;
      const sellerData = data.seller || null;
      
      if (!isSeller) {
        router.push('/login');
        return;
      }

      setSeller(sellerData);

      // Check Whatnot seller status
      const response = await fetch('/api/whatnot/seller-register');
      const data = await response.json();
      
      if (response.ok) {
        setSellerStatus(data);
        
        // Pre-fill form if already registered
        if (data.status !== 'not_registered') {
          setFormData({
            accessToken: '',
            displayName: data.displayName || '',
            email: data.email || '',
            phone: '',
            businessAddress: '',
          });
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/whatnot/seller-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setSuccess('Whatnot seller registration submitted successfully!');
      await loadData();
    } catch (error: any) {
      console.error('Registration error:', error);
      setError(error.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = () => {
    if (!sellerStatus) return null;

    switch (sellerStatus.status) {
      case 'approved':
        return (
          <Badge className="bg-green-500 text-white">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-500 text-white">
            <Clock className="w-3 h-3 mr-1" />
            Pending Review
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-500 text-white">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-500 text-white">
            Not Registered
          </Badge>
        );
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Whatnot Seller Onboarding</h1>
          <p className="text-[var(--text-muted)] mt-1">Register as a Whatnot seller</p>
        </div>
        {getStatusBadge()}
      </div>

      {error && (
        <Alert className="bg-red-500/10 border-red-500 text-red-500">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-500/10 border-green-500 text-green-500">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Already Registered */}
      {sellerStatus?.status && sellerStatus.status !== 'not_registered' && (
        <Card className="card-premium border-2 border-[var(--accent-secondary)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)] flex items-center gap-2">
              <Store className="w-5 h-5 text-[var(--accent-secondary)]" />
              Registration Status
            </CardTitle>
            <CardDescription className="text-[var(--text-muted)]">
              Your Whatnot seller registration is {sellerStatus.status}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Store className="w-4 h-4 text-[var(--text-muted)]" />
                <div>
                  <p className="text-sm text-[var(--text-muted)]">Display Name</p>
                  <p className="font-medium text-[var(--text-primary)]">
                    {sellerStatus.displayName}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-[var(--text-muted)]" />
                <div>
                  <p className="text-sm text-[var(--text-muted)]">Email</p>
                  <p className="font-medium text-[var(--text-primary)]">
                    {sellerStatus.email}
                  </p>
                </div>
              </div>
              {sellerStatus.status === 'pending' && (
                <Alert className="bg-yellow-500/10 border-yellow-500 text-yellow-500">
                  <Clock className="w-4 h-4" />
                  <AlertDescription>
                    Your application is under review. This typically takes 1-3 business days.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Registration Form */}
      {(!sellerStatus?.status || sellerStatus.status === 'not_registered') && (
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">Connect Whatnot Seller Account</CardTitle>
            <CardDescription className="text-[var(--text-muted)]">
              Connect your Whatnot account using platform authorization and sync products only.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Access Token */}
              <div className="space-y-2">
                <Label htmlFor="accessToken" className="text-[var(--text-secondary)]">
                  Whatnot Access Token *
                </Label>
                <Input
                  id="accessToken"
                  placeholder="Enter your Whatnot access token"
                  value={formData.accessToken}
                  onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                  className="input-premium"
                  required
                />
                <p className="text-xs text-[var(--text-muted)]">
                  Provide your Whatnot API token or platform authorization token to connect.
                </p>
              </div>

              {/* Display Name */}
              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-[var(--text-secondary)]">
                  Display Name *
                </Label>
                <Input
                  id="displayName"
                  placeholder="Your Store Name"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="input-premium"
                  required
                />
                <p className="text-xs text-[var(--text-muted)]">
                  The name that will be shown to buyers
                </p>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[var(--text-secondary)]">
                  Whatnot Account Email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input-premium"
                  required
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-[var(--text-secondary)]">
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input-premium"
                />
                <p className="text-xs text-[var(--text-muted)]">
                  Optional but recommended for verification
                </p>
              </div>

              {/* Business Address */}
              <div className="space-y-2">
                <Label htmlFor="businessAddress" className="text-[var(--text-secondary)]">
                  Business Address
                </Label>
                <Textarea
                  id="businessAddress"
                  placeholder="123 Main St, City, State ZIP"
                  value={formData.businessAddress}
                  onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
                  rows={3}
                  className="input-premium"
                />
                <p className="text-xs text-[var(--text-muted)]">
                  Required for shipping and tax purposes
                </p>
              </div>

              {/* Submit */}
              <div className="flex gap-3">
                <Button
                  type="submit"
                  className="btn-primary"
                  disabled={
                    isSubmitting ||
                    !formData.accessToken ||
                    !formData.displayName ||
                    !formData.email
                  }
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Submit Registration
                    </>
                  )}
                </Button>
              </div>

              {/* Info */}
              <Alert className="bg-blue-500/10 border-blue-500 text-blue-500">
                <MapPin className="w-4 h-4" />
                <AlertDescription>
                  After submission, your application will be reviewed by Whatnot. 
                  This typically takes 1-3 business days. You'll receive a notification once approved.
                </AlertDescription>
              </Alert>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
