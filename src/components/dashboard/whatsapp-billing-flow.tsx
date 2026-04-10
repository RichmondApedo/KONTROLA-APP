'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, Share2, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface WhatsAppBillingFlowProps {
    type: 'invoice' | 'receipt';
    customerName: string;
    amount: number;
    currency: string;
    number: string; // Invoice/Receipt number
    dueDate?: string | Date;
    businessName?: string;
    phone?: string; // Customer phone
}

export function WhatsAppBillingFlow({ 
    type, 
    customerName, 
    amount, 
    currency, 
    number, 
    dueDate,
    businessName = 'Kontrola Merchant',
    phone
}: WhatsAppBillingFlowProps) {
    const [copied, setCopied] = useState(false);
    const { toast } = useToast();

    const formattedAmount = formatCurrency(amount, currency);
    const formattedDate = dueDate ? new Date(dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

    const message = type === 'invoice' 
        ? `Hello ${customerName}, this is ${businessName}. Your invoice ${number} for ${formattedAmount} is ready. %0A%0A*Due Date:* ${formattedDate}%0A%0AThank you for your business!`
        : `Hello ${customerName}, this is ${businessName}. We've received your payment of ${formattedAmount}. Your receipt ${number} is attached below. %0A%0AThank you!`;

    const shareOnWhatsApp = () => {
        const whatsappUrl = `https://wa.me/${phone ? phone.replace(/\D/g, '') : ''}?text=${message}`;
        window.open(whatsappUrl, '_blank');
    };

    const copyToClipboard = () => {
        const rawMessage = decodeURIComponent(message.replace(/%0A/g, '\n'));
        navigator.clipboard.writeText(rawMessage);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({
            title: "Copied!",
            description: "Message copied to clipboard for manual sharing.",
        });
    };

    return (
        <div className="flex flex-col gap-3 p-4 glass-card rounded-2xl border-primary/20 bg-primary/5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-full bg-emerald-500/10">
                        <MessageCircle className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-foreground">WhatsApp Billing</p>
                        <p className="text-[10px] text-muted-foreground">Professional message for {customerName}</p>
                    </div>
                </div>
            </div>

            <div className="bg-background/40 p-3 rounded-xl border border-border/40">
                <p className="text-[11px] leading-relaxed italic text-muted-foreground whitespace-pre-wrap">
                    "{decodeURIComponent(message.replace(/%0A/g, '\n'))}"
                </p>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-1">
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={copyToClipboard}
                    className="h-9 rounded-xl border-emerald-500/20 hover:bg-emerald-500/5 hover:text-emerald-500 transition-all text-[11px]"
                >
                    {copied ? <Check className="mr-2 h-3.5 w-3.5" /> : <Copy className="mr-2 h-3.5 w-3.5" />}
                    Copy Text
                </Button>
                <Button 
                    size="sm" 
                    onClick={shareOnWhatsApp}
                    className="h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 text-[11px]"
                >
                    <Share2 className="mr-2 h-3.5 w-3.5" />
                    Share now
                </Button>
            </div>
        </div>
    );
}
