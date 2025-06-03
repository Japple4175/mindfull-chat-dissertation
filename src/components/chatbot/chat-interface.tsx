
'use client';

import { useState, useRef, useEffect, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getChatbotResponse } from '@/ai/flows/chatbot-response';
import { generateGreeting } from '@/ai/flows/greeting-flow'; // Import the new greeting flow
import type { ConversationMessage } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
// Chat service is now mainly used by the AI flows
// import { fetchChatHistory, addChatMessage } from '@/services/chat-service';


export function ChatInterface() {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoadingResponse, setIsLoadingResponse] = useState(false); // For AI responses
  const [isLoadingGreeting, setIsLoadingGreeting] = useState(true); // For initial greeting
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(scrollToBottom, [messages]);

  // Helper to get a generic personalized greeting if AI greeting fails or for non-logged-in users
  const getFallbackPersonalizedGreeting = (userName?: string | null): string => {
    const namePart = userName ? `, ${userName.split(' ')[0]}` : '';
    return `Hello${namePart}! I'm here to listen and support you. How are you feeling today?`;
  };

  useEffect(() => {
    const initializeChat = async () => {
      setIsLoadingGreeting(true);
      setMessages([]); // Clear previous messages if user logs in/out

      if (user) {
        try {
          const greetingResponse = await generateGreeting({ 
            userId: user.uid, 
            userName: user.displayName || undefined 
          });
          setMessages([{ role: 'assistant', content: greetingResponse.greeting, id: `greeting-${Date.now()}` }]);
        } catch (error) {
          console.error('Error generating intelligent greeting:', error);
          const fallbackGreeting = getFallbackPersonalizedGreeting(user.displayName);
          setMessages([{ role: 'assistant', content: fallbackGreeting, id: `fallback-greeting-${Date.now()}` }]);
          toast({ title: 'Info', description: 'Could not fetch a smart greeting, using a default one.', variant: 'default' });
        }
      } else {
        const defaultGreeting = getFallbackPersonalizedGreeting(null);
        setMessages([{ role: 'assistant', content: defaultGreeting, id: `default-greeting-${Date.now()}` }]);
      }
      setIsLoadingGreeting(false);
    };

    initializeChat();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); 

  const handleSendMessage = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    const userMessage: ConversationMessage = { role: 'user', content: input.trim(), id: `user-${Date.now()}` };
    setMessages(prev => [...prev, userMessage]);
    
    const currentInput = input;
    setInput('');
    setIsLoadingResponse(true);

    try {
      // AI flow (getChatbotResponse) handles saving user message and fetching full history internally
      const aiResponse = await getChatbotResponse({ 
        message: userMessage.content, 
        userId: user?.uid,
        userName: user?.displayName || undefined,
      });
      const assistantMessage: ConversationMessage = { role: 'assistant', content: aiResponse.response, id: `assistant-${Date.now()}` };
      setMessages(prev => [...prev, assistantMessage]);
      // AI flow also handles saving assistant message
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
          {isLoadingGreeting && (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Crafting a greeting for you...</p>
            </div>
          )}
          {!isLoadingGreeting && messages.map((msg, index) => (
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
          {isLoadingResponse && !isLoadingGreeting && ( // Show typing indicator only if not loading greeting
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
            placeholder={isLoadingGreeting ? "Waiting for greeting..." : "Type your message..."}
            className="flex-grow"
            disabled={isLoadingResponse || isLoadingGreeting}
            aria-label="Chat message input"
          />
          <Button type="submit" size="icon" disabled={isLoadingResponse || isLoadingGreeting || !input.trim()} aria-label="Send message">
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
