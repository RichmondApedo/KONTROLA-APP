'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Send, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { askKontrolaFlow } from '@/ai/flows/ask-kontrola-flow';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser, useUserProfile } from '@/firebase';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import Markdown from 'react-markdown';
import { FuturisticBotIcon } from '@/components/dashboard/futuristic-bot-icon';
import { format } from 'date-fns';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const examplePrompts = [
    "How do I add a new expense?",
    "How can I link my bank account?",
    "Tell me about the Kontrola Score",
    "What's the difference between Premium and Pro Plus?",
];

export default function HelpPage() {
  const { user } = useUser();
  const { profile, isProfileLoading } = useUserProfile();

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
    if (!messageContent || isLoading || !profile || !user) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: messageContent,
    };
    setMessages((prev) => [...prev, userMessage]);
    if (input) setInput('');
    setIsLoading(true);

    try {
        const result = await askKontrolaFlow({
            question: messageContent,
            currentDate: format(new Date(), 'PPP'),
            profile: {
                firstName: profile.firstName || 'User',
                plan: profile.plan,
                preferredCurrency: profile.preferredCurrency,
            },
            userId: user.uid,
        });

        if (!result?.answer) {
            throw new Error("The AI model did not return a valid answer string.");
        }

        const assistantMessage: Message = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: result.answer,
        };
        setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
        console.error("❌ [AI Service Error]:", error);
        
        // Extract a specific reason if possible
        let errorHint = "I'm sorry, I'm having trouble connecting to my intelligence core right now.";
        if (error.message?.includes('429')) errorHint = "My brain is currently overwhelmed (Rate Limit). Please try again in 60 seconds.";
        if (error.message?.includes('404')) errorHint = "The AI model is currently configuration-locked. Please check /api/ai-status.";
        if (error.message?.includes('500')) errorHint = "The server is having a hiccup. Please try again later.";

        const errorMessage: Message = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `${errorHint}\n\n*Technical Detail: ${error.message || 'Unknown Error'}*`,
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
    <div className="h-full relative overflow-hidden flex flex-col">
        {/* Premium Background Layer */}
        <div 
          className="absolute inset-0 z-0 pointer-events-none opacity-40 mix-blend-soft-light"
          style={{ 
            backgroundImage: 'url("/images/premium-bg.png")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(20px)'
          }}
        />
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-background/10 via-background/60 to-background pointer-events-none" />

        <div className="relative z-10 flex flex-col h-full">
            <div className="mb-6">
                <h1 className="text-3xl font-bold font-headline tracking-tight flex items-center gap-2">
                    <FuturisticBotIcon className="h-8 w-8 text-primary animate-pulse"/>
                    Ask KONTROLA
                </h1>
                <p className="text-muted-foreground">Your 24/7 AI-powered support assistant.</p>
            </div>

            <Card className="flex-1 flex flex-col overflow-hidden min-h-0 bg-background/40 backdrop-blur-md border-primary/20 shadow-2xl">
                <CardContent className="p-0 flex-1 flex flex-col min-h-0">

                <ScrollArea className="flex-1" ref={scrollAreaRef}>
                    <div className="p-4 sm:p-6 space-y-6">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={cn(
                                    'flex items-start gap-3',
                                    message.role === 'user' ? 'justify-end' : 'justify-start'
                                )}
                            >
                            {message.role === 'assistant' && (
                                <Avatar className="h-8 w-8 border">
                                    <AvatarFallback className="bg-primary text-primary-foreground p-1"><FuturisticBotIcon className="h-5 w-5" /></AvatarFallback>
                                </Avatar>
                            )}
                            <div className={cn(
                                'p-3 rounded-2xl max-w-[80%] text-sm leading-relaxed shadow-sm break-words',
                                'prose prose-sm dark:prose-invert max-w-none prose-p:my-0 prose-ul:my-2 prose-strong:text-foreground',
                                message.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-none prose-strong:text-primary-foreground' : 'bg-muted rounded-bl-none'
                            )}>
                                <Markdown>{message.content}</Markdown>
                            </div>
                            {message.role === 'user' && (
                                <Avatar className="h-8 w-8 border">
                                    <AvatarImage src={user?.photoURL || ''} alt={user?.displayName || ''} />
                                    <AvatarFallback>{getInitials(user?.displayName)}</AvatarFallback>
                                </Avatar>
                            )}
                            </div>
                        ))}
                        {isLoading && (
                            <div
                                className="flex items-center gap-3"
                            >
                                <Avatar className="h-8 w-8 border">
                                    <AvatarFallback className="bg-primary text-primary-foreground p-1"><FuturisticBotIcon className="h-5 w-5" /></AvatarFallback>
                                </Avatar>
                                <div className="p-3 bg-muted rounded-2xl rounded-bl-none shadow-sm">
                                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                </div>
                            </div>
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
                                    disabled={isLoading || isProfileLoading}
                                 >
                                     <Sparkles className="mr-2 h-4 w-4 shrink-0"/>
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
                        disabled={isLoading || isProfileLoading}
                        className="flex-1"
                        />
                        <Button type="submit" size="icon" disabled={isLoading || isProfileLoading || !input}>
                        <Send className="h-4 w-4" />
                        </Button>
                    </form>
                </div>
            </CardContent>
        </Card>
        </div>
    </div>
  );
}
