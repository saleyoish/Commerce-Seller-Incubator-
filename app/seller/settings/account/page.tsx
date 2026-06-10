'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { PasswordInput } from '@/components/ui/password-input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { updateAccountAction, deleteAccountAction } from '@/app/actions';
import { useRouter } from 'next/navigation';
import { User, Mail, Phone, AlertTriangle, Trash2, Save, Loader2 } from 'lucide-react';

interface UserData {
  id: string;
  email: string;
  name: string;
  phone: string;
}

export default function AccountSettingsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [accountData, setAccountData] = useState({
    name: '',
    email: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Load user data on mount
  useEffect(() => {
    async function loadUserData() {
      try {
        const response = await fetch('/api/auth/check-user');
        const data = await response.json();
        
        if (data.user) {
          setAccountData(prev => ({
            ...prev,
            name: data.seller?.name || data.user.user_metadata?.full_name || '',
            email: data.user.email || '',
            phone: data.seller?.phone || '',
          }));
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadUserData();
  }, []);

  const handleAccountChange = (field: string, value: string) => {
    setAccountData(prev => ({ ...prev, [field]: value }));
    setMessage(null);
  };

  const handleUpdateAccount = async () => {
    // Validate password match
    if (accountData.newPassword && accountData.newPassword !== accountData.confirmPassword) {
      setMessage({ type: 'error', text: 'New password and confirm password do not match' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const result = await updateAccountAction({
        name: accountData.name,
        email: accountData.email,
        phone: accountData.phone,
        currentPassword: accountData.currentPassword,
        newPassword: accountData.newPassword,
      });

      if (result.success) {
        setMessage({ type: 'success', text: result.message || 'Account updated successfully' });
        // Clear password fields
        setAccountData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        }));
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to update account' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteAccountAction();

      if (result.success) {
        // Redirect to home page after successful deletion
        router.push('/');
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to delete account' });
        setDeleteDialogOpen(false);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An unexpected error occurred' });
      setDeleteDialogOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-[var(--text-primary)]">Account</h1>
          <p className="text-[var(--text-muted)]">Manage your account information</p>
        </div>
        <Card className="card-premium">
          <CardContent className="p-8">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-[var(--bg-raised)] rounded w-1/4"></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="h-10 bg-[var(--bg-raised)] rounded"></div>
                <div className="h-10 bg-[var(--bg-raised)] rounded"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-[var(--text-primary)]">Account</h1>
        <p className="text-[var(--text-muted)]">Manage your account information</p>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-[var(--accent-success)]/10 border border-[var(--accent-success)]/30 text-[var(--accent-success)]' 
            : 'bg-[var(--accent-danger)]/10 border border-[var(--accent-danger)]/30 text-[var(--accent-danger)]'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {/* Account Card */}
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)] flex items-center gap-2">
              <User className="w-5 h-5 text-[var(--accent-primary)]" />
              Account Information
            </CardTitle>
            <CardDescription className="text-[var(--text-muted)]">
              Update your personal information and contact details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Personal Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-[var(--text-primary)]">Full Name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Your full name"
                      value={accountData.name}
                      onChange={(e) => handleAccountChange('name', e.target.value)}
                      className="bg-[var(--bg-input)] border-[var(--border-default)] text-[var(--text-primary)]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-[var(--text-primary)] flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={accountData.email}
                      onChange={(e) => handleAccountChange('email', e.target.value)}
                      className="bg-[var(--bg-input)] border-[var(--border-default)] text-[var(--text-primary)]"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="phone" className="text-[var(--text-primary)] flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={accountData.phone}
                      onChange={(e) => handleAccountChange('phone', e.target.value)}
                      className="bg-[var(--bg-input)] border-[var(--border-default)] text-[var(--text-primary)]"
                    />
                  </div>
                </div>
              </div>

              <Separator className="bg-[var(--border-default)]" />

              {/* Password Change */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-[var(--text-primary)]">Change Password</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="currentPassword" className="text-[var(--text-primary)]">Current Password</Label>
                    <PasswordInput
                      id="currentPassword"
                      placeholder="Enter current password"
                      value={accountData.currentPassword}
                      onChange={(e) => handleAccountChange('currentPassword', e.target.value)}
                      className="bg-[var(--bg-input)] border-[var(--border-default)] text-[var(--text-primary)]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-[var(--text-primary)]">New Password</Label>
                    <PasswordInput
                      id="newPassword"
                      placeholder="Enter new password"
                      value={accountData.newPassword}
                      onChange={(e) => handleAccountChange('newPassword', e.target.value)}
                      className="bg-[var(--bg-input)] border-[var(--border-default)] text-[var(--text-primary)]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-[var(--text-primary)]">Confirm Password</Label>
                    <PasswordInput
                      id="confirmPassword"
                      placeholder="Confirm new password"
                      value={accountData.confirmPassword}
                      onChange={(e) => handleAccountChange('confirmPassword', e.target.value)}
                      className="bg-[var(--bg-input)] border-[var(--border-default)] text-[var(--text-primary)]"
                    />
                  </div>
                </div>
              </div>

              {/* Update Button */}
              <div className="flex justify-end">
                <Button
                  onClick={handleUpdateAccount}
                  disabled={isSaving}
                  className="btn-primary"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Update Account
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone Card */}
        <Card className="card-premium border-[var(--accent-danger)]/30">
          <CardHeader>
            <CardTitle className="text-[var(--accent-danger)] flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Danger Zone
            </CardTitle>
            <CardDescription className="text-[var(--text-muted)]">
              Irreversible and destructive actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 border border-[var(--accent-danger)]/30 rounded-lg bg-[var(--accent-danger)]/5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-[var(--text-primary)]">Delete Account</p>
                  <p className="text-sm text-[var(--text-muted)]">
                    This action cannot be undone. All your data will be permanently removed.
                  </p>
                </div>
                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <DialogTrigger
                    render={
                      <Button
                        variant="outline"
                        className="border-[var(--accent-danger)] text-[var(--accent-danger)] hover:bg-[var(--accent-danger)] hover:text-white"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Account
                      </Button>
                    }
                  />
                  <DialogContent className="bg-[var(--bg-card)] border-[var(--border-default)]">
                    <DialogHeader>
                      <DialogTitle className="text-[var(--text-primary)] flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-[var(--accent-danger)]" />
                        Are you absolutely sure?
                      </DialogTitle>
                      <DialogDescription className="text-[var(--text-muted)]">
                        This action cannot be undone. This will permanently delete your account
                        and remove all your data from our servers.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setDeleteDialogOpen(false)}
                        disabled={isDeleting}
                        className="border-[var(--border-default)] text-[var(--text-primary)]"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleDeleteAccount}
                        disabled={isDeleting}
                        className="bg-[var(--accent-danger)] text-white hover:bg-[var(--accent-danger)]/90"
                      >
                        {isDeleting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          'Yes, Delete My Account'
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
