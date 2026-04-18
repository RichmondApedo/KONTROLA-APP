'use client';

import { useEffect, useState } from 'react';
import { useFirestore, useUser, useCollection } from '@/firebase';
import { query, collection, where, doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Shield, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import type { BusinessInvitation } from '@/lib/types';
import { 
    Dialog, 
    DialogContent, 
    DialogDescription, 
    DialogHeader, 
    DialogTitle 
} from '@/components/ui/dialog';

export function InvitationAcceptance() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [pendingInvite, setPendingInvite] = useState<BusinessInvitation | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Only query for YOUR email
    const invitesQuery = useMemo(() => 
        user && firestore ? query(
            collection(firestore, 'business_invitations'), 
            where('targetEmail', '==', user.email?.toLowerCase()),
            where('status', '==', 'pending')
        ) : null,
        [user, firestore]
    );

    const { data: invites } = useCollection<BusinessInvitation>(invitesQuery);

    useEffect(() => {
        if (invites && invites.length > 0 && !open) {
            setPendingInvite(invites[0]);
            setOpen(true);
        }
    }, [invites, open]);

    const handleAccept = async () => {
        if (!firestore || !user || !pendingInvite) return;
        setIsProcessing(true);
        try {
            // 1. Update Invitation
            const inviteRef = doc(firestore, 'business_invitations', pendingInvite.id);
            await updateDoc(inviteRef, {
                status: 'accepted',
                targetUid: user.uid
            });

            // 2. Create/Update Grant (Mirror for easy lookup)
            // We use a specific ID to prevent duplicates: ownerUid_targetUid
            const grantId = `${pendingInvite.ownerUid}_${user.uid}`;
            await setDoc(doc(firestore, 'business_access_grants', grantId), {
                id: grantId,
                ownerUid: pendingInvite.ownerUid,
                ownerEmail: pendingInvite.ownerEmail,
                targetEmail: user.email?.toLowerCase(),
                targetUid: user.uid,
                accessLevel: pendingInvite.accessLevel,
                grantedAt: serverTimestamp(),
            });

            toast({
                title: "Access Granted!",
                description: `You can now manage the business workspace for ${pendingInvite.ownerEmail}.`,
            });
            setOpen(false);
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: "Error",
                description: "Failed to accept invitation. Please try again."
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDecline = async () => {
        if (!firestore || !pendingInvite) return;
        setIsProcessing(true);
        try {
            const inviteRef = doc(firestore, 'business_invitations', pendingInvite.id);
            await updateDoc(inviteRef, {
                status: 'rejected'
            });
            setOpen(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Error", description: "Failed to decline invitation." });
        } finally {
            setIsProcessing(false);
        }
    };

    if (!pendingInvite) return null;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="glass-card sm:max-w-md border-primary/20">
                <DialogHeader className="space-y-4">
                    <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner border border-primary/20">
                        <Shield className="h-8 w-8 text-primary animate-pulse" />
                    </div>
                    <div className="text-center space-y-2">
                        <DialogTitle className="text-2xl font-black tracking-tight">Business Delegation</DialogTitle>
                        <DialogDescription className="text-sm font-medium">
                            <span className="font-black text-foreground">{pendingInvite.ownerEmail}</span> has invited you to join their Business Command Suite as an <span className="uppercase text-primary font-black tracking-widest">{pendingInvite.accessLevel}</span>.
                        </DialogDescription>
                    </div>
                </DialogHeader>

                <div className="space-y-4 pt-6">
                    <div className="p-4 rounded-xl bg-muted/50 border border-border/40 text-[10px] items-center gap-3 flex text-muted-foreground leading-relaxed italic">
                        <Shield className="h-4 w-4 shrink-0 text-emerald-500" />
                        By accepting, you will be able to switch workspaces and manage their business data. You will NOT have access to their personal settings.
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <Button onClick={handleAccept} disabled={isProcessing} className="flex-1 bg-primary font-black uppercase tracking-widest text-xs h-12 rounded-xl">
                            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                            Accept Controls
                        </Button>
                        <Button variant="outline" onClick={handleDecline} disabled={isProcessing} className="flex-1 border-destructive/20 text-destructive hover:bg-destructive/5 font-black uppercase tracking-widest text-xs h-12 rounded-xl">
                            <XCircle className="h-4 w-4 mr-2" />
                            Decline
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

import React, { useMemo } from 'react';
