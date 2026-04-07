'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Loader2, Send, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useUser, useUserProfile, useFirestore, useCollection } from '@/firebase';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { askKontrola } from '@/ai/flows/ask-kontrola-flow';
import { FuturisticBotIcon } from '@/components/dashboard/futuristic-bot-icon';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { collection, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';

// Safe dynamic import for Markdown to prevent hydration/ESM crashes
const Markdown = dynamic(() => import('react-markdown'), { 
  ssr: false,
  loading: () => <span className="animate-pulse">Loading markdown...</span>
});

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: any;
}

const examplePrompts = [
    "How do I add a new expense?",
    "How can I link my bank account?",
    "Tell me about the Kontrola Score",
    "What's the difference between Premium and Pro Plus?",
];

export default function HelpPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { profile, isProfileLoading } = useUserProfile();

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // AI Memory Disabled: Using local state instead of Firestore
  const [messages, setMessages] = useState<Message[]>([
    { id: 'initial', role: 'assistant', content: "Hi! I'm Ask, your personal KONTROLA assistant. How can I help you today?" }
  ]);
  
  useEffect(() => {
    if (hasMounted && scrollAreaRef.current) {
        try {
            const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (viewport instanceof HTMLElement) {
                viewport.scrollTo({
                    top: viewport.scrollHeight,
                    behavior: 'smooth',
                });
            }
        } catch (err) {
            console.warn("Scroll failed:", err);
        }
    }
  }, [messages, isLoading, hasMounted]);
  
  const handleSendMessage = async (messageContent: string) => {
    if (!messageContent || isLoading || !profile || !user || !firestore) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent,
    };
    
    setMessages(prev => [...prev, userMsg]);
    
    if (input) setInput('');
    setIsLoading(true);

    try {
        const historyForAI = messages
            .filter((m: any) => m.id !== 'initial')
            .slice(-10)
            .map((m: any) => ({ role: m.role, content: m.content }));

        const result = await askKontrola({
            question: messageContent,
            currentDate: format(new Date(), 'PPP'),
            profile: {
                firstName: profile.firstName || 'User',
                plan: profile.plan || 'free',
                preferredCurrency: profile.preferredCurrency || 'GHS',
            },
            userId: user.uid,
            history: historyForAI as any,
        });

        if (result?.error) throw new Error(result.error);
        if (!result?.answer) throw new Error("No answer returned.");

        const assistantMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: result.answer,
        };
        setMessages(prev => [...prev, assistantMsg]);

    } catch (error: any) {
        console.error("❌ [AI Service Error]:", error);
        let errorHint = "I'm sorry, I'm having trouble connecting right now.";
        if (error.message?.includes('429')) errorHint = "Brain overwhelmed (Rate Limit). Try in 60s.";
        
        setMessages(prev => [...prev, {
            id: 'err-' + Date.now().toString(),
            role: 'assistant',
            content: `${errorHint}\n\n*Technical Detail: ${error.message || 'Unknown Error'}*`,
        }]);
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
    try {
        return name
            .split(' ')
            .filter(Boolean)
            .map((n) => n[0].toUpperCase())
            .slice(0, 2)
            .join('');
    } catch {
        return 'U';
    }
  };

  if (!hasMounted) {
      return <div className="h-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="h-full relative overflow-hidden flex flex-col">
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

            <Card className="flex-1 flex flex-col overflow-hidden min-h-0 bg-background/40 backdrop-blur-md border-primary/20 shadow-2xl rounded-2xl sm:rounded-3xl mb-[env(safe-area-inset-bottom)]">
                <CardContent className="p-0 flex-1 flex flex-col min-h-0">

                <ScrollArea className="flex-1" ref={scrollAreaRef}>
                    <div className="p-4 sm:p-6 space-y-6 pb-20 sm:pb-6">
                        {/* History Error banner removed because memory is disabled */}

                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={cn(
                                    'flex items-start gap-3',
                                    message.role === 'user' ? 'justify-end' : 'justify-start'
                                )}
                            >
                            {message.role === 'assistant' && (
                                <Avatar className="h-8 w-8 border border-primary/20 shadow-sm">
                                    <AvatarFallback className="bg-primary text-primary-foreground p-1"><FuturisticBotIcon className="h-5 w-5" /></AvatarFallback>
                                </Avatar>
                            )}
                            <div className={cn(
                                'p-4 rounded-2xl max-w-[85%] sm:max-w-[80%] text-sm leading-relaxed shadow-sm break-words',
                                'prose prose-sm dark:prose-invert max-w-none prose-p:my-0 prose-ul:my-2 prose-strong:text-foreground',
                                message.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-none prose-strong:text-primary-foreground shadow-primary/20' : 'bg-muted/80 backdrop-blur-sm rounded-bl-none shadow-muted-foreground/5 border border-border/40'
                            )}>
                                {message.content ? (
                                    <Markdown>{message.content}</Markdown>
                                ) : (
                                    <span className="italic opacity-50">Empty message</span>
                                )}
                            </div>
                            {message.role === 'user' && (
                                <Avatar className="h-8 w-8 border border-primary/20 shadow-sm">
                                    <AvatarImage src={user?.photoURL || ''} alt={user?.displayName || ''} />
                                    <AvatarFallback className="bg-muted text-muted-foreground font-black text-[10px]">{getInitials(user?.displayName)}</AvatarFallback>
                                </Avatar>
                            )}
                            </div>
                        ))}
                        {isLoading && (
                            <div
                                className="flex items-center gap-3"
                            >
                                <Avatar className="h-8 w-8 border border-primary/20 shadow-sm">
                                    <AvatarFallback className="bg-primary text-primary-foreground p-1"><FuturisticBotIcon className="h-5 w-5" /></AvatarFallback>
                                </Avatar>
                                <div className="p-4 bg-muted/80 backdrop-blur-sm rounded-2xl rounded-bl-none shadow-sm border border-border/40">
                                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
                <div className="p-4 border-t bg-background/95 backdrop-blur-md sticky bottom-0 z-20 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
                    {messages.length <= 1 && (
                         <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[30vh] overflow-y-auto no-scrollbar">
                             {examplePrompts.map(prompt => (
                                 <Button
                                    key={prompt}
                                    variant="outline"
                                    size="sm"
                                    className="h-auto py-2.5 text-left justify-start rounded-xl border-primary/10 bg-primary/5 hover:bg-primary/10 transition-colors"
                                    onClick={() => handleSendMessage(prompt)}
                                    disabled={isLoading || isProfileLoading}
                                 >
                                     <Sparkles className="mr-2 h-3.5 w-3.5 shrink-0 text-primary"/>
                                     <span className="text-[11px] font-bold tracking-tight">{prompt}</span>
                                 </Button>
                             ))}
                         </div>
                    )}
                    <form onSubmit={handleSubmit} className="flex items-center gap-3">
                        <Input
                        value={input}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
                        placeholder="Inquire about system operations..."
                        disabled={isLoading || isProfileLoading}
                        className="flex-1 h-12 rounded-xl bg-muted/30 border-border/40 focus:bg-background transition-all"
                        />
                        <Button type="submit" size="icon" disabled={isLoading || isProfileLoading || !input} className="h-12 w-12 rounded-xl shadow-lg shadow-primary/20">
                            <Send className="h-5 w-5" />
                        </Button>
                    </form>
                    <p className="mt-2 text-[9px] text-center font-black uppercase tracking-[0.15em] text-muted-foreground/40">Powered by Kontrola Strategic Intelligence</p>
                </div>
            </CardContent>
        </Card>
        </div>
    </div>
  );
}
