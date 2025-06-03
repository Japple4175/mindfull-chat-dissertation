
'use client';

import { useState, useRef, useEffect, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getChatbotResponse } from '@/ai/flows/chatbot-response';
import type { ConversationMessage } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export function ChatInterface() {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    // Set a generic initial greeting when the component mounts or user changes (logs in/out)
    // This ensures the chat starts fresh.
    const namePart = user?.displayName ? `, ${user.displayName.split(' ')[0]}` : '';
    const initialGreeting = `Hello${namePart}! I'm Mindful Chat. How can I help you today?`;
    setMessages([{ role: 'assistant', content: initialGreeting, id: `init-greeting-${Date.now()}` }]);
  }, [user]); 

  const handleSendMessage = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    const userMessage: ConversationMessage = { role: 'user', content: input.trim(), id: `user-${Date.now()}` };
    
    // Add user message to local state for immediate display
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    
    const currentInput = input;
    setInput('');
    setIsLoadingResponse(true);

    try {
      // Pass current input and session history (excluding current input) to the AI flow
      const aiResponse = await getChatbotResponse({ 
        message: currentInput, 
        userId: user?.uid,
        userName: user?.displayName || undefined,
        sessionHistory: messages.map(m => ({ role: m.role, content: m.content })), // History before the current user message
      });
      const assistantMessage: ConversationMessage = { role: 'assistant', content: aiResponse.response, id: `assistant-${Date.now()}` };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      const errorMessageContent = error instanceof Error ? error.message : "I'm having a little trouble connecting right now. Please try again in a moment.";
      const errorMessage: ConversationMessage = { role: 'assistant', content: errorMessageContent, id: `error-${Date.now()}` };
      setMessages(prev => [...prev, errorMessage]);
      toast({ title: 'Chat Error', description: errorMessageContent, variant: 'destructive'});
    } finally {
      setIsLoadingResponse(false);
    }
  };
  
  const getInitials = (name?: string | null): string => {
    if (name && name.trim().length > 0) {
      return name.trim()[0].toUpperCase();
    }
    return 'U';
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <ScrollArea className="flex-grow p-4 sm:p-6 min-h-0">
        <div className="space-y-6">
          {messages.map((msg, index) => (
            <div
              key={msg.id || index} 
              className={cn(
                'flex items-start gap-3',
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {msg.role === 'assistant' && (
                <Avatar className="h-10 w-10 border border-primary/50">
                  <AvatarFallback className="bg-primary/20 text-primary"><Bot /></AvatarFallback>
                </Avatar>
              )}
              <div
                className={cn(
                  'max-w-[70%] rounded-xl px-4 py-3 shadow-md',
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-card-foreground border border-border'
                )}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
              {msg.role === 'user' && user && (
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
                  <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                </Avatar>
              )}
               {msg.role === 'user' && !user && ( 
                <Avatar className="h-10 w-10">
                  <AvatarFallback><User /></AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          {isLoadingResponse && (
            <div className="flex items-start gap-3 justify-start">
              <Avatar className="h-10 w-10 border border-primary/50">
                <AvatarFallback className="bg-primary/20 text-primary"><Bot /></AvatarFallback>
              </Avatar>
              <div className="max-w-[70%] rounded-xl px-4 py-3 shadow-md bg-card text-card-foreground border border-border">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      <div className="border-t bg-background/80 p-3 sm:p-4">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2 sm:gap-3">
          <Input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-grow"
            disabled={isLoadingResponse}
            aria-label="Chat message input"
          />
          <Button type="submit" size="icon" disabled={isLoadingResponse || !input.trim()} aria-label="Send message">
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
