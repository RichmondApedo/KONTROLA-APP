'use client';

import { useState, useEffect, useMemo } from 'react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { SavingsGoal } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Star, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export function MilestoneCelebration() {
    const { user } = useUser();
    const firestore = useFirestore();
    const [celebratedGoalId, setCelebratedGoalId] = useState<string | null>(null);
    const [showCelebration, setShowCelebration] = useState(false);

    const goalsQuery = useMemo(() => user && firestore ? query(collection(firestore, `users/${user.uid}/savingsGoals`)) : null, [user, firestore]);
    const { data: goals } = useCollection<SavingsGoal>(goalsQuery);

    const completedGoal = useMemo(() => {
        if (!goals) return null;
        return goals.find(g => g.currentAmount >= g.targetAmount && g.targetAmount > 0);
    }, [goals]);

    useEffect(() => {
        if (completedGoal && celebratedGoalId !== completedGoal.id) {
            setShowCelebration(true);
            setCelebratedGoalId(completedGoal.id);
            
            // Auto-hide after 10 seconds
            const timer = setTimeout(() => setShowCelebration(false), 10000);
            return () => clearTimeout(timer);
        }
    }, [completedGoal, celebratedGoalId]);

    if (!showCelebration || !completedGoal) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
            {/* Simple CSS Confetti Fallback */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(20)].map((_, i) => (
                    <div 
                        key={i}
                        className="absolute h-2 w-2 rounded-full animate-bounce"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `-10px`,
                            backgroundColor: i % 3 === 0 ? 'var(--primary)' : i % 3 === 1 ? '#fbbf24' : '#60a5fa',
                            animation: `fall ${2 + Math.random() * 3}s linear infinite`,
                            animationDelay: `${Math.random() * 2}s`,
                            opacity: 0.7
                        }}
                    />
                ))}
            </div>

            <Card className="max-w-sm w-full shadow-2xl border-primary/20 bg-gradient-to-b from-background to-primary/5 animate-in zoom-in-95 duration-300">
                <CardContent className="p-6 text-center space-y-4">
                    <div className="relative inline-block">
                        <div className="absolute -inset-1 bg-gradient-to-r from-primary to-blue-500 rounded-full blur opacity-50 animate-pulse"></div>
                        <div className="relative bg-background rounded-full p-4 border-2 border-primary/20">
                            <Trophy className="h-10 w-10 text-primary" />
                        </div>
                        <Star className="absolute -top-1 -right-1 h-5 w-5 text-yellow-500 fill-yellow-500 animate-bounce" />
                    </div>
                    
                    <div className="space-y-2">
                        <h2 className="text-xl font-bold font-headline tracking-tight">Milestone Reached!</h2>
                        <p className="text-sm text-foreground">
                            Congratulations! You've successfully hit your goal: <span className="font-bold text-primary">{completedGoal.name}</span>
                        </p>
                    </div>

                    <div className="py-2">
                         <Progress value={100} className="h-2 bg-primary/20" />
                         <p className="text-[10px] text-muted-foreground mt-2 uppercase tracking-widest font-bold font-mono">100% Achieved</p>
                    </div>

                    <div className="flex gap-2">
                         <Button onClick={() => setShowCelebration(false)} className="flex-1">
                            Awesome!
                        </Button>
                        <Button onClick={() => setShowCelebration(false)} variant="outline" size="icon">
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <style jsx>{`
                @keyframes fall {
                    to {
                        transform: translateY(100vh) rotate(360deg);
                    }
                }
            `}</style>
        </div>
    );
}

