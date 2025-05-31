
'use client';

import { useQuery } from '@tanstack/react-query';
// Removed startOfDay, endOfDay, subDays, subMonths from this import
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { MoodEntry, MoodScale } from '@/lib/types';
import { moods as moodConfigs } from './mood-selector';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, AlertTriangle } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
// These functions are correctly imported from date-fns
import { format, eachDayOfInterval, parseISO, startOfDay, endOfDay, subDays, subMonths } from 'date-fns';


interface MoodChartProps {
  timeRange: 'weekly' | 'monthly';
}

async function fetchMoodDataForChart(userId: string, timeRange: 'weekly' | 'monthly'): Promise<MoodEntry[]> {
  const now = new Date();
  let startDate: Date;

  if (timeRange === 'weekly') {
    startDate = startOfDay(subDays(now, 6)); // Last 7 days including today
  } else {
    startDate = startOfDay(subMonths(now, 1)); 
    startDate.setDate(1); 
    startDate = startOfDay(subDays(now, 29)); 
  }
  const endDateValue = endOfDay(now);

  const q = query(
    collection(db, 'moodEntries'),
    where('userId', '==', userId),
    where('timestamp', '>=', startDate),
    where('timestamp', '<=', endDateValue),
    orderBy('timestamp', 'asc')
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      // Ensure timestamp is a JS Date object for date-fns compatibility
      timestamp: (data.timestamp as Timestamp).toDate(),
    } as MoodEntry;
  });
}


const chartConfig = {
  awful: { label: 'Awful', color: 'hsl(var(--chart-1))' },
  bad: { label: 'Bad', color: 'hsl(var(--chart-2))' },
  neutral: { label: 'Neutral', color: 'hsl(var(--chart-3))' },
  good: { label: 'Good', color: 'hsl(var(--chart-4))' },
  great: { label: 'Great', color: 'hsl(var(--chart-5))' },
} satisfies ChartConfig;


export function MoodChart({ timeRange }: MoodChartProps) {
  const currentUser = auth.currentUser;
  const { data: moodData, isLoading, error } = useQuery<MoodEntry[], Error>({
    queryKey: ['moodChartData', currentUser?.uid, timeRange],
    queryFn: () => {
      if (!currentUser?.uid) throw new Error('User not authenticated');
      return fetchMoodDataForChart(currentUser.uid, timeRange);
    },
    enabled: !!currentUser?.uid,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/2 mb-1" />
          <Skeleton className="h-4 w-3/4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
     return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error Loading Chart Data</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  if (!moodData || moodData.length === 0) {
    return (
       <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Not Enough Data</AlertTitle>
        <AlertDescription>
          Log more moods in this period to see your trends.
        </AlertDescription>
      </Alert>
    );
  }

  // Process data for the chart
  // Aggregate moods by day (or week/month if needed, for now daily for selected range)
  const processedData = moodData.reduce((acc, entry) => {
    const day = format(entry.timestamp, 'yyyy-MM-dd'); // Group by day
    if (!acc[day]) {
      acc[day] = { name: format(entry.timestamp, timeRange === 'weekly' ? 'EEE' : 'MMM d'), awful: 0, bad: 0, neutral: 0, good: 0, great: 0 };
    }
    acc[day][entry.mood]++;
    return acc;
  }, {} as Record<string, { name: string } & Record<MoodScale, number>>);
  
  const chartData = Object.values(processedData).sort((a,b) => {
      // Ensure correct sorting by date if keys are not naturally ordered
      // This depends on how 'name' was formatted. For 'EEE' or 'MMM d' might need actual date comparison
      // For simplicity, assuming object key order or initial moodData sort is sufficient.
      // A more robust sort would involve parsing 'name' back to a date or using the original timestamp.
      return new Date(Object.keys(processedData).find(key => processedData[key] === a) || 0).getTime() - 
             new Date(Object.keys(processedData).find(key => processedData[key] === b) || 0).getTime();
  });


  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="font-headline text-xl">Mood Distribution ({timeRange === 'weekly' ? 'Last 7 Days' : 'Last 30 Days'})</CardTitle>
        <CardDescription>Count of each mood logged per day.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="name" 
                tickLine={false} 
                axisLine={false} 
                tickMargin={8} 
                tickFormatter={(value) => value.slice(0,3)} // Abbreviate day/month names
              />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              {Object.keys(chartConfig).map((moodKey) => (
                <Bar 
                  key={moodKey} 
                  dataKey={moodKey} 
                  stackId="a" // To stack bars if multiple moods on same day
                  fill={`var(--color-${moodKey})`} 
                  radius={[4, 4, 0, 0]} 
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
