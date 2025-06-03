
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
import { fetchChatHistory } from '@/services/chat-service'; // To pre-populate UI on load

export function ChatInterface() {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(scrollToBottom, [messages]);

  // Fetch initial chat history for the UI when the component mounts and user is available
  useEffect(() => {
    async function loadInitialHistory() {
      if (user?.uid) {
        setIsHistoryLoading(true);
        try {
          const pastMessages = await fetchChatHistory(user.uid);
          if (pastMessages.length > 0) {
            setMessages(pastMessages);
          } else {
            setMessages([{ role: 'assistant', content: "Hello! I'm here to listen and support you. How are you feeling today?" }]);
          }
        } catch (error) {
          console.error('Error loading initial chat history for UI:', error);
          setMessages([{ role: 'assistant', content: "Hello! I had trouble loading our past chat. How are you feeling today?" }]);
        } finally {
          setIsHistoryLoading(false);
        }
      } else if (!user && !isHistoryLoading) { // If there's no user and we weren't already loading
         setMessages([{ role: 'assistant', content: "Hello! I'm here to listen and support you. How are you feeling today?" }]);
         setIsHistoryLoading(false);
      }
    }

    if (user) { // Only attempt to load history if user is available
        loadInitialHistory();
    } else { // If no user, set initial message and stop loading indicator.
        setMessages([{ role: 'assistant', content: "Hello! Please log in to save your chat history. How are you feeling today?" }]);
        setIsHistoryLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]); // Rerun when user.uid changes (login/logout)


  const handleSendMessage = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || !user?.uid) {
      if (!user?.uid) {
        // Optionally, prompt user to log in or handle anonymous chat differently
        setMessages(prev => [...prev, { role: 'user', content: input.trim() }, { role: 'assistant', content: "Please log in to continue and save our conversation." }]);
        setInput('');
      }
      return;
    }

    const newMessage: ConversationMessage = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, newMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      // The AI flow now handles history internally using userId
      const aiResponse = await getChatbotResponse({ userId: user.uid, message: newMessage.content });
      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse.response }]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm having a little trouble connecting right now. Please try again in a moment." }]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return names[0][0].toUpperCase();
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <ScrollArea className="flex-grow p-4 sm:p-6 min-h-0">
        <div className="space-y-6">
          {isHistoryLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="ml-2 text-muted-foreground">Loading chat history...</p>
            </div>
          )}
          {!isHistoryLoading && messages.map((msg, index) => (
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
            </div>
          ))}
          {isLoading && !isHistoryLoading && ( // Only show thinking loader if not initial history loading
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
            placeholder={user ? "Type your message..." : "Please log in to chat"}
            className="flex-grow"
            disabled={isLoading || !user || isHistoryLoading}
            aria-label="Chat message input"
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim() || !user || isHistoryLoading} aria-label="Send message">
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
