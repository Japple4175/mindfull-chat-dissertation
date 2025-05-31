'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { ChatInterface } from '@/components/chatbot/chat-interface';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ChatPage() {
  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-theme(spacing.32))] sm:h-[calc(100vh-theme(spacing.24))]"> {/* Adjust height based on header */}
        <Card className="flex-grow flex flex-col shadow-lg overflow-hidden">
          <CardHeader>
            <CardTitle className="font-headline text-2xl md:text-3xl">Mindful AI Chat</CardTitle>
            <CardDescription>
              A safe space to discuss your thoughts and feelings. Remember, this AI is for support, not a replacement for professional help.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex flex-col p-0">
            <ChatInterface />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
