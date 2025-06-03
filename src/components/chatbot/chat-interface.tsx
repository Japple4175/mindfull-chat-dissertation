
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

export function ChatInterface() {
  const defaultInitialMessage = "Hello! I'm here to listen and support you. How are you feeling today?";
  const [messages, setMessages] = useState<ConversationMessage[]>([
    { role: 'assistant', content: defaultInitialMessage }
  ]);
  // conversationHistory is now managed per session for context, not for long-term memory by client
  const [currentSessionHistory, setCurrentSessionHistory] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    // Reset current session history if user changes (login/logout)
    setCurrentSessionHistory([]);
    // Update initial greeting if user is logged in
    if (user?.displayName) {
      setMessages(prevMessages => {
        const newMessages = [...prevMessages];
        if (newMessages.length > 0 && newMessages[0].role === 'assistant' && newMessages[0].content.startsWith("Hello!")) {
          newMessages[0] = { 
            role: 'assistant', 
            content: `Hello, ${user.displayName.split(' ')[0]}! I'm here to listen and support you. How are you feeling today?` 
          };
        }
        return newMessages;
      });
    } else {
       setMessages([{ role: 'assistant', content: defaultInitialMessage }]);
    }
  }, [user]);

  const handleSendMessage = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    const userMessage: ConversationMessage = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    // Add to current session history for the AI call
    const updatedSessionHistory = [...currentSessionHistory, userMessage];
    setCurrentSessionHistory(updatedSessionHistory);
    
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      const aiResponse = await getChatbotResponse({ 
        message: userMessage.content, 
        userId: user?.uid,
        userName: user?.displayName || undefined,
        conversationHistory: updatedSessionHistory 
      });
      const assistantMessage: ConversationMessage = { role: 'assistant', content: aiResponse.response };
      setMessages(prev => [...prev, assistantMessage]);
      // Add AI response to current session history
      setCurrentSessionHistory(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      const errorMessage: ConversationMessage = { role: 'assistant', content: "I'm having a little trouble connecting right now. Please try again in a moment." };
      setMessages(prev => [...prev, errorMessage]);
      setCurrentSessionHistory(prev => [...prev, errorMessage]); // Also add error to session history for context if retry
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
          {messages.map((msg, index) => (
            <div
              key={index}
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
          {isLoading && (
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
            disabled={isLoading}
            aria-label="Chat message input"
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()} aria-label="Send message">
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
