'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { MoodChart } from '@/components/mood/mood-chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function TrendsPage() {
  return (
    <AppLayout>
      <div className="space-y-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-2xl md:text-3xl">Mood Distribution</CardTitle>
            <CardDescription>
              Count of each mood logged per day.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="weekly_dist" className="w-full">
              <TabsList className="grid w-full grid-cols-2 sm:w-[300px] mb-4">
                <TabsTrigger value="weekly_dist">Weekly</TabsTrigger>
                <TabsTrigger value="monthly_dist">Monthly</TabsTrigger>
              </TabsList>
              <TabsContent value="weekly_dist">
                <MoodChart timeRange="weekly" chartType="distribution" />
              </TabsContent>
              <TabsContent value="monthly_dist">
                <MoodChart timeRange="monthly" chartType="distribution" />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-2xl md:text-3xl">Average Mood Trend</CardTitle>
            <CardDescription>
              Your average mood score over time (1: Awful, 5: Great).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="weekly_avg" className="w-full">
              <TabsList className="grid w-full grid-cols-2 sm:w-[300px] mb-4">
                <TabsTrigger value="weekly_avg">Weekly</TabsTrigger>
                <TabsTrigger value="monthly_avg">Monthly</TabsTrigger>
              </TabsList>
              <TabsContent value="weekly_avg">
                <MoodChart timeRange="weekly" chartType="average" />
              </TabsContent>
              <TabsContent value="monthly_avg">
                <MoodChart timeRange="monthly" chartType="average" />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
