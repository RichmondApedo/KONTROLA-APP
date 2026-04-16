'use client';

import { useMemo, useState } from 'react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, orderBy, limit, doc, updateDoc, writeBatch, Timestamp } from 'firebase/firestore';
import { Bell, Info, ShieldCheck, Target, Zap, Trash2, CheckSquare, X, ChevronRight } from 'lucide-react';
import { 
    Popover, 
    PopoverContent, 
    PopoverTrigger 
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { NotificationType } from '@/lib/notifications';

interface NotificationEntry {
    id: string;
    title: string;
    body: string;
    type: NotificationType;
    status: 'unread' | 'read';
    createdAt: any;
    data?: any;
}

export function NotificationCenter() {
    const { user } = useUser();
    const firestore = useFirestore();
    const [open, setOpen] = useState(false);

    const notificationsQuery = useMemo(() => 
        user && firestore ? query(
            collection(firestore, 'users', user.uid, 'notifications'),
            orderBy('createdAt', 'desc'),
            limit(20)
        ) : null,
    [user, firestore]);

    const { data: notifications, isLoading } = useCollection<NotificationEntry>(notificationsQuery);

    const unreadCount = useMemo(() => 
        notifications?.filter(n => n.status === 'unread').length || 0,
    [notifications]);

    const getIcon = (type: NotificationType) => {
        switch (type) {
            case 'bill_reminder': return <Zap className="h-4 w-4 text-amber-500" />;
            case 'budget_warning': return <Info className="h-4 w-4 text-destructive" />;
            case 'goal_milestone': return <Target className="h-4 w-4 text-emerald-500" />;
            case 'security_alert': return <ShieldCheck className="h-4 w-4 text-primary" />;
            default: return <Bell className="h-4 w-4 text-muted-foreground" />;
        }
    };

    const markAsRead = async (id: string) => {
        if (!user || !firestore) return;
        const ref = doc(firestore, 'users', user.uid, 'notifications', id);
        await updateDoc(ref, { status: 'read' });
    };

    const markAllRead = async () => {
        if (!user || !firestore || !notifications) return;
        const unread = notifications.filter(n => n.status === 'unread');
        if (unread.length === 0) return;

        const batch = writeBatch(firestore);
        unread.forEach(n => {
            const ref = doc(firestore, 'users', user.uid, 'notifications', n.id);
            batch.update(ref, { status: 'read' });
        });
        await batch.commit();
    };

    const clearAll = async () => {
        if (!user || !firestore || !notifications) return;
        const batch = writeBatch(firestore);
        notifications.forEach(n => {
            const ref = doc(firestore, 'users', user.uid, 'notifications', n.id);
            batch.delete(ref);
        });
        await batch.commit();
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="relative rounded-xl hover:bg-primary/10 transition-all duration-300 group"
                >
                    <Bell className={cn(
                        "h-5 w-5 transition-transform duration-500 group-hover:rotate-12",
                        unreadCount > 0 ? "text-primary scale-110" : "text-muted-foreground"
                    )} />
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-black text-white shadow-lg shadow-primary/40 animate-in zoom-in-50 duration-300 ring-2 ring-background">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 sm:w-[400px] p-0 border-border/40 bg-background/95 backdrop-blur-2xl shadow-premium rounded-[2rem] overflow-hidden animate-in fade-in zoom-in-95 duration-500 origin-top-right" align="end">
                <div className="flex flex-col h-[500px]">
                    {/* Header */}
                    <div className="px-6 py-5 border-b border-border/10 bg-primary/[0.03]">
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                                    Strategic Notifications
                                    {unreadCount > 0 && <Badge variant="secondary" className="bg-primary/20 text-primary border-none text-[8px] tracking-widest">{unreadCount} NEW</Badge>}
                                </h3>
                                <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-1">Intelligence Feed</p>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" onClick={markAllRead} className="h-8 w-8 rounded-lg hover:bg-emerald-500/10 text-emerald-600/60 hover:text-emerald-600 transition-colors" title="Mark All Read">
                                    <CheckSquare className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={clearAll} className="h-8 w-8 rounded-lg hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-colors" title="Clear All">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="h-8 w-8 rounded-lg md:hidden">
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <ScrollArea className="flex-1">
                        <div className="divide-y divide-border/10">
                            {isLoading ? (
                                <div className="p-12 text-center space-y-4">
                                    <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto opacity-40" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 italic">Syncing Intel...</p>
                                </div>
                            ) : notifications && notifications.length > 0 ? (
                                notifications.map((notification) => (
                                    <div 
                                        key={notification.id} 
                                        onClick={() => markAsRead(notification.id)}
                                        className={cn(
                                            "flex gap-4 p-5 transition-all duration-300 hover:bg-primary/[0.03] cursor-pointer relative group",
                                            notification.status === 'unread' ? "bg-primary/[0.01]" : "opacity-60"
                                        )}
                                    >
                                        {/* Status Glow */}
                                        {notification.status === 'unread' && (
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                                        )}
                                        
                                        <div className="shrink-0 mt-1">
                                            <div className="h-10 w-10 rounded-xl bg-background border border-border/40 shadow-soft flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                                                {getIcon(notification.type)}
                                            </div>
                                        </div>

                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <h4 className={cn(
                                                    "text-sm tracking-tight truncate",
                                                    notification.status === 'unread' ? "font-black text-foreground" : "font-bold text-muted-foreground"
                                                )}>
                                                    {notification.title}
                                                </h4>
                                                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 whitespace-nowrap">
                                                    {formatDistanceToNow(new Date(notification.createdAt?.toDate ? notification.createdAt.toDate() : notification.createdAt), { addSuffix: true })}
                                                </span>
                                            </div>
                                            <p className="text-[11px] font-medium text-muted-foreground/80 leading-relaxed line-clamp-2">
                                                {notification.body}
                                            </p>
                                            
                                            {/* Action Link (Optional) */}
                                            {notification.status === 'unread' && (
                                                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-primary pt-1 translate-x-[-2px]">
                                                    <div className="h-1 w-1 rounded-full bg-primary animate-pulse" />
                                                    Strategic Action <ChevronRight className="h-3 w-3" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center p-12 text-center space-y-6">
                                    <div className="h-16 w-16 rounded-[2rem] bg-muted/10 flex items-center justify-center">
                                        <Bell className="h-8 w-8 text-muted-foreground/20" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Clean Ledger</p>
                                        <p className="text-[10px] font-medium text-muted-foreground/30 italic">No new strategic updates.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    {/* Footer */}
                    <div className="p-4 border-t border-border/10 bg-muted/5 flex justify-center">
                        <Button variant="ghost" size="sm" className="w-full rounded-xl text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 hover:text-primary transition-colors" onClick={() => setOpen(false)}>
                            Dismiss Center
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
