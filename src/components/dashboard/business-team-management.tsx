'use client';

import { useMemo, useState } from 'react';
import { useFirestore, useUser, useUserProfile, useCollection } from '@/firebase';
import { collection, query, where, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Shield, UserPlus, Trash2, SwitchCamera, CheckCircle2, Clock, Briefcase, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { BusinessInvitation, BusinessAccess } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CreateEnterpriseDialog } from './create-enterprise-dialog';

export function BusinessTeamManagement() {
    const { user } = useUser();
    const { profile, activeProfile, activeProfileId, activeAccessLevel, switchProfile } = useUserProfile();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteLevel, setInviteLevel] = useState<'viewer' | 'editor'>('viewer');
    const [isInviting, setIsInviting] = useState(false);

    // Queries
    const outgoingInvitesQuery = useMemo(() => 
        user && firestore ? query(collection(firestore, 'business_invitations'), where('ownerUid', '==', user.uid)) : null,
        [user, firestore]
    );

    const authorizedAccessQuery = useMemo(() => 
        user && firestore ? query(collection(firestore, 'business_access_grants'), where('targetEmail', '==', user?.email?.toLowerCase())) : null,
        [user, firestore]
    );

    const { data: outgoingInvites, isLoading: isOutgoingLoading } = useCollection<BusinessInvitation>(outgoingInvitesQuery);
    const { data: authorizedAccess, isLoading: isAccessLoading } = useCollection<BusinessAccess>(authorizedAccessQuery);

    const handleSendInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !firestore || !inviteEmail) return;

        setIsInviting(true);
        try {
            await addDoc(collection(firestore, 'business_invitations'), {
                ownerUid: activeProfileId,
                ownerEmail: activeProfile?.businessName || user.email,
                targetEmail: inviteEmail.toLowerCase(),
                accessLevel: inviteLevel,
                status: 'pending',
                createdAt: serverTimestamp(),
            });

            // 2. Send Email Invitation via API
            const idToken = await user.getIdToken();
            const emailResponse = await fetch('/api/send-invite', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    targetEmail: inviteEmail.toLowerCase(),
                    ownerEmail: user.email,
                    accessLevel: inviteLevel
                })
            });

            const emailResult = await emailResponse.json();

            if (!emailResponse.ok) {
                console.warn('Email notification failed to send, but invitation document was created.', emailResult.error);
                toast({
                    variant: 'default',
                    title: "Invitation Created",
                    description: `The invitation was saved, but we couldn't send the notification email to ${inviteEmail}.`,
                });
            } else {
                toast({
                    title: "Invitation Sent",
                    description: `Sent business access invitation and email to ${inviteEmail}.`,
                });
            }
            setInviteEmail('');
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Invite Failed',
                description: error.message,
            });
        } finally {
            setIsInviting(false);
        }
    };

    const handleRevoke = async (inviteId: string) => {
        if (!firestore) return;
        if (!window.confirm("Are you sure you want to revoke this invitation? The collaborator will lose access immediately.")) return;
        try {
            await deleteDoc(doc(firestore, 'business_invitations', inviteId));
            toast({ title: "Invite Revoked" });
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Revocation Failed", description: error.message });
        }
    };

    const isViewingOther = activeProfileId !== user?.uid;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
                        Team Command Hub
                        {isViewingOther && (
                            <Badge variant="outline" className={cn(
                                "border-primary/20 text-[10px] uppercase font-black tracking-widest px-2 py-0.5",
                                activeAccessLevel === 'owner' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-primary/10 text-primary border-primary/20"
                            )}>
                                {activeAccessLevel === 'owner' ? 'Secondary Enterprise' : 'Delegated Terminal'}
                            </Badge>
                        )}
                    </h2>
                    <p className="text-sm text-muted-foreground font-medium">Manage your enterprise portfolio and delegate access to team members.</p>
                </div>
                <div className="flex items-center gap-3">
                    {!isViewingOther && <CreateEnterpriseDialog />}
                    {isViewingOther && (
                        <Button variant="outline" size="sm" onClick={() => switchProfile(null)} className="rounded-xl font-bold uppercase tracking-widest text-[10px] border-primary/20 text-primary h-11 px-6">
                            <SwitchCamera className="mr-2 h-3.5 w-3.5" /> Return to My Terminal
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Outbound Invitations */}
                {!isViewingOther && (
                    <Card className="glass-card border-primary/20 shadow-premium overflow-hidden">
                        <CardHeader className="bg-primary/[0.02] border-b border-primary/10">
                            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                <UserPlus className="h-4 w-4 text-primary" />
                                Delegate Access
                            </CardTitle>
                            <CardDescription className="text-xs">Invite collaborators to manage this business terminal.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <form onSubmit={handleSendInvite} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="inviteEmail" className="text-[10px] font-black uppercase tracking-widest opacity-60">Collaborator Email</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40" />
                                        <Input 
                                            id="inviteEmail"
                                            placeholder="accountant@example.com"
                                            type="email"
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                            className="pl-10 rounded-xl bg-background/50 border-border/40"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="level" className="text-[10px] font-black uppercase tracking-widest opacity-60">Access Permissions</Label>
                                    <Select value={inviteLevel} onValueChange={(v: any) => setInviteLevel(v)}>
                                        <SelectTrigger id="level" className="rounded-xl bg-background/50 border-border/40">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="viewer">VIEWER (Read-Only Insights)</SelectItem>
                                            <SelectItem value="editor">EDITOR (Full Control)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button type="submit" className="w-full bg-primary font-black uppercase tracking-widest text-xs h-11 rounded-xl shadow-lg shadow-primary/20" disabled={isInviting}>
                                    {isInviting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
                                    Send In-App Invite
                                </Button>
                            </form>

                            <div className="mt-8 space-y-3">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 border-b border-border/40 pb-2">Pending Requests</h3>
                                {isOutgoingLoading ? <Skeleton className="h-20 w-full rounded-xl" /> : 
                                 (!outgoingInvites || outgoingInvites.length === 0) ? <p className="text-xs text-center py-6 text-muted-foreground italic font-medium">No pending outbound invites.</p> :
                                 outgoingInvites.filter(i => i.status === 'pending').map(invite => (
                                     <div key={invite.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/20 text-xs shadow-sm">
                                         <div className="flex flex-col gap-0.5">
                                             <span className="font-bold truncate max-w-[140px]">{invite.targetEmail}</span>
                                             <span className="flex items-center gap-1.5 opacity-50 font-black uppercase text-[8px] tracking-tight">
                                                 <Clock className="h-2.5 w-2.5" /> Pending • {invite.accessLevel}
                                             </span>
                                         </div>
                                         <Button variant="ghost" size="icon" onClick={() => handleRevoke(invite.id)} className="h-8 w-8 text-destructive/40 hover:text-destructive hover:bg-destructive/5">
                                             <Trash2 className="h-4 w-4" />
                                         </Button>
                                     </div>
                                 ))
                                }
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Authorized Terminals - Switcher */}
                <Card className="glass-card border-border/40 shadow-premium overflow-hidden">
                    <CardHeader className="bg-muted/30 border-b border-border/20">
                        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                             <SwitchCamera className="h-4 w-4 text-emerald-500" />
                             Linked Enterprises
                        </CardTitle>
                        <CardDescription className="text-xs">Accounts that have delegated business access to you.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="space-y-4">
                            {/* Personal Account Option */}
                            <div className="flex items-center justify-between p-4 rounded-2xl bg-primary/5 border border-primary/20 shadow-sm transition-all hover:scale-[1.02]">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                                        <Briefcase className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black tracking-tight">Personal Terminal</p>
                                        <p className="text-[10px] uppercase font-bold text-primary opacity-60">Primary Owner</p>
                                    </div>
                                </div>
                                {!isViewingOther ? (
                                    <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">Active</Badge>
                                ) : (
                                    <Button size="sm" onClick={() => switchProfile(null)} className="rounded-xl font-black uppercase tracking-widest text-[9px] h-8 px-4 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all">Select</Button>
                                )}
                            </div>                             {/* Shared Accounts */}
                            {isAccessLoading ? <Skeleton className="h-24 w-full rounded-2xl" /> : 
                             (!authorizedAccess || authorizedAccess.length === 0) ? (
                                <div className="p-8 rounded-2xl border-2 border-dashed border-border/40 flex flex-col items-center justify-center text-center space-y-2 mt-4 opacity-50">
                                    <Shield className="h-8 w-8 mb-2" />
                                    <p className="text-xs font-bold leading-relaxed uppercase tracking-widest">No Linked Accounts Found</p>
                                    <p className="text-[10px] font-medium max-w-[200px]">Other businesses must invite your email to grant you management access, or use the "Spawn" button to create your own.</p>
                                </div>
                             ) :
                             <>
                                {/* Owned Enterprises Section */}
                                {authorizedAccess.some(a => a.accessLevel === 'owner') && (
                                    <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 fill-mode-both">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 flex items-center gap-2">
                                            <div className="h-1 w-1 rounded-full bg-emerald-500" /> My Enterprise Portfolio
                                        </p>
                                        {authorizedAccess.filter(a => a.accessLevel === 'owner').map(access => (
                                            <div key={access.id} className={cn(
                                                "flex items-center justify-between p-4 rounded-2xl border transition-all duration-300",
                                                activeProfileId === access.ownerUid ? "bg-emerald-500/[0.08] border-emerald-500/30 shadow-lg shadow-emerald-500/10 outline outline-1 outline-emerald-500/20" : "bg-muted/20 border-border/40 hover:bg-emerald-500/5 hover:border-emerald-500/20"
                                                )}>
                                                <div className="flex items-center gap-4">
                                                    <div className={cn(
                                                        "h-10 w-10 rounded-xl flex items-center justify-center shadow-lg",
                                                        activeProfileId === access.ownerUid ? "bg-emerald-500 shadow-emerald-500/20" : "bg-emerald-500/40 shadow-sm"
                                                    )}>
                                                        <Briefcase className="h-5 w-5 text-white" />
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <p className="text-sm font-black tracking-tight truncate max-w-[120px]">{access.ownerEmail}</p>
                                                        <p className="text-[10px] uppercase font-bold text-emerald-600 flex items-center gap-1.5">
                                                            <Sparkles className="h-2.5 w-2.5" /> Secondary Owner
                                                        </p>
                                                    </div>
                                                </div>
                                                {activeProfileId === access.ownerUid ? (
                                                    <Badge variant="outline" className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">In Control</Badge>
                                                ) : (
                                                    <Button size="sm" onClick={() => switchProfile(access.ownerUid, 'owner')} className="rounded-xl font-black uppercase tracking-widest text-[9px] h-8 px-4 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all">Select</Button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Delegated Terminals Section */}
                                {authorizedAccess.some(a => a.accessLevel !== 'owner') && (
                                    <div className="space-y-3 pt-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-both">
                                         <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 flex items-center gap-2">
                                            <div className="h-1 w-1 rounded-full bg-primary" /> Delegated Terminals
                                        </p>
                                        {authorizedAccess.filter(a => a.accessLevel !== 'owner').map(access => (
                                            <div key={access.id} className={cn(
                                                "flex items-center justify-between p-4 rounded-2xl border transition-all",
                                                activeProfileId === access.ownerUid ? "bg-primary/5 border-primary/20 shadow-sm" : "bg-muted/20 border-border/40 hover:bg-muted/40"
                                                )}>
                                                <div className="flex items-center gap-4">
                                                    <div className={cn(
                                                        "h-10 w-10 rounded-xl flex items-center justify-center shadow-lg",
                                                        activeProfileId === access.ownerUid ? "bg-primary shadow-primary/20" : "bg-muted shadow-sm"
                                                    )}>
                                                        <CheckCircle2 className="h-5 w-5 text-white" />
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <p className="text-sm font-black tracking-tight truncate max-w-[120px]">{access.ownerEmail}</p>
                                                        <p className="text-[10px] uppercase font-bold opacity-60 flex items-center gap-1.5">
                                                            <Shield className="h-2.5 w-2.5" /> {access.accessLevel} Mode
                                                        </p>
                                                    </div>
                                                </div>
                                                {activeProfileId === access.ownerUid ? (
                                                    <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30 font-black uppercase tracking-widest text-[9px]">Viewing</Badge>
                                                ) : (
                                                    <Button size="sm" onClick={() => switchProfile(access.ownerUid, access.accessLevel)} className="rounded-xl font-black uppercase tracking-widest text-[9px] h-8 px-4 bg-muted border border-border hover:bg-primary hover:text-white hover:border-primary transition-all">Switch</Button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                             </>
                            }
}
                        </div>
                    </CardContent>
                </Card>

                {/* Privacy Shield Note */}
                <Card className="lg:col-span-2 bg-emerald-500/[0.03] border border-emerald-500/10 rounded-2xl overflow-hidden">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                             <Shield className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-xs font-black uppercase tracking-[0.1em] text-emerald-700">Privacy Shield Active</p>
                            <p className="text-[10px] text-emerald-600/70 font-medium leading-relaxed">
                                Business delegates are strictly prevented from viewing your personal settings, security credentials, and private financial ledgers. Access is limited to the Business Suite.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
