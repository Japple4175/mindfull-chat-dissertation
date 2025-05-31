
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { deleteAllUserMoodsAction } from '@/actions/mood-actions';
import { Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth'; // Added useAuth import

export function DataManagement() {
  const { toast } = useToast();
  const { user } = useAuth(); // Get user from AuthContext
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAllData = async () => {
    if (!user) {
      toast({ title: 'Authentication Error', description: 'You must be logged in to delete data.', variant: 'destructive' });
      return;
    }

    setIsDeleting(true);
    const result = await deleteAllUserMoodsAction(user.uid); // Pass user.uid
    if (result.success) {
      toast({ title: 'Data Deleted', description: 'All your mood data has been successfully deleted.' });
    } else {
      toast({ title: 'Error Deleting Data', description: result.error || 'An unknown error occurred.', variant: 'destructive' });
    }
    setIsDeleting(false);
  };

  return (
    <Card className="shadow-lg border-destructive">
      <CardHeader>
        <CardTitle className="font-headline text-xl text-destructive flex items-center gap-2"><Trash2 /> Data Management</CardTitle>
        <CardDescription>
          Manage your personal data stored in Mindful Chat. These actions are permanent.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold">Delete All Mood Data</h4>
            <p className="text-sm text-muted-foreground mt-1 mb-2">
              This will permanently delete all your logged moods and related notes. This action cannot be undone.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isDeleting || !user}>
                  {isDeleting ? 'Deleting Data...' : 'Delete All Mood Data'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete all your mood entries from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAllData} disabled={isDeleting || !user} className="bg-destructive hover:bg-destructive/90">
                    {isDeleting ? 'Deleting...' : 'Yes, delete all my data'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
