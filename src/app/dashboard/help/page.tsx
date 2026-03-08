'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bot, Loader2, Send, Sparkles, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { askKontrola } from '@/ai/flows/ask-kontrola-flow';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser } from '@/firebase';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const examplePrompts = [
    "How do I create a budget?",
    "Explain the Kontrola Score",
    "How do I connect my bank account?",
    "What are the benefits of Pro Plus?",
];

export default function HelpPage() {
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
            { id: 'initial', role: 'assistant', content: "Hi! I'm Ask, your personal KONTROLA assistant. How can I help you with the app today?" }
        ])
    }
  }, [messages.length]);

  const handleSendMessage = async (messageContent: string) => {
    if (!messageContent || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: messageContent,
    };
    setMessages((prev) => [...prev, userMessage]);
    if (input) setInput('');
    setIsLoading(true);

    try {
      const response = await askKontrola({ question: messageContent });
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(input);
  };
  
  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('');
  };

  return (
    <div className="h-full flex flex-col">
        <div className="mb-6">
            <h1 className="text-3xl font-bold font-headline tracking-tight flex items-center gap-2">
                <Bot className="text-primary"/>
                Ask KONTROLA
            </h1>
            <p className="text-muted-foreground">Your 24/7 AI-powered support assistant.</p>
        </div>

        <Card className="flex-1 flex flex-col">
            <CardContent className="p-0 flex-1 flex flex-col">
                <ScrollArea className="flex-1" ref={scrollAreaRef}>
                    <div className="p-4 sm:p-6 space-y-6">
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
                                <Avatar className="h-8 w-8 border">
                                    <AvatarFallback className="bg-primary text-primary-foreground"><Bot className="h-5 w-5"/></AvatarFallback>
                                </Avatar>
                            )}
                            <div className={cn(
                                'p-3 rounded-2xl max-w-[80%] text-sm leading-relaxed shadow-sm',
                                message.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted rounded-bl-none'
                            )}>
                                {message.content}
                            </div>
                            {message.role === 'user' && (
                                <Avatar className="h-8 w-8 border">
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
                                <Avatar className="h-8 w-8 border">
                                    <AvatarFallback className="bg-primary text-primary-foreground"><Bot className="h-5 w-5"/></AvatarFallback>
                                </Avatar>
                                <div className="p-3 bg-muted rounded-2xl rounded-bl-none shadow-sm">
                                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                </div>
                            </motion.div>
                        )}
                    </div>
                </ScrollArea>
                <div className="p-4 border-t bg-background/80 backdrop-blur-sm rounded-b-lg">
                    {messages.length <= 1 && (
                         <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                             {examplePrompts.map(prompt => (
                                 <Button
                                    key={prompt}
                                    variant="outline"
                                    size="sm"
                                    className="h-auto py-2 text-left justify-start"
                                    onClick={() => handleSendMessage(prompt)}
                                 >
                                     <Sparkles className="h-4 w-4 mr-2 shrink-0"/>
                                     {prompt}
                                 </Button>
                             ))}
                         </div>
                    )}
                    <form onSubmit={handleSubmit} className="flex items-center gap-2">
                        <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about a feature..."
                        disabled={isLoading}
                        className="flex-1"
                        />
                        <Button type="submit" size="icon" disabled={isLoading || !input}>
                        <Send className="h-4 w-4" />
                        </Button>
                    </form>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
