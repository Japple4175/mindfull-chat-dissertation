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
            <CardTitle className="font-headline text-2xl md:text-3xl">Mood Trends</CardTitle>
            <CardDescription>
              Visualize your mood patterns over time to gain deeper insights.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="weekly" className="w-full">
              <TabsList className="grid w-full grid-cols-2 sm:w-[300px] mb-4">
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
              </TabsList>
              <TabsContent value="weekly">
                <MoodChart timeRange="weekly" />
              </TabsContent>
              <TabsContent value="monthly">
                <MoodChart timeRange="monthly" />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
