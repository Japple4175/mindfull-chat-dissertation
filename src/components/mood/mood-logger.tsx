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

export function MoodLogger() {
  const [selectedMood, setSelectedMood] = useState<MoodScale | null>(null);
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  const handleSelectMood = (mood: MoodScale) => {
    setSelectedMood(mood);
  };
  
  // Effect to handle Math.random() for unique key/id, run only on client
  const [datePickerKey, setDatePickerKey] = useState<string | null>(null);
  useEffect(() => {
    setDatePickerKey(`date-picker-${Math.random()}`);
  }, []);


  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
    formData.set('mood', selectedMood);
    formData.set('date', format(date, "yyyy-MM-dd")); // Ensure date is in YYYY-MM-DD for server action

    const result = await logMoodAction(formData);

    if (result.success) {
      toast({ title: 'Mood Logged!', description: result.message });
      setSelectedMood(null);
      setNotes('');
      // setDate(new Date()); // Keep date or reset as preferred
      formRef.current?.reset(); // Reset native form fields
    } else {
      toast({ title: 'Error Logging Mood', description: result.error, variant: 'destructive' });
    }
    setIsSubmitting(false);
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
          <Label htmlFor="date" className="block text-sm font-medium text-foreground mb-1">Date</Label>
          {datePickerKey && ( // Only render Popover once datePickerKey is set
            <Popover key={datePickerKey}>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
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

      <Button type="submit" className="w-full sm:w-auto" disabled={!selectedMood || isSubmitting}>
        {isSubmitting ? 'Saving Mood...' : 'Save Mood'}
      </Button>
    </form>
  );
}
