'use client';

import { useEffect, useState } from 'react';
import { createClientSideSupabase } from '@/lib/supabase-client';
import { checkUserStatus } from '@/lib/auth';
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
  FileText,
  MapPin,
  Building2
} from 'lucide-react';

export default function TikTokAffiliatePage() {
  const router = useRouter();
  const [seller, setSeller] = useState<any>(null);
  const [affiliateStatus, setAffiliateStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    businessType: 'individual',
    businessName: '',
    taxId: '',
    businessAddress: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { isSeller, seller: sellerData } = await checkUserStatus();
      
      if (!isSeller) {
        router.push('/login');
        return;
      }

      setSeller(sellerData);

      // Check affiliate status
      const response = await fetch('/api/tiktok/affiliate-register');
      const data = await response.json();
      
      if (response.ok) {
        setAffiliateStatus(data);
        
        // Pre-fill form if already registered
        if (data.status !== 'not_registered') {
          setFormData({
            businessType: data.businessType || 'individual',
            businessName: data.businessName || '',
            taxId: '',
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
      const response = await fetch('/api/tiktok/affiliate-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setSuccess('Affiliate registration submitted successfully!');
      await loadData();
    } catch (error: any) {
      console.error('Registration error:', error);
      setError(error.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = () => {
    if (!affiliateStatus) return null;

    switch (affiliateStatus.status) {
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
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">TikTok Shop Affiliate</h1>
          <p className="text-[var(--text-muted)] mt-1">Register as a TikTok Shop affiliate seller</p>
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
      {affiliateStatus?.status && affiliateStatus.status !== 'not_registered' && (
        <Card className="card-premium border-2 border-[var(--accent-secondary)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)] flex items-center gap-2">
              <Store className="w-5 h-5 text-[var(--accent-secondary)]" />
              Registration Status
            </CardTitle>
            <CardDescription className="text-[var(--text-muted)]">
              Your TikTok Shop affiliate registration is {affiliateStatus.status}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Building2 className="w-4 h-4 text-[var(--text-muted)]" />
                <div>
                  <p className="text-sm text-[var(--text-muted)]">Business Type</p>
                  <p className="font-medium text-[var(--text-primary)] capitalize">
                    {affiliateStatus.businessType}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Store className="w-4 h-4 text-[var(--text-muted)]" />
                <div>
                  <p className="text-sm text-[var(--text-muted)]">Business Name</p>
                  <p className="font-medium text-[var(--text-primary)]">
                    {affiliateStatus.businessName}
                  </p>
                </div>
              </div>
              {affiliateStatus.status === 'pending' && (
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
      {(!affiliateStatus?.status || affiliateStatus.status === 'not_registered') && (
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">Register as Affiliate</CardTitle>
            <CardDescription className="text-[var(--text-muted)]">
              Complete your TikTok Shop affiliate registration to start selling
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Business Type */}
              <div className="space-y-2">
                <Label className="text-[var(--text-secondary)]">Business Type *</Label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, businessType: 'individual' })}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      formData.businessType === 'individual'
                        ? 'border-[var(--accent-primary)] bg-[rgba(124,58,237,0.1)]'
                        : 'border-[var(--border-default)] hover:border-[var(--accent-primary)]'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-5 h-5 text-[var(--accent-primary)]" />
                      <span className="font-medium text-[var(--text-primary)]">Individual</span>
                    </div>
                    <p className="text-sm text-[var(--text-muted)]">
                      Selling as an individual person
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, businessType: 'llc' })}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      formData.businessType === 'llc'
                        ? 'border-[var(--accent-primary)] bg-[rgba(124,58,237,0.1)]'
                        : 'border-[var(--border-default)] hover:border-[var(--accent-primary)]'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="w-5 h-5 text-[var(--accent-primary)]" />
                      <span className="font-medium text-[var(--text-primary)]">LLC / Company</span>
                    </div>
                    <p className="text-sm text-[var(--text-muted)]">
                      Selling as a registered business
                    </p>
                  </button>
                </div>
              </div>

              {/* Business Name */}
              <div className="space-y-2">
                <Label htmlFor="businessName" className="text-[var(--text-secondary)]">
                  {formData.businessType === 'individual' ? 'Full Legal Name' : 'Business Name'} *
                </Label>
                <Input
                  id="businessName"
                  placeholder={formData.businessType === 'individual' ? 'John Doe' : 'My Company LLC'}
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  className="input-premium"
                  required
                />
              </div>

              {/* Tax ID (Optional for individuals) */}
              {formData.businessType === 'llc' && (
                <div className="space-y-2">
                  <Label htmlFor="taxId" className="text-[var(--text-secondary)]">EIN / Tax ID</Label>
                  <Input
                    id="taxId"
                    placeholder="12-3456789"
                    value={formData.taxId}
                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                    className="input-premium"
                  />
                  <p className="text-xs text-[var(--text-muted)]">
                    Required for LLC/Company registrations
                  </p>
                </div>
              )}

              {/* Business Address */}
              <div className="space-y-2">
                <Label htmlFor="businessAddress" className="text-[var(--text-secondary)]">Business Address</Label>
                <Textarea
                  id="businessAddress"
                  placeholder="123 Main St, City, State ZIP"
                  value={formData.businessAddress}
                  onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
                  rows={3}
                  className="input-premium"
                />
              </div>

              {/* Submit */}
              <div className="flex gap-3">
                <Button
                  type="submit"
                  className="btn-primary"
                  disabled={isSubmitting || !formData.businessName}
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
                  After submission, your application will be reviewed by TikTok Shop. 
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
