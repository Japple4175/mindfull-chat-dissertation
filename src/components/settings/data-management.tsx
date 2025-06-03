
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
import { useAuth } from '@/hooks/useAuth';
import { Separator } from '../ui/separator';

export function DataManagement() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isDeletingMoods, setIsDeletingMoods] = useState(false);

  const handleDeleteAllMoodData = async () => {
    if (!user) {
      toast({ title: 'Authentication Error', description: 'You must be logged in to delete mood data.', variant: 'destructive' });
      return;
    }

    setIsDeletingMoods(true);
    const result = await deleteAllUserMoodsAction(user.uid);
    if (result.success) {
      toast({ title: 'Mood Data Deleted', description: 'All your mood data has been successfully deleted.' });
    } else {
      toast({ title: 'Error Deleting Mood Data', description: result.error || 'An unknown error occurred.', variant: 'destructive' });
    }
    setIsDeletingMoods(false);
  };


  return (
    <Card className="shadow-lg border-destructive">
      <CardHeader>
        <CardTitle className="font-headline text-xl text-destructive flex items-center gap-2"><Trash2 /> Data Management</CardTitle>
        <CardDescription>
          Manage your personal data stored in Mindful Chat. These actions are permanent.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="font-semibold">Delete All Mood Data</h4>
          <p className="text-sm text-muted-foreground mt-1 mb-2">
            This will permanently delete all your logged moods and related notes. This action cannot be undone.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isDeletingMoods || !user}>
                {isDeletingMoods ? 'Deleting Mood Data...' : 'Delete All Mood Data'}
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
                <AlertDialogCancel disabled={isDeletingMoods}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAllMoodData} disabled={isDeletingMoods || !user} className="bg-destructive hover:bg-destructive/90">
                  {isDeletingMoods ? 'Deleting...' : 'Yes, delete all mood data'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
