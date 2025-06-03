
'use client';

import type { MoodScale } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { moodConfigurations } from '@/lib/mood-definitions';

interface MoodSelectorProps {
  selectedMood: MoodScale | null;
  onSelectMood: (mood: MoodScale) => void;
}

export function MoodSelector({ selectedMood, onSelectMood }: MoodSelectorProps) {
  return (
    <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
      {moodConfigurations.map((mood) => (
        <Button
          key={mood.value}
          type="button"
          variant="outline"
          className={cn(
            "flex flex-col items-center justify-center h-24 w-24 sm:h-28 sm:w-28 rounded-lg p-3 transition-all duration-200 ease-in-out transform hover:scale-105 focus:ring-2 focus:ring-primary",
            selectedMood === mood.value ? 'border-primary border-2 shadow-lg bg-primary/10' : 'border-border hover:border-primary/50'
          )}
          onClick={() => onSelectMood(mood.value)}
          aria-pressed={selectedMood === mood.value}
          aria-label={`Select mood: ${mood.label}`}
        >
          <mood.icon className={cn(
            "h-10 w-10 sm:h-12 sm:w-12 mb-1.5",
            selectedMood === mood.value ? 'text-primary' : 'text-muted-foreground group-hover:text-primary/80'
           )} />
          <span className={cn(
            "text-xs sm:text-sm font-medium",
            selectedMood === mood.value ? 'text-primary' : 'text-muted-foreground'
          )}>{mood.label}</span>
        </Button>
      ))}
    </div>
  );
}
