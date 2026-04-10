'use client';

import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { WhatsAppBillingFlow } from './whatsapp-billing-flow';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface WhatsAppShareDialogProps {
    type: 'invoice' | 'receipt';
    customerName: string;
    amount: number;
    currency: string;
    number: string;
    dueDate?: string | Date;
    businessName?: string;
    phone?: string;
    trigger?: React.ReactNode;
}

export function WhatsAppShareDialog({
    type,
    customerName,
    amount,
    currency,
    number,
    dueDate,
    businessName,
    phone,
    trigger
}: WhatsAppShareDialogProps) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                {trigger || (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-9 w-9 rounded-xl hover:bg-emerald-500/10 text-muted-foreground transition-all duration-300"
                                >
                                    <MessageCircle className="h-4 w-4" />
                                    <span className="sr-only">Share via WhatsApp</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent className="text-[10px] font-black tracking-widest bg-emerald-500 text-white border-none">
                                WhatsApp Share
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] glass-card border-emerald-500/20 shadow-premium p-0 overflow-hidden">
                <div className="bg-emerald-500/10 p-6 pb-4 border-b border-emerald-500/10">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black tracking-tight flex items-center gap-2">
                             <MessageCircle className="h-5 w-5 text-emerald-500" />
                             Share {type === 'invoice' ? 'Bill' : 'Receipt'}
                        </DialogTitle>
                        <DialogDescription className="text-xs font-medium text-muted-foreground/60 italic uppercase tracking-widest mt-1">
                            Strategic Collection Velocity
                        </DialogDescription>
                    </DialogHeader>
                </div>
                <div className="p-1 pb-4">
                    <WhatsAppBillingFlow
                        type={type}
                        customerName={customerName}
                        amount={amount}
                        currency={currency}
                        number={number}
                        dueDate={dueDate}
                        businessName={businessName}
                        phone={phone}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
