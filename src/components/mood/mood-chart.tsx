
'use client';

import { useQuery } from '@tanstack/react-query';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { MoodEntry, MoodScale } from '@/lib/types';
import { moodConfigurations, moodValueToScoreMap, moodScoreToLabelMap } from '@/lib/mood-definitions';
import { Bar, BarChart, Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, AlertTriangle } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { format, parseISO, startOfDay, endOfDay, subDays, subMonths } from 'date-fns';

interface MoodChartProps {
  timeRange: 'weekly' | 'monthly';
  chartType: 'distribution' | 'average';
}

async function fetchMoodDataForChart(userId: string, timeRange: 'weekly' | 'monthly'): Promise<MoodEntry[]> {
  const now = new Date();
  let startDate: Date;

  if (timeRange === 'weekly') {
    startDate = startOfDay(subDays(now, 6)); // Last 7 days including today
  } else {
    startDate = startOfDay(subDays(now, 29)); // Last 30 days including today
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
      timestamp: (data.timestamp as Timestamp).toDate(),
    } as MoodEntry;
  });
}

const distributionChartConfig = Object.fromEntries(
  moodConfigurations.map((mood, index) => [
    mood.value,
    { label: mood.label, color: `hsl(var(--chart-${index + 1}))` }
  ])
) satisfies ChartConfig;

const averageLineChartConfig = {
  averageMood: { label: 'Average Mood', color: 'hsl(var(--chart-1))' },
} satisfies ChartConfig;

export function MoodChart({ timeRange, chartType }: MoodChartProps) {
  const currentUser = auth.currentUser;
  const { data: moodData, isLoading, error } = useQuery<MoodEntry[], Error>({
    queryKey: ['moodChartData', currentUser?.uid, timeRange, chartType],
    queryFn: () => {
      if (!currentUser?.uid) throw new Error('User not authenticated');
      return fetchMoodDataForChart(currentUser.uid, timeRange);
    },
    enabled: !!currentUser?.uid,
    staleTime: 1000 * 60, // 1 minute
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

  if (chartType === 'distribution') {
    const processedData = moodData.reduce((acc, entry) => {
      const dayKey = format(entry.timestamp, 'yyyy-MM-dd');
      if (!acc[dayKey]) {
        acc[dayKey] = { 
          name: format(entry.timestamp, timeRange === 'weekly' ? 'EEE' : 'MMM d'), 
          awful: 0, bad: 0, neutral: 0, good: 0, great: 0 
        };
      }
      acc[dayKey][entry.mood]++;
      return acc;
    }, {} as Record<string, { name: string } & Record<MoodScale, number>>);
    
    const distributionData = Object.entries(processedData)
      .map(([dateKey, data]) => ({ date: parseISO(dateKey), ...data }))
      .sort((a,b) => a.date.getTime() - b.date.getTime())
      .map(({date, ...rest}) => rest);

    return (
      <ChartContainer config={distributionChartConfig} className="min-h-[300px] w-full">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={distributionData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis 
              dataKey="name" 
              tickLine={false} 
              axisLine={false} 
              tickMargin={8} 
              tickFormatter={(value) => value.slice(0,3)}
            />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            {Object.keys(distributionChartConfig).map((moodKey) => (
              <Bar 
                key={moodKey} 
                dataKey={moodKey} 
                stackId="a"
                fill={`var(--color-${moodKey})`} 
                radius={[4, 4, 0, 0]} 
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    );
  }

  if (chartType === 'average') {
    const dailyAverages = moodData.reduce((acc, entry) => {
      const dayKey = format(entry.timestamp, 'yyyy-MM-dd');
      const score = moodValueToScoreMap[entry.mood];
      if (score === undefined) return acc; 

      if (!acc[dayKey]) {
        acc[dayKey] = { 
          sum: 0, 
          count: 0, 
          name: format(entry.timestamp, timeRange === 'weekly' ? 'EEE' : 'MMM d'),
          date: entry.timestamp // Store full date for sorting
        };
      }
      acc[dayKey].sum += score;
      acc[dayKey].count++;
      return acc;
    }, {} as Record<string, { sum: number; count: number; name: string, date: Date }>);

    const averageChartData = Object.values(dailyAverages)
      .map(dayData => ({
        name: dayData.name,
        averageMood: parseFloat((dayData.sum / dayData.count).toFixed(2)),
        date: dayData.date 
      }))
      .sort((a,b) => a.date.getTime() - b.date.getTime())
      .map(({ date, ...rest}) => rest);


    return (
      <ChartContainer config={averageLineChartConfig} className="min-h-[300px] w-full">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={averageChartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis 
              dataKey="name" 
              tickLine={false} 
              axisLine={false} 
              tickMargin={8} 
              tickFormatter={(value) => value.slice(0,3)}
            />
            <YAxis 
              domain={[1, 5]} 
              ticks={[1, 2, 3, 4, 5]} 
              tickFormatter={(value) => moodScoreToLabelMap[value] || ''}
              tickLine={false} 
              axisLine={false} 
              tickMargin={8} 
            />
            <ChartTooltip 
              content={
                <ChartTooltipContent 
                  formatter={(value, name, props) => {
                    if (name === 'averageMood' && typeof value === 'number') {
                      const moodLabel = moodScoreToLabelMap[Math.round(value)] || `Score: ${value.toFixed(1)}`;
                      return [`${value.toFixed(2)} (${moodLabel})`, averageLineChartConfig.averageMood.label];
                    }
                    return [value, name];
                  }}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Line 
              type="monotone" 
              dataKey="averageMood" 
              stroke={`var(--color-averageMood)`}
              strokeWidth={2} 
              dot={{ r: 4, fill: `var(--color-averageMood)` }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>
    );
  }

  return null; 
}
