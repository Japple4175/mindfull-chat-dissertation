'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { MoodLogger } from '@/components/mood/mood-logger';
import { MoodHistory } from '@/components/mood/mood-history';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <AppLayout>
      <div className="space-y-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-2xl md:text-3xl">
              Hello, {user?.displayName?.split(' ')[0] || 'User'}! How are you feeling today?
            </CardTitle>
            <CardDescription>
              Log your mood to track your emotional well-being.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MoodLogger />
          </CardContent>
        </Card>
        
        <MoodHistory />
      </div>
    </AppLayout>
  );
}
