'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { DataManagement } from '@/components/settings/data-management';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect, type FormEvent } from 'react';
import { updateProfile, updateEmail, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState(''); // For re-authentication
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleProfileUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsProfileLoading(true);
    try {
      await updateProfile(user, { displayName });
      toast({ title: 'Profile Updated', description: 'Your display name has been updated.' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsProfileLoading(false);
    }
  };

  const handleEmailUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !user.email) return;
    
    if (!currentPassword) {
        toast({ title: 'Authentication Required', description: 'Please enter your current password to change email.', variant: 'destructive' });
        return;
    }
    setIsEmailLoading(true);

    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updateEmail(user, email);
      toast({ title: 'Email Updated', description: 'Your email address has been updated. Please verify your new email if prompted.' });
      setCurrentPassword(''); // Clear password field
    } catch (error: any) {
      toast({ title: 'Error Updating Email', description: error.message, variant: 'destructive' });
      console.error("Email update error:", error);
    } finally {
      setIsEmailLoading(false);
    }
  };
  
  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return names[0][0].toUpperCase();
  };


  if (!user) {
    return <AppLayout><div>Loading user settings...</div></AppLayout>; 
  }

  return (
    <AppLayout>
      <div className="space-y-8 max-w-2xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-2xl md:text-3xl">Account Settings</CardTitle>
            <CardDescription>Manage your profile and account details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                 <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
                 <AvatarFallback className="text-2xl">{getInitials(user.displayName)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xl font-semibold">{user.displayName || 'Anonymous User'}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
            
            <Separator />

            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div>
                <Label htmlFor="displayName">Display Name</Label>
                <Input 
                  id="displayName" 
                  value={displayName} 
                  onChange={(e) => setDisplayName(e.target.value)} 
                  className="mt-1"
                  disabled={isProfileLoading}
                />
              </div>
              <Button type="submit" disabled={isProfileLoading || displayName === user.displayName}>
                {isProfileLoading ? 'Saving...' : 'Save Name'}
              </Button>
            </form>

            <Separator />
            
            <form onSubmit={handleEmailUpdate} className="space-y-4">
              <CardTitle className="text-lg font-headline pt-2">Change Email</CardTitle>
              <div>
                <Label htmlFor="email">New Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="mt-1"
                  disabled={isEmailLoading}
                />
              </div>
               <div>
                <Label htmlFor="currentPassword">Current Password (required to change email)</Label>
                <Input 
                  id="currentPassword" 
                  type="password" 
                  value={currentPassword} 
                  onChange={(e) => setCurrentPassword(e.target.value)} 
                  className="mt-1"
                  placeholder="Enter your current password"
                  disabled={isEmailLoading}
                />
              </div>
              <Button type="submit" disabled={isEmailLoading || email === user.email}>
                {isEmailLoading ? 'Updating...' : 'Update Email'}
              </Button>
            </form>

          </CardContent>
        </Card>

        <DataManagement />
      </div>
    </AppLayout>
  );
}
