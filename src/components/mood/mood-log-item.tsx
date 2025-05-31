'use client';

import type { MoodEntry } from '@/lib/types';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { moods as moodConfigs } from './mood-selector';
import { Trash2 } from 'lucide-react';
import { deleteMoodAction } from '@/actions/mood-actions';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
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

interface MoodLogItemProps {
  entry: MoodEntry;
}

export function MoodLogItem({ entry }: MoodLogItemProps) {
  const moodConfig = moodConfigs.find(m => m.value === entry.mood);
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteMoodAction(entry.id);
    if (result.success) {
      toast({ title: 'Mood Deleted', description: result.message });
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setIsDeleting(false);
  };

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-card">
        <div className="flex items-center gap-3">
          {moodConfig && <moodConfig.icon className={`h-8 w-8 ${moodConfig.color.replace('bg-', 'text-').split(' ')[0]}`} />}
          <CardTitle className="text-xl font-semibold font-headline">
            {moodConfig?.label || entry.mood}
          </CardTitle>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Delete mood entry" disabled={isDeleting}>
              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete this mood entry.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                {isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardHeader>
      <CardContent className="pt-2 pb-4">
        <CardDescription className="text-sm text-muted-foreground mb-2">
          {format(entry.timestamp.toDate(), 'PPPp')}
        </CardDescription>
        {entry.notes && <p className="text-sm text-foreground whitespace-pre-wrap">{entry.notes}</p>}
        {!entry.notes && <p className="text-sm text-muted-foreground italic">No notes for this entry.</p>}
      </CardContent>
    </Card>
  );
}
