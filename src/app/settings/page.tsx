
'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { DataManagement } from '@/components/settings/data-management';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect, type FormEvent } from 'react';
import { updateProfile, updateEmail, reauthenticateWithCredential, EmailAuthProvider, updatePassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPasswordForEmailChange, setCurrentPasswordForEmailChange] = useState(''); // For email re-auth
  const [currentPasswordForPasswordChange, setCurrentPasswordForPasswordChange] = useState(''); // For password change re-auth
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

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
    
    if (!currentPasswordForEmailChange) {
        toast({ title: 'Authentication Required', description: 'Please enter your current password to change email.', variant: 'destructive' });
        return;
    }
    setIsEmailLoading(true);

    try {
      const credential = EmailAuthProvider.credential(user.email, currentPasswordForEmailChange);
      await reauthenticateWithCredential(user, credential);
      await updateEmail(user, email);
      toast({ title: 'Email Updated', description: 'Your email address has been updated. Please verify your new email if prompted.' });
      setCurrentPasswordForEmailChange(''); // Clear password field
    } catch (error: any) {
      toast({ title: 'Error Updating Email', description: error.message, variant: 'destructive' });
      console.error("Email update error:", error);
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !user.email) return;

    if (newPassword !== confirmNewPassword) {
      toast({ title: 'Error', description: 'New passwords do not match.', variant: 'destructive' });
      return;
    }
    if (!newPassword) {
      toast({ title: 'Error', description: 'New password cannot be empty.', variant: 'destructive' });
      return;
    }
     if (!currentPasswordForPasswordChange) {
      toast({ title: 'Authentication Required', description: 'Please enter your current password to change your password.', variant: 'destructive' });
      return;
    }

    setIsPasswordLoading(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPasswordForPasswordChange);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      toast({ title: 'Password Updated', description: 'Your password has been successfully changed.' });
      setCurrentPasswordForPasswordChange('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error: any)
     {
      let errorMessage = 'Failed to update password.';
      if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect current password. Please try again.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'The new password is too weak. Please choose a stronger password.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      toast({ title: 'Error Changing Password', description: errorMessage, variant: 'destructive' });
      console.error("Password change error:", error);
    } finally {
      setIsPasswordLoading(false);
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
                <Label htmlFor="currentPasswordForEmailChange">Current Password (required to change email)</Label>
                <Input 
                  id="currentPasswordForEmailChange" 
                  type="password" 
                  value={currentPasswordForEmailChange} 
                  onChange={(e) => setCurrentPasswordForEmailChange(e.target.value)} 
                  className="mt-1"
                  placeholder="Enter your current password"
                  disabled={isEmailLoading}
                />
              </div>
              <Button type="submit" disabled={isEmailLoading || email === user.email || !currentPasswordForEmailChange}>
                {isEmailLoading ? 'Updating...' : 'Update Email'}
              </Button>
            </form>

            <Separator />

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <CardTitle className="text-lg font-headline pt-2">Change Password</CardTitle>
              <div>
                <Label htmlFor="currentPasswordForPasswordChange">Current Password</Label>
                <Input
                  id="currentPasswordForPasswordChange"
                  type="password"
                  value={currentPasswordForPasswordChange}
                  onChange={(e) => setCurrentPasswordForPasswordChange(e.target.value)}
                  className="mt-1"
                  placeholder="Enter your current password"
                  disabled={isPasswordLoading}
                  required
                />
              </div>
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1"
                  placeholder="Enter your new password"
                  disabled={isPasswordLoading}
                  required
                />
              </div>
              <div>
                <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                <Input
                  id="confirmNewPassword"
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="mt-1"
                  placeholder="Confirm your new password"
                  disabled={isPasswordLoading}
                  required
                />
              </div>
              <Button type="submit" disabled={isPasswordLoading || !currentPasswordForPasswordChange || !newPassword || newPassword !== confirmNewPassword}>
                {isPasswordLoading ? 'Changing Password...' : 'Change Password'}
              </Button>
            </form>

          </CardContent>
        </Card>

        <DataManagement />
      </div>
    </AppLayout>
  );
}
