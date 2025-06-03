
'use client';

import { useState, useRef, useEffect, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getChatbotResponse } from '@/ai/flows/chatbot-response';
import type { ConversationMessage, ChatMessageEntry } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { fetchChatHistory, addChatMessage } from '@/services/chat-service';
import { useToast } from '@/hooks/use-toast';

export function ChatInterface() {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(scrollToBottom, [messages]);

  const getPersonalizedGreeting = (userName?: string | null): string => {
    const namePart = userName ? `, ${userName.split(' ')[0]}` : '';
    return `Hello${namePart}! I'm here to listen and support you. How are you feeling today?`;
  };

  useEffect(() => {
    const loadHistory = async () => {
      if (user) {
        setIsLoadingHistory(true);
        try {
          const history = await fetchChatHistory(user.uid, 50); // Fetch last 50 messages for UI
          if (history.length > 0) {
            setMessages(history.map(h => ({id: h.id, role: h.role, content: h.content})));
          } else {
            // No history, send initial greeting and save it
            const greeting = getPersonalizedGreeting(user.displayName);
            const initialBotMessage: ConversationMessage = { role: 'assistant', content: greeting, id: `initial-${Date.now()}` };
            setMessages([initialBotMessage]);
            await addChatMessage(user.uid, {role: 'assistant', content: greeting}); // Save initial greeting to DB
          }
        } catch (error) {
          console.error('Error loading chat history:', error);
          toast({ title: 'Error', description: 'Could not load chat history.', variant: 'destructive' });
          // Fallback to default greeting if history load fails
          const greeting = getPersonalizedGreeting(user.displayName);
          setMessages([{ role: 'assistant', content: greeting, id: `initial-error-${Date.now()}` }]);
        } finally {
          setIsLoadingHistory(false);
        }
      } else {
        // No user, just default greeting, not saved
        setMessages([{ role: 'assistant', content: getPersonalizedGreeting(null), id: `initial-nouser-${Date.now()}` }]);
      }
    };

    loadHistory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // Reload history when user logs in/out

  const handleSendMessage = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    const userMessage: ConversationMessage = { role: 'user', content: input.trim(), id: `user-${Date.now()}` };
    setMessages(prev => [...prev, userMessage]);
    
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      // AI flow now handles saving user message and fetching full history internally
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
      const errorMessage: ConversationMessage = { role: 'assistant', content: "I'm having a little trouble connecting right now. Please try again in a moment.", id: `error-${Date.now()}` };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
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
          {isLoadingHistory && (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Loading chat history...</p>
            </div>
          )}
          {!isLoadingHistory && messages.map((msg, index) => (
            <div
              key={msg.id || index} // Use message ID if available, fallback to index
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
          {isLoading && !isLoadingHistory && (
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
            placeholder={"Type your message..."}
            className="flex-grow"
            disabled={isLoading || isLoadingHistory}
            aria-label="Chat message input"
          />
          <Button type="submit" size="icon" disabled={isLoading || isLoadingHistory || !input.trim()} aria-label="Send message">
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
