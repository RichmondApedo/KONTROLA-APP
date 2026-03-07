'use client';

import { useState, useRef, useEffect } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Bot, Loader2, Send, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { askKontrola } from '@/ai/flows/ask-kontrola-flow';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser } from '@/firebase';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export function AskChatbot() {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);
  
  useEffect(() => {
    if (messages.length === 0) {
        setMessages([
            { id: 'initial', role: 'assistant', content: "Hi! I'm Ask, your personal KONTROLA assistant. How can I help you today?" }
        ])
    }
  }, [messages.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await askKontrola({ question: input });
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.answer,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error("Chatbot error:", error);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Sorry, I encountered an issue. The specific error is: "${error.message || 'Unknown error'}". Our team has been notified.`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('');
  };
  
  const constraintsRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={constraintsRef} className="fixed inset-0 pointer-events-none z-30">
        <Popover>
          <PopoverTrigger asChild>
            <motion.button
                drag
                dragConstraints={constraintsRef}
                dragMomentum={false}
                className={cn(
                    buttonVariants({ variant: "default", size: "icon" }),
                    "fixed bottom-24 right-4 flex h-14 w-14 flex-col items-center justify-center rounded-full shadow-lg leading-none md:bottom-6 md:right-6 cursor-grab active:cursor-grabbing pointer-events-auto"
                )}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 20,
                    delay: 0.5,
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
            >
                <Bot className="h-6 w-6" />
                <span className="mt-0.5 text-[9px] font-bold">Ask</span>
                <span className="sr-only">Open Chatbot</span>
            </motion.button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            sideOffset={16}
            className="w-[calc(100vw-2rem)] sm:w-[350px] md:w-[400px] h-[500px] md:h-[600px] p-0 flex flex-col pointer-events-auto"
          >
            <div className="p-4 border-b">
              <h3 className="font-semibold flex items-center gap-2"><Bot className="text-primary"/> Ask KONTROLA</h3>
              <p className="text-sm text-muted-foreground">Your AI Assistant</p>
            </div>
            <ScrollArea className="flex-1" ref={scrollAreaRef}>
                <div className="p-4 space-y-4">
                    <AnimatePresence>
                    {messages.map((message) => (
                        <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                            className={cn(
                                'flex items-start gap-3',
                                message.role === 'user' ? 'justify-end' : 'justify-start'
                            )}
                        >
                        {message.role === 'assistant' && (
                            <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-primary text-primary-foreground"><Bot className="h-5 w-5"/></AvatarFallback>
                            </Avatar>
                        )}
                        <div className={cn(
                            'p-3 rounded-2xl max-w-[80%] text-sm',
                            message.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted rounded-bl-none'
                        )}>
                            {message.content}
                        </div>
                         {message.role === 'user' && (
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={user?.photoURL || ''} alt={user?.displayName || ''} />
                                <AvatarFallback>{getInitials(user?.displayName)}</AvatarFallback>
                            </Avatar>
                        )}
                        </motion.div>
                    ))}
                    </AnimatePresence>
                    {isLoading && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-3"
                        >
                             <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-primary text-primary-foreground"><Bot className="h-5 w-5"/></AvatarFallback>
                            </Avatar>
                            <div className="p-3 bg-muted rounded-2xl rounded-bl-none">
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                        </motion.div>
                    )}
                </div>
            </ScrollArea>
            <div className="p-4 border-t">
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question..."
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button type="submit" size="icon" disabled={isLoading || !input}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </PopoverContent>
        </Popover>
    </div>
  );
}
