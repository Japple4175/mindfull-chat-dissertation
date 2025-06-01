
'use client';

import { useState, useRef, useEffect } from 'react';
import { MoodSelector } from './mood-selector';
import type { MoodScale } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { logMoodAction } from '@/actions/mood-actions';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from '@/hooks/useAuth';

export function MoodLogger() {
  const [selectedMood, setSelectedMood] = useState<MoodScale | null>(null);
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const formRef = useRef<HTMLFormElement>(null);

  const handleSelectMood = (mood: MoodScale) => {
    setSelectedMood(mood);
  };
  
  const [datePickerKey, setDatePickerKey] = useState<string | null>(null);
  useEffect(() => {
    setDatePickerKey(`date-picker-${Date.now().toString()}`); // Use timestamp for a more unique key
  }, []);


  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    // Client-side logging for easier debugging
    console.log('Attempting to submit mood log with state:', {
      userId: user ? user.uid : 'No user object',
      isUserLoaded: !!user,
      selectedMood,
      date,
      notesLength: notes.length,
    });

    if (!user) {
      toast({ title: 'Authentication Error', description: 'You must be logged in to log your mood.', variant: 'destructive' });
      setIsSubmitting(false); // Ensure isSubmitting is reset
      return;
    }

    if (!selectedMood) {
      toast({ title: 'Uh oh!', description: 'Please select a mood.', variant: 'destructive' });
      return;
    }
    if (!date) {
      toast({ title: 'Uh oh!', description: 'Please select a date.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    // Hidden inputs for mood and date are already in the form.

    try {
      const result = await logMoodAction(user.uid, formData);

      if (result.success) {
        toast({ title: 'Mood Logged!', description: result.message });
        setSelectedMood(null);
        setNotes('');
        if (formRef.current) {
          formRef.current.reset(); 
        }
        setDate(new Date()); 
        // Force re-render of date picker if needed, though Popover key might handle this
        setDatePickerKey(`date-picker-${Date.now().toString()}-reset`);
      } else {
        toast({ title: 'Error Logging Mood', description: result.error || 'An unknown error occurred.', variant: 'destructive' });
      }
    } catch (error: any) {
      console.error('Client-side error during mood submission:', error);
      toast({ title: 'Submission Error', description: error.message || 'An unexpected error occurred on the client.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label className="block text-sm font-medium text-foreground mb-2 text-center sm:text-left">Select your current mood:</Label>
        <MoodSelector selectedMood={selectedMood} onSelectMood={handleSelectMood} />
        <input type="hidden" name="mood" value={selectedMood || ''} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="date-button" className="block text-sm font-medium text-foreground mb-1">Date</Label>
          {datePickerKey && ( 
            <Popover key={datePickerKey}>
              <PopoverTrigger asChild>
                <Button
                  id="date-button"
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                  disabled={isSubmitting} // Disable popover trigger while submitting
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(selectedDateValue) => {
                     setDate(selectedDateValue);
                     // Optionally, force Popover to close or update key if issues with selection update
                     // setDatePickerKey(`date-picker-${Date.now().toString()}-select`);
                  }}
                  initialFocus
                  disabled={(d) => d > new Date() || d < new Date("1900-01-01")}
                />
              </PopoverContent>
            </Popover>
          )}
          <input type="hidden" name="date" value={date ? format(date, "yyyy-MM-dd") : ''} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="notes" className="block text-sm font-medium text-foreground mb-1">Notes (Optional)</Label>
          <Textarea
            id="notes"
            name="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any thoughts or details about your mood..."
            rows={3}
            className="resize-none"
            disabled={isSubmitting}
          />
        </div>
      </div>

      <Button 
        type="submit" 
        className="w-full sm:w-auto" 
        disabled={!selectedMood || !user || !date || isSubmitting}
      >
        {isSubmitting ? 'Saving Mood...' : 'Save Mood'}
      </Button>
    </form>
  );
}
